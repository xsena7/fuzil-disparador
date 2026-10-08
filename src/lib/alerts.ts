import type { AlertSeverity, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./env";

export async function createAlert(input: {
  workspaceId: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
}) {
  const alert = await prisma.alert.create({ data: input });
  if (input.severity !== "INFO") {
    const ws = await prisma.workspace.findUnique({ where: { id: input.workspaceId }, select: { telegramChatId: true } });
    if (ws?.telegramChatId) await sendTelegram(ws.telegramChatId, `${input.severity === "CRITICAL" ? "🚨" : "⚠️"} *${input.title}*\n${input.message}`);
  }
  return alert;
}

export async function sendTelegram(chatId: string, text: string) {
  const token = env.telegramBotToken();
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("[telegram] falha ao enviar", err);
  }
}
