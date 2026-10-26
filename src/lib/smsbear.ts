// Registro automático de número na WABA com SMSBear ou SMS24h (só WhatsApp Brasil).
// O Fuzil compra o número, coloca na WABA, espera o código da Meta e confirma.
// Se o SMS não chegar em 2,5 minutos, cancela (o saldo volta) e tenta outro número, até dar certo ou acabar as tentativas.
import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import { env } from "./env";
import { meta } from "./meta";
import { friendlyError, metaDetail } from "./meta-errors";
import { PHONE_DISCARDED, syncWaba, wabaToken } from "./sync";
import type { Prisma } from "@prisma/client";
import { createAlert } from "./alerts";
import { formatPhone } from "./phone";
import { codeFromSms, providerOf, providerToken } from "./sms-providers";

export { codeFromSms } from "./sms-providers";

export const SMS_WAIT_MS = Number(process.env.SMSBEAR_WAIT_MS) || 150_000; // 2,5 minutos esperando o SMS (o teste local encurta)
const CANCEL_GIVE_UP_MS = 6 * 3600_000; // cancelamento que não vai em 6h: desiste e avisa para pedir no site
const CANCEL_EVERY_MS = 30_000; // o SMSBear pede alguns minutos após a compra: tenta a cada 30s

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
  const prov = providerOf(job.provider);
  const token = await providerToken(job.workspaceId, job.provider);
  if (!token) return finish(job.id, "FAILED", `O ${prov.label} foi desconectado desta conta.`, "bad", `${prov.label} desconectado`);
  const metaToken = wabaToken(job.waba);

  if (job.step === "BUY") {
    if (job.attempt >= job.maxAttempts) {
      await alertEnd(job, false, `Nenhum número deu certo em ${job.maxAttempts} tentativas.`);
      return finish(job.id, "FAILED", `Parou: ${job.maxAttempts} tentativas sem receber o SMS.`, "bad", "Tentativas esgotadas");
    }
    const attempt = job.attempt + 1;
    let order: { id: string; number: string; costCents: number };
    try {
      order = await prov.buy(token, `fuzil-${job.id}-${attempt}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Sem saldo, mas com número esperando cancelar: o saldo volta quando o SMSBear deixar cancelar. Espera e continua
      const waitingRefund = ((job.toCancel as Cancel[]) ?? []).length > 0;
      if (/saldo|insufficient|balance/i.test(msg) && waitingRefund) {
        const lastText = ((job.log as LogLine[]) ?? []).at(-1)?.text ?? "";
        if (!lastText.startsWith("Sem saldo agora")) await push(job.id, `Sem saldo agora: esperando o ${prov.label} devolver o dos números cancelados para continuar...`, "info");
        return;
      }
      // Sem saldo de verdade ou sem estoque: não adianta insistir
      return finish(job.id, "FAILED", `Não deu para comprar o número: ${msg}`, "bad", msg);
    }
    await push(job.id, `Tentativa ${attempt}: número ${pretty(order.number)} comprado no ${prov.label}${order.costCents ? ` (R$ ${(order.costCents / 100).toFixed(2).replace(".", ",")})` : ""}.`, "info", {
      attempt,
      orderId: order.id,
      number: order.number,
      spentCents: job.spentCents + order.costCents,
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
    const order = await prov.order(token, job.orderId).catch(() => null);
    const code = order ? codeFromSms(order.sms) : null;
    if (code) {
      await push(job.id, `Código ${code} chegou. Confirmando na Meta...`, "info");
      try {
        await meta.verifyCode(metaToken, job.phoneNumberId, code);
        await meta.registerPhone(metaToken, job.phoneNumberId, env.metaRegisterPin());
        await syncWaba(job.wabaId).catch(() => undefined);
        await prov.finish?.(token, job.orderId).catch(() => undefined);
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
  if (job.orderId) await dropAttempt(job, `Parado por você. Cancelando o número atual no ${providerOf(job.provider).label}.`);
  await finish(job.id, "STOPPED", "Registro automático parado.", "info");
}

/** Cancela no SMSBear os números que não receberam SMS (o saldo volta). O SMSBear pede alguns minutos depois da compra. */
async function cancelPending() {
  const jobs = await prisma.smsJob.findMany({ where: { NOT: { toCancel: { equals: [] } } }, select: { id: true, workspaceId: true, toCancel: true, provider: true } });
  for (const job of jobs) {
    const prov = providerOf(job.provider);
    const name = prov.label;
    const token = await providerToken(job.workspaceId, job.provider);
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
        await prov.cancel(token, c.id);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
      if (!error) {
        await push(job.id, `${label} cancelado no ${name}: o saldo volta.`, "ok");
        continue;
      }
      // Só sai da fila se foi devolvido de verdade ou se tem SMS (qualquer outra situação = ainda aguardando: tenta de novo)
      const o = await prov.order(token, c.id).catch(() => null);
      if (o?.status === "cancelled") {
        await push(job.id, `${label} devolvido pelo ${name}: o saldo voltou.`, "ok");
        continue;
      }
      if (o?.status === "received") {
        await push(job.id, `${label} recebeu SMS no ${name} (não dá para cancelar).`, "info");
        continue;
      }
      if (Date.now() - new Date(c.since).getTime() > CANCEL_GIVE_UP_MS) {
        await push(job.id, `O ${name} não deixou cancelar ${label} (${error}). Cancele pelo site do ${name} para o saldo voltar.`, "bad");
        continue;
      }
      // Primeira recusa vai para a linha do tempo; as seguintes só atualizam o motivo
      if (!c.error) await push(job.id, `O ${name} ainda não deixou cancelar ${label} (${error}). O Fuzil tenta de novo a cada 30s.`, "info");
      left.push({ ...c, last: new Date().toISOString(), error });
    }
    await prisma.smsJob.update({ where: { id: job.id }, data: { toCancel: left } });
  }
}

async function alertEnd(job: { workspaceId: string; provider: string; waba: { business: { name: string } } }, ok: boolean, text: string) {
  await createAlert({
    workspaceId: job.workspaceId,
    type: "NUMBER_STATUS",
    severity: ok ? "INFO" : "WARNING",
    title: ok ? `Número novo registrado pelo ${providerOf(job.provider).label} (${job.waba.business.name})` : `Registro automático parou (${job.waba.business.name})`,
    message: text,
  }).catch(() => undefined);
}

export const newIdempotency = () => randomUUID();

/** Modo manual: atualiza os números aguardando SMS (no máximo a cada 4s cada) e devolve os do painel. */
export async function manualOrders(workspaceId: string) {
  const list = await prisma.smsOrder.findMany({ where: { workspaceId, hidden: false }, orderBy: { createdAt: "desc" }, take: 8 });
  const tokens = new Map<string, string | null>();
  await Promise.all(
    list
      .filter((o) => o.status === "PENDING" && (!o.checkedAt || Date.now() - o.checkedAt.getTime() > 4000))
      .map(async (o) => {
        if (!tokens.has(o.provider)) tokens.set(o.provider, await providerToken(workspaceId, o.provider));
        const token = tokens.get(o.provider);
        if (!token) return;
        const r = await providerOf(o.provider).order(token, o.orderId).catch(() => null);
        if (!r) return;
        const code = codeFromSms(r.sms);
        const status = code ? "RECEIVED" : r.status === "cancelled" ? "CANCELLED" : "PENDING";
        Object.assign(o, { status, code, smsText: r.sms?.[0]?.text ?? null, checkedAt: new Date() });
        await prisma.smsOrder.update({ where: { id: o.id }, data: { status, code, smsText: o.smsText, checkedAt: o.checkedAt } });
      }),
  );
  return list.map((o) => ({ id: o.id, provider: o.provider, number: o.number, costCents: o.costCents, status: o.status, code: o.code, smsText: o.smsText, createdAt: o.createdAt }));
}
