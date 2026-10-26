import type { CreditTxType } from "@prisma/client";
import { prisma } from "./db";

/** Debita créditos de forma atômica. Retorna false se não houver saldo suficiente. */
export async function tryDebit(workspaceId: string, amount: number, description: string, campaignId?: string): Promise<boolean> {
  if (amount <= 0) return true;
  return prisma.$transaction(async (tx) => {
    const res = await tx.workspace.updateMany({
      where: { id: workspaceId, creditBalance: { gte: amount } },
      data: { creditBalance: { decrement: amount } },
    });
    if (res.count === 0) return false;
    const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { creditBalance: true } });
    await tx.creditTransaction.create({
      data: { workspaceId, type: "DEBIT", amount: -amount, balanceAfter: ws.creditBalance, description, campaignId },
    });
    return true;
  });
}

export async function addCredits(
  workspaceId: string,
  amount: number,
  type: Exclude<CreditTxType, "DEBIT">,
  description: string,
  opts: { campaignId?: string; createdById?: string } = {},
) {
  return prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.update({
      where: { id: workspaceId },
      data: { creditBalance: { increment: amount } },
      select: { creditBalance: true },
    });
    await tx.creditTransaction.create({
      data: { workspaceId, type, amount, balanceAfter: ws.creditBalance, description, ...opts },
    });
    return ws.creditBalance;
  });
}

/**
 * Cobra um lote de destinatários e anota o crédito em cada um, tudo de uma vez (se cair no meio, nada fica pela metade).
 * Destinatário que já tinha crédito anotado (sobra de um envio interrompido) não paga de novo: só a diferença é cobrada.
 * Retorna false se não houver saldo para o lote.
 */
export async function chargeRecipients(workspaceId: string, recipientIds: string[], price: number, description: string, campaignId: string): Promise<boolean> {
  if (!recipientIds.length || price <= 0) return true;
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ total: bigint | null }>>`
      SELECT SUM("creditsCharged") AS total FROM (
        SELECT "creditsCharged" FROM "CampaignRecipient" WHERE id = ANY(${recipientIds}) FOR UPDATE
      ) r`;
    const already = Number(rows[0]?.total ?? 0);
    const due = recipientIds.length * price - already;
    if (due > 0) {
      const res = await tx.workspace.updateMany({ where: { id: workspaceId, creditBalance: { gte: due } }, data: { creditBalance: { decrement: due } } });
      if (res.count === 0) return false;
    } else if (due < 0) {
      await tx.workspace.update({ where: { id: workspaceId }, data: { creditBalance: { increment: -due } } });
    }
    if (due !== 0) {
      const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { creditBalance: true } });
      await tx.creditTransaction.create({
        data: { workspaceId, type: due > 0 ? "DEBIT" : "REFUND", amount: -due, balanceAfter: ws.creditBalance, description, campaignId },
      });
    }
    await tx.campaignRecipient.updateMany({ where: { id: { in: recipientIds } }, data: { creditsCharged: price } });
    return true;
  });
}

/**
 * Estorna o crédito dos destinatários que não foram enviados (voltaram para a fila, falharam ou foram pulados).
 * Trava as linhas, lê o crédito anotado, zera e devolve na mesma operação: rodar duas vezes (ou ao mesmo tempo)
 * nunca devolve em dobro. Quem está sendo enviado agora (SENDING) ou já saiu (SENT/DELIVERED/READ) não é tocado.
 * Retorna quantos créditos voltaram.
 */
export async function settleRecipients(campaignId: string, description: string, recipientIds?: string[]): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const ids = recipientIds ?? null;
    const rows = await tx.$queryRaw<Array<{ total: bigint | null }>>`
      WITH old AS (
        SELECT id, "creditsCharged" AS amount FROM "CampaignRecipient"
        WHERE "campaignId" = ${campaignId} AND "creditsCharged" > 0
          AND status::text NOT IN ('SENDING', 'SENT', 'DELIVERED', 'READ')
          AND (${ids}::text[] IS NULL OR id = ANY(${ids}::text[]))
        FOR UPDATE
      ), upd AS (
        UPDATE "CampaignRecipient" r SET "creditsCharged" = 0 FROM old WHERE r.id = old.id RETURNING old.amount
      )
      SELECT SUM(amount) AS total FROM upd`;
    const total = Number(rows[0]?.total ?? 0);
    if (total <= 0) return 0;
    const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { workspaceId: true, name: true } });
    const ws = await tx.workspace.update({ where: { id: campaign.workspaceId }, data: { creditBalance: { increment: total } }, select: { creditBalance: true } });
    await tx.creditTransaction.create({
      data: { workspaceId: campaign.workspaceId, type: "REFUND", amount: total, balanceAfter: ws.creditBalance, description: `${description} — ${campaign.name}`, campaignId },
    });
    return total;
  });
}

/** Limpeza do worker: estorna crédito que ficou anotado em destinatário não enviado (ex.: o worker caiu no meio do lote). */
export async function settleLeftoverCredits() {
  const camps = await prisma.campaignRecipient.groupBy({
    by: ["campaignId"],
    where: { creditsCharged: { gt: 0 }, status: { in: ["PENDING", "FAILED", "SKIPPED"] } },
  });
  let total = 0;
  for (const c of camps) total += await settleRecipients(c.campaignId, "Estorno (envio interrompido)");
  return total;
}
