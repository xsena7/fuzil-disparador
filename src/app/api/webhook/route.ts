import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { processWebhook, verifyWebhook } from "@/lib/webhook";
import { reportError } from "@/lib/report";

/** Verificação do webhook (feita uma vez pelo painel da Meta). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === env.metaVerifyToken() && env.metaVerifyToken()) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

const lastMark = new Map<string, number>();
/** Marca na WABA que os eventos estão chegando (aparece em Conexões). Só depois de conferir a assinatura. */
async function markWebhook(raw: string, allowed: Set<string> | null) {
  const ids = [...new Set([...raw.matchAll(/"entry"\s*:\s*\[\s*\{\s*"id"\s*:\s*"(\d+)"/g)].map((m) => m[1]))].slice(0, 20);
  if (lastMark.size > 5000) lastMark.clear();
  for (const wabaId of ids) {
    if (allowed && !allowed.has(wabaId)) continue;
    if (Date.now() - (lastMark.get(wabaId) ?? 0) < 60_000) continue;
    lastMark.set(wabaId, Date.now());
    await prisma.whatsAppAccount.updateMany({ where: { wabaId }, data: { webhookLastAt: new Date() } });
  }
}

/** Eventos da Meta: status de mensagens, respostas, templates, qualidade, conta. */
export async function POST(req: Request) {
  const raw = await req.text();
  // Evento gigante não é da Meta
  if (raw.length > 2_000_000) return new Response("Too large", { status: 413 });
  const { ok, wabaIds } = await verifyWebhook(raw, req.headers.get("x-hub-signature-256"));
  if (!ok) return new Response("Invalid signature", { status: 401 });
  void markWebhook(raw, wabaIds).catch(() => undefined);
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const event = await prisma.webhookEvent.create({ data: { payload: payload as Prisma.InputJsonValue } });
  try {
    await processWebhook(payload, wabaIds);
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
  } catch (err) {
    await reportError("webhook", err, { path: "POST /api/webhook", detail: raw.slice(0, 500) });
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { error: err instanceof Error ? err.message : String(err) } });
  }
  // Sempre 200: a Meta reenvia em caso de erro e isso duplicaria eventos
  return new Response("OK", { status: 200 });
}
