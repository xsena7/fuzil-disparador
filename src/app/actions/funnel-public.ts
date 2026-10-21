"use server";

import { randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { clientIp, tooMany } from "@/lib/rate-limit";
import { advanceLead, CODE_COOLDOWN_S, funnelFields, funnelPage, hashCode, MAX_CODE_ATTEMPTS, MAX_CODE_SENDS, sendCode, sendDone } from "@/lib/funnels";
import { resolveFunnel } from "@/lib/funnel-public";
import { cookies, headers } from "next/headers";
import type { Funnel, Lead } from "@prisma/client";
import { sendCapi, type CapiEvent } from "@/lib/capi";

/** Manda o evento para a API de Conversões sem segurar a resposta da pessoa. */
async function capi(funnel: Funnel, lead: Lead, event: CapiEvent) {
  if (!funnel.pixelId || !funnel.capiTokenEnc) return;
  const [h, c, ip] = await Promise.all([headers(), cookies(), clientIp()]);
  const ctx = { ip, ua: h.get("user-agent"), fbp: c.get("_fbp")?.value, fbc: c.get("_fbc")?.value, url: h.get("referer") };
  void sendCapi(funnel, lead, event, ctx).catch(() => undefined);
}

export type SignupState = { token?: string; phone?: string; already?: boolean; error?: string } | undefined;

/** Formulário da landing: cria o lead e manda o código pelo WhatsApp. */
export async function signupAction(key: string, _: SignupState, form: FormData): Promise<SignupState> {
  const funnel = await resolveFunnel(key);
  if (!funnel || funnel.status !== "ACTIVE") return { error: "As inscrições estão encerradas no momento." };
  // Robô preenchendo o campo escondido: finge que deu certo
  if (String(form.get("website") ?? "")) return { token: "x", phone: "" };
  const ip = await clientIp();
  if (tooMany(`fsign:${ip}`, 20, 10 * 60_000)) return { error: "Muitas inscrições seguidas. Tente de novo em alguns minutos." };

  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 120);
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (name.length < 3 || !name.includes(" ")) return { error: "Digite seu nome completo." };
  if (!phone) return { error: "WhatsApp inválido. Digite com DDD, ex.: (11) 99999-8888." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido." };
  if (!form.get("consent")) return { error: "Marque que aceita receber as mensagens no WhatsApp." };
  const openJobs = funnelPage(funnel).jobs.filter((j) => j.open);
  const job = openJobs.find((j) => j.id === String(form.get("job") ?? ""))?.title ?? null;
  if (openJobs.length && !job) return { error: "Escolha a vaga que você quer." };

  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"]) {
    const v = String(form.get(k) ?? "").slice(0, 200);
    if (v) utm[k] = v;
  }

  // Quem se inscreve está pedindo para receber: tira de um "SAIR" antigo
  await prisma.contact.upsert({
    where: { workspaceId_phone: { workspaceId: funnel.workspaceId, phone } },
    create: { workspaceId: funnel.workspaceId, phone, name, email: email || null },
    update: { name, email: email || undefined, optedOut: false, optedOutAt: null },
  });

  let lead = await prisma.lead.findUnique({ where: { funnelId_phone: { funnelId: funnel.id, phone } } });
  // Já confirmado: não devolve o link do cadastro (qualquer um poderia digitar o número de outra pessoa)
  if (lead && lead.status !== "CODE_SENT") return { phone, already: true };
  if (lead) {
    lead = await prisma.lead.update({ where: { id: lead.id }, data: { name, email: email || null, job } });
    // Acabou de receber um código: não manda outro
    if (lead.lastCodeAt && Date.now() - lead.lastCodeAt.getTime() < CODE_COOLDOWN_S * 1000) return { token: lead.formToken, phone };
    if (lead.codeSends >= MAX_CODE_SENDS && lead.lastCodeAt && Date.now() - lead.lastCodeAt.getTime() < 86400_000)
      return { error: "Você já pediu vários códigos. Tente de novo amanhã." };
  } else {
    lead = await prisma.lead
      .create({ data: { funnelId: funnel.id, workspaceId: funnel.workspaceId, name, phone, email: email || null, job, formToken: randomBytes(18).toString("base64url"), utm, ip } })
      .catch(() => prisma.lead.findUniqueOrThrow({ where: { funnelId_phone: { funnelId: funnel.id, phone } } }));
  }
  await sendCode(funnel, lead);
  await capi(funnel, lead, "Lead");
  return { token: lead.formToken, phone };
}

