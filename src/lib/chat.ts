/**
 * Chat: conversas por número, mensagens (disparos, respostas do cliente, atendimento) e resposta automática.
 */
import { randomBytes } from "node:crypto";
import type { Campaign, CampaignRecipient, Conversation, PhoneNumber, WhatsAppAccount } from "@prisma/client";
import { prisma } from "./db";
import { meta, MetaError } from "./meta";
import { wabaToken } from "./sync";
import { metaErrorLabel } from "./meta-errors";
import { firstName, getComponent, renderText, type TComponent, type VariableMapping } from "./template-utils";

export const WINDOW_MS = 24 * 3600_000;

const newId = () => `c${randomBytes(12).toString("hex")}`;

const KIND_LABEL: Record<string, string> = {
  image: "📷 Imagem",
  video: "🎬 Vídeo",
  audio: "🎤 Mensagem de voz",
  document: "📄 Documento",
  sticker: "Figurinha",
  location: "📍 Localização",
  contacts: "👤 Contato",
  reaction: "Reação",
  template: "Template",
  unknown: "Mensagem",
};

/** Texto curto para a lista de conversas. */
export function preview(kind: string, text?: string | null) {
  const t = text?.replace(/\s+/g, " ").trim();
  if (kind === "text" || kind === "button" || kind === "template") return t || KIND_LABEL[kind] || "";
  return t ? `${KIND_LABEL[kind] ?? "Mensagem"}: ${t}` : KIND_LABEL[kind] ?? "Mensagem";
}

/** Janela de 24h aberta? (pode mandar mensagem livre) */
export function windowOpen(c: Pick<Conversation, "lastInboundAt">) {
  return Boolean(c.lastInboundAt && Date.now() - c.lastInboundAt.getTime() < WINDOW_MS);
}

// ---------------------------------------------------------------------------
// Disparos -> chat
// ---------------------------------------------------------------------------

/** Texto do template como o cliente viu (corpo com as variáveis preenchidas). */
export function renderCampaignText(components: TComponent[], campaign: Pick<Campaign, "variableMapping">, r: Pick<CampaignRecipient, "phone" | "name" | "data">) {
  const mapping = (campaign.variableMapping ?? {}) as VariableMapping;
  const body = getComponent(components, "BODY")?.text;
  return renderText(body, mapping.body, { phone: r.phone, name: r.name, data: r.data as Record<string, unknown> }, false);
}

/**
 * Registra no chat as mensagens de uma leva de disparo (uma conversa por contato e número).
 * Feito em lote para não atrasar o disparo.
 */
export async function recordCampaignSends(
  workspaceId: string,
  campaignId: string,
  phoneId: string,
  items: Array<{ phone: string; name: string | null; wamid: string; text: string }>,
) {
  if (!items.length) return;
  const now = new Date();
  const rows = await prisma.$queryRaw<Array<{ id: string; contactPhone: string }>>`
    INSERT INTO "Conversation" (id, "workspaceId", "phoneId", "contactPhone", "contactName", "lastMessageAt", "lastMessageText", "lastDirection", "createdAt")
    SELECT x.id, ${workspaceId}, ${phoneId}, x.phone, x.name, ${now}, x.text, 'OUT', ${now}
    FROM unnest(${items.map(() => newId())}::text[], ${items.map((i) => i.phone)}::text[], ${items.map((i) => i.name ?? null)}::text[], ${items.map((i) => preview("template", i.text).slice(0, 200))}::text[]) AS x(id, phone, name, text)
    ON CONFLICT ("phoneId", "contactPhone") DO UPDATE SET
      "lastMessageAt" = EXCLUDED."lastMessageAt",
      "lastMessageText" = EXCLUDED."lastMessageText",
      "lastDirection" = 'OUT',
      "contactName" = COALESCE("Conversation"."contactName", EXCLUDED."contactName")
    RETURNING id, "contactPhone"`;
  const convByPhone = new Map(rows.map((r) => [r.contactPhone, r.id]));
  await prisma.chatMessage.createMany({
    data: items.flatMap((i) => {
      const conversationId = convByPhone.get(i.phone);
      return conversationId
        ? [{ id: newId(), conversationId, workspaceId, direction: "OUT", kind: "template", text: i.text, wamid: i.wamid, status: "sent", source: "CAMPAIGN", campaignId, createdAt: now }]
        : [];
    }),
    skipDuplicates: true,
  });
}

