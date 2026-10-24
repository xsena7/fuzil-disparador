import { prisma } from "./db";

/** Sócios = administradores do Fuzil (divisão em partes iguais). */
export function financePartners() {
  return prisma.user.findMany({ where: { isSuperAdmin: true }, select: { id: true, name: true, email: true }, orderBy: { createdAt: "asc" } });
}
