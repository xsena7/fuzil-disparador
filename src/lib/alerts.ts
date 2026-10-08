import type { AlertSeverity, Prisma } from "@prisma/client";
import { prisma } from "./db";

/**
 * Registra um alerta. Ele aparece no painel (lista e notificação na tela).
 * Alertas CRÍTICOS também vão por e-mail para donos/admins (sem repetir o mesmo em 30 min).
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
  if (input.severity === "CRITICAL") {
    emailCritical(alert.id, input).catch((err) => console.error("[alert-email]", err));
  }
  return alert;
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
