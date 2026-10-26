// Compra de créditos pelo Pix: 1 crédito = 1 disparo, preço configurável (padrão R$ 0,01). Pagou, o saldo entra sozinho, uma vez só.
import { prisma } from "./db";
import { env } from "./env";
import { randomToken } from "./crypto";
import { createAlert } from "./alerts";
import { platformOwnerId } from "./onboarding";
import { mpCreatePix, mpGetPayment, paidEnough, type MpPayment } from "./mercadopago";
import { recordCompanyIncome } from "./finance-auto";

/** Recarga mínima: R$ 60,00 (a quantidade mínima de créditos sai do preço do crédito). */
export const MIN_AMOUNT_CENTS = 6_000;
export const MAX_CREDITS = 5_000_000;
/** Quanto tempo o Pix da recarga vale. */
export const CREDIT_PIX_MINUTES = 30;
const BASE_PACKAGES = [6_000, 10_000, 25_000, 50_000, 100_000];

/** Menor quantidade de créditos que dá a recarga mínima no preço atual. */
export function minCredits(price = env.creditPrice()): number {
  return Math.ceil(MIN_AMOUNT_CENTS / (price * 100) - 1e-9);
}

/** Pacotes prontos da tela de Saldo (todos acima do mínimo; o primeiro é o próprio mínimo). */
export function creditPackages(price = env.creditPrice()): number[] {
  const min = minCredits(price);
  return [...new Set([min, ...BASE_PACKAGES.filter((p) => p > min)])].slice(0, 5);
}

/** Valor da recarga em centavos (arredonda para o centavo mais próximo). */
export function creditsPriceCents(credits: number, price = env.creditPrice()): number {
  return Math.round(credits * price * 100);
}

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const n = (v: number) => v.toLocaleString("pt-BR");

export async function createCreditPurchase(input: { workspaceId: string; userId: string; email: string; name: string; credits: number }): Promise<{ token: string } | { error: string }> {
  const credits = Math.floor(input.credits);
  const amountCents = creditsPriceCents(credits);
  if (!Number.isFinite(credits) || credits < 1 || amountCents < MIN_AMOUNT_CENTS)
    return { error: `A recarga mínima é de ${brl(MIN_AMOUNT_CENTS)} (${n(minCredits())} créditos)` };
  if (credits > MAX_CREDITS) return { error: `O máximo por Pix é ${n(MAX_CREDITS)} créditos` };
  // Pix em aberto da mesma conta e valor: reaproveita (clique duplo não gera dois Pix)
  const open = await prisma.creditPurchase.findFirst({ where: { workspaceId: input.workspaceId, credits, status: "PENDING", mpPaymentId: { not: null }, expiresAt: { gt: new Date(Date.now() + 5 * 60_000) } } });
  if (open) return { token: open.token };
  const purchase = await prisma.creditPurchase.create({
    data: { token: randomToken(18), workspaceId: input.workspaceId, userId: input.userId, credits, amountCents, expiresAt: new Date(Date.now() + CREDIT_PIX_MINUTES * 60_000) },
  });
  try {
    const pix = await mpCreatePix({
      amountCents,
      description: `${n(credits)} créditos Fuzil Disparador`,
      reference: `cred:${purchase.id}`,
      email: input.email,
      firstName: input.name.split(" ")[0],
      expiresAt: purchase.expiresAt,
      idempotency: `cred-${purchase.id}`,
    });
    await prisma.creditPurchase.update({ where: { id: purchase.id }, data: { mpPaymentId: pix.id, pixCode: pix.code, pixQr: pix.qr } });
    return { token: purchase.token };
  } catch (e) {
    console.error("[créditos] gerar Pix", e);
    await prisma.creditPurchase.update({ where: { id: purchase.id }, data: { status: "CANCELLED", error: e instanceof Error ? e.message : String(e) } });
    return { error: "Não consegui gerar o Pix agora. Tente de novo em instantes." };
  }
}

