import { createHmac, timingSafeEqual } from "node:crypto";
import type { Prisma, RecipientStatus } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./env";
import { createAlert } from "./alerts";
import { onCategoryChanged, onStatusChanged, syncWaba } from "./sync";
import { metaErrorLabel } from "./meta-errors";

export function verifySignature(raw: string, header: string | null): boolean {
  const secret = env.metaAppSecret();
  if (!secret) return true; // sem segredo configurado (desenvolvimento)
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(header.slice(7), "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
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

async function handleMessages(value: any, workspaceIds: string[]) {
  const phoneNumberId: string | undefined = value.metadata?.phone_number_id;

  for (const st of value.statuses ?? []) {
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
    // Só avança o status (os webhooks podem chegar fora de ordem). Falha vale sempre.
    if (next === "FAILED" || RANK[next] > RANK[r.status]) data.status = next;
    await prisma.campaignRecipient.update({ where: { id: r.id }, data });
  }

  for (const msg of value.messages ?? []) {
    const from: string = msg.from;
    const text: string | null =
      msg.text?.body ?? msg.button?.text ?? msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? null;
    const phone = phoneNumberId ? await prisma.phoneNumber.findUnique({ where: { phoneNumberId } }) : null;

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
