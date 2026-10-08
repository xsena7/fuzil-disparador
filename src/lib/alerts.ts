import { Prisma, type AlertSeverity } from "@prisma/client";
import { cachedSetting } from "./settings-cache";
import { prisma } from "./db";
import { env } from "./env";
import { DISCORD_COLORS, sendDiscord } from "./discord";
import { webhookFor, type DiscordWebhooks } from "./alert-channels";
import { explainAlert, URGENCY_LABEL, type Urgency } from "./explain";

const EMOJI: Record<Urgency, string> = { URGENTE: "🚨", ATENCAO: "⚠️", INFO: "ℹ️" };
const COLOR: Record<Urgency, number> = { URGENTE: DISCORD_COLORS.CRITICAL, ATENCAO: DISCORD_COLORS.WARNING, INFO: DISCORD_COLORS.INFO };

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
  const ws = await prisma.workspace.findUnique({ where: { id: input.workspaceId }, select: { name: true } });
  const url = webhookFor(await platformDiscordHooks(), input.type);
  if (!url) return;
  const success = input.type === "CAMPAIGN_COMPLETED" || input.type === "BM_LIMIT_RELEASED" || input.type === "CAMPAIGN_STARTED";
  const ex = explainAlert(input);
  await sendDiscord(url, {
    title: `${success ? "✅" : EMOJI[ex.urgency]} ${input.title}`,
    description: [`**${URGENCY_LABEL[ex.urgency]}**`, "", `**O que significa:** ${ex.meaning}`, `**O que fazer:** ${ex.action}`].join("\n"),
    color: success ? DISCORD_COLORS.SUCCESS : COLOR[ex.urgency],
    url: `${env.appUrl()}/alertas`,
    fields: [
      { name: "Conta", value: ws?.name ?? "—", inline: true },
      ...(input.message ? [{ name: "Detalhe", value: input.message }] : []),
    ],
  });
}

/**
 * Canais do Discord da plataforma (configurados no Admin): recebem os avisos de TODAS as contas.
 * Antes eram salvos na conta do admin; se ainda não foram salvos no Admin, usa os de lá.
 */
export async function platformDiscordHooks(): Promise<DiscordWebhooks | null> {
  const raw = cachedSetting("DISCORD_CHANNELS");
  if (raw) {
    try {
      return JSON.parse(raw) as DiscordWebhooks;
    } catch {
      /* valor inválido: cai no legado */
    }
  }
  const legacy = await prisma.workspace.findFirst({
    where: { discordWebhooks: { not: Prisma.DbNull }, memberships: { some: { user: { isSuperAdmin: true } } } },
    select: { discordWebhooks: true },
    orderBy: { createdAt: "asc" },
  });
  return (legacy?.discordWebhooks as DiscordWebhooks | null) ?? null;
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