/** Pagamento de uma recarga (já consultado no Mercado Pago). O saldo entra uma vez só, mesmo com vários avisos. */
export async function confirmCreditPayment(pay: MpPayment) {
  if (pay.status !== "approved" || !pay.external_reference?.startsWith("cred:")) return { status: pay.status };
  const purchase = await prisma.creditPurchase.findUnique({ where: { id: pay.external_reference.slice(5) } });
  if (!purchase || (purchase.mpPaymentId && purchase.mpPaymentId !== String(pay.id))) return { status: "ignored" };
  if (!paidEnough(pay, purchase.amountCents)) {
    await prisma.creditPurchase.update({ where: { id: purchase.id }, data: { error: `Pago valor menor: ${pay.transaction_amount}` } });
    return { status: "amount_mismatch" };
  }
  const credited = await prisma.$transaction(async (tx) => {
    // Só quem muda de "não pago" para "pago" credita (o Mercado Pago avisa mais de uma vez, e o worker também confere)
    const marked = await tx.creditPurchase.updateMany({
      where: { id: purchase.id, status: { in: ["PENDING", "EXPIRED", "CANCELLED"] } },
      data: { status: "PAID", paidAt: new Date(), mpPaymentId: String(pay.id), error: null },
    });
    if (!marked.count) return null;
    const ws = await tx.workspace.update({ where: { id: purchase.workspaceId }, data: { creditBalance: { increment: purchase.credits } }, select: { creditBalance: true, name: true } });
    await tx.creditTransaction.create({
      data: { workspaceId: purchase.workspaceId, type: "TOPUP", amount: purchase.credits, balanceAfter: ws.creditBalance, description: `Recarga Pix (${n(purchase.credits)} créditos)`, createdById: purchase.userId },
    });
    return ws;
  });
  if (!credited) return { status: "already" };
  await createAlert({
    workspaceId: purchase.workspaceId,
    type: "CREDITS_ADDED",
    severity: "INFO",
    title: `${n(purchase.credits)} créditos adicionados`,
    message: `Pix de ${brl(purchase.amountCents)} confirmado. Saldo agora: ${n(credited.creditBalance)} créditos.`,
  }).catch(() => undefined);
  const ownerId = await platformOwnerId();
  const ownerWs = ownerId ? await prisma.membership.findFirst({ where: { userId: ownerId, role: "OWNER" }, select: { workspaceId: true } }) : null;
  if (ownerWs && ownerWs.workspaceId !== purchase.workspaceId)
    await createAlert({ workspaceId: ownerWs.workspaceId, type: "SALE", severity: "INFO", title: `Recarga paga: ${brl(purchase.amountCents)}`, message: `${credited.name} comprou ${n(purchase.credits)} créditos.` }).catch(() => undefined);
  await recordCompanyIncome({ description: `Recarga de créditos — ${credited.name} (${n(purchase.credits)} créditos)`, amountCents: purchase.amountCents, category: "Disparo" }).catch((e) => console.error("[créditos] financeiro", e));
  return { status: "approved" };
}

/** Rodada do worker: confere Pix de recarga sem aviso e vence os que passaram do prazo. */
export async function creditTick() {
  const now = Date.now();
  const pending = await prisma.creditPurchase.findMany({ where: { status: "PENDING", mpPaymentId: { not: null } }, take: 50 });
  for (const p of pending) {
    try {
      const r = await confirmCreditPayment(await mpGetPayment(p.mpPaymentId!));
      if (r.status !== "approved" && r.status !== "already" && p.expiresAt.getTime() < now - 60_000)
        await prisma.creditPurchase.updateMany({ where: { id: p.id, status: "PENDING" }, data: { status: "EXPIRED" } });
    } catch {
      if (p.expiresAt.getTime() < now - 10 * 60_000) await prisma.creditPurchase.updateMany({ where: { id: p.id, status: "PENDING" }, data: { status: "EXPIRED" } });
    }
  }
}

/** Situação de uma recarga (só da conta logada). */
export async function purchaseStatus(token: string, workspaceId: string) {
  const p = await prisma.creditPurchase.findFirst({ where: { token, workspaceId } });
  if (!p) return null;
  return {
    status: p.status,
    credits: p.credits,
    amountCents: p.amountCents,
    pixCode: p.status === "PENDING" ? p.pixCode : null,
    pixQr: p.status === "PENDING" ? p.pixQr : null,
    expiresAt: p.expiresAt.toISOString(),
  };
}
export type PurchaseStatus = NonNullable<Awaited<ReturnType<typeof purchaseStatus>>>;
