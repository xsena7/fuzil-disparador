import { createHash, randomBytes, randomInt } from "node:crypto";
import type { Funnel, Lead, Prisma, TemplateBlueprint } from "@prisma/client";
import { prisma } from "./db";
import { getComponent, type TComponent, type VariableMapping } from "./template-utils";

/**
 * Login do gerador de links (funil kind LINKS): a pessoa recebe um código no WhatsApp (disparado pelo
 * rodízio de um grupo de BM), confirma no site e recebe as mensagens dos passos com timers.
 * Cada envio é uma campanha interna (funnelId + funnelStep): usa o mesmo motor das campanhas
 * (rodízio, créditos, limite de 24h, estorno, retry, chat), então todo envio conta para o limite das BMs.
 */

export type WaitStep = { id: string; type: "wait"; amount: number; unit: "minutes" | "hours" | "days" };
export type SendStep = { id: string; type: "send"; blueprintId: string; mapping: VariableMapping; onlyIfPending?: boolean };
export type FunnelStep = WaitStep | SendStep;

export const UNIT_MS = { minutes: 60_000, hours: 3600_000, days: 86400_000 } as const;
export const CODE_TTL_MIN = 10;
export const CODE_COOLDOWN_S = 60;
export const MAX_CODE_SENDS = 4;
export const MAX_CODE_ATTEMPTS = 5;

export const funnelSteps = (f: Pick<Funnel, "steps">) => (Array.isArray(f.steps) ? (f.steps as unknown as FunnelStep[]) : []);

export const hashCode = (leadId: string, code: string) => createHash("sha256").update(`${leadId}:${code}`).digest("hex");

// --- Campanhas internas de cada passo --------------------------------------

/** Acha (ou cria) a campanha interna que envia um passo do funil. */
async function stepCampaign(funnel: Funnel, step: string, bp: TemplateBlueprint, mapping: VariableMapping, label: string) {
  const status = funnel.status === "ACTIVE" ? "RUNNING" : "PAUSED";
  const data = {
    name: `Login · ${funnel.name} · ${label}`,
    groupId: funnel.groupId,
    templateName: bp.name,
    templateLanguage: bp.language,
    templateCategory: bp.category,
    variableMapping: mapping as Prisma.InputJsonValue,
  };
  const existing = await prisma.campaign.findUnique({ where: { funnelId_funnelStep: { funnelId: funnel.id, funnelStep: step } } });
  if (existing) {
    const changed = existing.templateName !== data.templateName || existing.groupId !== data.groupId || JSON.stringify(existing.variableMapping) !== JSON.stringify(mapping) || existing.name !== data.name;
    // Alguém cancelou/concluiu a campanha interna: com o funil ligado, ela volta a rodar
    const revive = funnel.status === "ACTIVE" && !["RUNNING", "PAUSED"].includes(existing.status);
    return changed || revive ? prisma.campaign.update({ where: { id: existing.id }, data: { ...data, ...(revive ? { status: "RUNNING" as const, pausedReason: null } : {}) } }) : existing;
  }
  // "Recebi" na mensagem de inscrição abre a conversa: responde na hora (mensagem grátis, conta como conversa de verdade)
  const autoReply =
    step !== "code" && step !== "login" && getComponent(bp.components as unknown as TComponent[], "BUTTONS")?.buttons?.some((b) => b.type === "QUICK_REPLY")
      ? {
          autoReplyEnabled: true,
          autoReplyText: "Perfeito, {{primeiro_nome}}! Tudo certo com a sua conta. Qualquer acesso novo, a gente te avisa por aqui. 😉",
        }
      : {};
  return prisma.campaign
    .create({ data: { ...data, workspaceId: funnel.workspaceId, funnelId: funnel.id, funnelStep: step, status, startedAt: new Date(), ...autoReply } })
    .catch(() => prisma.campaign.findUniqueOrThrow({ where: { funnelId_funnelStep: { funnelId: funnel.id, funnelStep: step } } }));
}

function leadData(lead: Lead, extra: Record<string, string> = {}) {
  return { email: lead.email ?? "", ...extra };
}

/** Coloca o lead na fila de um passo. `again` = reenviar mesmo se já foi (código novo). */
async function enqueue(funnel: Funnel, lead: Lead, step: string, bp: TemplateBlueprint, mapping: VariableMapping, label: string, extra: Record<string, string> = {}, again = false) {
  const campaign = await stepCampaign(funnel, step, bp, mapping, label);
  const data = leadData(lead, extra);
  const existing = await prisma.campaignRecipient.findUnique({ where: { campaignId_phone: { campaignId: campaign.id, phone: lead.phone } } });
  if (!existing) {
    await prisma.campaignRecipient.create({ data: { campaignId: campaign.id, phone: lead.phone, name: lead.name, data, clickToken: randomBytes(8).toString("base64url") } }).catch(() => undefined);
    return;
  }
  if (!again) return;
  // Reenvio: só volta para a fila se não estiver saindo agora
  await prisma.campaignRecipient.updateMany({
    where: { id: existing.id, status: { not: "SENDING" } },
    data: { status: "PENDING", data, name: lead.name, attempts: 0, retryAt: null, wamid: null, errorCode: null, errorTitle: null, errorDetail: null, sentAt: null, deliveredAt: null, readAt: null, failedAt: null },
  });
}

