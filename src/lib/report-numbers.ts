// Números do relatório do cliente: os reais da campanha, ou os ajustados à mão pelo dono (para cobrar com exatidão).
// O relatório do cliente mostra o valor (enviadas × preço) e o funil: público → enviadas → lidas → clicaram → responderam.
import { prisma } from "./db";

export const REPORT_FIELDS = [
  { key: "total", label: "Público" },
  { key: "sent", label: "Enviadas" },
  { key: "read", label: "Lidas" },
  { key: "clicked", label: "Clicaram" },
  { key: "replied", label: "Responderam" },
] as const;
export type ReportKey = (typeof REPORT_FIELDS)[number]["key"];
export type ReportNumbers = Record<ReportKey, number> & { clicks: number; failed: number; noWa: number; pending: number; sentUnread: number; adjusted: boolean };

/** Os números reais, contados nos destinatários da campanha. */
export async function realReportNumbers(campaignId: string): Promise<Omit<ReportNumbers, "adjusted">> {
  const [byStatus, agg, noWa] = await Promise.all([
    prisma.campaignRecipient.groupBy({ by: ["status"], where: { campaignId }, _count: true }),
    prisma.$queryRaw<Array<{ sent: bigint; read: bigint; clicked: bigint; clicks: bigint; replied: bigint }>>`
      SELECT COUNT(*) FILTER (WHERE "sentAt" IS NOT NULL) AS sent,
        COUNT(*) FILTER (WHERE "readAt" IS NOT NULL) AS read,
        COUNT(*) FILTER (WHERE "clickCount" > 0) AS clicked,
        COALESCE(SUM("clickCount"), 0) AS clicks,
        COUNT(*) FILTER (WHERE "repliedAt" IS NOT NULL) AS replied
      FROM "CampaignRecipient" WHERE "campaignId" = ${campaignId}`,
    prisma.campaignRecipient.count({ where: { campaignId, status: "FAILED", errorCode: 131026 } }),
  ]);
  const st = (k: string) => byStatus.find((x) => x.status === k)?._count ?? 0;
  const a = agg[0];
  const total = byStatus.reduce((s, x) => s + x._count, 0);
  const clicked = Number(a?.clicked ?? 0);
  const replied = Number(a?.replied ?? 0);
  // Quem clicou ou respondeu leu (mesmo com a confirmação de leitura desligada no celular dela)
  const read = Math.max(Number(a?.read ?? 0), clicked, replied);
  const sent = Math.max(Number(a?.sent ?? 0), read);
  return {
    total: Math.max(total, sent),
    sent,
    read,
    clicked,
    clicks: Number(a?.clicks ?? 0),
    replied,
    failed: Math.max(0, st("FAILED") - noWa),
    noWa,
    pending: st("PENDING") + st("SENDING") + st("SKIPPED"),
    sentUnread: st("DELIVERED") + st("SENT"),
  };
}

export function parseOverrides(raw: unknown): Partial<Record<ReportKey, number>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<ReportKey, number>> = {};
  for (const { key } of REPORT_FIELDS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[key] = Math.round(v);
  }
  return out;
}

/** Números reais na hora em que o ajuste foi salvo (a base da proporção). Ajustes antigos não têm: ficam fixos. */
export function parseBase(raw: unknown): Partial<Record<ReportKey, number>> {
  if (!raw || typeof raw !== "object") return {};
  return parseOverrides((raw as Record<string, unknown>).base);
}

/**
 * Ajuste por cima dos reais, acompanhando ao vivo na mesma proporção:
 * real 200 cliques → ajustado 2.000 (×10); o real vai a 250 → o relatório mostra 2.500.
 * Se o real era 0 quando salvou, cada novo real soma na proporção das Enviadas.
 */
export function applyOverrides(real: Omit<ReportNumbers, "adjusted">, overrides: unknown): ReportNumbers {
  const o = parseOverrides(overrides);
  if (!Object.keys(o).length) return { ...real, adjusted: false };
  const base = parseBase(overrides);
  const live = Object.keys(base).length > 0;
  const sentFactor = live && base.sent && o.sent !== undefined ? o.sent / base.sent : 1;
  const n = { ...real };
  for (const { key } of REPORT_FIELDS) {
    const v = o[key];
    if (v === undefined) continue;
    const b = base[key];
    if (!live || b === undefined) {
      n[key] = v;
      continue;
    }
    const factor = b > 0 ? v / b : sentFactor;
    n[key] = Math.max(0, Math.round(v + (real[key] - b) * factor));
  }
  // Garante a lógica (corta de cima para baixo)
  n.sent = Math.min(n.sent, n.total);
  n.read = Math.min(n.read, n.sent);
  n.clicked = Math.min(n.clicked, n.read);
  n.replied = Math.min(n.replied, n.read);
  return {
    ...n,
    // Cliques totais acompanham quem clicou na mesma proporção
    clicks: o.clicked === undefined ? real.clicks : real.clicked > 0 ? Math.max(n.clicked, Math.round((real.clicks * n.clicked) / real.clicked)) : n.clicked,
    sentUnread: Math.max(0, n.sent - n.read),
    pending: Math.max(0, n.total - n.sent),
    adjusted: true,
  };
}

/** Números que o relatório do cliente mostra: os ajustados por cima dos reais, acompanhando os reais ao vivo. */
export async function reportNumbers(campaignId: string, overrides: unknown): Promise<ReportNumbers> {
  return applyOverrides(await realReportNumbers(campaignId), overrides);
}

/** A lógica dos números: Público ≥ Enviadas ≥ Lidas ≥ Clicaram, e Responderam ≤ Lidas. Devolve o erro em português. */
export function checkLogic(v: Record<ReportKey, number>): string | null {
  if (v.sent > v.total) return `Enviadas (${v.sent}) não pode ser maior que o Público (${v.total}).`;
  if (v.read > v.sent) return `Lidas (${v.read}) não pode ser maior que Enviadas (${v.sent}).`;
  if (v.clicked > v.read) return `Clicaram (${v.clicked}) não pode ser maior que Lidas (${v.read}): quem clicou leu a mensagem.`;
  if (v.replied > v.read) return `Responderam (${v.replied}) não pode ser maior que Lidas (${v.read}): quem respondeu leu a mensagem.`;
  return null;
}
