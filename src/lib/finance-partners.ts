import { redirect } from "next/navigation";
import { prisma } from "./db";
import { requireAuth } from "./auth";

/** Sócios do financeiro (fixos: marcados no banco; dar administrador para alguém não muda a divisão). */
export function financePartners() {
  return prisma.user.findMany({ where: { financePartner: true }, select: { id: true, name: true, email: true, pixKey: true }, orderBy: { createdAt: "asc" } });
}

export async function isFinancePartner(userId: string) {
  return Boolean((await prisma.user.findUnique({ where: { id: userId }, select: { financePartner: true } }))?.financePartner);
}

/** Dono do financeiro: apaga qualquer lançamento (os outros sócios só apagam os próprios). */
export async function isFinanceOwner(userId: string) {
  return Boolean((await prisma.user.findUnique({ where: { id: userId }, select: { financeOwner: true } }))?.financeOwner);
}

/** Só sócios entram no financeiro (os outros vão para o Início). */
export async function requireFinancePartner() {
  const auth = await requireAuth();
  if (!(await isFinancePartner(auth.user.id))) redirect("/");
  return auth;
}
