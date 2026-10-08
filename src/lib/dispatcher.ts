import type { Campaign, CampaignRecipient } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./env";
import { meta, MetaError } from "./meta";
import { wabaToken } from "./sync";
import { tierToLimit } from "./limits";
import { createAlert } from "./alerts";
import { addCredits, tryDebit } from "./credits";
import { buildSendComponents, type TComponent, type VariableMapping } from "./template-utils";
import { metaErrorLabel, RETRYABLE_CODES, SENDER_FATAL_CODES, TEMPLATE_FATAL_CODES } from "./meta-errors";
import { formatPhone } from "./phone";

export const TICK_MS = 2000;
const DEFAULT_RATE = 20; // msgs/s por número
const MAX_ATTEMPTS = 3;
const BAD_PHONE_STATUS = new Set(["BANNED", "RESTRICTED", "FLAGGED", "DISCONNECTED", "DELETED", "UNVERIFIED"]);

export type Sender = {
  phoneId: string; // id interno
  phoneNumberId: string; // id da Meta
  display: string;
  businessId: string;
  businessName: string;
  wabaId: string; // id interno da WABA
  token: string;
  template: { name: string; language: string; components: TComponent[] };
};

export type SenderPlan = {
  senders: Sender[];
  /** Capacidade restante (24h) por BM. Infinity = ilimitado / desconhecido. */
  capacity: Map<string, number>;
  /** Motivo de cada número que ficou de fora (para mostrar no painel). */
  skipped: Array<{ display: string; reason: string }>;
};

/** Destinatários únicos atendidos por cada BM nas últimas 24h (o limite da Meta é por portfólio). */
async function usedLast24h(businessIds: string[]): Promise<Map<string, number>> {
  if (!businessIds.length) return new Map();
  const rows = await prisma.$queryRaw<Array<{ businessId: string; used: bigint }>>`
    SELECT w."businessId" AS "businessId", COUNT(DISTINCT r.phone) AS used
    FROM "CampaignRecipient" r
    JOIN "PhoneNumber" p ON p.id = r."senderId"
    JOIN "WhatsAppAccount" w ON w.id = p."wabaId"
    WHERE r."sentAt" > NOW() - INTERVAL '24 hours'
      AND w."businessId" = ANY(${businessIds})
    GROUP BY w."businessId"`;
  return new Map(rows.map((r) => [r.businessId, Number(r.used)]));
}

/**
 * Monta a lista de números aptos para a campanha.
 * Regra de ouro: só entra número cuja WABA tem a cópia do template APROVADA e na categoria UTILITY.
 */
export async function planSenders(
  campaign: Pick<Campaign, "workspaceId" | "groupId" | "templateName" | "templateLanguage" | "skipRedQuality" | "excludedSenders">,
): Promise<SenderPlan> {
  const plan: SenderPlan = { senders: [], capacity: new Map(), skipped: [] };
  if (!campaign.groupId || !campaign.templateName || !campaign.templateLanguage) return plan;

  const members = await prisma.bmGroupMember.findMany({
    where: { groupId: campaign.groupId },
    include: {
      business: {
        include: {
          wabas: {
            include: {
              phones: true,
              templates: { where: { name: campaign.templateName, language: campaign.templateLanguage } },
            },
          },
        },
      },
    },
  });

  const used = await usedLast24h(members.map((m) => m.businessId));

  for (const { business } of members) {
    const limit = tierToLimit(business.messagingLimitTier) ?? Infinity;
    plan.capacity.set(business.id, Math.max(0, limit - (used.get(business.id) ?? 0)));

    for (const waba of business.wabas) {
      const tpl = waba.templates[0];
      for (const phone of waba.phones) {
        const display = formatPhone(phone.displayPhoneNumber.replace(/\D/g, ""));
        const skip = (reason: string) => plan.skipped.push({ display, reason });
        if (!phone.enabled) { skip("Número desativado no rodízio"); continue; }
        if (campaign.excludedSenders.includes(phone.id)) { skip("Retirado desta campanha por erro"); continue; }
        if (phone.status && BAD_PHONE_STATUS.has(phone.status)) { skip(`Status ${phone.status}`); continue; }
        if (campaign.skipRedQuality && phone.qualityRating === "RED") { skip("Qualidade vermelha"); continue; }
        if (!tpl) { skip("Template não existe nesta WABA"); continue; }
        if (tpl.status !== "APPROVED") { skip(`Template ${tpl.status}`); continue; }
        if (tpl.category !== "UTILITY") { skip(`Template recategorizado para ${tpl.category}`); continue; }
        let token: string;
        try {
          token = wabaToken(waba);
        } catch {
          skip("Sem token de acesso");
          continue;
        }
        plan.senders.push({
          phoneId: phone.id,
          phoneNumberId: phone.phoneNumberId,
          display,
          businessId: business.id,
          businessName: business.name,
          wabaId: waba.id,
          token,
          template: { name: tpl.name, language: tpl.language, components: tpl.components as unknown as TComponent[] },
        });
      }
    }
  }
  return plan;
}