// ---------------------------------------------------------------------------
// Webhook -> chat
// ---------------------------------------------------------------------------

/** Tipo, texto e mídia de uma mensagem recebida da Meta. */
export function parseInbound(msg: any): { kind: string; text: string | null; mediaId?: string; mediaMime?: string; mediaName?: string } {
  const type: string = msg.type ?? "unknown";
  switch (type) {
    case "text":
      return { kind: "text", text: msg.text?.body ?? null };
    case "button":
      return { kind: "button", text: msg.button?.text ?? null };
    case "interactive":
      return { kind: "button", text: msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? null };
    case "image":
    case "video":
    case "audio":
    case "document":
    case "sticker": {
      const m = msg[type] ?? {};
      return { kind: type, text: m.caption ?? null, mediaId: m.id, mediaMime: m.mime_type, mediaName: m.filename };
    }
    case "location":
      return { kind: "location", text: [msg.location?.name, msg.location?.address, msg.location ? `${msg.location.latitude},${msg.location.longitude}` : null].filter(Boolean).join(" · ") };
    case "reaction":
      return { kind: "reaction", text: msg.reaction?.emoji ?? null };
    case "contacts":
      return { kind: "contacts", text: msg.contacts?.map((c: any) => `${c.name?.formatted_name ?? ""} ${c.phones?.[0]?.phone ?? ""}`.trim()).join(", ") ?? null };
    default:
      return { kind: "unknown", text: null };
  }
}

/** Grava a mensagem recebida na conversa (cria a conversa se for a primeira). */
export async function ingestInbound(workspaceId: string, phone: PhoneNumber, msg: any, contactName?: string | null) {
  const p = parseInbound(msg);
  const at = new Date(Number(msg.timestamp) * 1000 || Date.now());
  if (await prisma.chatMessage.findUnique({ where: { wamid: msg.id } })) return null; // webhook repetido
  const isReaction = p.kind === "reaction";
  const conv = await prisma.conversation.upsert({
    where: { phoneId_contactPhone: { phoneId: phone.id, contactPhone: msg.from } },
    create: {
      workspaceId,
      phoneId: phone.id,
      contactPhone: msg.from,
      contactName: contactName ?? null,
      hasInbound: true,
      unread: isReaction ? 0 : 1,
      lastInboundAt: at,
      lastMessageAt: at,
      lastMessageText: preview(p.kind, p.text).slice(0, 200),
      lastDirection: "IN",
    },
    update: {
      hasInbound: true,
      lastInboundAt: at,
      ...(contactName ? { contactName } : {}),
      ...(isReaction
        ? {}
        : { unread: { increment: 1 }, lastMessageAt: at, lastMessageText: preview(p.kind, p.text).slice(0, 200), lastDirection: "IN" }),
    },
  });
  // Cliente voltou a falar numa conversa finalizada: reabre
  if (conv.status === "CLOSED" && !isReaction) await prisma.conversation.update({ where: { id: conv.id }, data: { status: "OPEN", closedAt: null } });
  await prisma.chatMessage.create({
    data: {
      conversationId: conv.id,
      workspaceId,
      direction: "IN",
      kind: p.kind,
      text: p.text,
      mediaId: p.mediaId,
      mediaMime: p.mediaMime,
      mediaName: p.mediaName,
      wamid: msg.id,
      source: "CUSTOMER",
      createdAt: at,
    },
  });
  return conv;
}

