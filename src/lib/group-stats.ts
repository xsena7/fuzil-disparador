import { prisma } from "./db";
import { tierToLimit } from "./limits";

export type GroupStats = {
  totalLimit: number; // soma dos limites das BMs (Infinity se alguma for ilimitada)
  usedToday: number;
  available: number;
  phones: number;
  activePhones: number;
  quality: { GREEN: number; YELLOW: number; RED: number; UNKNOWN: number };
};

/** Soma limites e uso de 24h de um conjunto de BMs. */
export async function statsForBusinesses(businessIds: string[]): Promise<GroupStats> {
  const stats: GroupStats = { totalLimit: 0, usedToday: 0, available: 0, phones: 0, activePhones: 0, quality: { GREEN: 0, YELLOW: 0, RED: 0, UNKNOWN: 0 } };
  if (!businessIds.length) return stats;
  const bms = await prisma.businessManager.findMany({
    where: { id: { in: businessIds } },
    include: { wabas: { include: { phones: true } } },
  });
  const usedRows = await prisma.$queryRaw<Array<{ businessId: string; used: bigint }>>`
    SELECT w."businessId" AS "businessId", COUNT(DISTINCT r.phone) AS used
    FROM "CampaignRecipient" r
    JOIN "PhoneNumber" p ON p.id = r."senderId"
    JOIN "WhatsAppAccount" w ON w.id = p."wabaId"
    WHERE r."sentAt" > NOW() - INTERVAL '24 hours' AND w."businessId" = ANY(${businessIds})
    GROUP BY w."businessId"`;
  const used = new Map(usedRows.map((r) => [r.businessId, Number(r.used)]));
  for (const bm of bms) {
    const limit = tierToLimit(bm.messagingLimitTier) ?? 0;
    const u = used.get(bm.id) ?? 0;
    stats.totalLimit += limit;
    stats.usedToday += u;
    stats.available += Math.max(0, limit - u);
    for (const w of bm.wabas)
      for (const p of w.phones) {
        stats.phones++;
        if (p.enabled && p.status === "CONNECTED") stats.activePhones++;
        const q = (p.qualityRating ?? "UNKNOWN") as keyof GroupStats["quality"];
        stats.quality[q in stats.quality ? q : "UNKNOWN"]++;
      }
  }
  return stats;
}
