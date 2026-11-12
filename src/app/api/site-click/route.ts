import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientIp, tooMany } from "@/lib/rate-limit";

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, "").trim().slice(0, max) : "");

/** Clique no botão do WhatsApp do site: soma 1 no contador do dia (anônimo, sem cookie, sem guardar quem clicou). */
export async function POST(req: Request) {
  if (tooMany(`siteclick:${await clientIp()}`, 30, 60_000)) return new NextResponse(null, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const page = clean(b.page, 80) || "/";
  const button = clean(b.button, 60) || "WhatsApp";
  const source = clean(b.source, 80) || "Direto";
  // Dia no horário de Brasília
  const day = new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}T00:00:00Z`);
  await prisma.siteClick.upsert({
    where: { day_page_button_source: { day, page, button, source } },
    create: { day, page, button, source, count: 1 },
    update: { count: { increment: 1 } },
  });
  return NextResponse.json({ ok: true });
}
