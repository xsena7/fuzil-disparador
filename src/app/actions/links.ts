"use server";

import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { trackedUrlBase } from "@/lib/env";
import { normalizePhone } from "@/lib/phone";
import { clientIp, tooMany } from "@/lib/rate-limit";
import { CODE_COOLDOWN_S, hashCode, MAX_CODE_ATTEMPTS, MAX_CODE_SENDS, advanceLead, sendCode } from "@/lib/funnels";
import { createLinksFunnel, endLinksSession, linksAuth, linksFunnelFor, startLinksSession } from "@/lib/links-login";
import type { FormState } from "./auth";

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 7 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

// ---------------- Login pelo WhatsApp ----------------

export type LoginState = { step?: "phone" | "name" | "code"; phone?: string; error?: string; ok?: boolean } | undefined;

/** Passo 1: número (e o nome, no primeiro acesso). Manda o código pelo WhatsApp. */
export async function requestLinksCodeAction(_: LoginState, form: FormData): Promise<LoginState> {
  const ip = await clientIp();
  if (tooMany(`lk:code:${ip}`, 15, 15 * 60_000)) return { error: "Muitos pedidos de código. Espere alguns minutos." };
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return { error: "WhatsApp inválido. Digite com DDD, ex.: (11) 99999-8888." };
  const funnel = await linksFunnelFor(phone);
  if (!funnel || funnel.status !== "ACTIVE") return { error: "O login está fora do ar agora. Tente de novo em alguns minutos." };
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 80);

  let lead = await prisma.lead.findUnique({ where: { funnelId_phone: { funnelId: funnel.id, phone } } });
  if (lead?.status === "STOPPED") return { error: "Esse número não tem acesso ao gerador de links." };
  if (!lead) {
    if (name.length < 2) return { step: "name", phone };
    await prisma.contact.upsert({
      where: { workspaceId_phone: { workspaceId: funnel.workspaceId, phone } },
      create: { workspaceId: funnel.workspaceId, phone, name },
      update: { name, optedOut: false, optedOutAt: null },
    });
    lead = await prisma.lead
      .create({ data: { funnelId: funnel.id, workspaceId: funnel.workspaceId, name, phone, formToken: randomBytes(18).toString("base64url"), ip } })
      .catch(() => prisma.lead.findUniqueOrThrow({ where: { funnelId_phone: { funnelId: funnel.id, phone } } }));
  }
  // Acabou de receber um código: não manda outro
  if (lead.lastCodeAt && Date.now() - lead.lastCodeAt.getTime() < CODE_COOLDOWN_S * 1000 && lead.codeHash) return { step: "code", phone };
  // Limite de códigos por dia (zera depois de 24h)
  const sends = lead.lastCodeAt && Date.now() - lead.lastCodeAt.getTime() > 86400_000 ? 0 : lead.codeSends;
  if (sends >= MAX_CODE_SENDS * 2) return { error: "Você já pediu vários códigos hoje. Tente de novo amanhã." };
  if (sends !== lead.codeSends) lead = await prisma.lead.update({ where: { id: lead.id }, data: { codeSends: 0 } });
  await sendCode(funnel, lead);
  return { step: "code", phone };
}

/** Passo 2: confere o código e abre o login (salvo neste navegador, neste IP). */
export async function verifyLinksCodeAction(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const funnel = phone ? await linksFunnelFor(phone) : null;
  if (!funnel || !phone) return { error: "Recarregue a página e tente de novo." };
  if (tooMany(`lk:ver:${phone}`, 15, 10 * 60_000)) return { step: "code", phone, error: "Muitas tentativas. Espere alguns minutos." };
  const lead = await prisma.lead.findUnique({ where: { funnelId_phone: { funnelId: funnel.id, phone } } });
  if (!lead || lead.status === "STOPPED") return { error: "Recarregue a página e tente de novo." };
  const digits = String(form.get("code") ?? "").replace(/\D/g, "");
  if (digits.length !== 6) return { step: "code", phone, error: "Digite os 6 números do código." };
  if (!lead.codeHash || !lead.codeExpiresAt || lead.codeExpiresAt < new Date()) return { step: "code", phone, error: "O código expirou. Toque em \"Mandar outro código\"." };
  if (lead.codeAttempts >= MAX_CODE_ATTEMPTS) return { step: "code", phone, error: "Muitas tentativas erradas. Peça outro código." };
  if (!timingSafeEqual(Buffer.from(hashCode(lead.id, digits)), Buffer.from(lead.codeHash))) {
    await prisma.lead.update({ where: { id: lead.id }, data: { codeAttempts: { increment: 1 } } });
    return { step: "code", phone, error: "Código incorreto. Confira no WhatsApp e tente de novo." };
  }
  const first = lead.status === "CODE_SENT";
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: { codeHash: null, codeAttempts: 0, ...(first ? { status: "VERIFIED" as const, verifiedAt: new Date(), stepIndex: 0, nextStepAt: new Date() } : {}) },
  });
  await startLinksSession(funnel, updated, (await headers()).get("user-agent"));
  // Primeiro acesso: entra nos passos do funil (se você configurou algum no Aquecimento)
  if (first) await advanceLead(funnel, updated).catch((e) => console.error("[links] funil", e));
  return { ok: true };
}