const STATUS_RANK: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

/** Atualiza o status (enviada/entregue/lida/falhou) de uma mensagem do chat. */
export async function applyChatStatus(st: any) {
  const m = await prisma.chatMessage.findUnique({ where: { wamid: st.id }, select: { id: true, status: true } });
  if (!m) return;
  const next = String(st.status);
  if (next !== "failed" && (STATUS_RANK[next] ?? 0) <= (STATUS_RANK[m.status ?? "pending"] ?? 0)) return;
  const e = st.errors?.[0];
  await prisma.chatMessage.update({
    where: { id: m.id },
    data: { status: next, ...(next === "failed" ? { error: e ? `${metaErrorLabel(e.code)}${e.code ? ` (código ${e.code})` : ""}` : "Falhou" } : {}) },
  });
}

// ---------------------------------------------------------------------------
// Envio pelo chat (atendimento e resposta automática)
// ---------------------------------------------------------------------------

type ConvWithPhone = Conversation & { phone: PhoneNumber & { waba: WhatsAppAccount } };

async function loadConversation(conversationId: string): Promise<ConvWithPhone> {
  return prisma.conversation.findUniqueOrThrow({ where: { id: conversationId }, include: { phone: { include: { waba: true } } } });
}

export type OutMessage = {
  text?: string;
  media?: { url: string; kind: "image" | "video" | "audio" | "document"; mime?: string; name?: string };
  source: "AGENT" | "AUTO_REPLY";
  userId?: string;
  campaignId?: string;
  replyTo?: string;
};

/** Manda mensagem livre (texto e/ou mídia) numa conversa e grava no chat. Lança erro com mensagem amigável. */
export async function sendChatMessage(conversationId: string, out: OutMessage) {
  const conv = await loadConversation(conversationId);
  if (!windowOpen(conv)) throw new Error("A janela de 24h está fechada: o cliente não fala com esse número há mais de 24h. Use um template para retomar a conversa.");
  const token = wabaToken(conv.phone.waba);
  const pnid = conv.phone.phoneNumberId;
  const sends: Array<{ kind: string; text: string | null; media?: OutMessage["media"]; call: () => Promise<{ messages: Array<{ id: string }> }> }> = [];
  const caption = out.media && out.media.kind !== "audio" ? out.text : undefined;
  if (out.media) {
    const media = out.media;
    sends.push({ kind: media.kind, text: caption ?? null, media, call: () => meta.sendMedia(token, pnid, conv.contactPhone, media.kind, media.url, caption, media.name) });
  }
  if (out.text && !caption) {
    const text = out.text;
    sends.push({ kind: "text", text, call: () => meta.sendText(token, pnid, conv.contactPhone, text, out.replyTo) });
  }
  const created = [];
  for (const s of sends) {
    let wamid: string | null = null;
    let error: string | null = null;
    try {
      wamid = (await s.call()).messages?.[0]?.id ?? null;
    } catch (e) {
      error = e instanceof MetaError ? `${metaErrorLabel(e.code)}${e.code ? ` (código ${e.code})` : ""}${e.message ? ` — ${e.message}` : ""}` : String(e);
    }
    created.push(
      await prisma.chatMessage.create({
        data: {
          conversationId: conv.id,
          workspaceId: conv.workspaceId,
          direction: "OUT",
          kind: s.kind,
          text: s.text,
          mediaUrl: s.media?.url,
          mediaMime: s.media?.mime,
          mediaName: s.media?.name,
          wamid,
          status: error ? "failed" : "sent",
          error,
          source: out.source,
          campaignId: out.campaignId,
          senderUserId: out.userId,
        },
      }),
    );
    if (error) throw Object.assign(new Error(error), { messages: created });
  }
  const last = created[created.length - 1];
  if (last) {
    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        lastMessageAt: last.createdAt,
        lastMessageText: preview(last.kind, last.text).slice(0, 200),
        lastDirection: "OUT",
        ...(out.source === "AGENT" ? { unread: 0, ...(conv.status === "OPEN" ? { status: "ATTENDING" as const, assignedUserId: out.userId } : {}) } : {}),
      },
    });
  }
  return created;
}

