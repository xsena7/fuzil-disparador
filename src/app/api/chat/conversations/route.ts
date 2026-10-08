import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getActiveAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Lista de conversas do chat.
 * ?phone=<id>  ?group=<id>  ?tab=sending|active  ?closed=1  ?unread=1  ?q=texto  ?before=<iso> (paginação)
 */
export async function GET(req: Request) {
  const auth = await getActiveAuth();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const ws = auth.workspace.id;
  const tab = sp.get("tab") ?? "active";
  const closed = sp.get("closed") === "1";
  const q = sp.get("q")?.trim();
  const before = sp.get("before");
  const phoneId = sp.get("phone");
  const groupId = sp.get("group");

  let phoneIds: string[] | undefined;
  if (phoneId) phoneIds = [phoneId];
  else if (groupId) {
    const phones = await prisma.phoneNumber.findMany({
      where: { waba: { workspaceId: ws, business: { groups: { some: { groupId } } } } },
      select: { id: true },
    });
    phoneIds = phones.map((p) => p.id);
  }

  const where: Prisma.ConversationWhereInput = {
    workspaceId: ws,
    ...(phoneIds ? { phoneId: { in: phoneIds } } : {}),
    // Disparando: só recebeu o disparo. Em andamento: respondeu OU clicou no botão.
    // Finalizadas: todas, de qualquer aba
    ...(closed ? { status: "CLOSED" as const } : { status: { not: "CLOSED" as const } }),
    ...(!closed && tab === "sending" ? { hasInbound: false, clickedAt: null } : {}),
    ...(!closed && tab === "active" ? { OR: [{ hasInbound: true }, { clickedAt: { not: null } }] } : {}),
    ...(sp.get("unread") === "1" ? { unread: { gt: 0 } } : {}),
    ...(q ? { AND: [{ OR: [{ contactPhone: { contains: q.replace(/\D/g, "") || q } }, { contactName: { contains: q, mode: "insensitive" } }] }] } : {}),
    ...(before ? { lastMessageAt: { lt: new Date(before) } } : {}),
  };

  const [rows, counts] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: 40,
      select: {
        id: true, contactPhone: true, contactName: true, status: true, unread: true, hasInbound: true,
        lastMessageAt: true, lastMessageText: true, lastDirection: true, lastInboundAt: true, phoneId: true, clickedAt: true,
      },
    }),
    // Não lidas por número (para as "caixas")
    prisma.conversation.groupBy({ by: ["phoneId"], where: { workspaceId: ws, unread: { gt: 0 } }, _count: { _all: true } }),
  ]);

  return NextResponse.json({
    conversations: rows,
    unreadByPhone: Object.fromEntries(counts.map((c) => [c.phoneId, c._count._all])),
    now: new Date().toISOString(),
  });
}