export async function resendLinksCodeAction(phoneRaw: string): Promise<{ ok?: true; error?: string }> {
  const form = new FormData();
  form.set("phone", phoneRaw);
  const phone = normalizePhone(phoneRaw);
  const funnel = phone ? await linksFunnelFor(phone) : null;
  const lead = funnel && phone ? await prisma.lead.findUnique({ where: { funnelId_phone: { funnelId: funnel.id, phone } } }) : null;
  if (lead?.lastCodeAt && Date.now() - lead.lastCodeAt.getTime() < CODE_COOLDOWN_S * 1000) return { error: "Espere um minutinho antes de pedir outro código." };
  const r = await requestLinksCodeAction(undefined, form);
  return r?.error ? { error: r.error } : { ok: true };
}

export async function logoutLinksAction() {
  await endLinksSession();
  revalidatePath("/site/links");
}

// ---------------- Links do cliente logado ----------------

function readForm(form: FormData): { name: string; url: string } | { error: string } {
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  let url = String(form.get("url") ?? "").trim();
  if (!name) return { error: "Dê um nome para o link (ex.: Loja do João)" };
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/^https?:\/\/[^\s/]+\.[^\s]+$/.test(url) || url.length > 2000) return { error: "Cole o link de destino completo (ex.: https://seusite.com.br)" };
  // Não deixa apontar para o próprio redirecionador (vira um laço infinito)
  if (new URL(url).host === trackedUrlBase().split("/")[0]) return { error: "Esse link já é do Fuzil. Cole o site final, para onde o cliente deve ir." };
  return { name, url };
}

export async function createMyLinkAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await linksAuth();
  if (!auth) return { error: "Sua sessão expirou. Recarregue a página e entre de novo." };
  if (tooMany(`lk:new:${auth.lead.id}`, 30, 60 * 60_000)) return { error: "Muitos links criados em pouco tempo. Espere um pouco." };
  const data = readForm(form);
  if ("error" in data) return data;
  for (let i = 0; i < 5; i++) {
    try {
      const link = await prisma.externalLink.create({ data: { ...data, code: newCode(), leadId: auth.lead.id, creatorIp: auth.session.ip } });
      revalidatePath("/site/links");
      return { ok: `Link criado! O código é ${link.code}. Copie e cole na variável do botão.` };
    } catch {
      /* código repetido: tenta outro */
    }
  }
  return { error: "Não consegui gerar o código agora. Tente de novo." };
}

export async function updateMyLinkAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const auth = await linksAuth();
  if (!auth) return { error: "Sua sessão expirou. Recarregue a página e entre de novo." };
  const data = readForm(form);
  if ("error" in data) return data;
  const r = await prisma.externalLink.updateMany({ where: { id, leadId: auth.lead.id }, data });
  if (!r.count) return { error: "Link não encontrado" };
  revalidatePath("/site/links");
  return { ok: "Salvo! Quem clicar a partir de agora já vai para o destino novo." };
}

export async function deleteMyLinkAction(id: string): Promise<{ ok?: true; error?: string }> {
  const auth = await linksAuth();
  if (!auth) return { error: "Sua sessão expirou. Recarregue a página e entre de novo." };
  await prisma.externalLink.deleteMany({ where: { id, leadId: auth.lead.id } });
  revalidatePath("/site/links");
  return { ok: true };
}

// ---------------- Admin ----------------

/** Liga o login por WhatsApp: cria o funil (e os 2 templates padrão) no grupo escolhido, ou troca o grupo. */
export async function setupLinksLoginAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireSuperAdmin();
  const groupId = String(form.get("groupId") ?? "");
  const group = await prisma.bmGroup.findFirst({ where: { id: groupId, workspaceId: auth.workspace.id, system: null } });
  if (!group) return { error: "Escolha um grupo de BM." };
  // O funil do login desta conta (cada conta de administrador tem o seu)
  const existing = await prisma.funnel.findFirst({ where: { kind: "LINKS", workspaceId: auth.workspace.id } });
  if (existing) {
    await prisma.funnel.update({ where: { id: existing.id }, data: { groupId } });
    await prisma.templateBlueprint.updateMany({ where: { id: { in: [existing.codeBlueprintId, existing.loginBlueprintId].filter((x): x is string => Boolean(x)) } }, data: { groupId } });
    await prisma.campaign.updateMany({ where: { funnelId: existing.id }, data: { groupId } });
    revalidatePath("/admin");
    return { ok: `Pronto! Os códigos e avisos do gerador de links agora saem pelo grupo ${group.name}.` };
  }
  await createLinksFunnel(auth.workspace.id, groupId);
  revalidatePath("/admin");
  return { ok: `Login por WhatsApp ligado no grupo ${group.name}! Os 2 templates (código e aviso de acesso) foram enviados para a Meta aprovar nas BMs do grupo. Quando aprovarem, o site já funciona.` };
}

/** Admin: apaga qualquer link (ex.: alguém usando para golpe). */
export async function adminDeleteLinkAction(id: string) {
  await requireSuperAdmin();
  await prisma.externalLink.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/admin");
  return { ok: "Link apagado. Quem clicar nele vai ver \"link não encontrado\"." };
}
