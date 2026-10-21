import { cache } from "react";
import { prisma } from "./db";

/** Funil pelo endereço: slug (/v/vagas) ou domínio próprio (vagasbrasil.com.br, com ou sem www). */
export const resolveFunnel = cache(async (key: string) => {
  const k = decodeURIComponent(key).toLowerCase();
  if (k.includes(".")) return prisma.funnel.findUnique({ where: { domain: k.replace(/^www\./, "") } });
  return prisma.funnel.findUnique({ where: { slug: k } });
});
