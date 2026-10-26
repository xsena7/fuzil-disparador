// Financeiro dos sócios: caixa da empresa, despesas e entradas, e quem tem que passar quanto para quem.

export const FINANCE_CATEGORIES = ["Perfil", "Automação", "SMS", "Captcha", "Disparo", "Venda BM", "Sem categoria"] as const;
// EXPENSE/INCOME com cash = saiu/entrou no caixa da empresa (não mexe na conta de nenhum sócio).
// WITHDRAW = reembolso: o caixa devolveu ao sócio algo que ele pagou do bolso.
export type FinanceKind = "EXPENSE" | "INCOME" | "SETTLEMENT" | "WITHDRAW";

export type FinanceLine = { kind: FinanceKind; amountCents: number; userId: string; toUserId: string | null; cash?: boolean };
export type PartnerTotals = { userId: string; paid: number; received: number; sent: number; got: number; holding: number; diff: number };
export type Transfer = { from: string; to: string; amountCents: number };
export type Refund = { to: string; amountCents: number };

/**
 * Caixa da empresa: o lucro fica nele (é reinvestido) e não vai para a conta de ninguém.
 * Sócio que pagou do próprio bolso é reembolsado pelo caixa, enquanto houver dinheiro nele.
 * O que o caixa não cobre (e o que ficou na conta de algum sócio) é dividido em partes iguais entre os sócios.
 * holding = quanto o sócio tem a mais/a menos por causa da empresa (recebeu − pagou − mandou + recebeu de acerto/caixa).
 * diff = holding − parte justa (depois dos reembolsos): positivo = passa para os outros; negativo = tem a receber.
 */
export function settle(
  lines: FinanceLine[],
  partnerIds: string[],
): { profit: number; share: number; cash: number; refunds: Refund[]; partners: PartnerTotals[]; transfers: Transfer[] } {
  const ids = [...new Set(partnerIds)];
  const t = new Map(ids.map((id) => [id, { userId: id, paid: 0, received: 0, sent: 0, got: 0, holding: 0, diff: 0 }]));
  const get = (id: string) => {
    if (!t.has(id)) t.set(id, { userId: id, paid: 0, received: 0, sent: 0, got: 0, holding: 0, diff: 0 });
    return t.get(id)!;
  };
  let profit = 0;
  let cash = 0;
  for (const l of lines) {
    if (l.kind === "EXPENSE") {
      if (l.cash) cash -= l.amountCents;
      else get(l.userId).paid += l.amountCents;
      profit -= l.amountCents;
    } else if (l.kind === "INCOME") {
      if (l.cash) cash += l.amountCents;
      else get(l.userId).received += l.amountCents;
      profit += l.amountCents;
    } else if (l.kind === "WITHDRAW") {
      get(l.userId).got += l.amountCents;
      cash -= l.amountCents;
    } else if (l.toUserId) {
      get(l.userId).sent += l.amountCents;
      get(l.toUserId).got += l.amountCents;
    }
  }
  const all = [...t.values()];
  for (const p of all) p.holding = p.received - p.paid - p.sent + p.got;

  // 1) O caixa reembolsa quem pagou do bolso (do maior para o menor), até onde tiver dinheiro
  const refunds: Refund[] = [];
  let left = Math.max(0, cash);
  const after = new Map(all.map((p) => [p.userId, p.holding]));
  for (const p of [...all].sort((a, b) => a.holding - b.holding)) {
    if (p.holding >= 0 || left <= 0) continue;
    const amount = Math.min(-p.holding, left);
    refunds.push({ to: p.userId, amountCents: amount });
    after.set(p.userId, p.holding + amount);
    left -= amount;
  }

  // 2) O resto fica igual entre os sócios
  const n = Math.max(1, ids.length || all.length);
  const share = [...after.values()].reduce((a, v) => a + v, 0) / n;
  for (const p of all) {
    // Em centavos inteiros; meio centavo arredonda para baixo de quem deve (nunca cobra a mais)
    p.diff = Math.trunc(after.get(p.userId)! - share);
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
  return { profit, share: Math.round(share), cash, refunds, partners: all, transfers };
}

/**
 * Valor em reais → centavos, no jeito brasileiro: "1.234,56", "1.234", "300", "12,5" e também "1234.56".
 * Ponto seguido de exatamente 3 números é separador de milhar ("1.234" = mil duzentos e trinta e quatro).
 * Qualquer coisa estranha (letras, dois separadores de centavos, mais de 2 casas) é recusada: nunca adivinha.
 */
export function parseMoney(raw: string): number | null {
  const v = String(raw ?? "").replace(/R\$|\s/g, "");
  if (!v || !/^[\d.,]+$/.test(v)) return null;
  let int: string;
  let dec = "";
  if (v.includes(",")) {
    // Vírgula = centavos; pontos antes dela = milhar (em grupos de 3)
    if (v.split(",").length !== 2) return null;
    [int, dec] = v.split(",");
    if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(int)) return null;
    int = int.replace(/\./g, "");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(v)) {
    int = v.replace(/\./g, ""); // 1.234 ou 1.234.567
  } else if (/^\d+\.\d{1,2}$/.test(v)) {
    [int, dec] = v.split("."); // 1234.5 / 1234.56 (jeito americano)
  } else if (/^\d+$/.test(v)) {
    int = v;
  } else return null;
  if (dec.length > 2 || !/^\d*$/.test(dec)) return null;
  const cents = Number(int) * 100 + Number((dec + "00").slice(0, 2));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
