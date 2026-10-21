import type { Funnel, Lead } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./env";
import { decrypt, sha256 } from "./crypto";

/**
 * API de Conversões da Meta: manda do servidor os mesmos eventos do Pixel (Lead, CompleteRegistration,
 * SubmitApplication). O event_id é igual ao do navegador, então a Meta junta os dois e não conta em dobro.
 */
export type CapiEvent = "Lead" | "CompleteRegistration" | "SubmitApplication";
export type CapiContext = { ip?: string | null; ua?: string | null; fbp?: string | null; fbc?: string | null; url?: string | null };

/** Mesmo id que o navegador usa (pixel.tsx). */
export const capiEventId = (event: CapiEvent, formToken: string) => `${event}-${formToken.slice(0, 12)}`;

const h = (v?: string | null) => (v ? sha256(v.trim().toLowerCase()) : undefined);

export async function sendCapi(funnel: Funnel, lead: Lead, event: CapiEvent, ctx: CapiContext) {
  if (!funnel.pixelId || !funnel.capiTokenEnc) return;
  let token: string;
  try {
    token = decrypt(funnel.capiTokenEnc);
  } catch {
    return;
  }
  const [first, ...rest] = lead.name.split(/\s+/);
  const fbclid = ((lead.utm ?? {}) as Record<string, string>).fbclid;
  const user_data: Record<string, unknown> = {
    em: lead.email ? [h(lead.email)] : undefined,
    ph: [sha256(lead.phone)],
    fn: [h(first)],
    ln: rest.length ? [h(rest[rest.length - 1])] : undefined,
    country: [h("br")],
    external_id: [sha256(lead.id)],
    client_ip_address: ctx.ip && ctx.ip !== "local" ? ctx.ip : undefined,
    client_user_agent: ctx.ua || undefined,
    fbp: ctx.fbp || undefined,
    fbc: ctx.fbc || (fbclid ? `fb.1.${lead.createdAt.getTime()}.${fbclid}` : undefined),
  };
  const body = {
    data: [
      {
        event_name: event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: capiEventId(event, lead.formToken),
        action_source: "website",
        event_source_url: ctx.url || undefined,
        user_data,
        ...(lead.job ? { custom_data: { content_name: lead.job } } : {}),
      },
    ],
    ...(funnel.capiTestCode ? { test_event_code: funnel.capiTestCode } : {}),
    access_token: token,
  };
  try {
    const res = await fetch(`${env.metaGraphUrl()}/${env.metaGraphVersion()}/${funnel.pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
    await prisma.funnel.update({ where: { id: funnel.id }, data: { capiLastOkAt: new Date(), capiLastError: null } });
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).slice(0, 300);
    await prisma.funnel.update({ where: { id: funnel.id }, data: { capiLastError: `${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}: ${msg}` } }).catch(() => undefined);
  }
}
