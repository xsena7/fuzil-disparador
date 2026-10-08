/** Converte o tier de limite da Meta em número de destinatários únicos por 24h. */
export function tierToLimit(tier?: string | null): number | null {
  if (!tier) return null;
  const t = tier.toUpperCase();
  if (t.includes("UNLIMITED")) return Infinity;
  const m = t.match(/TIER_(\d+)(K)?/);
  if (!m) return null;
  return Number(m[1]) * (m[2] ? 1000 : 1);
}

export function tierLabel(tier?: string | null): string {
  const n = tierToLimit(tier);
  if (n === null) return "—";
  if (n === Infinity) return "Ilimitado";
  return n >= 1000 ? `${n / 1000}k/dia` : `${n}/dia`;
}

export function formatLimit(n: number | null): string {
  if (n === null) return "—";
  if (n === Infinity) return "Ilimitado";
  return n.toLocaleString("pt-BR");
}

/** Tier efetivo da BM: usa o tier do portfólio, ou o maior entre os números. */
export function effectiveTier(bmTier: string | null | undefined, phoneTiers: Array<string | null | undefined>): string | null {
  if (bmTier) return bmTier;
  let best: string | null = null;
  for (const t of phoneTiers) {
    if ((tierToLimit(t) ?? -1) > (tierToLimit(best) ?? -1)) best = t ?? null;
  }
  return best;
}
