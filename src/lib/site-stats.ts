import { prisma } from "./db";

// Mensagens já enviadas pelo Fuzil (número real, guardado por 10 min para não pesar no banco)
let sentCache = { at: 0, n: 0 };
export async function totalSent() {
  if (Date.now() - sentCache.at < 600_000) return sentCache.n;
  const n = await prisma.campaignRecipient.count({ where: { status: { in: ["SENT", "DELIVERED", "READ"] } } }).catch(() => sentCache.n);
  sentCache = { at: Date.now(), n };
  return n;
}
export const roundDown = (n: number) => (n >= 1_000_000 ? `${Math.floor(n / 100_000) / 10} milhões`.replace(".", ",") : n >= 10_000 ? `${Math.floor(n / 1000)} mil` : n.toLocaleString("pt-BR"));
