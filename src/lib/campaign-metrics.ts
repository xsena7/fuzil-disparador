import { prisma } from "./db";
import { metaErrorLabel } from "./meta-errors";
import { formatPhone } from "./phone";

export type CampaignMetrics = Awaited<ReturnType<typeof campaignMetrics>>;

export async function campaignMetrics(campaignId: string) {
  const [totals] = await prisma.$queryRaw<
    Array<{
      total: bigint; pending: bigint; sending: bigint; sent: bigint; delivered: bigint; read: bigint; failed: bigint; skipped: bigint;
      clicked: bigint; clicks: bigint; replied: bigint; opted_out: bigint; credits: bigint; first_sent: Date | null; last_sent: Date | null;
    }>
  >`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
      COUNT(*) FILTER (WHERE status = 'SENDING') AS sending,
      COUNT(*) FILTER (WHERE "sentAt" IS NOT NULL) AS sent,
      COUNT(*) FILTER (WHERE "deliveredAt" IS NOT NULL) AS delivered,
      COUNT(*) FILTER (WHERE "readAt" IS NOT NULL) AS read,
      COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
      COUNT(*) FILTER (WHERE status = 'SKIPPED') AS skipped,
      COUNT(*) FILTER (WHERE "clickCount" > 0) AS clicked,
      COALESCE(SUM("clickCount"), 0) AS clicks,
      COUNT(*) FILTER (WHERE "repliedAt" IS NOT NULL) AS replied,
      COUNT(*) FILTER (WHERE "optedOutAt" IS NOT NULL) AS opted_out,
      COALESCE(SUM("creditsCharged"), 0) AS credits,
      MIN("sentAt") AS first_sent,
      MAX("sentAt") AS last_sent
    FROM "CampaignRecipient" WHERE "campaignId" = ${campaignId}`;

  const errors = await prisma.$queryRaw<Array<{ code: number | null; title: string | null; n: bigint }>>`
    SELECT "errorCode" AS code, MIN("errorTitle") AS title, COUNT(*) AS n
    FROM "CampaignRecipient" WHERE "campaignId" = ${campaignId} AND status IN ('FAILED', 'SKIPPED')
    GROUP BY "errorCode" ORDER BY n DESC`;

  const senders = await prisma.$queryRaw<
    Array<{ id: string; display: string; business: string; quality: string | null; sent: bigint; delivered: bigint; read: bigint; failed: bigint; clicked: bigint; replied: bigint }>
  >`
    SELECT p.id, p."displayPhoneNumber" AS display, b.name AS business, p."qualityRating" AS quality,
      COUNT(*) FILTER (WHERE r."sentAt" IS NOT NULL) AS sent,
      COUNT(*) FILTER (WHERE r."deliveredAt" IS NOT NULL) AS delivered,
      COUNT(*) FILTER (WHERE r."readAt" IS NOT NULL) AS read,
      COUNT(*) FILTER (WHERE r.status = 'FAILED') AS failed,
      COUNT(*) FILTER (WHERE r."clickCount" > 0) AS clicked,
      COUNT(*) FILTER (WHERE r."repliedAt" IS NOT NULL) AS replied
    FROM "CampaignRecipient" r
    JOIN "PhoneNumber" p ON p.id = r."senderId"
    JOIN "WhatsAppAccount" w ON w.id = p."wabaId"
    JOIN "BusinessManager" b ON b.id = w."businessId"
    WHERE r."campaignId" = ${campaignId}
    GROUP BY p.id, b.name ORDER BY sent DESC`;

  const timeline = await prisma.$queryRaw<Array<{ bucket: Date; sent: bigint; delivered: bigint; read: bigint; clicked: bigint }>>`
    WITH b AS (
      SELECT date_trunc('hour', "sentAt") AS bucket, 'sent' AS k FROM "CampaignRecipient" WHERE "campaignId" = ${campaignId} AND "sentAt" IS NOT NULL
      UNION ALL SELECT date_trunc('hour', "deliveredAt"), 'delivered' FROM "CampaignRecipient" WHERE "campaignId" = ${campaignId} AND "deliveredAt" IS NOT NULL
      UNION ALL SELECT date_trunc('hour', "readAt"), 'read' FROM "CampaignRecipient" WHERE "campaignId" = ${campaignId} AND "readAt" IS NOT NULL
      UNION ALL SELECT date_trunc('hour', "firstClickAt"), 'clicked' FROM "CampaignRecipient" WHERE "campaignId" = ${campaignId} AND "firstClickAt" IS NOT NULL
    )
    SELECT bucket,
      COUNT(*) FILTER (WHERE k = 'sent') AS sent,
      COUNT(*) FILTER (WHERE k = 'delivered') AS delivered,
      COUNT(*) FILTER (WHERE k = 'read') AS read,
      COUNT(*) FILTER (WHERE k = 'clicked') AS clicked
    FROM b GROUP BY bucket ORDER BY bucket LIMIT 200`;

  const [timing] = await prisma.$queryRaw<Array<{ deliver_s: number | null; read_s: number | null; click_s: number | null }>>`
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("deliveredAt" - "sentAt"))) FILTER (WHERE "deliveredAt" IS NOT NULL AND "sentAt" IS NOT NULL) AS deliver_s,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("readAt" - "sentAt"))) FILTER (WHERE "readAt" IS NOT NULL AND "sentAt" IS NOT NULL) AS read_s,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("firstClickAt" - "sentAt"))) FILTER (WHERE "firstClickAt" IS NOT NULL AND "sentAt" IS NOT NULL) AS click_s
    FROM "CampaignRecipient" WHERE "campaignId" = ${campaignId}`;

  const botClicks = await prisma.linkClick.count({ where: { campaignId, isBot: true } });
  const inboundTypes = await prisma.$queryRaw<Array<{ text: string | null; n: bigint }>>`
    SELECT LOWER(TRIM(i.text)) AS text, COUNT(*) AS n
    FROM "InboundMessage" i JOIN "CampaignRecipient" r ON r.id = i."recipientId"
    WHERE r."campaignId" = ${campaignId} AND i.text IS NOT NULL
    GROUP BY LOWER(TRIM(i.text)) ORDER BY n DESC LIMIT 10`;

  const n = (v: bigint | number | null | undefined) => Number(v ?? 0);
  const t = {
    total: n(totals.total), pending: n(totals.pending) + n(totals.sending), sent: n(totals.sent), delivered: n(totals.delivered), read: n(totals.read),
    failed: n(totals.failed), skipped: n(totals.skipped), clicked: n(totals.clicked), clicks: n(totals.clicks), replied: n(totals.replied),
    optedOut: n(totals.opted_out), credits: n(totals.credits), firstSent: totals.first_sent, lastSent: totals.last_sent, botClicks,
  };
  // Não entregue por "131026" costuma ser número sem WhatsApp ou que bloqueou o remetente
  const undeliverable = errors.filter((e) => e.code === 131026).reduce((a, e) => a + n(e.n), 0);

  return {
    totals: t,
    undeliverable,
    errors: errors.map((e) => ({ code: e.code, title: e.title ?? metaErrorLabel(e.code), count: n(e.n) })),
    senders: senders.map((s) => ({
      ...s,
      display: formatPhone(s.display.replace(/\D/g, "")),
      sent: n(s.sent), delivered: n(s.delivered), read: n(s.read), failed: n(s.failed), clicked: n(s.clicked), replied: n(s.replied),
    })),
    timeline: timeline.map((r) => ({ bucket: r.bucket, sent: n(r.sent), delivered: n(r.delivered), read: n(r.read), clicked: n(r.clicked) })),
    timing: { deliver: timing?.deliver_s ?? null, read: timing?.read_s ?? null, click: timing?.click_s ?? null },
    topReplies: inboundTypes.map((r) => ({ text: r.text ?? "", count: n(r.n) })),
  };
}

export function pct(part: number, whole: number) {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toFixed(1).replace(".", ",")}%`;
}

export function duration(seconds: number | null) {
  if (seconds === null || Number.isNaN(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1).replace(".", ",")} h`;
}