export type TemplateExtras = {
  /** Mídia do cabeçalho (templates com imagem, vídeo ou documento) */
  headerMedia?: { url: string; kind: "image" | "video" | "document"; name?: string };
  /** Complemento dos botões de link com variável (índice do botão -> texto) */
  buttonParams?: Record<string, string>;
};

/** Manda um template aprovado (para abrir/retomar conversa fora da janela de 24h). */
export async function sendChatTemplate(conversationId: string, templateId: string, params: string[], userId: string, extras: TemplateExtras = {}) {
  const conv = await loadConversation(conversationId);
  const tpl = await prisma.template.findUniqueOrThrow({ where: { id: templateId } });
  if (tpl.wabaId !== conv.phone.wabaId) throw new Error("Esse template não é da conta (WABA) deste número.");
  if (tpl.status !== "APPROVED") throw new Error("Template não aprovado.");
  if (tpl.category !== "UTILITY") throw new Error("Só templates de utilidade podem ser enviados.");
  const components = tpl.components as unknown as TComponent[];
  const header = getComponent(components, "HEADER");
  const body = getComponent(components, "BODY")?.text ?? "";
  const n = (body.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? []).length;
  const sendComponents: unknown[] = [];
  if (header && ["IMAGE", "VIDEO", "DOCUMENT"].includes(header.format ?? "")) {
    if (!extras.headerMedia) throw new Error("Esse template tem mídia no cabeçalho: anexe a imagem/vídeo/documento.");
    const kind = extras.headerMedia.kind;
    sendComponents.push({ type: "header", parameters: [{ type: kind, [kind]: { link: extras.headerMedia.url, ...(kind === "document" && extras.headerMedia.name ? { filename: extras.headerMedia.name } : {}) } }] });
  }
  if (n) sendComponents.push({ type: "body", parameters: params.slice(0, n).map((t) => ({ type: "text", text: t || "-" })) });
  (getComponent(components, "BUTTONS")?.buttons ?? []).forEach((btn, index) => {
    if (btn.type === "URL" && /\{\{/.test(btn.url ?? "")) {
      const v = extras.buttonParams?.[String(index)]?.trim();
      if (!v) throw new Error(`Preencha o complemento do link do botão "${btn.text}".`);
      sendComponents.push({ type: "button", sub_type: "url", index: String(index), parameters: [{ type: "text", text: v }] });
    }
  });
  let i = 0;
  const text = body.replace(/\{\{\s*[\w.]+\s*\}\}/g, () => params[i++] || "-");
  let wamid: string | null = null;
  let error: string | null = null;
  try {
    wamid = (await meta.sendTemplate(wabaToken(conv.phone.waba), conv.phone.phoneNumberId, conv.contactPhone, { name: tpl.name, language: tpl.language, components: sendComponents })).messages?.[0]?.id ?? null;
  } catch (e) {
    error = e instanceof MetaError ? `${metaErrorLabel(e.code)}${e.code ? ` (código ${e.code})` : ""}` : String(e);
  }
  const m = await prisma.chatMessage.create({
    data: {
      conversationId: conv.id,
      workspaceId: conv.workspaceId,
      direction: "OUT",
      kind: extras.headerMedia ? extras.headerMedia.kind : "template",
      text,
      mediaUrl: extras.headerMedia?.url,
      mediaName: extras.headerMedia?.name,
      wamid,
      status: error ? "failed" : "sent",
      error,
      source: "AGENT",
      senderUserId: userId,
    },
  });
  await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: m.createdAt, lastMessageText: preview("template", text).slice(0, 200), lastDirection: "OUT" } });
  if (error) throw new Error(error);
  return m;
}

