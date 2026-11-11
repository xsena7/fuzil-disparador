// API de Conversões da Meta (Pixel do site pelo servidor). O ID do Pixel e o token ficam em Admin → Plataforma.
// O mesmo evento sai pelo navegador (fbq) e por aqui com o mesmo event_id: a Meta junta e não conta duas vezes.
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { env } from "./env";

export const PX_CONSENT_COOKIE = "fz_px";
export const BROWSER_EVENTS = ["PageView", "ViewContent", "AddToCart", "Contact"] as const;

const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

/** O visitante aceitou os cookies de anúncio no site? (cookie gravado pelo aviso do site) */
export async function pxConsent(): Promise<boolean> {
  return (await cookies()).get(PX_CONSENT_COOKIE)?.value === "1";
}

export async function sendCapiEvent(ev: { name: string; eventId: string; url?: string | null; email?: string | null; custom?: Record<string, string | number> }) {
  const pixel = env.metaPixelId();
  const token = env.metaCapiToken();
  if (!pixel || !token) return;
  const h = await headers();
  const c = await cookies();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
  const user_data: Record<string, unknown> = {
    client_user_agent: h.get("user-agent") ?? undefined,
    client_ip_address: ip && ip !== "local" ? ip : undefined,
    fbp: c.get("_fbp")?.value,
    fbc: c.get("_fbc")?.value,
    ...(ev.email ? { em: [sha(ev.email)] } : {}),
  };
  const body = {
    data: [
      {
        event_name: ev.name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: ev.eventId,
        action_source: "website",
        event_source_url: ev.url ?? h.get("referer") ?? undefined,
        user_data,
        ...(ev.custom ? { custom_data: ev.custom } : {}),
      },
    ],
    // Só durante o teste no Gerenciador de Eventos (variável META_CAPI_TEST_CODE no servidor)
    ...(process.env.META_CAPI_TEST_CODE ? { test_event_code: process.env.META_CAPI_TEST_CODE } : {}),
  };
  try {
    const res = await fetch(`${env.metaGraphUrl()}/${env.metaGraphVersion()}/${pixel}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    // Nunca loga o token: só o status e a mensagem da Meta
    if (!res.ok) console.error("[capi]", ev.name, res.status, ((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "");
  } catch (e) {
    console.error("[capi]", ev.name, e instanceof Error ? e.message : e);
  }
}

/** Cadastro feito (painel ou site de links): só pelo servidor, e só se o visitante aceitou os cookies. */
export async function capiRegistration(email: string, kind: string) {
  if (!(await pxConsent())) return;
  const { randomUUID } = await import("node:crypto");
  await sendCapiEvent({ name: "CompleteRegistration", eventId: randomUUID(), email, custom: { content_name: kind } });
}
