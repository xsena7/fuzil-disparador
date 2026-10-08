"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { saveUpload } from "@/lib/uploads";
import { DISCORD_COLORS, sendDiscordDetailed } from "@/lib/discord";
import { platformDiscordHooks } from "@/lib/alerts";

const recent = new Map<string, number>();

/** Botão "Reportar bug": grava no Admin e avisa no Discord #bugs (ou #geral). */
export async function reportBugAction(form: FormData): Promise<{ ok?: string; error?: string }> {
  const auth = await requireAuth();
  const message = String(form.get("message") ?? "").trim().slice(0, 4000);
  if (message.length < 5) return { error: "Conte o que aconteceu (pelo menos uma frase)." };
  // Anti-flood: no máximo 1 relato a cada 30s por usuário
  const last = recent.get(auth.user.id) ?? 0;
  if (Date.now() - last < 30_000) return { error: "Aguarde alguns segundos antes de mandar outro relato." };
  recent.set(auth.user.id, Date.now());

  let screenshotUrl: string | undefined;
  const file = form.get("screenshot");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return { error: "O print precisa ser uma imagem (PNG ou JPG)." };
    try {
      screenshotUrl = (await saveUpload(file)).url;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Não consegui salvar o print." };
    }
  }
  const pagePath = String(form.get("pagePath") ?? "").slice(0, 300) || null;
  const userAgent = String(form.get("userAgent") ?? "").slice(0, 400) || null;

  const bug = await prisma.bugReport.create({
    data: {
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      workspaceId: auth.workspace.id,
      workspaceName: auth.workspace.name,
      message,
      pagePath,
      userAgent,
      screenshotUrl,
    },
  });

  await notifyBugDiscord(bug.id);
  revalidatePath("/admin");
  return { ok: `Recebemos! Protocolo #${bug.id.slice(-6).toUpperCase()}. Vamos analisar e corrigir.` };
}

export async function setBugStatusAction(id: string, resolved: boolean) {
  await requireSuperAdmin();
  await prisma.bugReport.update({ where: { id }, data: { status: resolved ? "RESOLVED" : "OPEN", resolvedAt: resolved ? new Date() : null } });
  revalidatePath("/admin");
}

export async function deleteBugAction(id: string) {
  await requireSuperAdmin();
  await prisma.bugReport.delete({ where: { id } });
  revalidatePath("/admin");
}

/**
 * Manda o bug pro Discord: canal #bugs; se não tiver, #geral; depois #erros; depois qualquer canal configurado.
 * Guarda se chegou (e o motivo, se não chegou) para aparecer no Admin.
 */
async function notifyBugDiscord(id: string): Promise<{ ok: boolean; error?: string }> {
  const b = await prisma.bugReport.findUniqueOrThrow({ where: { id } });
  const hooks = await platformDiscordHooks();
  // Último caso: qualquer canal configurado (melhor chegar no canal "errado" do que não chegar)
  const url = hooks?.bugs || hooks?.general || env.discordErrorsWebhook() || Object.values(hooks ?? {}).find(Boolean) || null;
  const res = await sendDiscordDetailed(url, {
    title: `🐞 Bug reportado #${b.id.slice(-6).toUpperCase()}`,
    description: b.message,
    color: DISCORD_COLORS.WARNING,
    url: `${env.appUrl()}/admin#bugs`,
    fields: [
      { name: "Quem", value: `${b.userName} (${b.userEmail})`, inline: true },
      { name: "Conta", value: b.workspaceName, inline: true },
      ...(b.pagePath ? [{ name: "Página", value: b.pagePath, inline: true }] : []),
      ...(b.screenshotUrl ? [{ name: "Print", value: b.screenshotUrl }] : []),
    ],
    ...(b.screenshotUrl ? { image: b.screenshotUrl } : {}),
  });
  await prisma.bugReport.update({ where: { id }, data: { discordSent: res.ok, discordError: res.ok ? null : res.error } });
  return res;
}

export async function resendBugDiscordAction(id: string) {
  await requireSuperAdmin();
  await notifyBugDiscord(id);
  revalidatePath("/admin");
}
