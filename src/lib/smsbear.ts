// SMSBear: números BR para WhatsApp. O Fuzil compra o número, coloca na WABA, espera o código da Meta e confirma.
// Se o SMS não chegar em 2,5 minutos, cancela (o saldo volta) e tenta outro número, até dar certo ou acabar as tentativas.
import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import { decrypt } from "./crypto";
import { env } from "./env";
import { meta } from "./meta";
import { friendlyError, metaDetail } from "./meta-errors";
import { PHONE_DISCARDED, syncWaba, wabaToken } from "./sync";
import type { Prisma } from "@prisma/client";
import { createAlert } from "./alerts";
import { formatPhone } from "./phone";

export const SMS_WAIT_MS = Number(process.env.SMSBEAR_WAIT_MS) || 150_000; // 2,5 minutos esperando o SMS (o teste local encurta)
const CANCEL_GIVE_UP_MS = 6 * 3600_000; // cancelamento que não vai em 6h: desiste e avisa para pedir no site
const CANCEL_EVERY_MS = 30_000; // o SMSBear pede alguns minutos após a compra: tenta a cada 30s
const SERVICE = "whatsapp";
const COUNTRY = "brazil";

const smsbearUrl = () => (process.env.SMSBEAR_API_URL || "https://api.smsbear.net").replace(/\/$/, "");

export class SmsBearError extends Error {}