/** Confere o código digitado no site. */
export async function verifyCodeAction(token: string, code: string): Promise<{ ok?: true; error?: string }> {
  if (tooMany(`fver:${token}`, 15, 10 * 60_000)) return { error: "Muitas tentativas. Espere alguns minutos." };
  const lead = await prisma.lead.findUnique({ where: { formToken: token }, include: { funnel: true } });
  if (!lead) return { error: "Inscrição não encontrada. Recarregue a página." };
  if (lead.status !== "CODE_SENT") return { ok: true };
  const digits = String(code ?? "").replace(/\D/g, "");
  if (digits.length !== 6) return { error: "Digite os 6 números do código." };
  if (!lead.codeHash || !lead.codeExpiresAt || lead.codeExpiresAt < new Date()) return { error: "O código expirou. Toque em reenviar." };
  if (lead.codeAttempts >= MAX_CODE_ATTEMPTS) return { error: "Muitas tentativas erradas. Toque em reenviar para receber outro código." };
  const ok = timingSafeEqual(Buffer.from(hashCode(lead.id, digits)), Buffer.from(lead.codeHash));
  if (!ok) {
    await prisma.lead.update({ where: { id: lead.id }, data: { codeAttempts: { increment: 1 } } });
    return { error: "Código incorreto. Confira no WhatsApp e tente de novo." };
  }
  const { funnel, ...rest } = lead;
  const verified = await prisma.lead.update({
    where: { id: rest.id },
    data: { status: "VERIFIED", verifiedAt: new Date(), codeHash: null, stepIndex: 0, nextStepAt: new Date() },
  });
  // Já manda o primeiro passo (mensagem de inscrição confirmada) sem esperar o worker
  await advanceLead(funnel, verified).catch((e) => console.error("[funil] avançar", e));
  await capi(funnel, verified, "CompleteRegistration");
  return { ok: true };
}

export async function resendCodeAction(token: string): Promise<{ ok?: true; error?: string }> {
  const lead = await prisma.lead.findUnique({ where: { formToken: token }, include: { funnel: true } });
  if (!lead || lead.status !== "CODE_SENT") return { error: "Inscrição não encontrada. Recarregue a página." };
  if (lead.funnel.status !== "ACTIVE") return { error: "As inscrições estão encerradas no momento." };
  if (lead.lastCodeAt && Date.now() - lead.lastCodeAt.getTime() < CODE_COOLDOWN_S * 1000) return { error: "Espere um minutinho antes de pedir outro código." };
  if (lead.codeSends >= MAX_CODE_SENDS) return { error: "Você já pediu vários códigos. Confira se o número está certo ou tente amanhã." };
  const { funnel, ...rest } = lead;
  await sendCode(funnel, rest);
  return { ok: true };
}

/** Cadastro final (link que chega no WhatsApp). */
export async function answersAction(token: string, _: { ok?: true; error?: string } | undefined, form: FormData): Promise<{ ok?: true; error?: string }> {
  const lead = await prisma.lead.findUnique({ where: { formToken: token }, include: { funnel: true } });
  if (!lead || lead.status === "CODE_SENT") return { error: "Link inválido." };
  if (lead.status === "COMPLETED") return { ok: true };
  const answers: Record<string, string> = {};
  for (const f of funnelFields(lead.funnel)) {
    const v = String(form.get(f.key) ?? "").trim().slice(0, 1000);
    if (f.required && !v) return { error: `Responda: ${f.label}` };
    if (f.type === "select" && v && !f.options?.includes(v)) return { error: `Escolha uma opção em: ${f.label}` };
    answers[f.key] = v;
  }
  const done = await prisma.lead.updateMany({ where: { id: lead.id, status: "VERIFIED" }, data: { status: "COMPLETED", answers, answeredAt: new Date() } });
  if (done.count) {
    const { funnel, ...rest } = lead;
    await sendDone(funnel, { ...rest, status: "COMPLETED" }).catch((e) => console.error("[funil] recebido", e));
    await capi(funnel, { ...rest, status: "COMPLETED" }, "SubmitApplication");
  }
  return { ok: true };
}
