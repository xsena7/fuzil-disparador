import { cache } from "react";
import { prisma } from "./db";

/** Funil pelo endereço: slug (/v/vagas) ou domínio próprio (vagasbrasil.com.br, com ou sem www). */
export const resolveFunnel = cache(async (key: string) => {
  const k = decodeURIComponent(key).toLowerCase();
  const f = k.includes(".") ? await prisma.funnel.findUnique({ where: { domain: k.replace(/^www\./, "") } }) : await prisma.funnel.findUnique({ where: { slug: k } });
  // O funil do gerador de links não tem landing page
  return f && f.kind === "LINKS" ? null : f;
});
