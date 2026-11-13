import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Saúde do painel (o Docker e o vigia do servidor usam): responde 200 se o painel e o banco estão de pé. */
export async function GET() {
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, new Promise((_, rej) => setTimeout(() => rej(new Error("banco lento")), 5000))]);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "banco" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
