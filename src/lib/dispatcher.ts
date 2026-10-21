import type { Campaign, CampaignRecipient } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./env";
import { meta, MetaError } from "./meta";
import { wabaToken } from "./sync";
import { tierToLimit } from "./limits";
import { createAlert } from "./alerts";
import { addCredits, tryDebit } from "./credits";
import { buildSendComponents, getComponent, type TComponent, type VariableMapping } from "./template-utils";

/** Texto do corpo e botões (sem exemplos): dois templates com a mesma assinatura são o mesmo conteúdo. */
const signature = (components: unknown) => {
  const c = (components ?? []) as TComponent[];
  const body = getComponent(c, "BODY")?.text ?? "";
  const buttons = (getComponent(c, "BUTTONS")?.buttons ?? []).map((b) => ({ type: b.type, text: b.text, url: b.url ?? "" }));
  const header = getComponent(c, "HEADER");
  return JSON.stringify({ body, buttons, header: header ? { format: header.format ?? null, text: header.text ?? null } : null });
};
import { metaErrorLabel, RETRYABLE_CODES, SENDER_FATAL_CODES, TEMPLATE_FATAL_CODES } from "./meta-errors";
import { formatPhone } from "./phone";
import { recordCampaignSends, renderCampaignText } from "./chat";
import { templateFamily } from "./blueprints";
import { flagBusinessProblem, problemFix } from "./bm-problems";

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
  campaign: Pick<Campaign, "workspaceId" | "groupId" | "templateName" | "templateLanguage" | "skipRedQuality" | "excludedSenders"> & { templateCategory?: string },
): Promise<SenderPlan> {
  const category = campaign.templateCategory ?? "UTILITY";
  const plan: SenderPlan = { senders: [], capacity: new Map(), skipped: [] };
  if (!campaign.groupId || !campaign.templateName || !campaign.templateLanguage) return plan;

  // O mesmo template pode ter versões numeradas em algumas WABAs (fzl_disp1, fzl_disp2...)
  const family = await templateFamily(campaign.workspaceId, campaign.templateName, campaign.templateLanguage);
  const members = await prisma.bmGroupMember.findMany({
    // Só BMs da própria conta, mesmo que o grupo tenha sido trocado por um de outra conta
    where: { groupId: campaign.groupId, business: { workspaceId: campaign.workspaceId } },
    include: {
      business: {
        include: {
          wabas: {
            include: {
              phones: true,
              // Todos os templates do idioma: o do nome escolhido e os de mesmo conteúdo com outro nome
              templates: { where: { language: campaign.templateLanguage } },
            },
          },
        },
      },
    },
  });

  // Conteúdo de referência: o template com o nome escolhido, em qualquer conta do grupo
  const refTpl = members.flatMap((m) => m.business.wabas.flatMap((w) => w.templates)).find((t) => family.includes(t.name));
  const reference = refTpl ? signature(refTpl.components) : null;

  const used = await usedLast24h(members.map((m) => m.businessId));

  for (const { business } of members) {
    const limit = tierToLimit(business.messagingLimitTier) ?? Infinity;
    plan.capacity.set(business.id, Math.max(0, limit - (used.get(business.id) ?? 0)));

    for (const waba of business.wabas) {
      // Prefere o template do nome escolhido; se a conta não tem esse nome, usa o aprovado com o mesmo conteúdo
      const byName = waba.templates.find((t) => family.includes(t.name) && t.status === "APPROVED" && t.category === category);
      const sameContent = !byName && reference ? waba.templates.find((t) => t.status === "APPROVED" && t.category === category && signature(t.components) === reference) : undefined;
      // Sem o nome escolhido nem um template de mesmo conteúdo, a BM fica de fora (nunca manda outro template no lugar)
      const tpl = byName ?? sameContent ?? waba.templates.find((t) => family.includes(t.name));
      for (const phone of waba.phones) {
        const display = formatPhone(phone.displayPhoneNumber.replace(/\D/g, ""));
        const skip = (reason: string) => plan.skipped.push({ display, reason });
        if (phone.invalidReason) { skip(phone.invalidReason); continue; }
        if (!phone.enabled) { skip("Número desativado no rodízio"); continue; }
        if (campaign.excludedSenders.includes(phone.id)) { skip("Retirado desta campanha por erro"); continue; }
        if (phone.status && BAD_PHONE_STATUS.has(phone.status)) { skip(`Status ${phone.status}`); continue; }
        if (campaign.skipRedQuality && phone.qualityRating === "RED") { skip("Qualidade vermelha"); continue; }
        if (!tpl) { skip("Template não existe nesta WABA"); continue; }
        if (tpl.status !== "APPROVED") { skip(`Template ${tpl.status}`); continue; }
        if (tpl.category !== category) { skip(`Template recategorizado para ${tpl.category}`); continue; }
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
      WHERE "campaignId" = ${campaignId} AND status = 'PENDING' AND ("retryAt" IS NULL OR "retryAt" <= NOW())
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
    data: { status: "PENDING", attempts: { decrement: 1 }, creditsCharged: 0 },
  });
}

export async function pauseCampaign(campaign: Pick<Campaign, "id" | "workspaceId" | "name">, reason: string, severity: "WARNING" | "CRITICAL" = "CRITICAL") {
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "PAUSED", pausedReason: reason } });
  // O funil retoma sozinho e pode pausar de novo pelo mesmo motivo: avisa uma vez a cada 6h
  const title = `Campanha "${campaign.name}" pausada`;
  if (await prisma.alert.findFirst({ where: { workspaceId: campaign.workspaceId, title, message: reason, createdAt: { gte: new Date(Date.now() - 6 * 3600_000) } }, select: { id: true } })) return;
  await createAlert({
    workspaceId: campaign.workspaceId,
    type: "CAMPAIGN_PAUSED",
    severity,
    title,
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
    // Template de código (AUTHENTICATION): o código vai no corpo e no botão "Copiar código"
    const code = campaign.templateCategory === "AUTHENTICATION" ? String((r.data as Record<string, unknown>)?.codigo ?? "") : null;
    const components = code
      ? [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ]
      : buildSendComponents(sender.template.components, (campaign.variableMapping ?? {}) as VariableMapping, {
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
      const title = metaErrorLabel(err.code) + (err.code !== null ? ` (código ${err.code})` : "") + (err.message ? ` — ${err.message}` : "") + ` [enviado: ${sender.template.name} · ${sender.template.language}]`;
      if (err.code !== null && SENDER_FATAL_CODES.has(err.code)) return { kind: "sender_fatal", code: err.code, title };
      if (err.code !== null && TEMPLATE_FATAL_CODES.has(err.code)) return { kind: "template_fatal", code: err.code, title };
      if ((err.code !== null && RETRYABLE_CODES.has(err.code)) || err.httpStatus >= 500) return { kind: "retry", code: err.code };
      return { kind: "failed", code: err.code, title, detail: err.details };
    }
    return { kind: "retry", code: null };
  }
}

async function templateStillUtility(sender: Sender, category = "UTILITY"): Promise<boolean> {
  const tpl = await prisma.template.findUnique({
    where: { wabaId_name_language: { wabaId: sender.wabaId, name: sender.template.name, language: sender.template.language } },
    select: { category: true, status: true },
  });
  return tpl?.category === category && tpl.status === "APPROVED";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Executa um "tick" de uma campanha em andamento. */
export async function runCampaignTick(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, include: { workspace: true } });
  if (!campaign || campaign.status !== "RUNNING") return;
  if (campaign.workspace.blockedAt) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "PAUSED", pausedReason: "Conta bloqueada pelo administrador" } });
    return;
  }

  // Nada na fila agora (funil esperando lead, retry agendado): não monta o rodízio à toa
  const due = await prisma.campaignRecipient.findFirst({
    where: { campaignId, status: "PENDING", OR: [{ retryAt: null }, { retryAt: { lte: new Date() } }] },
    select: { id: true },
  });
  if (!due) {
    await maybeComplete(campaignId);
    return;
  }

  const plan = await planSenders(campaign);
  if (!plan.senders.length) {
    const reasons = [...new Set(plan.skipped.map((s) => s.reason))].join("; ");
    await pauseCampaign(campaign, `Nenhum número apto para enviar.${reasons ? ` Motivos: ${reasons}` : ""}`);
    return;
  }

  // Só conta a capacidade das BMs que têm algum número apto (senão pega, cobra e devolve em loop)
  const senderBms = new Set(plan.senders.map((x) => x.businessId));
  const totalCapacity = [...plan.capacity.entries()].filter(([id]) => senderBms.has(id)).reduce((a, [, v]) => a + v, 0);
  // Velocidade total dividida entre os números aptos (ex.: 30/s com 6 números = 5/s por número)
  const rate = campaign.totalRatePerSecond
    ? Math.max(1, Math.ceil(campaign.totalRatePerSecond / plan.senders.length))
    : campaign.ratePerSecond > 0
      ? campaign.ratePerSecond
      : DEFAULT_RATE;
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

  // Cobra o lote antes de enviar. Se o saldo não cobre tudo, envia o que dá e devolve o resto pra fila
  const price = campaign.workspace.creditsPerMessage;
  let sendable = claimed.filter((r) => !optedOut.has(r.phone));
  if (price > 0 && sendable.length * price > campaign.workspace.creditBalance) {
    const keep = Math.floor(campaign.workspace.creditBalance / price);
    await releaseRecipients(sendable.slice(keep).map((r) => r.id));
    sendable = sendable.slice(0, keep);
  }
  if (!sendable.length && claimed.length > toSkip.length) {
    await pauseCampaign(campaign, "Saldo insuficiente. Adicione créditos e retome a campanha.");
    return;
  }
  if (sendable.length && !(await tryDebit(campaign.workspaceId, sendable.length * price, `Campanha ${campaign.name}`, campaign.id))) {
    await releaseRecipients(sendable.map((r) => r.id));
    await pauseCampaign(campaign, "Saldo insuficiente. Adicione créditos e retome a campanha.");
    return;
  }
  // Marca o crédito reservado em cada um: se o worker cair no meio, a recuperação sabe quanto devolver
  if (sendable.length && price > 0)
    await prisma.campaignRecipient.updateMany({ where: { id: { in: sendable.map((r) => r.id) } }, data: { creditsCharged: price } });

  const { buckets, rest } = distribute(sendable, plan.senders, plan.capacity, perSender);
  // O que não coube volta pra fila (e o crédito volta junto)
  if (rest.length) {
    await releaseRecipients(rest.map((r) => r.id));
    await addCredits(campaign.workspaceId, rest.length * price, "REFUND", `Estorno (sem capacidade) — ${campaign.name}`, { campaignId: campaign.id });
  }

  const started = Date.now();
  const fatalSenders = new Map<string, string>();
  const fatalWabas = new Map<string, string>();
  const fatalCodes = new Map<string, number | null>();
  const firstSent = new Set<string>();
  let refund = 0;
  // Pausou ou cancelou no meio do lote: para de enviar e devolve o resto
  let stopped = false;
  const watch = setInterval(() => {
    prisma.campaign
      .findUnique({ where: { id: campaign.id }, select: { status: true } })
      .then((c) => { if (c?.status !== "RUNNING") stopped = true; })
      .catch(() => undefined);
  }, 1000);

  try {
    await Promise.all(
      plan.senders.map(async (sender) => {
        const items = buckets.get(sender.phoneId) ?? [];
        for (let offset = 0; offset < items.length; offset += rate) {
          const chunk = items.slice(offset, offset + rate);
          const t0 = Date.now();
          // Trava de segurança: reconfere a categoria a cada leva (a recategorização pode chegar no meio do lote)
          if (stopped || !(await templateStillUtility(sender, campaign.templateCategory))) {
            await releaseRecipients(items.slice(offset).map((r) => r.id));
            refund += (items.length - offset) * price;
            break;
          }
          const sentNow: Array<{ phone: string; name: string | null; wamid: string; text: string }> = [];
          await Promise.all(
            chunk.map(async (r) => {
              if (fatalWabas.has(sender.wabaId) || fatalSenders.has(sender.phoneId)) {
                await releaseRecipients([r.id]);
                refund += price;
                return;
              }
              let sentWamid: string | null = null;
              try {
                const out = await sendOne(sender, campaign, r);
                switch (out.kind) {
                  case "sent": {
                    sentWamid = out.wamid;
                    const data = { status: "SENT" as const, wamid: out.wamid, senderId: sender.phoneId, sentAt: new Date(), creditsCharged: price, errorCode: null, errorTitle: null };
                    // Já saiu pela Meta: insiste em gravar, senão a recuperação mandaria de novo
                    await prisma.campaignRecipient.update({ where: { id: r.id }, data }).catch(async () => {
                      await sleep(500);
                      await prisma.campaignRecipient.update({ where: { id: r.id }, data });
                    });
                    sentNow.push({ phone: r.phone, name: r.name, wamid: out.wamid, text: renderCampaignText(sender.template.components, campaign, r) });
                    if (!firstSent.has(sender.businessId)) {
                      firstSent.add(sender.businessId);
                      await prisma.businessManager.updateMany({ where: { id: sender.businessId, firstSentAt: null }, data: { firstSentAt: new Date() } });
                    }
                    break;
                  }
                  case "retry":
                    refund += price;
                    if (r.attempts >= MAX_ATTEMPTS) {
                      await prisma.campaignRecipient.update({
                        where: { id: r.id },
                        data: { status: "FAILED", senderId: sender.phoneId, failedAt: new Date(), errorCode: out.code, errorTitle: metaErrorLabel(out.code), creditsCharged: 0 },
                      });
                    } else {
                      // Espera antes de tentar de novo (limite de velocidade da Meta precisa de tempo, não de 2s)
                      const wait = (out.code === 131056 ? 120 : 30) * r.attempts;
                      await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: "PENDING", creditsCharged: 0, retryAt: new Date(Date.now() + wait * 1000) } });
                    }
                    break;
                  case "sender_fatal":
                    refund += price;
                    if (!fatalSenders.has(sender.phoneId)) fatalCodes.set(sender.phoneId, out.code);
                    fatalSenders.set(sender.phoneId, out.title);
                    await releaseRecipients([r.id]);
                    break;
                  case "template_fatal":
                    // Problema na cópia do template DESSA WABA: tira só ela, as outras seguem
                    refund += price;
                    fatalWabas.set(sender.wabaId, out.title);
                    await releaseRecipients([r.id]);
                    break;
                  case "failed":
                    refund += price;
                    await prisma.campaignRecipient.update({
                      where: { id: r.id },
                      data: { status: "FAILED", senderId: sender.phoneId, failedAt: new Date(), errorCode: out.code, errorTitle: out.title, errorDetail: out.detail, creditsCharged: 0 },
                    });
                    break;
                }
              } catch (e) {
                // Erro inesperado (ex.: banco caiu um instante): não perde o crédito nem envia duas vezes
                console.error("[dispatcher] destinatário", r.id, e instanceof Error ? e.message : e);
                if (!sentWamid) {
                  await releaseRecipients([r.id]).catch(() => undefined);
                  refund += price;
                }
              }
            }),
          );
          // Mostra os disparos no Chat (em lote, sem travar o envio)
          await recordCampaignSends(campaign.workspaceId, campaign.id, sender.phoneId, sentNow).catch((e) => console.error("[dispatcher] chat", e));
          const elapsed = Date.now() - t0;
          if (offset + rate < items.length && elapsed < 1000) await sleep(1000 - elapsed);
        }
      }),
    );
  } finally {
    clearInterval(watch);
    if (refund > 0) {
      await addCredits(campaign.workspaceId, refund, "REFUND", `Estorno de falhas — ${campaign.name}`, { campaignId: campaign.id });
    }
  }

  // Template com problema numa WABA: tira os números dela da campanha; só pausa se não sobrar nenhum
  for (const [wabaId, reason] of fatalWabas) {
    const out = plan.senders.filter((x) => x.wabaId === wabaId);
    for (const x of out) if (!fatalSenders.has(x.phoneId)) fatalSenders.set(x.phoneId, `Erro no template nessa WABA: ${reason}`);
  }
  for (const [phoneId, reason] of fatalSenders) {
    const sender = plan.senders.find((s) => s.phoneId === phoneId)!;
    // Problema na BM (pagamento, bloqueio, acesso...): ela vai para "BMs com problema"
    if (fatalCodes.has(phoneId))
      await flagBusinessProblem(sender.businessId, `${sender.display}: ${reason}`, problemFix(fatalCodes.get(phoneId))).catch((e) => console.error("[dispatcher] problema da BM", e));
    await prisma.campaign.update({ where: { id: campaign.id }, data: { excludedSenders: { push: phoneId } } });
    await createAlert({
      workspaceId: campaign.workspaceId,
      type: "SENDER_REMOVED",
      severity: "CRITICAL",
      title: `Número ${sender.display} retirado da campanha "${campaign.name}"`,
      message: `${sender.businessName}: ${reason}`,
    });
  }
  const remaining = plan.senders.filter((x) => !fatalSenders.has(x.phoneId));
  if (fatalWabas.size && !remaining.length) await pauseCampaign(campaign, `Erro no template: ${[...fatalWabas.values()][0]}`);

  if (Date.now() - started > 60_000) console.warn(`[dispatcher] tick lento na campanha ${campaign.id}: ${Date.now() - started}ms`);
}

