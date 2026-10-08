/** Envio para webhooks do Discord (mensagens com "embed" colorido). */
import { env } from "./env";

export const DISCORD_COLORS = { CRITICAL: 0xe11d48, WARNING: 0xf59e0b, INFO: 0x0ea5e9, SUCCESS: 0x10b981, ERROR: 0xb91c1c } as const;

export function isDiscordWebhook(url: string) {
  return /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/.test(url.trim());
}

export type DiscordEmbed = { title: string; description?: string; color?: number; url?: string; image?: string; fields?: Array<{ name: string; value: string; inline?: boolean }> };

export async function sendDiscord(url: string | null | undefined, embed: DiscordEmbed): Promise<boolean> {
  return (await sendDiscordDetailed(url, embed)).ok;
}

/** Igual ao sendDiscord, mas diz POR QUE não foi (sem canal, link inválido, Discord recusou...). */
export async function sendDiscordDetailed(url: string | null | undefined, embed: DiscordEmbed): Promise<{ ok: boolean; error?: string }> {
  if (!url) return { ok: false, error: "nenhum canal do Discord configurado" };
  if (!isDiscordWebhook(url)) return { ok: false, error: "link do webhook inválido" };
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  try {
    const res = await fetch(url.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Fuzil Disparador",
        avatar_url: `${env.appUrl()}/brand/icon-512.png`,
        embeds: [
          {
            title: clip(embed.title, 250),
            description: embed.description ? clip(embed.description, 3900) : undefined,
            color: embed.color ?? DISCORD_COLORS.INFO,
            url: embed.url,
            image: embed.image ? { url: embed.image } : undefined,
            fields: embed.fields?.slice(0, 10).map((f) => ({ ...f, name: clip(f.name, 250), value: clip(f.value || "—", 1000) })),
            timestamp: new Date().toISOString(),
            footer: { text: "Fuzil Disparador" },
          },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true };
    const body = (await res.text().catch(() => "")).slice(0, 200);
    const reason =
      res.status === 404 ? "o webhook foi apagado no Discord (crie outro e cole de novo)" :
      res.status === 401 || res.status === 403 ? "o Discord recusou o webhook" :
      res.status === 429 ? "muitas mensagens seguidas (o Discord pediu para esperar)" :
      `o Discord respondeu ${res.status}${body ? `: ${body}` : ""}`;
    console.error("[discord]", reason);
    return { ok: false, error: reason };
  } catch (e) {
    const reason = `sem conexão com o Discord (${e instanceof Error ? e.message : String(e)})`;
    console.error("[discord]", reason);
    return { ok: false, error: reason };
  }
}
