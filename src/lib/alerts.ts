import type { AlertSeverity, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./env";
import { DISCORD_COLORS, sendDiscord } from "./discord";
import { webhookFor, type DiscordWebhooks } from "./alert-channels";

const EMOJI: Record<AlertSeverity, string> = { CRITICAL: "🚨", WARNING: "⚠️", INFO: "ℹ️" };

/**
 * Registra um alerta: aparece no painel, vai pro canal certo do Discord
 * e, se for CRÍTICO, por e-mail para donos/admins (sem repetir o mesmo em 30 min).
 */
export async function createAlert(input: {
  workspaceId: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
}) {
  const alert = await prisma.alert.create({ data: input });
  notifyDiscord(input).catch((err) => console.error("[alert-discord]", err));
  if (input.severity === "CRITICAL") {
    emailCritical(alert.id, input).catch((err) => console.error("[alert-email]", err));
  }
  return alert;
}

async function notifyDiscord(input: { workspaceId: string; type: string; severity: AlertSeverity; title: string; message: string }) {
  const ws = await prisma.workspace.findUnique({ where: { id: input.workspaceId }, select: { name: true, discordWebhooks: true } });
  const url = webhookFor(ws?.discordWebhooks as DiscordWebhooks | null, input.type);
  if (!url) return;
  const success = input.type === "CAMPAIGN_COMPLETED" || input.type === "BM_LIMIT_RELEASED" || input.type === "CAMPAIGN_STARTED";
  await sendDiscord(url, {
    title: `${success ? "✅" : EMOJI[input.severity]} ${input.title}`,
    description: input.message,
    color: success ? DISCORD_COLORS.SUCCESS : DISCORD_COLORS[input.severity],
    url: `${env.appUrl()}/alertas`,
    fields: [{ name: "Conta", value: ws?.name ?? "—", inline: true }],
  });
}

async function emailCritical(alertId: string, input: { workspaceId: string; title: string; message: string }) {
  const ws = await prisma.workspace.findUnique({ where: { id: input.workspaceId }, select: { name: true, emailAlerts: true } });
  if (!ws?.emailAlerts) return;
  const repeated = await prisma.alert.count({
    where: { workspaceId: input.workspaceId, title: input.title, id: { not: alertId }, createdAt: { gt: new Date(Date.now() - 30 * 60_000) } },
  });
  if (repeated) return;
  const owners = await prisma.membership.findMany({
    where: { workspaceId: input.workspaceId, role: { in: ["OWNER", "ADMIN"] } },
    include: { user: { select: { email: true } } },
  });
  if (!owners.length) return;
  const { sendCriticalAlertEmail } = await import("./email-templates");
  await sendCriticalAlertEmail(owners.map((o) => o.user.email), ws.name, input.title, input.message);
}
