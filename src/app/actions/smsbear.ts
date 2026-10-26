"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { smsbear, stopSmsJob } from "@/lib/smsbear";
import type { FormState } from "./auth";

/** Conecta a conta do SMSBear desta conta do Fuzil (pelo token da API, conferido na hora). */
export async function connectSmsBearAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const token = String(form.get("token") ?? "").trim();
  if (token.length < 10) return { error: "Cole o token da API do SMSBear." };
  try {
    await smsbear.balance(token);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não deu para conferir o token no SMSBear" };
  }
  await prisma.workspace.update({ where: { id: auth.workspace.id }, data: { smsbearTokenEnc: encrypt(token) } });
  revalidatePath("/conexoes");
  return { ok: "SMSBear conectado!" };
}

export async function disconnectSmsBearAction(): Promise<FormState> {
  const auth = await requireAuth();
  const running = await prisma.smsJob.count({ where: { workspaceId: auth.workspace.id, status: "RUNNING" } });
  if (running) return { error: "Tem registro automático em andamento. Pare ele antes de desconectar." };
  await prisma.workspace.update({ where: { id: auth.workspace.id }, data: { smsbearTokenEnc: null } });
  revalidatePath("/conexoes");
  return { ok: "SMSBear desconectado." };
}

/** Começa o registro automático: compra, coloca na WABA, espera o SMS, confirma (e troca de número se não chegar). */
export async function startSmsJobAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const ws = await prisma.workspace.findUnique({ where: { id: auth.workspace.id }, select: { smsbearTokenEnc: true } });
  if (!ws?.smsbearTokenEnc) return { error: "Conecte o SMSBear primeiro." };
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
      verifiedName: name,
      maxAttempts,
      log: [{ at: new Date().toISOString(), text: `Começou: registrar um número na ${waba.business.name} (até ${maxAttempts} tentativas).`, tone: "info" }],
    },
  });
  return { ok: "Registro automático começou! Acompanhe aqui no painel." };
}

const noPendingCancel = { toCancel: { equals: [] } } as const;

/** Apaga um registro que já terminou (os que ainda esperam cancelar número no SMSBear ficam, para o saldo voltar). */
export async function deleteSmsJobAction(jobId: string): Promise<FormState> {
  const auth = await requireAuth();
  const job = await prisma.smsJob.findFirst({ where: { id: jobId, workspaceId: auth.workspace.id } });
  if (!job) return { ok: "Apagado." };
  if (job.status === "RUNNING") return { error: "Pare o registro antes de apagar." };
  const r = await prisma.smsJob.deleteMany({ where: { id: job.id, ...noPendingCancel } });
  return r.count ? { ok: "Apagado." } : { error: "Ainda tem número esperando cancelar no SMSBear. Dá para apagar assim que o saldo voltar." };
}

/** Limpa o histórico: apaga todos os registros que já terminaram (menos os que ainda esperam cancelar número). */
export async function clearSmsJobsAction(): Promise<FormState> {
  const auth = await requireAuth();
  const r = await prisma.smsJob.deleteMany({ where: { workspaceId: auth.workspace.id, status: { not: "RUNNING" }, ...noPendingCancel } });
  const kept = await prisma.smsJob.count({ where: { workspaceId: auth.workspace.id, status: { not: "RUNNING" } } });
  return { ok: `${r.count} registro(s) apagado(s).${kept ? ` ${kept} ficou(aram) porque ainda tem número esperando cancelar no SMSBear.` : ""}` };
}

export async function stopSmsJobAction(jobId: string): Promise<FormState> {
  const auth = await requireAuth();
  const job = await prisma.smsJob.findFirst({ where: { id: jobId, workspaceId: auth.workspace.id } });
  if (!job) return { error: "Tarefa não encontrada" };
  await stopSmsJob(job.id);
  return { ok: "Parado." };
}

// ---------------------------------------------------------------------------
// Modo manual: compra o número, o código aparece no painel, você coloca na WABA pelo "Adicionar número"
// ---------------------------------------------------------------------------

async function bearTokenOf(workspaceId: string) {
  const { workspaceBearToken } = await import("@/lib/smsbear");
  return workspaceBearToken(workspaceId);
}

export async function buyManualAction(): Promise<FormState> {
  const auth = await requireAuth();
  const token = await bearTokenOf(auth.workspace.id);
  if (!token) return { error: "Conecte o SMSBear primeiro." };
  try {
    const { randomUUID } = await import("node:crypto");
    const o = await smsbear.buy(token, randomUUID());
    await prisma.smsOrder.create({ data: { workspaceId: auth.workspace.id, orderId: o.id, number: o.number, costCents: Number(o.cost) || 0 } });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não deu para comprar o número" };
  }
  return { ok: "Número comprado! Copie e coloque na WABA em \"Adicionar número nesta WABA\". O código aparece aqui quando chegar." };
}

/** Cancela no SMSBear (o saldo volta). O SMSBear só deixa alguns minutos depois da compra. */
export async function cancelManualAction(id: string): Promise<FormState> {
  const auth = await requireAuth();
  const o = await prisma.smsOrder.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!o) return { error: "Número não encontrado" };
  if (o.status !== "PENDING") return { error: o.status === "RECEIVED" ? "Esse número já recebeu SMS: não dá para cancelar." : "Já foi cancelado." };
  const { cancelOpensIn } = await import("@/lib/smsbear-shared");
  const wait = cancelOpensIn(o.createdAt);
  if (wait > 0) return { error: `O SMSBear libera o cancelamento em ${Math.ceil(wait / 1000)}s.` };
  const token = await bearTokenOf(auth.workspace.id);
  if (!token) return { error: "Conecte o SMSBear primeiro." };
  try {
    await smsbear.cancel(token, o.orderId);
  } catch (e) {
    return { error: `O SMSBear ainda não deixou cancelar (${e instanceof Error ? e.message : "erro"}). Ele libera uns 4 minutos depois da compra.` };
  }
  await prisma.smsOrder.update({ where: { id: o.id }, data: { status: "CANCELLED" } });
  return { ok: "Cancelado: o saldo volta." };
}

/** Trocar número: cancela este e já compra outro. */
export async function swapManualAction(id: string): Promise<FormState> {
  const r = await cancelManualAction(id);
  if (r?.error) return r;
  return buyManualAction();
}

/** Tira do painel (o que já foi cancelado ou recebeu SMS). */
export async function hideManualAction(id: string): Promise<FormState> {
  const auth = await requireAuth();
  await prisma.smsOrder.updateMany({ where: { id, workspaceId: auth.workspace.id, status: { not: "PENDING" } }, data: { hidden: true } });
  return { ok: "Removido." };
}
