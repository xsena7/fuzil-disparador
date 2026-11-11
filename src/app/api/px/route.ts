import { NextResponse } from "next/server";
import { BROWSER_EVENTS, pxConsent, sendCapiEvent } from "@/lib/meta-capi";
import { clientIp, tooMany } from "@/lib/rate-limit";

/** Recebe do site o mesmo evento que o Pixel mandou e repassa para a API de Conversões (com o mesmo event_id). */
export async function POST(req: Request) {
  if (!(await pxConsent())) return new NextResponse(null, { status: 204 });
  if (tooMany(`px:${await clientIp()}`, 120, 60_000)) return new NextResponse(null, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { name?: string; eventId?: string; url?: string; custom?: Record<string, unknown> };
  if (!BROWSER_EVENTS.includes(b.name as (typeof BROWSER_EVENTS)[number]) || typeof b.eventId !== "string" || !/^[\w-]{8,64}$/.test(b.eventId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const custom: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(b.custom ?? {}).slice(0, 5)) {
    if (/^[a-z_]{1,30}$/.test(k) && (typeof v === "number" || (typeof v === "string" && v.length <= 100))) custom[k] = v;
  }
  const url = typeof b.url === "string" && /^https?:\/\//.test(b.url) ? b.url.slice(0, 500) : null;
  await sendCapiEvent({ name: b.name!, eventId: b.eventId, url, custom: Object.keys(custom).length ? custom : undefined });
  return NextResponse.json({ ok: true });
}
