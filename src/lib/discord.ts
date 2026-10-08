/** Envio para webhooks do Discord (mensagens com "embed" colorido). */
import { env } from "./env";

export const DISCORD_COLORS = { CRITICAL: 0xe11d48, WARNING: 0xf59e0b, INFO: 0x0ea5e9, SUCCESS: 0x10b981, ERROR: 0xb91c1c } as const;

export function isDiscordWebhook(url: string) {
  return /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/.test(url.trim());
}

export async function sendDiscord(
  url: string | null | undefined,
  embed: { title: string; description?: string; color?: number; url?: string; image?: string; fields?: Array<{ name: string; value: string; inline?: boolean }> },
): Promise<boolean> {
  if (!url || !isDiscordWebhook(url)) return false;
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
    return res.ok;
  } catch {
    return false;
  }
}
