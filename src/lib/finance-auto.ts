// Entradas automáticas no Financeiro: dinheiro que caiu na conta da empresa pelo Mercado Pago (vai para o caixa).
import { prisma } from "./db";
import { platformOwnerId } from "./onboarding";

export async function recordCompanyIncome(input: { description: string; amountCents: number; category: "Disparo" | "Venda BM" }) {
  // Anotado em nome do dono da plataforma (ou do primeiro sócio): é só quem "assina" a linha, o dinheiro é do caixa
  const userId = (await platformOwnerId()) ?? (await prisma.user.findFirst({ where: { financePartner: true }, select: { id: true } }))?.id;
  if (!userId || input.amountCents <= 0) return;
  await prisma.financeEntry.create({
    data: { kind: "INCOME", cash: true, category: input.category, description: input.description.slice(0, 200), amountCents: input.amountCents, userId },
  });
}
