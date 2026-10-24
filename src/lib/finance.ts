// Financeiro dos sócios: despesas e entradas divididas em partes iguais, e quem tem que passar quanto para quem.

export const FINANCE_CATEGORIES = ["Perfil", "Automação", "SMS", "Captcha", "Disparo", "Venda BM", "Sem categoria"] as const;
export type FinanceKind = "EXPENSE" | "INCOME" | "SETTLEMENT";

export type FinanceLine = { kind: FinanceKind; amountCents: number; userId: string; toUserId: string | null };
export type PartnerTotals = { userId: string; paid: number; received: number; sent: number; got: number; holding: number; diff: number };
export type Transfer = { from: string; to: string; amountCents: number };

/**
 * Cada sócio fica com a mesma parte do lucro (entradas − despesas).
 * holding = o que ficou com ele (recebeu − pagou − Pix que mandou + Pix que recebeu).
 * diff = holding − parte justa: positivo = tem que passar para os outros; negativo = tem a receber.
 */
export function settle(lines: FinanceLine[], partnerIds: string[]): { profit: number; share: number; partners: PartnerTotals[]; transfers: Transfer[] } {
  const ids = [...new Set(partnerIds)];
  const t = new Map(ids.map((id) => [id, { userId: id, paid: 0, received: 0, sent: 0, got: 0, holding: 0, diff: 0 }]));
  const get = (id: string) => {
    if (!t.has(id)) t.set(id, { userId: id, paid: 0, received: 0, sent: 0, got: 0, holding: 0, diff: 0 });
    return t.get(id)!;
  };
  let profit = 0;
  for (const l of lines) {
    if (l.kind === "EXPENSE") {
      get(l.userId).paid += l.amountCents;
      profit -= l.amountCents;
    } else if (l.kind === "INCOME") {
      get(l.userId).received += l.amountCents;
      profit += l.amountCents;
    } else if (l.toUserId) {
      get(l.userId).sent += l.amountCents;
      get(l.toUserId).got += l.amountCents;
    }
  }
  const all = [...t.values()];
  const n = Math.max(1, ids.length || all.length);
  const share = profit / n;
  for (const p of all) {
    p.holding = p.received - p.paid - p.sent + p.got;
    p.diff = Math.round(p.holding - share);
  }
  // Quem tem a mais passa para quem tem a menos (com 2 sócios é um Pix só)
  const debtors = all.filter((p) => p.diff > 0).map((p) => ({ id: p.userId, left: p.diff }));
  const creditors = all.filter((p) => p.diff < 0).map((p) => ({ id: p.userId, left: -p.diff }));
  const transfers: Transfer[] = [];
  for (const d of debtors) {
    for (const c of creditors) {
      if (d.left <= 0) break;
      if (c.left <= 0) continue;
      const amount = Math.min(d.left, c.left);
      if (amount > 0) transfers.push({ from: d.id, to: c.id, amountCents: amount });
      d.left -= amount;
      c.left -= amount;
    }
  }
  return { profit, share: Math.round(share), partners: all, transfers };
}

/** "1.234,56", "1234.56", "300" → centavos. */
export function parseMoney(raw: string): number | null {
  let v = String(raw ?? "").replace(/[R$\s]/g, "");
  if (!v) return null;
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
