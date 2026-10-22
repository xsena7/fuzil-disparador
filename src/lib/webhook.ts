import { createHmac, timingSafeEqual } from "node:crypto";
import type { Prisma, RecipientStatus } from "@prisma/client";
import { prisma } from "./db";
import { handleLoginReply } from "./links-login";
import { env } from "./env";
import { decrypt } from "./crypto";
import { createAlert } from "./alerts";
import { onCategoryChanged, onStatusChanged, syncWaba } from "./sync";
import { metaErrorLabel, SENDER_FATAL_CODES } from "./meta-errors";
import { addCredits } from "./credits";
import { flagBusinessProblem, problemFix } from "./bm-problems";
import { canonicalWaId, formatPhone } from "./phone";
import { applyChatStatus, ingestInbound, maybeAutoReply, sendChatMessage } from "./chat";

function signedWith(raw: string, header: string, secret: string) {
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(header.slice(7), "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** App Secrets dos apps das BMs (conexão manual). Cache de 1 min para não ir ao banco a cada evento. */
let bmSecrets: { at: number; list: string[] } = { at: 0, list: [] };
async function bmAppSecrets(): Promise<string[]> {
  if (Date.now() - bmSecrets.at < 60_000) return bmSecrets.list;
  const rows = await prisma.whatsAppAccount.findMany({ where: { appSecretEnc: { not: null } }, select: { appSecretEnc: true } });
  const list = [...new Set(rows.flatMap((r) => {
    try {
      return [decrypt(r.appSecretEnc!)];
    } catch {
      return [];
    }
  }))];
  bmSecrets = { at: Date.now(), list };
  return list;
}
export const resetBmSecrets = () => (bmSecrets = { at: 0, list: [] });

/** Confere se o evento veio da Meta: assinado pelo app do Fuzil ou pelo app de alguma BM conectada manualmente. */
export async function verifySignature(raw: string, header: string | null): Promise<boolean> {
  const secret = env.metaAppSecret();
  const others = await bmAppSecrets();
  // Sem nenhum App Secret não dá para saber se o evento veio da Meta: em produção, recusa tudo
  if (!secret && !others.length) return process.env.NODE_ENV !== "production";
  if (!header?.startsWith("sha256=")) return false;
  return [secret, ...others].some((s) => s && signedWith(raw, header, s));
}

const OPT_OUT_WORDS = ["sair", "parar", "pare", "stop", "cancelar", "descadastrar", "remover", "nao quero", "não quero", "bloquear"];

export function isOptOut(text?: string | null): boolean {
  if (!text) return false;
  const t = text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return OPT_OUT_WORDS.some((w) => t === w.normalize("NFD").replace(/[̀-ͯ]/g, ""));
}

const RANK: Record<RecipientStatus, number> = { PENDING: 0, SENDING: 1, SENT: 2, DELIVERED: 3, READ: 4, FAILED: 5, SKIPPED: 5 };

export async function processWebhook(payload: any) {
  if (payload?.object !== "whatsapp_business_account") return;
  for (const entry of payload.entry ?? []) {
    const wabaMetaId: string = entry.id;
    const wabas = await prisma.whatsAppAccount.findMany({ where: { wabaId: wabaMetaId } });
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      switch (change.field) {
        case "messages":
          await handleMessages(value, wabas.map((w) => w.workspaceId));
          break;
        case "message_template_status_update":
          for (const w of wabas) await handleTemplateStatus(w.id, w.workspaceId, value);
          break;
        case "template_category_update":
          for (const w of wabas) await handleTemplateCategory(w.id, w.workspaceId, value);
          break;
        case "message_template_quality_update":
          for (const w of wabas) {
            await prisma.template.updateMany({
              where: { wabaId: w.id, metaTemplateId: String(value.message_template_id) },
              data: { qualityScore: value.new_quality_score },
            });
          }
          break;
        case "phone_number_quality_update":
        case "phone_number_name_update":
        case "business_capability_update":
          for (const w of wabas) await syncWaba(w.id).catch((e) => console.error("[webhook] sync", e));
          break;
        case "account_update":
        case "account_review_update":
          for (const w of wabas) {
            const event = value.event ?? value.decision ?? "UPDATE";
            const bad = /DISABLE|BAN|VIOLATION|RESTRICT|REJECT/i.test(String(event));
            await createAlert({
              workspaceId: w.workspaceId,
              type: "ACCOUNT_UPDATE",
              severity: bad ? "CRITICAL" : "INFO",
              title: `Atualização na WABA ${w.name}: ${event}`,
              message: JSON.stringify(value.violation_info ?? value.restriction_info ?? value.ban_info ?? value).slice(0, 500),
            });
            await syncWaba(w.id).catch(() => undefined);
          }
          break;
      }
    }
  }
}

const MAX_REROUTES = 3;

/**
 * A Meta aceitou a mensagem, mas avisou depois (webhook) que ela falhou por um problema da BM
 * (pagamento, conta bloqueada/restrita...). O destinatário volta para a fila, o crédito é estornado,
 * o número sai da campanha e a BM vai para "BMs com problema": as outras BMs do grupo enviam no lugar.
 */
async function rerouteFailed(
  r: { id: string; campaignId: string; senderId: string | null; attempts: number; creditsCharged: number },
  err: { code?: number; title?: string; message?: string; error_data?: { details?: string } } | undefined,
): Promise<boolean> {
  const code = err?.code;
  if (code === undefined || code === null || !SENDER_FATAL_CODES.has(code) || !r.senderId || r.attempts >= MAX_REROUTES) return false;
  const campaign = await prisma.campaign.findUnique({ where: { id: r.campaignId }, select: { id: true, name: true, workspaceId: true, status: true, excludedSenders: true } });
  if (!campaign || campaign.status === "CANCELLED") return false;
  const sender = await prisma.phoneNumber.findUnique({ where: { id: r.senderId }, include: { waba: { include: { business: true } } } });

  const back = await prisma.campaignRecipient.updateMany({
    where: { id: r.id, status: { in: ["SENT", "DELIVERED"] } },
    data: { status: "PENDING", wamid: null, senderId: null, sentAt: null, deliveredAt: null, failedAt: null, retryAt: null, creditsCharged: 0, errorCode: code, errorTitle: `${metaErrorLabel(code)} no número anterior: reenviando por outra BM` },
  });
  if (!back.count) return false;
  if (r.creditsCharged > 0) await addCredits(campaign.workspaceId, r.creditsCharged, "REFUND", `Estorno (reenvio por outra BM) — ${campaign.name}`, { campaignId: campaign.id });

  if (!campaign.excludedSenders.includes(r.senderId)) {
    await prisma.campaign.update({ where: { id: campaign.id }, data: { excludedSenders: { push: r.senderId } } });
    if (sender) {
      const display = formatPhone(sender.displayPhoneNumber.replace(/\D/g, ""));
      const reason = `${metaErrorLabel(code)} (código ${code})${err?.error_data?.details ? ` — ${err.error_data.details}` : ""}`;
      await flagBusinessProblem(sender.waba.businessId, `${display}: ${reason}`, problemFix(code)).catch(() => undefined);
      await createAlert({
        workspaceId: campaign.workspaceId,
        type: "SENDER_REMOVED",
        severity: "CRITICAL",
        title: `Número ${display} retirado da campanha "${campaign.name}"`,
        message: `${sender.waba.business.name}: ${reason}. As mensagens dele vão sair pelas outras BMs do grupo.`,
      });
    }
  }
  // Campanha já tinha terminado: volta a rodar para as outras BMs mandarem o que voltou para a fila
  if (campaign.status === "COMPLETED") await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "RUNNING", completedAt: null, pausedReason: null } });
  return true;
}

