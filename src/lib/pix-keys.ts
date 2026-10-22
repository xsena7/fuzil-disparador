// Chaves Pix da conta, mostradas no relatório do cliente para ele pagar.
export type PixKey = { id: string; key: string; name: string; bank: string };

export function parsePixKeys(raw: unknown): PixKey[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((k): k is Record<string, unknown> => Boolean(k) && typeof k === "object")
    .map((k) => ({ id: String(k.id ?? ""), key: String(k.key ?? ""), name: String(k.name ?? ""), bank: String(k.bank ?? "") }))
    .filter((k) => k.id && k.key);
}

/** Quais chaves aparecem no relatório: a escolhida na campanha, todas ("ALL") ou a primeira. */
export function keysForReport(keys: PixKey[], selected: string | null | undefined): PixKey[] {
  if (!keys.length) return [];
  if (selected === "ALL") return keys;
  const one = selected ? keys.find((k) => k.id === selected) : undefined;
  return [one ?? keys[0]];
}
