"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { stopSmsJob } from "@/lib/smsbear";
import { providerOf, providerToken } from "@/lib/sms-providers";
import { SMS_PROVIDER_INFO, cancelOpensIn, isSmsProvider, type SmsProviderKey } from "@/lib/smsbear-shared";
import type { FormState } from "./auth";

// Serviços de número (SMSBear e SMS24h, só WhatsApp Brasil): conectar, registro automático e modo manual

const keyField = (p: SmsProviderKey) => (p === "sms24h" ? "sms24hKeyEnc" : "smsbearTokenEnc");
const pick = (v: unknown): SmsProviderKey => (isSmsProvider(v) ? v : "smsbear");

/** Conecta a conta do serviço nesta conta do Fuzil (a chave é conferida na hora, pelo saldo). */
export async function connectSmsProviderAction(provider: SmsProviderKey, _: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const p = pick(provider);
  const token = String(form.get("token") ?? "").trim();
  if (token.length < 10) return { error: `Cole a ${SMS_PROVIDER_INFO[p].keyLabel.toLowerCase()}.` };
  try {
    await providerOf(p).balance(token);
  } catch (e) {
    return { error: e instanceof Error ? e.message : `Não deu para conferir a chave no ${SMS_PROVIDER_INFO[p].label}` };
  }
  await prisma.workspace.update({ where: { id: auth.workspace.id }, data: { [keyField(p)]: encrypt(token) } });
  revalidatePath("/conexoes");
  return { ok: `${SMS_PROVIDER_INFO[p].label} conectado!` };
}

export async function disconnectSmsProviderAction(provider: SmsProviderKey): Promise<FormState> {
  const auth = await requireAuth();
  const p = pick(provider);
  const running = await prisma.smsJob.count({ where: { workspaceId: auth.workspace.id, provider: p, status: "RUNNING" } });
  if (running) return { error: "Tem registro automático em andamento. Pare ele antes de desconectar." };
  await prisma.workspace.update({ where: { id: auth.workspace.id }, data: { [keyField(p)]: null } });
  revalidatePath("/conexoes");
  return { ok: `${SMS_PROVIDER_INFO[p].label} desconectado.` };
}

/** Começa o registro automático: compra, coloca na WABA, espera o SMS, confirma (e troca de número se não chegar). */
export async function startSmsJobAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const p = pick(form.get("provider"));
  if (!(await providerToken(auth.workspace.id, p))) return { error: `Conecte o ${SMS_PROVIDER_INFO[p].label} primeiro.` };
  const waba = await prisma.whatsAppAccount.findFirst({ where: { id: String(form.get("wabaId") ?? ""), workspaceId: auth.workspace.id }, include: { business: true } });
  if (!waba) return { error: "Escolha a WABA." };
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  if (name.length < 3) return { error: "Escreva o nome de exibição (o nome que aparece no WhatsApp)." };
  const maxAttempts = Math.min(20, Math.max(1, Number(form.get("maxAttempts")) || 10));
  // Uma de cada vez por WABA (dois números ao mesmo tempo confundem o código)
  if (await prisma.smsJob.count({ where: { wabaId: waba.id, status: "RUNNING" } })) return { error: "Já tem um registro automático rodando nessa WABA." };
  await prisma.smsJob.create({
    data: {
      workspaceId: auth.workspace.id,
      wabaId: waba.id,
      provider: p,
      verifiedName: name,
      maxAttempts,
      log: [{ at: new Date().toISOString(), text: `Começou pelo ${SMS_PROVIDER_INFO[p].label}: registrar um número na ${waba.business.name} (até ${maxAttempts} tentativas).`, tone: "info" }],
    },
  });
  return { ok: "Registro automático começou! Acompanhe aqui no painel." };
}

export async function stopSmsJobAction(jobId: string): Promise<FormState> {
  const auth = await requireAuth();
  const job = await prisma.smsJob.findFirst({ where: { id: jobId, workspaceId: auth.workspace.id } });
  if (!job) return { error: "Tarefa não encontrada" };
  await stopSmsJob(job.id);
  return { ok: "Parado." };
}

const noPendingCancel = { toCancel: { equals: [] } } as const;

