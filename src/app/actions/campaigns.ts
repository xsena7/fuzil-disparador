"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveUpload, mediaKind } from "@/lib/uploads";
import { planSenders } from "@/lib/dispatcher";
import { createAlert } from "@/lib/alerts";
import type { FormState } from "./auth";

async function ownCampaign(id: string) {
  const auth = await requireAuth();
  const c = await prisma.campaign.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!c) throw new Error("Campanha não encontrada");
  return { auth, c };
}

const EDITABLE = ["DRAFT", "SCHEDULED", "PAUSED"];

export async function createCampaignAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Dê um nome à campanha" };
  const lastGroup = await prisma.campaign.findFirst({ where: { workspaceId: auth.workspace.id, groupId: { not: null } }, orderBy: { createdAt: "desc" } });
  const c = await prisma.campaign.create({ data: { workspaceId: auth.workspace.id, name, groupId: lastGroup?.groupId } });
  redirect(`/campanhas/${c.id}?etapa=template`);
}

export async function duplicateCampaignAction(id: string) {
  const { c } = await ownCampaign(id);
  const copy = await prisma.campaign.create({
    data: {
      workspaceId: c.workspaceId,
      name: `${c.name} (cópia)`,
      groupId: c.groupId,
      templateName: c.templateName,
      templateLanguage: c.templateLanguage,
      variableMapping: c.variableMapping ?? undefined,
      headerMediaUrl: c.headerMediaUrl,
      headerMediaType: c.headerMediaType,
      headerMediaName: c.headerMediaName,
      buttonUrl: c.buttonUrl,
      ratePerSecond: c.ratePerSecond,
      skipRedQuality: c.skipRedQuality,
    },
  });
  redirect(`/campanhas/${copy.id}?etapa=audiencia`);
}

export async function saveTemplateStepAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { c } = await ownCampaign(id);
  if (!EDITABLE.includes(c.status)) return { error: "Campanha já iniciada" };
  const groupId = String(form.get("groupId") ?? "");
  const [name, language] = String(form.get("template") ?? "").split("|");
  if (!groupId) return { error: "Escolha um grupo de BM" };
  if (!name || !language) return { error: "Escolha um template" };
  const changed = name !== c.templateName || language !== c.templateLanguage;
  await prisma.campaign.update({
    where: { id },
    data: {
      name: String(form.get("name") ?? c.name).trim() || c.name,
      groupId,
      templateName: name,
      templateLanguage: language,
      ...(changed ? { variableMapping: undefined, headerMediaUrl: null, headerMediaType: null, buttonUrl: null } : {}),
    },
  });
  redirect(`/campanhas/${id}?etapa=conteudo`);
}

export async function saveContentStepAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { c } = await ownCampaign(id);
  if (!EDITABLE.includes(c.status)) return { error: "Campanha já iniciada" };
  let mapping: Prisma.InputJsonValue;
  try {
    mapping = JSON.parse(String(form.get("mapping") ?? "{}"));
  } catch {
    return { error: "Mapeamento inválido" };
  }
  const buttonUrl = String(form.get("buttonUrl") ?? "").trim() || null;
  if (buttonUrl && !/^https?:\/\/\S+\.\S+/.test(buttonUrl)) return { error: "Link de destino inválido (use https://...)" };
  if (form.get("requiresButtonUrl") === "1" && !buttonUrl) return { error: "Cole o link de destino do botão" };

  const data: Prisma.CampaignUpdateInput = { variableMapping: mapping, buttonUrl };
  const file = form.get("media");
  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveUpload(file);
      data.headerMediaUrl = saved.url;
      data.headerMediaType = mediaKind(saved.mime);
      data.headerMediaName = saved.name;
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  } else if (form.get("requiresMedia") === "1" && !c.headerMediaUrl) {
    return { error: "Envie a mídia do cabeçalho" };
  }
  await prisma.campaign.update({ where: { id }, data });
  redirect(`/campanhas/${id}?etapa=audiencia`);
}

