import { prisma } from "./db";
import { tierToLimit } from "./limits";

export type AccountRow = {
  id: string;
  name: string;
  createdAt: string;
  blocked: boolean;
  blockedReason: string | null;
  isMine: boolean;
  creditBalance: number;
  creditsPerMessage: number;
  owner: { name: string; email: string } | null;
  users: Array<{ id: string; name: string; email: string; role: string; lastLoginAt: string | null; isSuperAdmin: boolean }>;
  bms: Array<{ name: string; limit: number | null; used: number }>;
  /** Soma dos limites de 24h das BMs (null = nenhuma BM com limite conhecido; -1 = ilimitado). */
  totalLimit: number | null;
  used24h: number;
  sentTotal: number;
  campaigns: number;
  running: number;
};

/** Lista de contas para o painel do Admin: dono, usuários, limite somado das BMs e total de disparos. */
export async function listAccounts(adminUserId: string): Promise<AccountRow[]> {
  const [workspaces, usedRows, sentRows] = await Promise.all([
    prisma.workspace.findMany({
      include: {
        memberships: { include: { user: true }, orderBy: { role: "asc" } },
        businesses: { select: { id: true, name: true, messagingLimitTier: true }, orderBy: { name: "asc" } },
        campaigns: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.$queryRaw<Array<{ businessId: string; used: bigint }>>`
      SELECT w."businessId" AS "businessId", COUNT(DISTINCT r.phone) AS used
      FROM "CampaignRecipient" r
      JOIN "PhoneNumber" p ON p.id = r."senderId"
      JOIN "WhatsAppAccount" w ON w.id = p."wabaId"
      WHERE r."sentAt" > NOW() - INTERVAL '24 hours'
      GROUP BY w."businessId"`,
    prisma.$queryRaw<Array<{ workspaceId: string; sent: bigint }>>`
      SELECT c."workspaceId" AS "workspaceId", COUNT(*) AS sent
      FROM "CampaignRecipient" r JOIN "Campaign" c ON c.id = r."campaignId"
      WHERE r."sentAt" IS NOT NULL
      GROUP BY c."workspaceId"`,
  ]);
  const used = new Map(usedRows.map((r) => [r.businessId, Number(r.used)]));
  const sent = new Map(sentRows.map((r) => [r.workspaceId, Number(r.sent)]));

  return workspaces.map((w) => {
    const bms = w.businesses.map((b) => ({ name: b.name, limit: tierToLimit(b.messagingLimitTier), used: used.get(b.id) ?? 0 }));
    const known = bms.filter((b) => b.limit !== null);
    const totalLimit = !known.length ? null : known.some((b) => b.limit === Infinity) ? -1 : known.reduce((a, b) => a + (b.limit as number), 0);
    const owner = w.memberships.find((m) => m.role === "OWNER") ?? w.memberships[0];
    return {
      id: w.id,
      name: w.name,
      createdAt: w.createdAt.toISOString(),
      blocked: Boolean(w.blockedAt),
      blockedReason: w.blockedReason,
      isMine: w.memberships.some((m) => m.userId === adminUserId),
      creditBalance: w.creditBalance,
      creditsPerMessage: w.creditsPerMessage,
      owner: owner ? { name: owner.user.name, email: owner.user.email } : null,
      users: w.memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
        isSuperAdmin: m.user.isSuperAdmin,
      })),
      bms: bms.map((b) => ({ ...b, limit: b.limit === Infinity ? -1 : b.limit })),
      totalLimit,
      used24h: bms.reduce((a, b) => a + b.used, 0),
      sentTotal: sent.get(w.id) ?? 0,
      campaigns: w.campaigns.length,
      running: w.campaigns.filter((c) => c.status === "RUNNING").length,
    };
  });
}