async function handleMessages(value: any, workspaceIds: string[]) {
  const phoneNumberId: string | undefined = value.metadata?.phone_number_id;

  for (const st of value.statuses ?? []) {
    await applyChatStatus(st).catch((e) => console.error("[webhook] chat status", e));
    const r = await prisma.campaignRecipient.findUnique({ where: { wamid: st.id } });
    if (!r) continue;
    const at = new Date(Number(st.timestamp) * 1000);
    const data: Prisma.CampaignRecipientUpdateInput = {};
    let next: RecipientStatus | null = null;
    if (st.status === "sent") { next = "SENT"; data.sentAt = r.sentAt ?? at; }
    if (st.status === "delivered") { next = "DELIVERED"; data.deliveredAt = at; }
    if (st.status === "read") { next = "READ"; data.readAt = at; if (!r.deliveredAt) data.deliveredAt = at; }
    if (st.status === "failed") {
      next = "FAILED";
      const e = st.errors?.[0];
      data.failedAt = at;
      data.errorCode = e?.code ?? null;
      data.errorTitle = metaErrorLabel(e?.code) ;
      data.errorDetail = e?.error_data?.details ?? e?.message ?? e?.title ?? null;
    }
    if (!next) continue;
    // Falha por problema da BM (pagamento, bloqueio, restrição) que chega depois do envio: manda por outra BM do grupo
    if (next === "FAILED" && (await rerouteFailed(r, st.errors?.[0]))) continue;
    // Só avança o status (os webhooks podem chegar fora de ordem). Falha vale sempre.
    if (next === "FAILED" || RANK[next] > RANK[r.status]) data.status = next;
    await prisma.campaignRecipient.update({ where: { id: r.id }, data });
  }

  for (const msg of value.messages ?? []) {
    const waId: string = msg.from;
    const from = canonicalWaId(waId);
    msg.from = from;
    const text: string | null =
      msg.text?.body ?? msg.button?.text ?? msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? null;
    const phone = phoneNumberId ? await prisma.phoneNumber.findUnique({ where: { phoneNumberId }, include: { waba: true } }) : null;
    const contactName: string | null = value.contacts?.find((c: any) => c.wa_id === waId || canonicalWaId(c.wa_id) === from)?.profile?.name ?? null;

    // Liga a resposta à última campanha enviada pra esse contato
    const recipient = await prisma.campaignRecipient.findFirst({
      where: { phone: from, sentAt: { gte: new Date(Date.now() - 7 * 86400_000) }, ...(phone ? { senderId: phone.id } : {}) },
      orderBy: { sentAt: "desc" },
    });
    const optOut = isOptOut(text);

    for (const workspaceId of workspaceIds) {
      await prisma.inboundMessage.upsert({
        where: { wamid: msg.id },
        create: {
          workspaceId,
          phoneId: phone?.id,
          from,
          wamid: msg.id,
          type: msg.type,
          text,
          payload: msg,
          recipientId: recipient?.id,
          receivedAt: new Date(Number(msg.timestamp) * 1000),
        },
        update: {},
      });
      if (optOut) {
        await prisma.contact.upsert({
          where: { workspaceId_phone: { workspaceId, phone: from } },
          create: { workspaceId, phone: from, optedOut: true, optedOutAt: new Date() },
          update: { optedOut: true, optedOutAt: new Date() },
        });
      }
    }
    if (recipient) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { repliedAt: recipient.repliedAt ?? new Date(), ...(optOut ? { optedOutAt: new Date() } : {}) },
      });
    }

    // Chat: grava a mensagem na conversa e dispara a resposta automática da campanha (se tiver)
    if (phone) {
      try {
        const conv = await ingestInbound(phone.waba.workspaceId, phone, msg, contactName);
        // Botões do aviso de "novo acesso" do gerador de links (Fui eu / Não fui eu)
        const loginReply = conv && !optOut ? await handleLoginReply(recipient, text).catch(() => null) : null;
        if (conv && loginReply) await sendChatMessage(conv.id, { source: "AUTO_REPLY", text: loginReply }).catch((e) => console.error("[webhook] links", e));
        else if (conv && !optOut && msg.type !== "reaction") await maybeAutoReply(conv.id, recipient);
      } catch (e) {
        console.error("[webhook] chat", e);
      }
    }
  }
}