/** Gera um código novo e manda pelo WhatsApp. */
export async function sendCode(funnel: Funnel, lead: Lead) {
  const bp = funnel.codeBlueprintId ? await prisma.templateBlueprint.findUnique({ where: { id: funnel.codeBlueprintId } }) : null;
  if (!bp) throw new Error("Funil sem template de código");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: { codeHash: hashCode(lead.id, code), codeExpiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000), codeAttempts: 0, codeSends: { increment: 1 }, lastCodeAt: new Date() },
  });
  await enqueue(funnel, updated, "code", bp, { body: [{ type: "field", field: "col:codigo" }] }, "Código", { codigo: code }, true);
}

/** Gerador de links: aviso de "novo acesso" no WhatsApp (com os botões Fui eu / Não fui eu). */
export async function sendLoginAlert(funnel: Funnel, lead: Lead, quando: string) {
  const bp = funnel.loginBlueprintId ? await prisma.templateBlueprint.findUnique({ where: { id: funnel.loginBlueprintId } }) : null;
  if (bp) await enqueue(funnel, lead, "login", bp, { body: [{ type: "field", field: "col:quando" }] }, "Novo acesso", { quando }, true);
}

// --- Motor do funil (roda no worker) ----------------------------------------

const BRT_OFFSET_MS = 3 * 3600_000; // Brasília (sem horário de verão)

/** Próximo horário dentro da janela de envio (ex.: 8h às 21h de Brasília). */
export function nextAllowed(now: Date, from: number, to: number): Date {
  if (from >= to) return now;
  const local = new Date(now.getTime() - BRT_OFFSET_MS);
  const h = local.getUTCHours();
  if (h >= from && h < to) return now;
  const next = new Date(local);
  next.setUTCHours(from, randomInt(0, 20), 0, 0);
  if (h >= to) next.setUTCDate(next.getUTCDate() + 1);
  return new Date(next.getTime() + BRT_OFFSET_MS);
}

/** Avança o lead pelos passos até o próximo timer (ou até o fim). */
export async function advanceLead(funnel: Funnel, lead: Lead) {
  const steps = funnelSteps(funnel);
  let index = lead.stepIndex;
  let nextAt: Date | null = null;
  const now = new Date();
  const bps = new Map((await prisma.templateBlueprint.findMany({ where: { workspaceId: funnel.workspaceId, id: { in: steps.flatMap((s) => (s.type === "send" ? [s.blueprintId] : [])) } } })).map((b) => [b.id, b]));
  while (index < steps.length) {
    const step = steps[index];
    if (step.type === "wait") {
      index++;
      nextAt = new Date(now.getTime() + Math.max(1, step.amount) * UNIT_MS[step.unit]);
      break;
    }
    if (step.onlyIfPending && lead.status === "COMPLETED") {
      index++;
      continue;
    }
    // Fora do horário de envio: espera a janela abrir
    const allowed = nextAllowed(now, funnel.sendFrom, funnel.sendTo);
    if (allowed > now) {
      nextAt = allowed;
      break;
    }
    const bp = bps.get(step.blueprintId);
    if (bp) await enqueue(funnel, lead, step.id, bp, step.mapping ?? {}, `Passo ${index + 1}`);
    index++;
  }
  // Só grava se ninguém mexeu no lead enquanto isso (evita enviar duas vezes)
  await prisma.lead.updateMany({ where: { id: lead.id, stepIndex: lead.stepIndex }, data: { stepIndex: index, nextStepAt: nextAt } });
}

/** Tick do worker: leads com passo vencido + retomada das campanhas do funil pausadas por falta de saldo/número. */
export async function runFunnels() {
  const due = await prisma.lead.findMany({
    where: { nextStepAt: { lte: new Date() }, status: { in: ["VERIFIED", "COMPLETED"] }, funnel: { kind: "LINKS", status: "ACTIVE", workspace: { blockedAt: null } } },
    include: { funnel: true },
    orderBy: { nextStepAt: "asc" },
    take: 500,
  });
  for (const { funnel, ...lead } of due) await advanceLead(funnel, lead as Lead).catch((e) => console.error("[funil]", lead.id, e));

  await prisma.campaign.updateMany({
    where: {
      funnelId: { not: null },
      status: "PAUSED",
      // Pausa do funil ou pausa à mão: fica pausada até alguém retomar
      pausedReason: { notIn: [FUNNEL_PAUSED, "Pausada manualmente"] },
      updatedAt: { lt: new Date(Date.now() - 5 * 60_000) },
      funnel: { kind: "LINKS", status: "ACTIVE" },
    },
    data: { status: "RUNNING" },
  });
}

export const FUNNEL_PAUSED = "Funil pausado";