async function bear<T>(token: string, method: "GET" | "POST", path: string, body?: unknown, idempotency?: string): Promise<T> {
  const res = await fetch(`${smsbearUrl()}${path}`, {
    method,
    headers: {
      "x-api-token": token,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(idempotency ? { "Idempotency-Key": idempotency } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { success?: boolean; message?: string; error?: string };
  if (!res.ok || json.success === false) {
    const msg = json.message || json.error || `erro ${res.status}`;
    throw new SmsBearError(res.status === 401 || res.status === 403 ? "Token do SMSBear inválido" : `SMSBear: ${msg}`);
  }
  return json;
}

export type BearOrder = { id: string; status: string; number?: string; sms?: Array<{ code?: string; text?: string }>; cost?: number };

export const smsbear = {
  balance: (token: string) => bear<{ balance: number }>(token, "GET", "/v1/getBalance").then((r) => Number(r.balance) || 0),
  /** Preço (em centavos) e estoque do WhatsApp Brasil. */
  price: (token: string) =>
    bear<{ prices: Array<{ service: string; country: string; cost: number; stock: number }> }>(token, "GET", `/v1/sms/prices?service=${SERVICE}&country=${COUNTRY}`).then(
      (r) => r.prices?.find((p) => p.service === SERVICE && p.country === COUNTRY) ?? null,
    ),
  buy: (token: string, idempotency: string) =>
    bear<{ id: string; number: string; status: string; cost: number }>(token, "POST", "/v1/sms/buy", { service: SERVICE, country: COUNTRY }, idempotency),
  order: (token: string, id: string) => bear<{ order: BearOrder }>(token, "GET", `/v1/sms/orders/${encodeURIComponent(id)}`).then((r) => r.order),
  cancel: (token: string, id: string) => bear<{ success: boolean }>(token, "GET", `/v1/sms/cancel/${encodeURIComponent(id)}`),
};

/** Código de 6 números do SMS do WhatsApp ("123-456", "123456"...). */
export function codeFromSms(sms: BearOrder["sms"]): string | null {
  for (const s of sms ?? []) {
    const fromCode = String(s.code ?? "").replace(/\D/g, "");
    if (fromCode.length === 6) return fromCode;
    const m = String(s.text ?? "").match(/(\d{3})[-\s]?(\d{3})/);
    if (m) return m[1] + m[2];
    if (fromCode.length >= 4) return fromCode;
  }
  return null;
}

export async function workspaceBearToken(workspaceId: string) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { smsbearTokenEnc: true } });
  return ws?.smsbearTokenEnc ? decrypt(ws.smsbearTokenEnc) : null;
}

type LogLine = { at: string; text: string; tone?: "ok" | "bad" | "info" };
type Cancel = { id: string; since: string; number?: string; last?: string; error?: string };

async function push(jobId: string, text: string, tone: LogLine["tone"] = "info", data: Record<string, unknown> = {}) {
  const job = await prisma.smsJob.findUniqueOrThrow({ where: { id: jobId }, select: { log: true } });
  const log = [...((job.log as LogLine[]) ?? []), { at: new Date().toISOString(), text, tone }].slice(-60);
  await prisma.smsJob.update({ where: { id: jobId }, data: { log, ...data } });
}

const local = (n: string) => n.replace(/\D/g, "").replace(/^55/, "");
const pretty = (n: string) => formatPhone(n.replace(/\D/g, ""));

/** Larga o número da tentativa: guarda o pedido para cancelar e esconde o número que não foi confirmado. */
async function dropAttempt(job: { id: string; wabaId: string; orderId: string | null; number?: string | null; phoneNumberId: string | null; toCancel: unknown }, why: string) {
  const toCancel = [...((job.toCancel as Cancel[]) ?? [])];
  if (job.orderId) toCancel.push({ id: job.orderId, since: new Date().toISOString(), ...(job.number ? { number: job.number } : {}) });
  if (job.phoneNumberId)
    await prisma.phoneNumber.updateMany({ where: { phoneNumberId: job.phoneNumberId, status: { not: "CONNECTED" } }, data: { invalidReason: PHONE_DISCARDED, enabled: false } });
  await push(job.id, why, "bad", { toCancel, orderId: null, number: null, phoneNumberId: null, step: "BUY", stepAt: new Date() });
}

async function finish(jobId: string, status: "DONE" | "FAILED" | "STOPPED", text: string, tone: LogLine["tone"], error?: string) {
  await push(jobId, text, tone, { status, finishedAt: new Date(), ...(error ? { error } : {}) });
}

/** Um passo de cada tarefa em andamento. Roda no worker a cada poucos segundos. */
export async function smsJobsTick() {
  const jobs = await prisma.smsJob.findMany({ where: { status: "RUNNING" }, include: { waba: { include: { business: true } } } });
  for (const job of jobs) await stepJob(job).catch((e) => console.error("[smsbear] tarefa", job.id, e));
  await cancelPending();
}

type JobWithWaba = Prisma.SmsJobGetPayload<{ include: { waba: { include: { business: true } } } }>;

async function stepJob(job: JobWithWaba) {
  const token = await workspaceBearToken(job.workspaceId);
  if (!token) return finish(job.id, "FAILED", "O SMSBear foi desconectado desta conta.", "bad", "SMSBear desconectado");
  const metaToken = wabaToken(job.waba);

  if (job.step === "BUY") {
    if (job.attempt >= job.maxAttempts) {
      await alertEnd(job, false, `Nenhum número deu certo em ${job.maxAttempts} tentativas.`);
      return finish(job.id, "FAILED", `Parou: ${job.maxAttempts} tentativas sem receber o SMS.`, "bad", "Tentativas esgotadas");
    }
    const attempt = job.attempt + 1;
    let order: { id: string; number: string; cost: number };
    try {
      order = await smsbear.buy(token, `fuzil-${job.id}-${attempt}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Sem saldo, mas com número esperando cancelar: o saldo volta quando o SMSBear deixar cancelar. Espera e continua
      const waitingRefund = ((job.toCancel as Cancel[]) ?? []).length > 0;
      if (/saldo|insufficient|balance/i.test(msg) && waitingRefund) {
        const lastText = ((job.log as LogLine[]) ?? []).at(-1)?.text ?? "";
        if (!lastText.startsWith("Sem saldo agora")) await push(job.id, "Sem saldo agora: esperando o SMSBear devolver o dos números cancelados para continuar...", "info");
        return;
      }
      // Sem saldo de verdade ou sem estoque: não adianta insistir
      return finish(job.id, "FAILED", `Não deu para comprar o número: ${msg}`, "bad", msg);
    }
    await push(job.id, `Tentativa ${attempt}: número ${pretty(order.number)} comprado (R$ ${(Number(order.cost) / 100).toFixed(2).replace(".", ",")}).`, "info", {
      attempt,
      orderId: order.id,
      number: order.number,
      spentCents: job.spentCents + (Number(order.cost) || 0),
      stepAt: new Date(),
    });
    // Duas etapas na Meta: colocar o número na WABA e pedir o código. O log diz em qual delas a Meta recusou
    let stage = `colocar o número na WABA ${job.waba.name} (nome "${job.verifiedName}")`;
    try {
      const { id } = await meta.addPhone(metaToken, job.waba.wabaId, "55", local(order.number), job.verifiedName);
      await prisma.smsJob.update({ where: { id: job.id }, data: { phoneNumberId: id } });
      stage = "pedir o código por SMS (o número já entrou na WABA)";
      await meta.requestCode(metaToken, id, "SMS");
      await syncWaba(job.wabaId).catch(() => undefined);
      await push(job.id, "Número colocado na WABA. Esperando o código da Meta chegar por SMS (até 2,5 min)...", "info", { step: "WAIT", stepAt: new Date() });
    } catch (e) {
      // Número recusado pela Meta (normalmente já banido no WhatsApp): cancela e tenta outro, até o máximo de tentativas
      console.error("[smsbear] Meta recusou", stage, e);
      const fresh = await prisma.smsJob.findUniqueOrThrow({ where: { id: job.id } });
      await dropAttempt(fresh, `A Meta recusou ao ${stage}: ${metaDetail(e)}. Cancelando e pegando outro.`);
    }
    return;
  }

  if (job.step === "WAIT" && job.orderId && job.phoneNumberId) {
    const order = await smsbear.order(token, job.orderId).catch(() => null);
    const code = order ? codeFromSms(order.sms) : null;
    if (code) {
      await push(job.id, `Código ${code} chegou. Confirmando na Meta...`, "info");
      try {
        await meta.verifyCode(metaToken, job.phoneNumberId, code);
        await meta.registerPhone(metaToken, job.phoneNumberId, env.metaRegisterPin());
        await syncWaba(job.wabaId).catch(() => undefined);
        await alertEnd(job, true, `${pretty(job.number ?? "")} registrado na WABA ${job.waba.business.name}.`);
        return finish(job.id, "DONE", `Pronto! ${pretty(job.number ?? "")} confirmado e registrado. Já entra no rodízio.`, "ok");
      } catch (e) {
        // Código recusado: o número já foi pago (o SMS chegou), então só troca de número
        await dropAttempt(job, `A Meta recusou o código: ${friendlyError(e)}. Tentando outro número.`);
        return;
      }
    }
    if (Date.now() - job.stepAt.getTime() > SMS_WAIT_MS) await dropAttempt(job, "O SMS não chegou em 2,5 minutos. Cancelando esse número e comprando outro.");
  }
}

/** Botão Parar: larga o número da tentativa atual (cancela no SMSBear) e encerra. */
export async function stopSmsJob(jobId: string) {
  const job = await prisma.smsJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "RUNNING") return;
  if (job.orderId) await dropAttempt(job, "Parado por você. Cancelando o número atual no SMSBear.");
  await finish(job.id, "STOPPED", "Registro automático parado.", "info");
}

/** Cancela no SMSBear os números que não receberam SMS (o saldo volta). O SMSBear pede alguns minutos depois da compra. */
async function cancelPending() {
  const jobs = await prisma.smsJob.findMany({ where: { NOT: { toCancel: { equals: [] } } }, select: { id: true, workspaceId: true, toCancel: true } });
  for (const job of jobs) {
    const token = await workspaceBearToken(job.workspaceId);
    if (!token) continue;
    const left: Cancel[] = [];
    for (const c of (job.toCancel as Cancel[]) ?? []) {
      if (c.last && Date.now() - new Date(c.last).getTime() < CANCEL_EVERY_MS) {
        left.push(c);
        continue;
      }
      const label = c.number ? pretty(c.number) : c.id;
      let error: string | null = null;
      try {
        await smsbear.cancel(token, c.id);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
      if (!error) {
        await push(job.id, `${label} cancelado no SMSBear: o saldo volta.`, "ok");
        continue;
      }
      // Só sai da fila se foi devolvido de verdade ou se tem SMS (qualquer outra situação = ainda aguardando: tenta de novo)
      const o = await smsbear.order(token, c.id).catch(() => null);
      const st = String(o?.status ?? "").toLowerCase();
      if (o && /refund|cancel|devolv|reembols/.test(st)) {
        await push(job.id, `${label} devolvido pelo SMSBear: o saldo voltou.`, "ok");
        continue;
      }
      if (o && (o.sms?.length ?? 0) > 0) {
        await push(job.id, `${label} recebeu SMS no SMSBear (não dá para cancelar).`, "info");
        continue;
      }
      if (Date.now() - new Date(c.since).getTime() > CANCEL_GIVE_UP_MS) {
        await push(job.id, `O SMSBear não deixou cancelar ${label} (${error}). Cancele pelo site do SMSBear para o saldo voltar.`, "bad");
        continue;
      }
      // Primeira recusa vai para a linha do tempo; as seguintes só atualizam o motivo
      if (!c.error) await push(job.id, `O SMSBear ainda não deixou cancelar ${label} (${error}). O Fuzil tenta de novo a cada 30s.`, "info");
      left.push({ ...c, last: new Date().toISOString(), error });
    }
    await prisma.smsJob.update({ where: { id: job.id }, data: { toCancel: left } });
  }
}

async function alertEnd(job: { workspaceId: string; waba: { business: { name: string } } }, ok: boolean, text: string) {
  await createAlert({
    workspaceId: job.workspaceId,
    type: "NUMBER_STATUS",
    severity: ok ? "INFO" : "WARNING",
    title: ok ? `Número novo registrado pelo SMSBear (${job.waba.business.name})` : `Registro automático parou (${job.waba.business.name})`,
    message: text,
  }).catch(() => undefined);
}

export const newIdempotency = () => randomUUID();

/** Modo manual: atualiza os números aguardando SMS (no máximo a cada 4s cada) e devolve os do painel. */
export async function manualOrders(workspaceId: string, token: string) {
  const list = await prisma.smsOrder.findMany({ where: { workspaceId, hidden: false }, orderBy: { createdAt: "desc" }, take: 6 });
  await Promise.all(
    list
      .filter((o) => o.status === "PENDING" && (!o.checkedAt || Date.now() - o.checkedAt.getTime() > 4000))
      .map(async (o) => {
        const r = await smsbear.order(token, o.orderId).catch(() => null);
        if (!r) return;
        const code = codeFromSms(r.sms);
        const st = String(r.status ?? "").toLowerCase();
        const status = code ? "RECEIVED" : /refund|cancel|devolv|reembols/.test(st) ? "CANCELLED" : "PENDING";
        Object.assign(o, { status, code, smsText: r.sms?.[0]?.text ?? null, checkedAt: new Date() });
        await prisma.smsOrder.update({ where: { id: o.id }, data: { status, code, smsText: o.smsText, checkedAt: o.checkedAt } });
      }),
  );
  return list.map((o) => ({ id: o.id, number: o.number, costCents: o.costCents, status: o.status, code: o.code, smsText: o.smsText, createdAt: o.createdAt }));
}
