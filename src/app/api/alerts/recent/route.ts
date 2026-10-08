import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Alertas criados depois de `after` (usado pelas notificações na tela). */
export async function GET(req: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ alerts: [] }, { status: 401 });
  const after = new URL(req.url).searchParams.get("after");
  const since = after ? new Date(after) : new Date(Date.now() - 60_000);
  const alerts = await prisma.alert.findMany({
    where: { workspaceId: auth.workspace.id, createdAt: { gt: Number.isNaN(since.getTime()) ? new Date() : since } },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true, title: true, message: true, severity: true, createdAt: true },
  });
  return NextResponse.json({ alerts, now: new Date().toISOString() });
}
