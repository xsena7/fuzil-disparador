import type { AlertSeverity, Prisma } from "@prisma/client";
import { prisma } from "./db";

/** Registra um alerta. Ele aparece no painel (lista de alertas e notificação na tela). */
export async function createAlert(input: {
  workspaceId: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
}) {
  return prisma.alert.create({ data: input });
}
