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
