import { prisma } from "./db";
import { env } from "./env";
import { DISCORD_COLORS, sendDiscord } from "./discord";

const recent = new Map<string, number>();

/**
 * Registra um erro do sistema: grava em SystemLog (Admin → Logs) e manda pro Discord
 * de erros da plataforma. O mesmo erro não é reenviado ao Discord por 10 minutos.
 */
export async function reportError(source: string, err: unknown, ctx: { path?: string; digest?: string; detail?: string } = {}) {
  const e = err instanceof Error ? err : new Error(String(err));
  const message = (e.message || e.name || "Erro desconhecido").slice(0, 1000);
  const detail = [ctx.detail, e.stack?.split("\n").slice(0, 8).join("\n")].filter(Boolean).join("\n").slice(0, 4000);
  console.error(`[${source}]`, ctx.path ?? "", e);
  try {
    await prisma.systemLog.create({ data: { level: "error", source, message, detail, path: ctx.path, digest: ctx.digest } });
  } catch {
    /* banco fora do ar: segue só com o Discord */
  }
  const key = `${source}|${message}`;
  const last = recent.get(key) ?? 0;
  if (Date.now() - last < 10 * 60_000) return;
  recent.set(key, Date.now());
  await sendDiscord(env.discordErrorsWebhook(), {
    title: `❌ Erro no ${source === "web" ? "site" : source}`,
    description: "```\n" + message + "\n```",
    color: DISCORD_COLORS.ERROR,
    url: `${env.appUrl()}/admin/logs`,
    fields: [
      ...(ctx.path ? [{ name: "Página / rota", value: ctx.path, inline: true }] : []),
      ...(ctx.digest ? [{ name: "Código (digest)", value: ctx.digest, inline: true }] : []),
      ...(detail ? [{ name: "Detalhe", value: "```\n" + detail.slice(0, 900) + "\n```" }] : []),
    ],
  });
}