/** Reserva destinatários pendentes de forma segura (vários workers não pegam o mesmo). */
async function claimRecipients(campaignId: string, limit: number): Promise<CampaignRecipient[]> {
  if (limit <= 0) return [];
  return prisma.$queryRaw<CampaignRecipient[]>`
    UPDATE "CampaignRecipient" SET status = 'SENDING', "queuedAt" = NOW(), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM "CampaignRecipient"
      WHERE "campaignId" = ${campaignId} AND status = 'PENDING'
      ORDER BY "createdAt", id
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *`;
}

async function releaseRecipients(ids: string[]) {
  if (!ids.length) return;
  await prisma.campaignRecipient.updateMany({
    where: { id: { in: ids }, status: "SENDING" },
    data: { status: "PENDING", attempts: { decrement: 1 } },
  });
}

export async function pauseCampaign(campaign: Pick<Campaign, "id" | "workspaceId" | "name">, reason: string, severity: "WARNING" | "CRITICAL" = "CRITICAL") {
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "PAUSED", pausedReason: reason } });
  await createAlert({
    workspaceId: campaign.workspaceId,
    type: "CAMPAIGN_PAUSED",
    severity,
    title: `Campanha "${campaign.name}" pausada`,
    message: reason,
    data: { campaignId: campaign.id },
  });
}

/** Distribui os destinatários entre os números, respeitando a capacidade de cada BM (round-robin). */
export function distribute<T>(items: T[], senders: Sender[], capacity: Map<string, number>, perSenderMax: number) {
  const buckets = new Map<string, T[]>(senders.map((s) => [s.phoneId, []]));
  const cap = new Map(capacity);
  let i = 0;
  let idle = 0;
  const rest: T[] = [];
  for (const item of items) {
    let placed = false;
    while (idle < senders.length) {
      const s = senders[i % senders.length];
      i++;
      const bucket = buckets.get(s.phoneId)!;
      const left = cap.get(s.businessId) ?? Infinity;
      if (left > 0 && bucket.length < perSenderMax) {
        bucket.push(item);
        cap.set(s.businessId, left - 1);
        placed = true;
        idle = 0;
        break;
      }
      idle++;
    }
    if (!placed) rest.push(item);
  }
  return { buckets, rest };
}

type SendOutcome =
  | { kind: "sent"; wamid: string }
  | { kind: "failed"; code: number | null; title: string; detail?: string }
  | { kind: "retry"; code: number | null }
  | { kind: "sender_fatal"; code: number | null; title: string }
  | { kind: "template_fatal"; code: number | null; title: string };

async function sendOne(sender: Sender, campaign: Campaign, r: CampaignRecipient): Promise<SendOutcome> {
  try {
    const components = buildSendComponents(sender.template.components, (campaign.variableMapping ?? {}) as VariableMapping, {
      phone: r.phone,
      name: r.name,
      data: r.data as Record<string, unknown>,
    }, {
      redirectDomain: env.redirectDomain(),
      clickToken: r.clickToken,
      headerMediaUrl: campaign.headerMediaUrl,
      headerMediaName: campaign.headerMediaName,
    });
    const res = await meta.sendTemplate(sender.token, sender.phoneNumberId, r.phone, {
      name: sender.template.name,
      language: sender.template.language,
      components,
    });
    const wamid = res.messages?.[0]?.id;
    if (!wamid) return { kind: "failed", code: null, title: "Meta não retornou o id da mensagem" };
    return { kind: "sent", wamid };
  } catch (err) {
    if (err instanceof MetaError) {
      const title = metaErrorLabel(err.code) + (err.message ? ` — ${err.message}` : "");
      if (err.code !== null && SENDER_FATAL_CODES.has(err.code)) return { kind: "sender_fatal", code: err.code, title };
      if (err.code !== null && TEMPLATE_FATAL_CODES.has(err.code)) return { kind: "template_fatal", code: err.code, title };
      if ((err.code !== null && RETRYABLE_CODES.has(err.code)) || err.httpStatus >= 500) return { kind: "retry", code: err.code };
      return { kind: "failed", code: err.code, title, detail: err.details };
    }
    return { kind: "retry", code: null };
  }
}

