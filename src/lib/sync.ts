import type { Prisma, WhatsAppAccount } from "@prisma/client";
import { prisma } from "./db";
import { decrypt } from "./crypto";
import { env } from "./env";
import { meta, type MetaPhone, type MetaTemplate } from "./meta";
import { createAlert } from "./alerts";
import { tierLabel, tierToLimit } from "./limits";
import { formatPhone } from "./phone";

export function wabaToken(waba: Pick<WhatsAppAccount, "accessTokenEnc">): string {
  if (waba.accessTokenEnc) return decrypt(waba.accessTokenEnc);
  const sys = env.metaSystemToken();
  if (!sys) throw new Error("Nenhum token disponível: configure META_SYSTEM_USER_TOKEN ou conecte a WABA com um token próprio");
  return sys;
}

const QUALITY_ORDER: Record<string, number> = { GREEN: 3, YELLOW: 2, RED: 1, UNKNOWN: 0 };
const QUALITY_PT: Record<string, string> = { GREEN: "Alta (verde)", YELLOW: "Média (amarela)", RED: "Baixa (vermelha)", UNKNOWN: "Desconhecida" };

export function qualityLabel(q?: string | null) {
  return QUALITY_PT[q ?? "UNKNOWN"] ?? q ?? "—";
}

/** Sincroniza uma WABA inteira: dados da BM, números e templates. Gera alertas sobre mudanças. */
export async function syncWaba(wabaRecordId: string) {
  const waba = await prisma.whatsAppAccount.findUniqueOrThrow({ where: { id: wabaRecordId }, include: { business: true } });
  const token = wabaToken(waba);
  try {
    const info = await meta.getWaba(token, waba.wabaId);
    await prisma.whatsAppAccount.update({
      where: { id: waba.id },
      data: {
        name: info.name,
        currency: info.currency,
        timezoneId: info.timezone_id,
        reviewStatus: info.account_review_status,
        status: info.health_status?.can_send_message ?? waba.status,
      },
    });

    if (info.owner_business_info?.id && waba.business.metaBusinessId !== info.owner_business_info.id) {
      // A BM foi criada como placeholder: preenche com os dados reais (ou junta com uma BM existente)
      const existing = await prisma.businessManager.findUnique({
        where: { workspaceId_metaBusinessId: { workspaceId: waba.workspaceId, metaBusinessId: info.owner_business_info.id } },
      });
      if (existing && existing.id !== waba.businessId) {
        await prisma.whatsAppAccount.update({ where: { id: waba.id }, data: { businessId: existing.id } });
        const left = await prisma.whatsAppAccount.count({ where: { businessId: waba.businessId } });
        if (left === 0) await prisma.businessManager.delete({ where: { id: waba.businessId } });
      } else {
        await prisma.businessManager.update({
          where: { id: waba.businessId },
          data: { metaBusinessId: info.owner_business_info.id, name: info.owner_business_info.name },
        });
      }
    }

    const phones = await meta.listPhones(token, waba.wabaId);
    for (const p of phones) await upsertPhone(waba.workspaceId, waba.id, p);
    await refreshBusinessTier(waba.id);

    const templates = await meta.listTemplates(token, waba.wabaId);
    const seen = new Set<string>();
    for (const t of templates) {
      seen.add(`${t.name}|${t.language}`);
      await upsertTemplate(waba.workspaceId, waba.id, t);
    }
    // Templates apagados na Meta
    const local = await prisma.template.findMany({ where: { wabaId: waba.id }, select: { id: true, name: true, language: true } });
    const gone = local.filter((t) => !seen.has(`${t.name}|${t.language}`)).map((t) => t.id);
    if (gone.length) await prisma.template.deleteMany({ where: { id: { in: gone } } });

    await prisma.whatsAppAccount.update({ where: { id: waba.id }, data: { lastSyncedAt: new Date(), lastSyncError: null } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.whatsAppAccount.update({ where: { id: waba.id }, data: { lastSyncError: message, lastSyncedAt: new Date() } });
    throw err;
  }
}

/** O limite agora é por portfólio (BM). Guardamos o maior tier informado pelos números. */
async function refreshBusinessTier(wabaRecordId: string) {
  const waba = await prisma.whatsAppAccount.findUniqueOrThrow({ where: { id: wabaRecordId }, include: { business: true } });
  const phones = await prisma.phoneNumber.findMany({
    where: { waba: { businessId: waba.businessId } },
    select: { messagingLimitTier: true },
  });
  let best: string | null = null;
  for (const p of phones) if ((tierToLimit(p.messagingLimitTier) ?? -1) > (tierToLimit(best) ?? -1)) best = p.messagingLimitTier;
  if (best && best !== waba.business.messagingLimitTier) {
    if (waba.business.messagingLimitTier) {
      const up = (tierToLimit(best) ?? 0) > (tierToLimit(waba.business.messagingLimitTier) ?? 0);
      await createAlert({
        workspaceId: waba.workspaceId,
        type: "LIMIT_CHANGE",
        severity: up ? "INFO" : "WARNING",
        title: `Limite da BM ${waba.business.name} ${up ? "subiu" : "caiu"}`,
        message: `${tierLabel(waba.business.messagingLimitTier)} → ${tierLabel(best)}`,
        data: { businessId: waba.businessId, from: waba.business.messagingLimitTier, to: best },
      });
    }
    await prisma.businessManager.update({ where: { id: waba.businessId }, data: { messagingLimitTier: best } });
  }
}

export async function upsertPhone(workspaceId: string, wabaRecordId: string, p: MetaPhone) {
  const tier = p.whatsapp_business_manager_messaging_limit ?? p.messaging_limit_tier ?? null;
  const existing = await prisma.phoneNumber.findUnique({ where: { phoneNumberId: p.id } });
  const data = {
    wabaId: wabaRecordId,
    displayPhoneNumber: p.display_phone_number,
    verifiedName: p.verified_name,
    qualityRating: p.quality_rating ?? "UNKNOWN",
    messagingLimitTier: tier,
    status: p.status,
    nameStatus: p.name_status,
    throughputLevel: p.throughput?.level,
    isCoexistence: Boolean(p.is_on_biz_app),
    lastSyncedAt: new Date(),
  };
  if (!existing) {
    return prisma.phoneNumber.create({ data: { phoneNumberId: p.id, ...data } });
  }
  await diffPhone(workspaceId, existing, data);
  return prisma.phoneNumber.update({ where: { id: existing.id }, data });
}

async function diffPhone(
  workspaceId: string,
  before: { displayPhoneNumber: string; qualityRating: string | null; status: string | null },
  after: { qualityRating: string; status?: string },
) {
  const num = formatPhone(before.displayPhoneNumber.replace(/\D/g, ""));
  if (before.qualityRating && before.qualityRating !== after.qualityRating) {
    const worse = (QUALITY_ORDER[after.qualityRating] ?? 0) < (QUALITY_ORDER[before.qualityRating] ?? 0);
    await createAlert({
      workspaceId,
      type: "QUALITY_CHANGE",
      severity: worse ? (after.qualityRating === "RED" ? "CRITICAL" : "WARNING") : "INFO",
      title: `Qualidade do número ${num} ${worse ? "caiu" : "subiu"}`,
      message: `${qualityLabel(before.qualityRating)} → ${qualityLabel(after.qualityRating)}`,
    });
  }
  if (before.status && after.status && before.status !== after.status) {
    const bad = ["FLAGGED", "RESTRICTED", "BANNED", "DISCONNECTED", "RATE_LIMITED"].includes(after.status);
    await createAlert({
      workspaceId,
      type: "NUMBER_STATUS",
      severity: bad ? "CRITICAL" : "INFO",
      title: `Status do número ${num} mudou`,
      message: `${before.status} → ${after.status}`,
    });
  }
}

export async function upsertTemplate(workspaceId: string, wabaRecordId: string, t: MetaTemplate) {
  const existing = await prisma.template.findUnique({
    where: { wabaId_name_language: { wabaId: wabaRecordId, name: t.name, language: t.language } },
  });
  const data = {
    metaTemplateId: t.id,
    category: t.category,
    previousCategory: t.previous_category ?? existing?.previousCategory ?? null,
    status: t.status,
    rejectedReason: t.rejected_reason && t.rejected_reason !== "NONE" ? t.rejected_reason : null,
    qualityScore: t.quality_score?.score ?? null,
    components: t.components as unknown as Prisma.InputJsonValue,
    lastSyncedAt: new Date(),
  };
  if (!existing) {
    const created = await prisma.template.create({ data: { workspaceId, wabaId: wabaRecordId, name: t.name, language: t.language, ...data } });
    // Template novo que já chegou como marketing (ex.: recategorizado na aprovação)
    if (t.previous_category && t.previous_category !== t.category && t.category !== "UTILITY") {
      await onCategoryChanged(workspaceId, wabaRecordId, t.name, t.language, t.previous_category, t.category);
    }
    return created;
  }
  if (existing.category !== t.category) {
    await onCategoryChanged(workspaceId, wabaRecordId, t.name, t.language, existing.category, t.category);
  }
  if (existing.status !== t.status) {
    await onStatusChanged(workspaceId, wabaRecordId, t.name, t.language, existing.status, t.status, data.rejectedReason);
  }
  return prisma.template.update({ where: { id: existing.id }, data });
}

async function wabaLabel(wabaRecordId: string) {
  const w = await prisma.whatsAppAccount.findUnique({ where: { id: wabaRecordId }, include: { business: true } });
  return w ? `${w.business.name} / ${w.name}` : wabaRecordId;
}

/** Recategorização: nunca disparar marketing. O dispatcher já ignora cópias não-UTILITY; aqui avisamos. */
export async function onCategoryChanged(
  workspaceId: string,
  wabaRecordId: string,
  name: string,
  language: string,
  from: string,
  to: string,
) {
  const label = await wabaLabel(wabaRecordId);
  const affected = await prisma.campaign.findMany({
    where: { workspaceId, templateName: name, templateLanguage: language, status: { in: ["RUNNING", "SCHEDULED", "PAUSED"] } },
    select: { name: true },
  });
  const camp = affected.length ? ` Campanhas afetadas: ${affected.map((c) => c.name).join(", ")}. Os números dessa WABA foram retirados do envio.` : "";
  await createAlert({
    workspaceId,
    type: "TEMPLATE_RECATEGORIZED",
    severity: to === "UTILITY" ? "INFO" : "CRITICAL",
    title: `Template "${name}" recategorizado: ${from} → ${to}`,
    message: `WABA ${label}.${to === "UTILITY" ? "" : " Esse template NÃO será mais usado em disparos nessa WABA."}${camp}`,
    data: { wabaId: wabaRecordId, name, language, from, to },
  });
  const { handleRecategorized } = await import("./blueprints");
  await handleRecategorized(workspaceId, wabaRecordId, name, language, to);
}

export async function onStatusChanged(
  workspaceId: string,
  wabaRecordId: string,
  name: string,
  language: string,
  from: string,
  to: string,
  reason: string | null,
) {
  const label = await wabaLabel(wabaRecordId);
  const severity = ["REJECTED", "PAUSED", "DISABLED"].includes(to) ? "CRITICAL" : "INFO";
  const type = to === "REJECTED" ? "TEMPLATE_REJECTED" : to === "PAUSED" || to === "DISABLED" ? "TEMPLATE_PAUSED" : "TEMPLATE_STATUS";
  await createAlert({
    workspaceId,
    type,
    severity,
    title: `Template "${name}" (${language}): ${from} → ${to}`,
    message: `WABA ${label}.${reason ? ` Motivo: ${reason}` : ""}`,
    data: { wabaId: wabaRecordId, name, language, from, to },
  });
}

/** Cria ou reaproveita a WABA no banco e sincroniza. Usado pela conexão manual e pelo Embedded Signup. */
export async function connectWaba(input: {
  workspaceId: string;
  wabaId: string;
  accessTokenEnc: string | null;
  connectionType: "CLOUD_API" | "COEXISTENCE" | "MANUAL";
}) {
  let waba = await prisma.whatsAppAccount.findUnique({
    where: { workspaceId_wabaId: { workspaceId: input.workspaceId, wabaId: input.wabaId } },
  });
  if (!waba) {
    const placeholder = await prisma.businessManager.create({
      data: { workspaceId: input.workspaceId, name: `BM da WABA ${input.wabaId}` },
    });
    waba = await prisma.whatsAppAccount.create({
      data: {
        workspaceId: input.workspaceId,
        businessId: placeholder.id,
        wabaId: input.wabaId,
        name: `WABA ${input.wabaId}`,
        connectionType: input.connectionType,
        accessTokenEnc: input.accessTokenEnc,
      },
    });
  } else if (input.accessTokenEnc) {
    waba = await prisma.whatsAppAccount.update({
      where: { id: waba.id },
      data: { accessTokenEnc: input.accessTokenEnc, connectionType: input.connectionType },
    });
  }

  const token = wabaToken(waba);
  try {
    await meta.subscribeApp(token, waba.wabaId);
    await prisma.whatsAppAccount.update({ where: { id: waba.id }, data: { webhookSubscribed: true } });
  } catch (err) {
    console.warn("[connect] não foi possível inscrever o app no webhook da WABA", err);
  }
  await syncWaba(waba.id);
  return waba;
}
