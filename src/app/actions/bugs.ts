"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { saveUpload } from "@/lib/uploads";
import { DISCORD_COLORS, sendDiscord } from "@/lib/discord";
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

  const hooks = await platformDiscordHooks();
  await sendDiscord(hooks?.bugs || hooks?.general, {
    title: "🐞 Bug reportado",
    description: message,
    color: DISCORD_COLORS.WARNING,
    url: `${env.appUrl()}/admin#bugs`,
    fields: [
      { name: "Quem", value: `${auth.user.name} (${auth.user.email})`, inline: true },
      { name: "Conta", value: auth.workspace.name, inline: true },
      ...(pagePath ? [{ name: "Página", value: pagePath, inline: true }] : []),
      ...(screenshotUrl ? [{ name: "Print", value: screenshotUrl }] : []),
    ],
    ...(screenshotUrl ? { image: screenshotUrl } : {}),
  });
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
