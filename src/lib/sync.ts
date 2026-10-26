import type { Prisma, WhatsAppAccount } from "@prisma/client";
import { prisma } from "./db";
import { decrypt } from "./crypto";
import { env } from "./env";
import { meta, type MetaPhone, type MetaTemplate } from "./meta";
import { createAlert } from "./alerts";
import { checkBusinessAfterSync, syncReadyGroup } from "./bm-problems";
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
  if (!waba.webhookSubscribed && waba.lastSyncedAt) await ensureWebhook(waba.id).catch(() => undefined);
  // Cada parte separada: se a Meta negar uma, as outras continuam atualizando
  const errors: string[] = [];
  const step = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  };
  await step(async () => {
    const info = await meta.getWaba(token, waba.wabaId);
    const hasPaymentMethod = await meta.wabaHasPayment(token, waba.wabaId);
    const healthIssues = (info.health_status?.entities ?? []).flatMap((e) =>
      (e.errors ?? []).map((er) => ({ entity: e.entity_type ?? "", id: e.id ?? "", code: er.error_code ?? null, text: er.error_description ?? "", fix: er.possible_solution ?? "" })),
    );
    // Conta banida: a Meta marca na saúde da WABA (erro 141014 "The WABA is banned" ou entidade WABA bloqueada)
    // Só o erro 141014 ("The WABA is banned") conta como banimento. Pagamento/outros bloqueios NÃO são banimento
    const bannedWaba = healthIssues.some((h) => h.code === 141014);
    await prisma.whatsAppAccount.update({
      where: { id: waba.id },
      data: {
        name: info.name,
        currency: info.currency,
        timezoneId: info.timezone_id,
        reviewStatus: info.account_review_status,
        status: bannedWaba ? "BLOCKED" : info.health_status?.can_send_message ?? waba.status,
        ...(hasPaymentMethod !== null ? { hasPaymentMethod } : {}),
        healthIssues,
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
  });
  await step(async () => {
    const phones = await meta.listPhones(token, waba.wabaId);
    // Números de teste da Meta nem entram no Fuzil (e os que já estavam saem)
    const real = phones.filter((p) => phoneInvalidReason(p) !== TEST_NUMBER);
    for (const p of real) await upsertPhone(waba.workspaceId, waba.id, p);
    await removeGonePhones(waba.id, real.map((p) => p.id));
    await checkPendingNames(waba.id, token).catch((e) => console.error("[sync] troca de nome", e));
    // Conversas de número de teste são só teste: some tudo
    const test = phones.filter((p) => phoneInvalidReason(p) === TEST_NUMBER).map((p) => p.id);
    if (test.length) await prisma.phoneNumber.deleteMany({ where: { wabaId: waba.id, phoneNumberId: { in: test } } });
    await refreshBusinessTier(waba.id);
  });
  await step(async () => {
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
  });

  if (!errors.length) {
    await prisma.whatsAppAccount.update({ where: { id: waba.id }, data: { lastSyncedAt: new Date(), lastSyncError: null } });
    await checkBusinessAfterSync(waba.id).catch((e) => console.error("[sync] problema da BM", e));
    await syncReadyGroup(waba.workspaceId).catch((e) => console.error("[sync] grupo prontas", e));
    return;
  }
  const message = [...new Set(errors)].join(" · ");
  await prisma.whatsAppAccount.update({ where: { id: waba.id }, data: { lastSyncError: message, lastSyncedAt: new Date() } });
  await checkBusinessAfterSync(waba.id).catch(() => undefined);
  await syncReadyGroup(waba.workspaceId).catch(() => undefined);
  if (waba.lastSyncError !== message) {
    await createAlert({
      workspaceId: waba.workspaceId,
      type: "SYNC_ERROR",
      severity: "WARNING",
      title: `Falha ao sincronizar ${waba.business.name} / ${waba.name}`,
      message: `${message}. Qualidade, limite e templates dessa WABA podem estar desatualizados.`,
      data: { wabaId: waba.id },
    });
  }
  // Só conta como falha se nada deu certo
  if (errors.length === 3) throw new Error(message);
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

export const PHONE_REMOVED = "Número removido da Meta";
// Número que o registro automático (SMSBear) largou porque o SMS não chegou: some da tela e nunca entra no rodízio
export const PHONE_DISCARDED = "Número descartado (o SMS não chegou)";
const TEST_NUMBER = "Número de teste da Meta";

/** Números apagados na Meta somem do Fuzil (ficam escondidos, guardando histórico e a contagem do limite). */
async function removeGonePhones(wabaRecordId: string, metaIds: string[]) {
  const gone = await prisma.phoneNumber.findMany({
    where: { wabaId: wabaRecordId, phoneNumberId: { notIn: metaIds } },
    select: { id: true },
  });
  // Fica escondido (não apaga): os envios das últimas 24h dele continuam contando no limite da BM
  if (gone.length) await prisma.phoneNumber.updateMany({ where: { id: { in: gone.map((p) => p.id) } }, data: { invalidReason: PHONE_REMOVED, enabled: false } });
}

/**
 * Troca de nome pedida pelo Fuzil: quando a Meta aprova, registra o número de novo (sem isso o nome novo não aparece).
 * Recusou: avisa e esquece o pedido.
 */
async function checkPendingNames(wabaRecordId: string, token: string) {
  const phones = await prisma.phoneNumber.findMany({ where: { wabaId: wabaRecordId, pendingName: { not: null } }, include: { waba: { include: { business: true } } } });
  for (const p of phones) {
    const info = await meta.phoneNameStatus(token, p.phoneNumberId).catch(() => null);
    if (!info) continue;
    const approved = info.new_name_status === "APPROVED" || (info.verified_name === p.pendingName && info.name_status === "APPROVED");
    const declined = ["DECLINED", "REJECTED"].includes(String(info.new_name_status ?? ""));
    const num = formatPhone(p.displayPhoneNumber.replace(/\D/g, ""));
    if (approved) {
      const registered = await meta.registerPhone(token, p.phoneNumberId, env.metaRegisterPin()).then(() => true).catch(() => false);
      await prisma.phoneNumber.update({ where: { id: p.id }, data: { pendingName: null, pendingNameAt: null, ...(registered ? { verifiedName: p.pendingName } : {}) } });
      await createAlert({
        workspaceId: p.waba.workspaceId,
        type: "NUMBER_STATUS",
        severity: registered ? "INFO" : "WARNING",
        title: `Nome do número ${num} (${p.waba.business.name}) aprovado: ${p.pendingName}`,
        message: registered
          ? "A Meta aprovou o nome novo e o Fuzil registrou o número de novo. Pode levar alguns minutos para aparecer no celular."
          : "A Meta aprovou o nome novo, mas o Fuzil não conseguiu registrar o número de novo. Em Conexões, clique em Registrar número.",
      });
    } else if (declined) {
      await prisma.phoneNumber.update({ where: { id: p.id }, data: { pendingName: null, pendingNameAt: null } });
      await createAlert({
        workspaceId: p.waba.workspaceId,
        type: "NUMBER_STATUS",
        severity: "WARNING",
        title: `Nome do número ${num} (${p.waba.business.name}) recusado: ${p.pendingName}`,
        message: "A Meta recusou o nome novo. O número continua com o nome antigo. Tente um nome parecido com o da empresa (a Meta recusa nome genérico ou que não bate com a marca).",
      });
    }
  }
}

/** Números que nunca entram no rodízio: os de teste da Meta e os que não estão registrados na Cloud API. */
export function phoneInvalidReason(p: MetaPhone): string | null {
  const digits = p.display_phone_number.replace(/\D/g, "");
  // Número de teste da Meta (vem em toda WABA nova e não dá para apagar): +1 555..., nome "Test Number" ou conta SANDBOX
  const testName = /test\s*number|n[úu]mero\s+de\s+teste|^test$/i.test(String(p.verified_name ?? "").trim());
  // Todo número de teste da Meta é dos EUA (+1), e nem sempre com 555 (ex.: +1 711-670-0424). O Fuzil é para números do Brasil:
  // número +1 é tratado como de teste (nunca conta como número da BM, então ela fica em "Sem número" e não pula para Pagamento)
  if (String(p.account_mode ?? "").toUpperCase() === "SANDBOX" || testName || /^1\d{10}$/.test(digits)) return TEST_NUMBER;
  if (p.platform_type === "NOT_APPLICABLE") return "Número não registrado na API";
  return null;
}

export async function upsertPhone(workspaceId: string, wabaRecordId: string, p: MetaPhone) {
  const tier = p.whatsapp_business_manager_messaging_limit ?? p.messaging_limit_tier ?? null;
  const existing = await prisma.phoneNumber.findUnique({ where: { phoneNumberId: p.id }, include: { waba: { select: { workspaceId: true } } } });
  // Nunca move um número que já é de outra conta do Fuzil
  if (existing && existing.waba.workspaceId !== workspaceId) return existing;
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
    invalidReason: existing?.invalidReason === PHONE_DISCARDED && p.status !== "CONNECTED" ? PHONE_DISCARDED : phoneInvalidReason(p),
    lastSyncedAt: new Date(),
  };
  if (!existing) {
    return prisma.phoneNumber.create({ data: { phoneNumberId: p.id, ...data } });
  }
  await diffPhone(workspaceId, existing, data, await wabaLabel(wabaRecordId));
  return prisma.phoneNumber.update({ where: { id: existing.id }, data });
}

const PHONE_STATUS_PT: Record<string, string> = {
  CONNECTED: "Conectado",
  BANNED: "Banido",
  RESTRICTED: "Restrito",
  FLAGGED: "Sinalizado",
  DISCONNECTED: "Desconectado",
  RATE_LIMITED: "Limitado",
  PENDING: "Pendente",
  DELETED: "Excluído",
  MIGRATED: "Migrado",
  UNVERIFIED: "Não verificado",
};

async function diffPhone(
  workspaceId: string,
  before: { displayPhoneNumber: string; qualityRating: string | null; status: string | null },
  after: { qualityRating: string; status?: string },
  bm: string,
) {
  const num = formatPhone(before.displayPhoneNumber.replace(/\D/g, ""));
  // A BM (e a WABA) do número vai no título e na mensagem: dá para saber na hora de qual BM é
  if (before.qualityRating && before.qualityRating !== after.qualityRating) {
    const worse = (QUALITY_ORDER[after.qualityRating] ?? 0) < (QUALITY_ORDER[before.qualityRating] ?? 0);
    await createAlert({
      workspaceId,
      type: "QUALITY_CHANGE",
      severity: worse ? (after.qualityRating === "RED" ? "CRITICAL" : "WARNING") : "INFO",
      title: `Qualidade do número ${num} (${bm.split(" / ")[0]}) ${worse ? "caiu" : "subiu"}`,
      message: `${/^bm\b/i.test(bm) ? "" : "BM "}${bm}: ${qualityLabel(before.qualityRating)} → ${qualityLabel(after.qualityRating)}`,
    });
  }
  if (before.status && after.status && before.status !== after.status) {
    const bad = ["FLAGGED", "RESTRICTED", "BANNED", "DISCONNECTED", "RATE_LIMITED"].includes(after.status);
    await createAlert({
      workspaceId,
      type: "NUMBER_STATUS",
      severity: bad ? "CRITICAL" : "INFO",
      title: after.status === "BANNED" ? `Número ${num} banido (${bm.split(" / ")[0]})` : `Status do número ${num} (${bm.split(" / ")[0]}) mudou`,
      message: `${/^bm\b/i.test(bm) ? "" : "BM "}${bm}: ${PHONE_STATUS_PT[before.status] ?? before.status} → ${PHONE_STATUS_PT[after.status] ?? after.status}`,
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
  // Uma WABA pertence a uma conta do Fuzil só: impede que outra conta "puxe" os números de alguém
  const elsewhere = await prisma.whatsAppAccount.findFirst({ where: { wabaId: input.wabaId, workspaceId: { not: input.workspaceId } }, select: { id: true } });
  if (elsewhere) throw new Error("Essa WABA já está conectada em outra conta do Fuzil. Fale com o suporte se ela for sua.");
  // Confere na Meta, com o token que vai ser usado, que esse acesso existe antes de gravar qualquer coisa
  const token = input.accessTokenEnc ? decrypt(input.accessTokenEnc) : env.metaSystemToken();
  if (!token) throw new Error("Nenhum token de acesso para essa WABA");
  await meta.getWaba(token, input.wabaId).catch(() => {
    throw new Error("A Meta não deu acesso a essa WABA com esse token. Confira o ID da WABA e se o token tem acesso a ela.");
  });

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

  await ensureWebhook(waba.id);
  await syncWaba(waba.id);
  return waba;
}

/** Inscreve o webhook da WABA (com URL própria do Fuzil). Avisa se não conseguir. */
export async function ensureWebhook(wabaRecordId: string) {
  const waba = await prisma.whatsAppAccount.findUniqueOrThrow({ where: { id: wabaRecordId }, include: { business: true } });
  const override =
    env.appUrl().startsWith("https://") && env.metaVerifyToken()
      ? { callbackUrl: `${env.appUrl()}/api/webhook`, verifyToken: env.metaVerifyToken() }
      : undefined;
  try {
    await meta.subscribeApp(wabaToken(waba), waba.wabaId, override);
    await prisma.whatsAppAccount.update({ where: { id: waba.id }, data: { webhookSubscribed: true } });
    return true;
  } catch (err) {
    if (waba.webhookSubscribed !== false || !waba.lastSyncedAt) {
      await createAlert({
        workspaceId: waba.workspaceId,
        type: "SYNC_ERROR",
        severity: "WARNING",
        title: `Webhook não inscrito: ${waba.business.name} / ${waba.name}`,
        message: `Sem o webhook, entregas, leituras, respostas e recategorizações dessa WABA não chegam ao painel. Erro: ${err instanceof Error ? err.message : err}`,
      });
    }
    await prisma.whatsAppAccount.update({ where: { id: waba.id }, data: { webhookSubscribed: false } });
    return false;
  }
}

export const WEBHOOK_FIELDS = [
  "messages",
  "message_template_status_update",
  "template_category_update",
  "message_template_quality_update",
  "phone_number_quality_update",
  "phone_number_name_update",
  "account_update",
  "account_alerts",
];

/**
 * Conexão manual: configura sozinho o webhook do app da BM (URL do Fuzil + campos) usando a chave secreta do app.
 * Retorna null se deu certo, ou o motivo.
 */
export async function configureBmAppWebhook(wabaRecordId: string, appSecret: string): Promise<string | null> {
  const waba = await prisma.whatsAppAccount.findUniqueOrThrow({ where: { id: wabaRecordId } });
  if (!env.appUrl().startsWith("https://") || !env.metaVerifyToken()) return "o painel precisa estar em https com o token de verificação configurado";
  try {
    const appId = await meta.appIdOf(wabaToken(waba));
    // Liga o webhook do app (inclusive o app do Fuzil): sem isso a Meta não manda entregue/lida/resposta
    await meta.setAppWebhook(appId, appSecret, `${env.appUrl()}/api/webhook`, env.metaVerifyToken(), WEBHOOK_FIELDS);
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  await ensureWebhook(waba.id).catch(() => undefined);
  return null;
}
