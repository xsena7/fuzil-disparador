import { headers } from "next/headers";

/** Limite simples em memória (o app roda num processo só): N tentativas por janela, por chave. */
const hits = new Map<string, number[]>();

export function tooMany(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 50_000) for (const [k, v] of hits) if (now - v[v.length - 1] > windowMs) hits.delete(k);
  return list.length > max;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}
