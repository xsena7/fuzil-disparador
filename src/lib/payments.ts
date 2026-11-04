// Aviso de pagamento (Mercado Pago ou SyncPay): consulta o pagamento no gateway e manda para quem é (recarga de créditos ou pedido de BM).
import { prisma } from "./db";
import { getPixPayment } from "./pix";
import { confirmCreditPayment } from "./credit-purchase";
import { confirmMarketPayment } from "./market";
import { SP_PREFIX } from "./syncpay";

export async function handlePaymentNotice(paymentId: string) {
  const pay = await getPixPayment(paymentId);
  if (pay.reference?.startsWith("cred:")) return confirmCreditPayment(pay);
  if (!pay.reference && (await prisma.creditPurchase.count({ where: { mpPaymentId: pay.id } }))) return confirmCreditPayment(pay);
  return confirmMarketPayment(pay);
}

let lastSweep = 0;

/** Aviso da SyncPay: só confere os Pix da SyncPay que ainda esperam (o aviso não tem assinatura, então nunca libera nada sozinho). */
export async function handleSyncPayNotice(identifier: string | null) {
  // Ainda não pago (inclusive vencido nas últimas 24h: quem paga atrasado também recebe)
  const open = { status: { in: ["PENDING", "EXPIRED", "CANCELLED"] }, createdAt: { gt: new Date(Date.now() - 86400_000) } };
  const known = async (id: string) => (await prisma.creditPurchase.count({ where: { mpPaymentId: id, ...open } })) + (await prisma.marketOrder.count({ where: { mpPaymentId: id, ...open } }));
  if (identifier && (await known(`${SP_PREFIX}${identifier}`))) return void (await handlePaymentNotice(`${SP_PREFIX}${identifier}`));
  // Aviso sem um id nosso: confere todos os abertos, no máximo a cada 20s (aviso repetido não estoura o limite da SyncPay)
  if (Date.now() - lastSweep < 20_000) return;
  lastSweep = Date.now();
  const ids = [
    ...(await prisma.creditPurchase.findMany({ where: { ...open, mpPaymentId: { startsWith: SP_PREFIX } }, select: { mpPaymentId: true }, orderBy: { createdAt: "desc" }, take: 30 })),
    ...(await prisma.marketOrder.findMany({ where: { ...open, mpPaymentId: { startsWith: SP_PREFIX } }, select: { mpPaymentId: true }, orderBy: { createdAt: "desc" }, take: 30 })),
  ].map((r) => r.mpPaymentId!);
  for (const id of ids) await handlePaymentNotice(id).catch((e) => console.error("[vendas] conferir SyncPay", e));
}
