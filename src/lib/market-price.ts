// Preço por quantidade na loja de BMs (roda no navegador também): a partir de X unidades, cada BM sai por Y.

export type PriceTier = { min: number; priceCents: number };

/** Faixas válidas, da menor quantidade para a maior. */
export function parseTiers(v: unknown): PriceTier[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((t) => ({ min: Math.floor(Number(t?.min)), priceCents: Math.round(Number(t?.priceCents)) }))
    .filter((t) => t.min >= 2 && t.priceCents > 0)
    .sort((a, b) => a.min - b.min);
}

/** Preço de cada BM para essa quantidade (a maior faixa que a quantidade alcança). */
export function unitPrice(baseCents: number, tiers: PriceTier[], qty: number): number {
  let price = baseCents;
  for (const t of tiers) if (qty >= t.min) price = t.priceCents;
  return price;
}
