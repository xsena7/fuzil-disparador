// Resumo curto de um alerta para o aviso no canto da tela: o que aconteceu (título) + de quem (linha de baixo).

export type AlertTone = "red" | "amber" | "green" | "blue";
export type AlertSummary = { head: string; who: string; tone: AlertTone; key: string };

const strip = (s: string) => s.replace(/[\p{Extended_Pictographic}️]/gu, "").replace(/\s+/g, " ").trim();

// Avisos de conta da Meta (account_update / account_review_update), em poucas palavras
const ACCOUNT_EVENTS: Record<string, [string, AlertTone]> = {
  VERIFIED_ACCOUNT: ["Conta verificada", "green"],
  APPROVED: ["Conta aprovada", "green"],
  PARTNER_ADDED: ["Parceiro adicionado", "blue"],
  PARTNER_REMOVED: ["Parceiro removido", "amber"],
  PARTNER_APP_INSTALLED: ["App conectado na conta", "blue"],
  PARTNER_APP_UNINSTALLED: ["App desconectado da conta", "amber"],
  AD_ACCOUNT_LINKED: ["Conta de anúncios ligada", "blue"],
  PHONE_NUMBER_ADDED: ["Número adicionado", "blue"],
  PHONE_NUMBER_REMOVED: ["Número removido", "amber"],
  PENDING: ["Conta em análise", "amber"],
  REJECTED: ["Conta rejeitada", "red"],
  DISABLED_UPDATE: ["Conta desativada", "red"],
  ACCOUNT_DELETED: ["Conta excluída", "red"],
  ACCOUNT_VIOLATION: ["Violação na conta", "red"],
  ACCOUNT_RESTRICTION: ["Conta restrita", "red"],
  ACCOUNT_OFFBOARDED: ["Conta desligada", "red"],
};
const accountEvent = (ev: string): [string, AlertTone] => {
  const e = ev.trim().toUpperCase();
  if (ACCOUNT_EVENTS[e]) return ACCOUNT_EVENTS[e];
  if (/BAN|DISABLE|VIOLATION|RESTRICT|REJECT/.test(e)) return ["Restrição na conta", "red"];
  return ["Aviso da Meta na conta", "blue"];
};

const RULES: Array<[RegExp, (m: RegExpMatchArray) => Omit<AlertSummary, "key">]> = [
  [/^Atualização na WABA (.+?) \((.+)\): (.+)$/, (m) => { const [head, tone] = accountEvent(m[3]); return { head, who: m[2], tone }; }],
  [/^Atualização na WABA (.+): (.+)$/, (m) => { const [head, tone] = accountEvent(m[2]); return { head, who: m[1], tone }; }],
  [/^(.+) foi para "(.+)"$/, (m) => ({ head: strip(m[2]), who: m[1], tone: /banid/i.test(m[2]) ? "red" : "amber" })],
  [/^(.+) voltou para "(.+)"$/, (m) => ({ head: `Voltou: ${strip(m[2])}`, who: m[1], tone: "green" })],
  [/^Campanha "(.+)" concluída$/, (m) => ({ head: "Campanha concluída", who: m[1], tone: "green" })],
  [/^Campanha "(.+)" (iniciada|agendada começou)$/, (m) => ({ head: "Campanha começou", who: m[1], tone: "blue" })],
  [/^Campanha "(.+)" pausada$/, (m) => ({ head: "Campanha pausada", who: m[1], tone: "amber" })],
  [/^Campanha "(.+)" aguardando limite$/, (m) => ({ head: "Esperando limite", who: m[1], tone: "amber" })],
  [/^Aquecimento "(.+)" sem BM apta$/, (m) => ({ head: "Aquecimento sem BM", who: m[1], tone: "amber" })],
  [/^Número (.+?) \((.+)\) retirado da campanha "(.+)"$/, (m) => ({ head: "Número tirado da campanha", who: `${m[1]} · ${m[2]}`, tone: "red" })],
  [/^Número (.+?) banido \((.+)\)$/, (m) => ({ head: "Número banido", who: `${m[1]} · ${m[2]}`, tone: "red" })],
  [/^Qualidade do número (.+?) \((.+)\) (caiu|subiu)$/, (m) => ({ head: `Qualidade ${m[3]}`, who: `${m[1]} · ${m[2]}`, tone: m[3] === "caiu" ? "amber" : "green" })],
  [/^Status do número (.+?) \((.+)\) mudou$/, (m) => ({ head: "Status do número mudou", who: `${m[1]} · ${m[2]}`, tone: "amber" })],
  [/^Limite atingido: (.+?) \(/, (m) => ({ head: "Limite atingido", who: m[1], tone: "amber" })],
  [/^Limite liberado: (.+)$/, (m) => ({ head: "Limite liberado", who: m[1], tone: "green" })],
  [/^Limite da BM (.+) (subiu|caiu)$/, (m) => ({ head: `Limite ${m[2]}`, who: m[1], tone: m[2] === "subiu" ? "green" : "amber" })],
  [/^Falha ao sincronizar (.+?) \/ /, (m) => ({ head: "Falha ao sincronizar", who: m[1], tone: "amber" })],
  [/^Template "(.+?)" .*→ APPROVED$/, (m) => ({ head: "Template aprovado", who: m[1], tone: "green" })],
  [/^Template "(.+?)" .*→ REJECTED$/, (m) => ({ head: "Template rejeitado", who: m[1], tone: "red" })],
  [/^Template "(.+?)" recategorizado/, (m) => ({ head: "Template virou marketing", who: m[1], tone: "red" })],
  [/^Template padrão "(.+?)" não subiu em (.+)$/, (m) => ({ head: "Template não subiu", who: `${m[1]} · ${m[2]}`, tone: "amber" })],
  [/^Nome do número (.+?) \((.+)\) aprovado/, (m) => ({ head: "Nome aprovado", who: `${m[1]} · ${m[2]}`, tone: "green" })],
  [/^Nome do número (.+?) \((.+)\) recusado/, (m) => ({ head: "Nome recusado", who: `${m[1]} · ${m[2]}`, tone: "amber" })],
  [/^Número novo registrado pelo (.+?) \((.+)\)$/, (m) => ({ head: "Número registrado", who: m[2], tone: "green" })],
  [/^Registro automático parou \((.+)\)$/, (m) => ({ head: "Registro automático parou", who: m[1], tone: "amber" })],
  [/^(.+) créditos adicionados$/, (m) => ({ head: "Créditos adicionados", who: `${m[1]} créditos`, tone: "green" })],
  [/^Recarga paga: (.+)$/, (m) => ({ head: "Recarga paga", who: m[1], tone: "green" })],
];

export function summarizeAlert(a: { title: string; severity: "INFO" | "WARNING" | "CRITICAL" }): AlertSummary {
  for (const [re, fn] of RULES) {
    const m = a.title.match(re);
    if (m) {
      const r = fn(m);
      return { ...r, key: r.head };
    }
  }
  // Sem regra: o próprio título, curto
  const tone: AlertTone = a.severity === "CRITICAL" ? "red" : a.severity === "WARNING" ? "amber" : "blue";
  return { head: strip(a.title).slice(0, 60), who: "", tone, key: a.title };
}