/** Marca como lida no WhatsApp a última mensagem recebida (tracinhos azuis). Não trava se falhar. */
export async function markConversationRead(conversationId: string) {
  const conv = await loadConversation(conversationId);
  if (conv.unread > 0) await prisma.conversation.update({ where: { id: conv.id }, data: { unread: 0 } });
  const lastIn = await prisma.chatMessage.findFirst({ where: { conversationId, direction: "IN", wamid: { not: null } }, orderBy: { createdAt: "desc" } });
  if (lastIn?.wamid && Date.now() - lastIn.createdAt.getTime() < WINDOW_MS) {
    await meta.markRead(wabaToken(conv.phone.waba), conv.phone.phoneNumberId, lastIn.wamid).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Resposta automática da campanha
// ---------------------------------------------------------------------------

/** Troca {{nome}}, {{primeiro_nome}} e {{telefone}} pelos dados do contato. */
export function fillAutoReply(text: string, r: Pick<CampaignRecipient, "name" | "phone">) {
  return text
    .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, firstName(r.name) || "")
    .replace(/\{\{\s*nome\s*\}\}/gi, r.name ?? "")
    .replace(/\{\{\s*telefone\s*\}\}/gi, r.phone);
}

/**
 * O contato respondeu a um disparo: se a campanha tem resposta automática e ele ainda não recebeu, manda agora.
 * O "claim" no banco garante uma única resposta por contato, mesmo com webhooks repetidos.
 */
export async function maybeAutoReply(conversationId: string, recipient: CampaignRecipient | null) {
  if (!recipient || recipient.autoReplySentAt) return;
  const campaign = await prisma.campaign.findUnique({ where: { id: recipient.campaignId } });
  if (!campaign?.autoReplyEnabled || (!campaign.autoReplyText?.trim() && !campaign.autoReplyMediaUrl)) return;
  const claimed = await prisma.campaignRecipient.updateMany({ where: { id: recipient.id, autoReplySentAt: null }, data: { autoReplySentAt: new Date() } });
  if (!claimed.count) return;
  const kind = (campaign.autoReplyMediaType?.toLowerCase() ?? "") as "image" | "video" | "audio" | "document";
  try {
    await sendChatMessage(conversationId, {
      source: "AUTO_REPLY",
      campaignId: campaign.id,
      text: campaign.autoReplyText?.trim() ? fillAutoReply(campaign.autoReplyText, recipient) : undefined,
      media: campaign.autoReplyMediaUrl ? { url: campaign.autoReplyMediaUrl, kind: kind || "image", name: campaign.autoReplyMediaName ?? undefined } : undefined,
    });
  } catch (e) {
    console.error("[auto-reply]", e instanceof Error ? e.message : e);
  }
}

/** Clique no botão do disparo: a conversa vai para "Em andamento" e ganha um aviso na linha do tempo. */
export async function recordClick(recipient: Pick<CampaignRecipient, "senderId" | "phone">) {
  if (!recipient.senderId) return;
  const conv = await prisma.conversation.findUnique({ where: { phoneId_contactPhone: { phoneId: recipient.senderId, contactPhone: recipient.phone } } });
  if (!conv || conv.clickedAt) return; // só o primeiro clique vira aviso
  const now = new Date();
  const claimed = await prisma.conversation.updateMany({
    where: { id: conv.id, clickedAt: null },
    data: {
      clickedAt: now,
      lastMessageAt: now,
      lastMessageText: "🔗 Clicou no link do disparo",
      lastDirection: "IN",
      ...(conv.status === "CLOSED" ? { status: "OPEN", closedAt: null } : {}),
    },
  });
  if (!claimed.count) return;
  await prisma.chatMessage.create({
    data: { conversationId: conv.id, workspaceId: conv.workspaceId, direction: "IN", kind: "click", text: "Clicou no link do disparo", source: "SYSTEM", createdAt: now },
  });
}