export async function maybeComplete(campaignId: string) {
  const open = await prisma.campaignRecipient.count({ where: { campaignId, status: { in: ["PENDING", "SENDING"] } } });
  if (open > 0) return;
  // Só conclui se ainda estiver rodando (não passa por cima de cancelada/pausada, nem conclui duas vezes)
  const done = await prisma.campaign.updateMany({
    // Campanha de funil fica sempre aberta esperando os próximos leads
    where: { id: campaignId, status: "RUNNING", funnelId: null },
    data: { status: "COMPLETED", completedAt: new Date(), pausedReason: null },
  });
  if (!done.count) return;
  const c = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const [t] = await prisma.$queryRaw<Array<{ total: bigint; sent: bigint; delivered: bigint; failed: bigint }>>`
    SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "sentAt" IS NOT NULL) AS sent,
      COUNT(*) FILTER (WHERE "deliveredAt" IS NOT NULL) AS delivered, COUNT(*) FILTER (WHERE status = 'FAILED') AS failed
    FROM "CampaignRecipient" WHERE "campaignId" = ${campaignId}`;
  const n = (v: bigint) => Number(v).toLocaleString("pt-BR");
  await createAlert({
    workspaceId: c.workspaceId,
    type: "CAMPAIGN_COMPLETED",
    severity: "INFO",
    title: `Campanha "${c.name}" concluída`,
    message: `${n(t.sent)} de ${n(t.total)} enviadas · ${n(t.delivered)} entregues até agora · ${n(t.failed)} falhas.`,
    data: { campaignId },
  });
}