/** Apaga um registro que já terminou (os que ainda esperam cancelar número ficam, para o saldo voltar). */
export async function deleteSmsJobAction(jobId: string): Promise<FormState> {
  const auth = await requireAuth();
  const job = await prisma.smsJob.findFirst({ where: { id: jobId, workspaceId: auth.workspace.id } });
  if (!job) return { ok: "Apagado." };
  if (job.status === "RUNNING") return { error: "Pare o registro antes de apagar." };
  const r = await prisma.smsJob.deleteMany({ where: { id: job.id, ...noPendingCancel } });
  return r.count ? { ok: "Apagado." } : { error: "Ainda tem número esperando cancelar. Dá para apagar assim que o saldo voltar." };
}

/** Limpa o histórico do serviço: apaga os registros que já terminaram (menos os que ainda esperam cancelar número). */
export async function clearSmsJobsAction(provider: SmsProviderKey): Promise<FormState> {
  const auth = await requireAuth();
  const where = { workspaceId: auth.workspace.id, provider: pick(provider), status: { not: "RUNNING" } };
  const r = await prisma.smsJob.deleteMany({ where: { ...where, ...noPendingCancel } });
  const kept = await prisma.smsJob.count({ where });
  return { ok: `${r.count} registro(s) apagado(s).${kept ? ` ${kept} ficou(aram) porque ainda tem número esperando cancelar.` : ""}` };
}

// ---------------------------------------------------------------------------
// Modo manual: compra o número, o código aparece no painel, você coloca na WABA pelo "Adicionar número"
// ---------------------------------------------------------------------------

export async function buyManualAction(provider: SmsProviderKey): Promise<FormState> {
  const auth = await requireAuth();
  const p = pick(provider);
  const token = await providerToken(auth.workspace.id, p);
  if (!token) return { error: `Conecte o ${SMS_PROVIDER_INFO[p].label} primeiro.` };
  try {
    const o = await providerOf(p).buy(token, randomUUID());
    await prisma.smsOrder.create({ data: { workspaceId: auth.workspace.id, provider: p, orderId: o.id, number: o.number, costCents: o.costCents } });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não deu para comprar o número" };
  }
  return { ok: "Número comprado! Copie e coloque na WABA em \"Adicionar número nesta WABA\". O código aparece aqui quando chegar." };
}

/** Cancela no serviço (o saldo volta). Só depois de uns minutos da compra. */
export async function cancelManualAction(id: string): Promise<FormState> {
  const auth = await requireAuth();
  const o = await prisma.smsOrder.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!o) return { error: "Número não encontrado" };
  if (o.status !== "PENDING") return { error: o.status === "RECEIVED" ? "Esse número já recebeu SMS: não dá para cancelar." : "Já foi cancelado." };
  const wait = cancelOpensIn(o.createdAt, o.provider);
  if (wait > 0) return { error: `O ${providerOf(o.provider).label} libera o cancelamento em ${Math.ceil(wait / 1000)}s.` };
  const token = await providerToken(auth.workspace.id, o.provider);
  if (!token) return { error: `Conecte o ${providerOf(o.provider).label} primeiro.` };
  try {
    await providerOf(o.provider).cancel(token, o.orderId);
  } catch (e) {
    return { error: `Ainda não deu para cancelar (${e instanceof Error ? e.message : "erro"}). Tente de novo em instantes.` };
  }
  await prisma.smsOrder.update({ where: { id: o.id }, data: { status: "CANCELLED" } });
  return { ok: "Cancelado: o saldo volta." };
}

/** Trocar número: cancela este e já compra outro no mesmo serviço. */
export async function swapManualAction(id: string): Promise<FormState> {
  const auth = await requireAuth();
  const o = await prisma.smsOrder.findFirst({ where: { id, workspaceId: auth.workspace.id }, select: { provider: true } });
  const r = await cancelManualAction(id);
  if (r?.error) return r;
  return buyManualAction(pick(o?.provider));
}

/** Tira do painel (o que já foi cancelado ou recebeu SMS). */
export async function hideManualAction(id: string): Promise<FormState> {
  const auth = await requireAuth();
  await prisma.smsOrder.updateMany({ where: { id, workspaceId: auth.workspace.id, status: { not: "PENDING" } }, data: { hidden: true } });
  return { ok: "Removido." };
}
