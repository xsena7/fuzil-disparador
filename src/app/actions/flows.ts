"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { friendlyError } from "@/lib/meta-errors";
import { saveUpload } from "@/lib/uploads";
import { emptyGraph, validateGraph, type FlowGraph, type FlowNode, type FlowNodeType, type FlowOption, type FlowUnit } from "@/lib/flow-types";
import type { FormState } from "./auth";

const TYPES: FlowNodeType[] = ["start", "message", "buttons", "wait", "condition"];
const UNITS: FlowUnit[] = ["seconds", "minutes", "hours", "days"];
const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(100_000, Number(v))) : 0);
const unit = (v: unknown, def: FlowUnit): FlowUnit => (UNITS.includes(v as FlowUnit) ? (v as FlowUnit) : def);
const opts = (v: unknown, max: number): FlowOption[] =>
  (Array.isArray(v) ? v : []).slice(0, max).map((o) => ({ id: str(o?.id, 40) || randomBytes(4).toString("hex"), label: str(o?.label, 200) }));

/** Só guarda os campos conhecidos de cada bloco (o JSON vem do navegador). */
function clean(raw: unknown): FlowGraph {
  const g = (raw ?? {}) as Partial<FlowGraph>;
  const nodes: FlowNode[] = (Array.isArray(g.nodes) ? g.nodes : []).slice(0, 200).flatMap((n): FlowNode[] => {
    if (!TYPES.includes(n?.type)) return [];
    const d = (n.data ?? {}) as FlowNode["data"];
    const media = d.media?.url && /^https?:\/\//.test(d.media.url) ? { url: str(d.media.url, 1000), kind: (["image", "video", "audio", "document"].includes(d.media.kind) ? d.media.kind : "image") as "image", name: str(d.media.name, 200) || undefined } : null;
    const base = { id: str(n.id, 40), type: n.type, x: Math.round(num(n.x)), y: Math.round(num(n.y)) };
    const timeout = { timeoutAmount: num(d.timeoutAmount) || undefined, timeoutUnit: unit(d.timeoutUnit, "hours") };
    switch (n.type) {
      case "start":
        return [{ ...base, data: { options: opts(d.options, 20), campaignIds: (Array.isArray(d.campaignIds) ? d.campaignIds : []).slice(0, 50).map((c) => str(c, 40)).filter(Boolean) } }];
      case "message":
        return [{ ...base, data: { text: str(d.text, 4096), media } }];
      case "buttons":
        return [{ ...base, data: { text: str(d.text, 1024), buttons: opts(d.buttons, 3), ...timeout } }];
      case "wait":
        return [{ ...base, data: { amount: num(d.amount) || 1, unit: unit(d.unit, "minutes") } }];
      default:
        return [{ ...base, data: { options: opts(d.options, 20), ...timeout } }];
    }
  });
  const ids = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  const edges = (Array.isArray(g.edges) ? g.edges : []).flatMap((e) => {
    const from = str(e?.from, 40);
    const to = str(e?.to, 40);
    const port = str(e?.port, 60);
    // Cada saída leva para um lugar só
    if (!ids.has(from) || !ids.has(to) || from === to || seen.has(`${from}|${port}`)) return [];
    seen.add(`${from}|${port}`);
    return [{ id: str(e.id, 40) || randomBytes(4).toString("hex"), from, port, to }];
  });
  return { nodes, edges };
}

async function ownFlow(id: string) {
  const auth = await requireAuth();
  const flow = await prisma.flow.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!flow) throw new Error("Fluxo não encontrado");
  return { auth, flow };
}

export async function createFlowAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const name = str(form.get("name"), 80).trim();
  if (name.length < 2) return { error: "Dê um nome para o fluxo." };
  const flow = await prisma.flow.create({ data: { workspaceId: auth.workspace.id, name, graph: emptyGraph() as unknown as Prisma.InputJsonValue } });
  redirect(`/fluxos/${flow.id}`);
}

export async function saveFlowAction(id: string, name: string, graph: unknown): Promise<FormState> {
  const { flow } = await ownFlow(id);
  const g = clean(graph);
  const err = validateGraph(g);
  if (err) return { error: err };
  const n = name.trim().slice(0, 80);
  await prisma.flow.update({ where: { id: flow.id }, data: { graph: g as unknown as Prisma.InputJsonValue, ...(n.length >= 2 ? { name: n } : {}) } });
  // Disparos do bloco Disparo: essas campanhas passam a usar este fluxo (as que saíram do bloco ficam sem fluxo)
  const ids = g.nodes.find((x) => x.type === "start")?.data.campaignIds ?? [];
  await prisma.campaign.updateMany({ where: { workspaceId: flow.workspaceId, id: { in: ids } }, data: { flowId: flow.id } });
  await prisma.campaign.updateMany({ where: { workspaceId: flow.workspaceId, flowId: flow.id, id: { notIn: ids } }, data: { flowId: null } });
  revalidatePath("/fluxos");
  return { ok: "Fluxo salvo!" };
}

export async function duplicateFlowAction(id: string): Promise<FormState> {
  const { auth, flow } = await ownFlow(id);
  await prisma.flow.create({ data: { workspaceId: auth.workspace.id, name: `${flow.name} (cópia)`.slice(0, 80), graph: flow.graph as Prisma.InputJsonValue } });
  revalidatePath("/fluxos");
  return { ok: "Fluxo copiado." };
}

export async function deleteFlowAction(id: string): Promise<FormState> {
  const { flow } = await ownFlow(id);
  await prisma.flow.delete({ where: { id: flow.id } });
  revalidatePath("/fluxos");
  return { ok: "Fluxo apagado. As campanhas que usavam ele voltam para a resposta automática." };
}

/** Sobe a foto/áudio/vídeo/PDF de um bloco Mensagem. */
export async function uploadFlowMediaAction(form: FormData): Promise<{ url?: string; kind?: "image" | "video" | "audio" | "document"; name?: string; error?: string }> {
  await requireAuth();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Escolha um arquivo." };
  try {
    const saved = await saveUpload(file);
    const kind = saved.mime.startsWith("image/") ? "image" : saved.mime.startsWith("video/") ? "video" : saved.mime.startsWith("audio/") ? "audio" : "document";
    return { url: saved.url, kind, name: saved.name };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

/** Escolhe o fluxo da campanha (vazio = sem fluxo). Pode mudar a qualquer hora. */
export async function setCampaignFlowAction(campaignId: string, _: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const c = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: auth.workspace.id }, select: { id: true } });
  if (!c) return { error: "Campanha não encontrada" };
  const flowId = String(form.get("flowId") ?? "");
  const flow = flowId ? await prisma.flow.findFirst({ where: { id: flowId, workspaceId: auth.workspace.id }, select: { id: true, name: true } }) : null;
  if (flowId && !flow) return { error: "Fluxo não encontrado" };
  await prisma.campaign.update({ where: { id: c.id }, data: { flowId: flow?.id ?? null } });
  revalidatePath(`/campanhas/${c.id}`);
  return { ok: flow ? `Fluxo "${flow.name}" ligado: quem responder este disparo entra nele.` : "Fluxo desligado." };
}