/** Recupera destinatários presos em SENDING (ex.: worker reiniciou no meio do envio). */
export async function recoverStuck() {
  const where = { status: "SENDING" as const, wamid: null, queuedAt: { lt: new Date(Date.now() - 5 * 60_000) } };
  const stuck = await prisma.campaignRecipient.findMany({ where, select: { id: true, creditsCharged: true, campaign: { select: { id: true, name: true, workspaceId: true } } }, take: 50_000 });
  if (!stuck.length) return;
  const res = await prisma.campaignRecipient.updateMany({ where: { ...where, id: { in: stuck.map((r) => r.id) } }, data: { status: "PENDING", creditsCharged: 0 } });
  // Devolve o crédito que foi reservado para eles (vão ser cobrados de novo quando saírem)
  const byCampaign = new Map<string, { workspaceId: string; name: string; amount: number }>();
  for (const r of stuck) {
    const cur = byCampaign.get(r.campaign.id) ?? { workspaceId: r.campaign.workspaceId, name: r.campaign.name, amount: 0 };
    cur.amount += r.creditsCharged;
    byCampaign.set(r.campaign.id, cur);
  }
  for (const [campaignId, c] of byCampaign)
    if (c.amount > 0) await addCredits(c.workspaceId, c.amount, "REFUND", `Estorno (envio interrompido) — ${c.name}`, { campaignId });
  console.log(`[dispatcher] ${res.count} destinatários devolvidos para a fila`);
}

export async function startDueCampaigns() {
  const due = await prisma.campaign.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() }, workspace: { blockedAt: null } } });
  for (const c of due) {
    await prisma.campaign.update({ where: { id: c.id }, data: { status: "RUNNING", startedAt: c.startedAt ?? new Date() } });
    await announceStart(c.id, true);
  }
}

/** Aviso de campanha iniciada (painel + Discord #campanhas). */
export async function announceStart(campaignId: string, scheduled = false) {
  const c = await prisma.campaign.findUnique({ where: { id: campaignId }, include: { group: true } });
  if (!c) return;
  const total = await prisma.campaignRecipient.count({ where: { campaignId, status: "PENDING" } });
  await createAlert({
    workspaceId: c.workspaceId,
    type: "CAMPAIGN_STARTED",
    severity: "INFO",
    title: `Campanha "${c.name}" ${scheduled ? "agendada começou" : "iniciada"}`,
    message: `${total.toLocaleString("pt-BR")} destinatários · template ${c.templateName} · grupo ${c.group?.name ?? "—"}.`,
    data: { campaignId },
  });
}
