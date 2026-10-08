import { prisma } from "./db";
import { tierToLimit } from "./limits";

/**
 * O limite da Meta é uma janela móvel de 24h por portfólio (BM): cada destinatário único
 * conta até 24h depois do ÚLTIMO envio para ele. Aqui calculamos quando a capacidade volta.
 */
export type BmWindow = {
  businessId: string;
  limit: number; // Infinity = ilimitado
  used: number;
  available: number;
  /** Primeiro momento em que algum destinatário sai da janela. */
  nextReleaseAt: Date | null;
  /** Quantos destinatários saem na primeira hora a partir de nextReleaseAt. */
  nextReleaseCount: number;
  /** Quando a janela fica totalmente vazia (último envio + 24h). */
  fullResetAt: Date | null;
  /** Liberações agrupadas por hora (para a linha do tempo). */
  releases: Array<{ at: Date; count: number }>;
};

export async function bmWindows(businessIds: string[]): Promise<Map<string, BmWindow>> {
  const out = new Map<string, BmWindow>();
  if (!businessIds.length) return out;

  const bms = await prisma.businessManager.findMany({ where: { id: { in: businessIds } }, select: { id: true, messagingLimitTier: true } });
  const rows = await prisma.$queryRaw<Array<{ businessId: string; bucket: Date; count: bigint; first: Date; last: Date }>>`
    WITH last_per_phone AS (
      SELECT w."businessId" AS "businessId", r.phone, MAX(r."sentAt") AS last_sent
      FROM "CampaignRecipient" r
      JOIN "PhoneNumber" p ON p.id = r."senderId"
      JOIN "WhatsAppAccount" w ON w.id = p."wabaId"
      WHERE r."sentAt" > NOW() - INTERVAL '24 hours' AND w."businessId" = ANY(${businessIds})
      GROUP BY 1, 2
    )
    SELECT "businessId",
      date_trunc('hour', last_sent + INTERVAL '24 hours') AS bucket,
      COUNT(*) AS count,
      MIN(last_sent + INTERVAL '24 hours') AS first,
      MAX(last_sent + INTERVAL '24 hours') AS last
    FROM last_per_phone
    GROUP BY 1, 2
    ORDER BY 1, 2`;

  for (const bm of bms) {
    const mine = rows.filter((r) => r.businessId === bm.id);
    const used = mine.reduce((a, r) => a + Number(r.count), 0);
    const limit = tierToLimit(bm.messagingLimitTier) ?? Infinity;
    const first = mine[0];
    out.set(bm.id, {
      businessId: bm.id,
      limit,
      used,
      available: Math.max(0, limit - used),
      nextReleaseAt: first ? new Date(first.first) : null,
      nextReleaseCount: first ? Number(first.count) : 0,
      fullResetAt: mine.length ? new Date(mine[mine.length - 1].last) : null,
      releases: mine.map((r) => ({ at: new Date(r.bucket), count: Number(r.count) })),
    });
  }
  return out;
}

/** Uso de cada cópia de template: último envio e volume nas últimas 24h. */
export async function templateUsage(workspaceId: string) {
  const rows = await prisma.$queryRaw<Array<{ wabaId: string; name: string; language: string; last: Date | null; day: bigint; total: bigint }>>`
    SELECT p."wabaId" AS "wabaId", c."templateName" AS name, c."templateLanguage" AS language,
      MAX(r."sentAt") AS last,
      COUNT(*) FILTER (WHERE r."sentAt" > NOW() - INTERVAL '24 hours') AS day,
      COUNT(*) AS total
    FROM "CampaignRecipient" r
    JOIN "Campaign" c ON c.id = r."campaignId"
    JOIN "PhoneNumber" p ON p.id = r."senderId"
    WHERE c."workspaceId" = ${workspaceId} AND r."sentAt" IS NOT NULL
    GROUP BY 1, 2, 3`;
  return new Map(rows.map((r) => [`${r.wabaId}|${r.name}|${r.language}`, { last: r.last, day: Number(r.day), total: Number(r.total) }]));
}

export function ago(date: Date | null | undefined): string {
  if (!date) return "nunca";
  const s = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return "agora há pouco";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}min` : ""}`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

/** "14:05", "amanhã 01:05" ou "10/10 09:00" (horário de Brasília). */
export function clock(d: Date): string {
  const tz = "America/Sao_Paulo";
  const day = (x: Date) => x.toLocaleDateString("pt-BR", { timeZone: tz });
  const hm = d.toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const now = new Date();
  if (day(d) === day(now)) return hm;
  if (day(d) === day(new Date(now.getTime() + 86400_000))) return `amanhã ${hm}`;
  return `${d.toLocaleDateString("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit" })} ${hm}`;
}

/** Versão para frases: "às 14:05", "amanhã às 01:05", "em 10/10 às 09:00". */
export function whenText(d: Date): string {
  const c = clock(d);
  if (/^\d{2}:\d{2}$/.test(c)) return `às ${c}`;
  if (c.startsWith("amanhã")) return c.replace("amanhã ", "amanhã às ");
  const [date, hm] = c.split(" ");
  return `em ${date} às ${hm}`;
}