async function templateStillUtility(sender: Sender): Promise<boolean> {
  const tpl = await prisma.template.findUnique({
    where: { wabaId_name_language: { wabaId: sender.wabaId, name: sender.template.name, language: sender.template.language } },
    select: { category: true, status: true },
  });
  return tpl?.category === "UTILITY" && tpl.status === "APPROVED";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Executa um "tick" de uma campanha em andamento. */
export async function runCampaignTick(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, include: { workspace: true } });
  if (!campaign || campaign.status !== "RUNNING") return;

  const plan = await planSenders(campaign);
  if (!plan.senders.length) {
    const reasons = [...new Set(plan.skipped.map((s) => s.reason))].join("; ");
    await pauseCampaign(campaign, `Nenhum número apto para enviar.${reasons ? ` Motivos: ${reasons}` : ""}`);
    return;
  }

  const totalCapacity = [...plan.capacity.values()].reduce((a, b) => a + b, 0);
  const rate = campaign.ratePerSecond > 0 ? campaign.ratePerSecond : DEFAULT_RATE;
  const perSender = Math.max(1, Math.floor((rate * TICK_MS) / 1000));
  const wanted = Math.min(perSender * plan.senders.length, totalCapacity === Infinity ? Number.MAX_SAFE_INTEGER : totalCapacity);

  if (wanted <= 0) {
    const { bmWindows, whenText } = await import("./limit-windows");
    const ws = await bmWindows([...plan.capacity.keys()]);
    const next = [...ws.values()].map((w) => w.nextReleaseAt).filter((d): d is Date => Boolean(d)).sort((a, b) => a.getTime() - b.getTime())[0];
    const reason = `Aguardando limite das BMs liberar${next ? ` (volta ${whenText(next)})` : ""}`;
    if (!campaign.pausedReason?.startsWith("Aguardando limite")) {
      await prisma.campaign.update({ where: { id: campaign.id }, data: { pausedReason: reason } });
      await createAlert({
        workspaceId: campaign.workspaceId,
        type: "LIMIT_REACHED",
        severity: "WARNING",
        title: `Campanha "${campaign.name}" aguardando limite`,
        message: `Todas as BMs do grupo atingiram o limite de 24h. O envio continua sozinho quando liberar${next ? `, ${whenText(next)}` : ""}.`,
      });
    }
    return;
  }
  if (campaign.pausedReason) await prisma.campaign.update({ where: { id: campaign.id }, data: { pausedReason: null } });

  const claimed = await claimRecipients(campaign.id, wanted);
  if (!claimed.length) {
    await maybeComplete(campaign.id);
    return;
  }

  // Descadastrados (responderam SAIR/PARAR em qualquer campanha)
  const optedOut = new Set(
    (
      await prisma.contact.findMany({
        where: { workspaceId: campaign.workspaceId, optedOut: true, phone: { in: claimed.map((r) => r.phone) } },
        select: { phone: true },
      })
    ).map((c) => c.phone),
  );
  const toSkip = claimed.filter((r) => optedOut.has(r.phone));
  if (toSkip.length) {
    await prisma.campaignRecipient.updateMany({
      where: { id: { in: toSkip.map((r) => r.id) } },
      data: { status: "SKIPPED", errorTitle: "Contato descadastrado (opt-out)" },
    });
  }
  const sendable = claimed.filter((r) => !optedOut.has(r.phone));

  // Cobra o lote antes de enviar
  const price = campaign.workspace.creditsPerMessage;
  if (sendable.length && !(await tryDebit(campaign.workspaceId, sendable.length * price, `Campanha ${campaign.name}`, campaign.id))) {
    await releaseRecipients(sendable.map((r) => r.id));
    await pauseCampaign(campaign, "Saldo insuficiente. Adicione créditos e retome a campanha.");
    return;
  }

  const { buckets, rest } = distribute(sendable, plan.senders, plan.capacity, perSender);
  // O que não coube volta pra fila (e o crédito volta junto)
  if (rest.length) {
    await releaseRecipients(rest.map((r) => r.id));
    await addCredits(campaign.workspaceId, rest.length * price, "REFUND", `Estorno (sem capacidade) — ${campaign.name}`, { campaignId: campaign.id });
  }

  const started = Date.now();
  let templateFatal: string | null = null;
  const fatalSenders = new Map<string, string>();
  let refund = 0;

  await Promise.all(
    plan.senders.map(async (sender) => {
      const items = buckets.get(sender.phoneId) ?? [];
      for (let offset = 0; offset < items.length; offset += rate) {
        const chunk = items.slice(offset, offset + rate);
        const t0 = Date.now();
        // Trava de segurança: reconfere a categoria a cada leva (a recategorização pode chegar no meio do lote)
        if (!(await templateStillUtility(sender))) {
          await releaseRecipients(items.slice(offset).map((r) => r.id));
          refund += (items.length - offset) * price;
          break;
        }
        await Promise.all(
          chunk.map(async (r) => {
            if (templateFatal || fatalSenders.has(sender.phoneId)) {
              await releaseRecipients([r.id]);
              refund += price;
              return;
            }
            const out = await sendOne(sender, campaign, r);
            switch (out.kind) {
              case "sent":
                await prisma.campaignRecipient.update({
                  where: { id: r.id },
                  data: { status: "SENT", wamid: out.wamid, senderId: sender.phoneId, sentAt: new Date(), creditsCharged: price, errorCode: null, errorTitle: null },
                });
                break;
              case "retry":
                refund += price;
                if (r.attempts >= MAX_ATTEMPTS) {
                  await prisma.campaignRecipient.update({
                    where: { id: r.id },
                    data: { status: "FAILED", senderId: sender.phoneId, failedAt: new Date(), errorCode: out.code, errorTitle: metaErrorLabel(out.code) },
                  });
                } else {
                  await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: "PENDING" } });
                }
                break;
              case "sender_fatal":
                refund += price;
                fatalSenders.set(sender.phoneId, out.title);
                await releaseRecipients([r.id]);
                break;
              case "template_fatal":
                refund += price;
                templateFatal = out.title;
                await releaseRecipients([r.id]);
                break;
              case "failed":
                refund += price;
                await prisma.campaignRecipient.update({
                  where: { id: r.id },
                  data: { status: "FAILED", senderId: sender.phoneId, failedAt: new Date(), errorCode: out.code, errorTitle: out.title, errorDetail: out.detail },
                });
                break;
            }
          }),
        );
        const elapsed = Date.now() - t0;
        if (offset + rate < items.length && elapsed < 1000) await sleep(1000 - elapsed);
      }
    }),
  );

  if (refund > 0) {
    await addCredits(campaign.workspaceId, refund, "REFUND", `Estorno de falhas — ${campaign.name}`, { campaignId: campaign.id });
  }

  for (const [phoneId, reason] of fatalSenders) {
    const sender = plan.senders.find((s) => s.phoneId === phoneId)!;
    await prisma.campaign.update({ where: { id: campaign.id }, data: { excludedSenders: { push: phoneId } } });
    await createAlert({
      workspaceId: campaign.workspaceId,
      type: "SENDER_REMOVED",
      severity: "CRITICAL",
      title: `Número ${sender.display} retirado da campanha "${campaign.name}"`,
      message: `${sender.businessName}: ${reason}`,
    });
  }
  if (templateFatal) await pauseCampaign(campaign, `Erro no template: ${templateFatal}`);

  if (Date.now() - started > 60_000) console.warn(`[dispatcher] tick lento na campanha ${campaign.id}: ${Date.now() - started}ms`);
}