async function handleTemplateStatus(wabaRecordId: string, workspaceId: string, value: any) {
  const tpl = await prisma.template.findFirst({
    where: {
      wabaId: wabaRecordId,
      OR: [
        { metaTemplateId: String(value.message_template_id) },
        { name: value.message_template_name, language: value.message_template_language },
      ],
    },
  });
  const status = String(value.event ?? "").toUpperCase();
  if (!tpl || !status) {
    await syncWaba(wabaRecordId).catch(() => undefined);
    return;
  }
  if (tpl.status === status) return;
  const reason = value.reason && value.reason !== "NONE" ? value.reason : null;
  await prisma.template.update({ where: { id: tpl.id }, data: { status, rejectedReason: reason } });
  await onStatusChanged(workspaceId, wabaRecordId, tpl.name, tpl.language, tpl.status, status, reason);
  // Aprovado: confere a categoria final na Meta (pode ter sido aprovado como marketing)
  if (status === "APPROVED") await syncWaba(wabaRecordId).catch(() => undefined);
}

async function handleTemplateCategory(wabaRecordId: string, workspaceId: string, value: any) {
  // A Meta avisa antes ("correct_category") e depois ("new_category"). Bloqueamos já no aviso.
  const to = String(value.new_category ?? value.correct_category ?? "").toUpperCase();
  const tpl = await prisma.template.findFirst({
    where: {
      wabaId: wabaRecordId,
      OR: [
        { metaTemplateId: String(value.message_template_id) },
        { name: value.message_template_name, language: value.message_template_language },
      ],
    },
  });
  if (!tpl || !to) {
    await syncWaba(wabaRecordId).catch(() => undefined);
    return;
  }
  if (tpl.category === to) return;
  // Atualiza ANTES de qualquer outra coisa: o dispatcher para de usar essa cópia no próximo tick
  await prisma.template.update({ where: { id: tpl.id }, data: { category: to, previousCategory: tpl.category } });
  await onCategoryChanged(workspaceId, wabaRecordId, tpl.name, tpl.language, tpl.category, to);
}
