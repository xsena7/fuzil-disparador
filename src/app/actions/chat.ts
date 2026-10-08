"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveUpload } from "@/lib/uploads";
import { markConversationRead, sendChatMessage, sendChatTemplate, type TemplateExtras } from "@/lib/chat";
import { normalizePhone } from "@/lib/phone";

type Result = { ok?: boolean; error?: string; conversationId?: string };

async function ownConversation(conversationId: string) {
  const auth = await requireAuth();
  const conv = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId: auth.workspace.id } });
  if (!conv) throw new Error("Conversa não encontrada");
  return { auth, conv };
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Envia texto e/ou anexo numa conversa (dentro da janela de 24h). */
export async function sendChatAction(form: FormData): Promise<Result> {
  try {
    const { auth, conv } = await ownConversation(String(form.get("conversationId")));
    const text = String(form.get("text") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 4096);
    const file = form.get("file");
    let media;
    if (file instanceof File && file.size > 0) {
      const saved = await saveUpload(file);
      const kind = saved.mime.startsWith("image/") ? "image" : saved.mime.startsWith("video/") ? "video" : saved.mime.startsWith("audio/") ? "audio" : "document";
      media = { url: saved.url, kind: kind as "image" | "video" | "audio" | "document", mime: saved.mime, name: saved.name };
    }
    if (!text && !media) return { error: "Escreva uma mensagem ou anexe um arquivo." };
    await sendChatMessage(conv.id, { text: text || undefined, media, source: "AGENT", userId: auth.user.id, replyTo: String(form.get("replyTo") ?? "") || undefined });
    return { ok: true };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

/** Lê do formulário: template, variáveis, complemento dos botões e mídia do cabeçalho. */
async function templateFromForm(form: FormData) {
  const templateId = String(form.get("templateId") ?? "");
  const params = (JSON.parse(String(form.get("params") ?? "[]")) as string[]).map((p) => String(p ?? "").trim().slice(0, 1000));
  const buttonParams = JSON.parse(String(form.get("buttonParams") ?? "{}")) as Record<string, string>;
  const file = form.get("headerFile");
  let headerMedia: TemplateExtras["headerMedia"];
  if (file instanceof File && file.size > 0) {
    if (!/^(image\/(jpeg|png)|video\/mp4|application\/pdf)$/.test(file.type)) throw new Error("Cabeçalho aceita JPG, PNG, MP4 ou PDF.");
    const saved = await saveUpload(file);
    headerMedia = { url: saved.url, kind: saved.mime.startsWith("image/") ? "image" : saved.mime.startsWith("video/") ? "video" : "document", name: saved.name };
  }
  return { templateId, params, extras: { headerMedia, buttonParams } };
}

/** Envia um template (para falar com o cliente fora da janela de 24h). */
export async function sendChatTemplateAction(form: FormData): Promise<Result> {
  try {
    const { auth, conv } = await ownConversation(String(form.get("conversationId")));
    const t = await templateFromForm(form);
    await sendChatTemplate(conv.id, t.templateId, t.params, auth.user.id, t.extras);
    return { ok: true };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

/** Nova conversa: escolhe o número de saída, o contato e o template de abertura. */
export async function startConversationAction(form: FormData): Promise<Result> {
  try {
    const auth = await requireAuth();
    const phone = await prisma.phoneNumber.findFirst({ where: { id: String(form.get("phoneId")), waba: { workspaceId: auth.workspace.id } } });
    if (!phone) return { error: "Escolha o número que vai enviar." };
    const to = normalizePhone(String(form.get("contact") ?? ""));
    if (!to) return { error: "Telefone do contato inválido." };
    const optedOut = await prisma.contact.findUnique({ where: { workspaceId_phone: { workspaceId: auth.workspace.id, phone: to } } });
    if (optedOut?.optedOut) return { error: "Esse contato pediu para não receber mensagens (SAIR)." };
    const t = await templateFromForm(form);
    const conv = await prisma.conversation.upsert({
      where: { phoneId_contactPhone: { phoneId: phone.id, contactPhone: to } },
      create: { workspaceId: auth.workspace.id, phoneId: phone.id, contactPhone: to, status: "ATTENDING", assignedUserId: auth.user.id },
      update: {},
    });
    await sendChatTemplate(conv.id, t.templateId, t.params, auth.user.id, t.extras);
    return { ok: true, conversationId: conv.id };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function setConversationStatusAction(conversationId: string, status: "OPEN" | "ATTENDING" | "CLOSED"): Promise<Result> {
  try {
    const { auth, conv } = await ownConversation(conversationId);
    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        status,
        closedAt: status === "CLOSED" ? new Date() : null,
        ...(status === "ATTENDING" ? { assignedUserId: auth.user.id } : {}),
        ...(status === "CLOSED" ? { unread: 0 } : {}),
      },
    });
    return { ok: true };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function markConversationReadAction(conversationId: string): Promise<Result> {
  try {
    const { conv } = await ownConversation(conversationId);
    await markConversationRead(conv.id);
    return { ok: true };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function saveQuickReplyAction(shortcut: string, text: string): Promise<Result> {
  const auth = await requireAuth();
  const key = shortcut.trim().toLowerCase().replace(/^\//, "").replace(/[^\w-]/g, "").slice(0, 30);
  if (!key || !text.trim()) return { error: "Preencha o atalho e o texto." };
  await prisma.quickReply.upsert({
    where: { workspaceId_shortcut: { workspaceId: auth.workspace.id, shortcut: key } },
    create: { workspaceId: auth.workspace.id, shortcut: key, text: text.trim().slice(0, 4096) },
    update: { text: text.trim().slice(0, 4096) },
  });
  return { ok: true };
}

export async function deleteQuickReplyAction(id: string): Promise<Result> {
  const auth = await requireAuth();
  await prisma.quickReply.deleteMany({ where: { id, workspaceId: auth.workspace.id } });
  return { ok: true };
}