export async function maybeComplete(campaignId: string) {
  const open = await prisma.campaignRecipient.count({ where: { campaignId, status: { in: ["PENDING", "SENDING"] } } });
  if (open > 0) return;
  const c = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "COMPLETED", completedAt: new Date(), pausedReason: null },
  });
  await createAlert({
    workspaceId: c.workspaceId,
    type: "CAMPAIGN_COMPLETED",
    severity: "INFO",
    title: `Campanha "${c.name}" concluída`,
    message: "Todos os destinatários foram processados.",
    data: { campaignId },
  });
}

/** Recupera destinatários presos em SENDING (ex.: worker reiniciou no meio do envio). */
export async function recoverStuck() {
  const res = await prisma.campaignRecipient.updateMany({
    where: { status: "SENDING", wamid: null, queuedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
    data: { status: "PENDING" },
  });
  if (res.count) console.log(`[dispatcher] ${res.count} destinatários devolvidos para a fila`);
}

export async function startDueCampaigns() {
  const due = await prisma.campaign.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } } });
  for (const c of due) {
    await prisma.campaign.update({ where: { id: c.id }, data: { status: "RUNNING", startedAt: c.startedAt ?? new Date() } });
    console.log(`[dispatcher] campanha agendada iniciada: ${c.name}`);
  }
}
