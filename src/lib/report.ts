import { prisma } from "./db";
import { env } from "./env";
import { DISCORD_COLORS, sendDiscord } from "./discord";
import { explainSystemError, URGENCY_LABEL } from "./explain";

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
  const ex = explainSystemError(source, message, detail);
  await sendDiscord(env.discordErrorsWebhook(), {
    title: `${ex.urgency === "URGENTE" ? "🚨" : ex.urgency === "ATENCAO" ? "⚠️" : "ℹ️"} Erro ${source === "web" ? "no site" : source === "worker" ? "no motor de disparo" : source === "webhook" ? "nos eventos da Meta" : `no ${source}`}`,
    description: [`**${URGENCY_LABEL[ex.urgency]}**`, "", `**O que significa:** ${ex.meaning}`, `**O que fazer:** ${ex.action}`].join("\n"),
    color: ex.urgency === "URGENTE" ? DISCORD_COLORS.ERROR : ex.urgency === "ATENCAO" ? DISCORD_COLORS.WARNING : DISCORD_COLORS.INFO,
    url: `${env.appUrl()}/admin/logs`,
    fields: [
      ...(ctx.path ? [{ name: "Onde", value: ctx.path, inline: true }] : []),
      ...(ctx.digest ? [{ name: "Código (digest)", value: ctx.digest, inline: true }] : []),
      { name: "Detalhe técnico (para o suporte)", value: "```\n" + [message, detail].filter(Boolean).join("\n").slice(0, 900) + "\n```" },
    ],
  });
}