export async function startCampaignAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { auth, c } = await ownCampaign(id);
  if (!["DRAFT", "SCHEDULED"].includes(c.status)) return { error: "Campanha já iniciada" };
  if (!c.templateName || !c.groupId) return { error: "Escolha o template e o grupo" };
  const total = await prisma.campaignRecipient.count({ where: { campaignId: id, status: "PENDING" } });
  if (!total) return { error: "Suba a audiência primeiro" };

  const rate = Math.max(0, Math.min(80, Number(form.get("rate") ?? 0) || 0));
  const skipRed = form.get("skipRed") === "on";
  const plan = await planSenders({ ...c, skipRedQuality: skipRed });
  if (!plan.senders.length) return { error: "Nenhum número apto para enviar com esse template neste grupo" };

  const cost = total * auth.workspace.creditsPerMessage;
  if (auth.workspace.creditBalance < cost && form.get("ignoreBalance") !== "on") {
    return { error: `Saldo insuficiente: precisa de ${cost.toLocaleString("pt-BR")} créditos, tem ${auth.workspace.creditBalance.toLocaleString("pt-BR")}. Marque "enviar até acabar o saldo" para continuar mesmo assim.` };
  }

  const when = String(form.get("scheduledAt") ?? "");
  const scheduledAt = when ? new Date(when) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) return { error: "Data de agendamento inválida" };
  const future = scheduledAt && scheduledAt.getTime() > Date.now() + 30_000;

  await prisma.campaign.update({
    where: { id },
    data: {
      ratePerSecond: rate,
      skipRedQuality: skipRed,
      status: future ? "SCHEDULED" : "RUNNING",
      scheduledAt: future ? scheduledAt : null,
      startedAt: future ? null : new Date(),
      pausedReason: null,
    },
  });
  redirect(`/campanhas/${id}?etapa=metricas`);
}

export async function pauseCampaignAction(id: string) {
  const { c } = await ownCampaign(id);
  if (c.status !== "RUNNING" && c.status !== "SCHEDULED") return;
  await prisma.campaign.update({ where: { id }, data: { status: "PAUSED", pausedReason: "Pausada manualmente" } });
  revalidatePath(`/campanhas/${id}`);
}

export async function resumeCampaignAction(id: string) {
  const { c } = await ownCampaign(id);
  if (c.status !== "PAUSED") return;
  await prisma.campaign.update({ where: { id }, data: { status: "RUNNING", pausedReason: null, startedAt: c.startedAt ?? new Date() } });
  revalidatePath(`/campanhas/${id}`);
}

export async function cancelCampaignAction(id: string) {
  const { c } = await ownCampaign(id);
  if (["COMPLETED", "CANCELLED"].includes(c.status)) return;
  await prisma.$transaction([
    prisma.campaign.update({ where: { id }, data: { status: "CANCELLED", completedAt: new Date() } }),
    prisma.campaignRecipient.updateMany({ where: { campaignId: id, status: "PENDING" }, data: { status: "SKIPPED", errorTitle: "Campanha cancelada" } }),
  ]);
  await createAlert({ workspaceId: c.workspaceId, type: "CAMPAIGN_CANCELLED", severity: "INFO", title: `Campanha "${c.name}" cancelada`, message: "Os pendentes não serão enviados." });
  revalidatePath(`/campanhas/${id}`);
}

export async function deleteCampaignAction(id: string) {
  const { c } = await ownCampaign(id);
  if (c.status === "RUNNING") return;
  await prisma.campaign.delete({ where: { id } });
  redirect("/campanhas");
}

/** Reenvia para quem falhou por erro temporário (cria os destinatários de novo como pendentes). */
export async function retryFailedAction(id: string) {
  const { c } = await ownCampaign(id);
  if (!["COMPLETED", "PAUSED"].includes(c.status)) return;
  const failed = await prisma.campaignRecipient.findMany({
    where: { campaignId: id, status: "FAILED", errorCode: { notIn: [131026, 131050, 131049] } },
    select: { id: true },
  });
  for (const f of failed) {
    await prisma.campaignRecipient.update({
      where: { id: f.id },
      data: { status: "PENDING", attempts: 0, errorCode: null, errorTitle: null, errorDetail: null, failedAt: null, wamid: null },
    });
  }
  if (failed.length) await prisma.campaign.update({ where: { id }, data: { status: "RUNNING", pausedReason: null, completedAt: null } });
  revalidatePath(`/campanhas/${id}`);
}
