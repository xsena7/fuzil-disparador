// Fluxos: o contato responde um disparo e segue pelos blocos (mensagem, botões, esperar, condição).
// Cada pessoa tem um FlowRun parado num bloco: esperando resposta, esperando um tempo ou terminado.
import type { CampaignRecipient, Conversation, FlowRun, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { fillAutoReply, sendChatMessage } from "./chat";
import { matchOption, nodePorts, UNIT_MS, type FlowGraph, type FlowNode } from "./flow-types";

export * from "./flow-types";

// Passos seguidos sem parar (proteção contra setas em círculo)
const MAX_STEPS_PER_CALL = 25;
// Ninguém fica esperando resposta para sempre
const STALE_MS = 7 * 86400_000;

export const flowGraph = (g: unknown): FlowGraph => {
  const v = (g ?? {}) as Partial<FlowGraph>;
  return { nodes: Array.isArray(v.nodes) ? v.nodes : [], edges: Array.isArray(v.edges) ? v.edges : [] };
};

type Ctx = { run: FlowRun; graph: FlowGraph; person: { name: string | null; phone: string } };

const nextOf = (g: FlowGraph, nodeId: string, port: string) => {
  const e = g.edges.find((x) => x.from === nodeId && x.port === port);
  return e ? g.nodes.find((n) => n.id === e.to) ?? null : null;
};

/** Escolhe a saída de um bloco que esperava resposta (ou o tempo acabou). */
function portFor(node: FlowNode, ev: { reply?: string; buttonId?: string } | "timeout"): string {
  if (ev === "timeout") return node.type === "wait" ? "next" : "timeout";
  if (node.type === "buttons") {
    const byId = ev.buttonId?.startsWith("btn:") ? (node.data.buttons ?? []).find((b) => `btn:${b.id}` === ev.buttonId) : null;
    const hit = byId ?? matchOption(node.data.buttons, ev.reply ?? "");
    return hit ? `btn:${hit.id}` : "else";
  }
  const hit = matchOption(node.data.options, ev.reply ?? "");
  return hit ? `opt:${hit.id}` : "else";
}

const later = (amount: number | undefined, unit: string | undefined) => new Date(Date.now() + Math.max(1, Number(amount) || 1) * (UNIT_MS[(unit ?? "minutes") as keyof typeof UNIT_MS] ?? 60_000));

async function save(run: FlowRun, data: Prisma.FlowRunUpdateInput) {
  return prisma.flowRun.update({ where: { id: run.id }, data });
}

/** Entra nos blocos a partir de `node` até parar num que espera (ou acabar o fluxo). */
async function walk(ctx: Ctx, start: FlowNode | null) {
  let node = start;
  let steps = 0;
  const fill = (t: string) => fillAutoReply(t, ctx.person);
  while (node) {
    if (++steps > MAX_STEPS_PER_CALL) return save(ctx.run, { status: "FAILED", error: "O fluxo deu voltas demais sem esperar (confira as setas)", nodeId: node.id, waitUntil: null });
    const d = node.data ?? {};
    if (node.type === "message") {
      try {
        await sendChatMessage(ctx.run.conversationId, {
          source: "FLOW",
          campaignId: ctx.run.campaignId ?? undefined,
          text: d.text?.trim() ? fill(d.text) : undefined,
          media: d.media?.url ? { url: d.media.url, kind: d.media.kind, name: d.media.name } : undefined,
        });
      } catch (e) {
        return save(ctx.run, { status: "FAILED", error: (e instanceof Error ? e.message : String(e)).slice(0, 500), nodeId: node.id, waitUntil: null });
      }
      node = nextOf(ctx.graph, node.id, "next");
      continue;
    }
    if (node.type === "buttons") {
      try {
        await sendChatMessage(ctx.run.conversationId, {
          source: "FLOW",
          campaignId: ctx.run.campaignId ?? undefined,
          text: fill(d.text ?? ""),
          buttons: (d.buttons ?? []).map((b) => ({ id: `btn:${b.id}`, title: b.label.trim() })),
        });
      } catch (e) {
        return save(ctx.run, { status: "FAILED", error: (e instanceof Error ? e.message : String(e)).slice(0, 500), nodeId: node.id, waitUntil: null });
      }
      return save(ctx.run, { status: "WAITING_REPLY", nodeId: node.id, waitUntil: d.timeoutAmount ? later(d.timeoutAmount, d.timeoutUnit ?? "hours") : null, steps: { increment: steps } });
    }
    if (node.type === "condition") {
      return save(ctx.run, { status: "WAITING_REPLY", nodeId: node.id, waitUntil: d.timeoutAmount ? later(d.timeoutAmount, d.timeoutUnit ?? "hours") : null, steps: { increment: steps } });
    }
    if (node.type === "wait") {
      return save(ctx.run, { status: "WAITING_TIME", nodeId: node.id, waitUntil: later(d.amount, d.unit), steps: { increment: steps } });
    }
    // Um "Início" no meio do caminho não faz nada: segue pela primeira saída ligada
    node = nodePorts(node).map((p) => nextOf(ctx.graph, node!.id, p.id)).find(Boolean) ?? null;
  }
  return save(ctx.run, { status: "DONE", waitUntil: null, steps: { increment: steps } });
}

async function context(run: FlowRun): Promise<Ctx | null> {
  const [flow, conv] = await Promise.all([
    prisma.flow.findUnique({ where: { id: run.flowId } }),
    prisma.conversation.findUnique({ where: { id: run.conversationId }, select: { contactName: true, contactPhone: true, workspace: { select: { blockedAt: true } } } }),
  ]);
  if (!flow || !conv || conv.workspace.blockedAt) return null;
  return { run, graph: flowGraph(flow.graph), person: { name: conv.contactName, phone: conv.contactPhone } };
}

/** Pega a vez do run (evita dois webhooks ou o worker andarem com a mesma pessoa ao mesmo tempo). */
async function claim(run: FlowRun) {
  const r = await prisma.flowRun.updateMany({ where: { id: run.id, status: run.status, nodeId: run.nodeId, updatedAt: run.updatedAt }, data: { status: "RUNNING" } });
  return r.count === 1;
}

async function resume(run: FlowRun, ev: { reply?: string; buttonId?: string } | "timeout") {
  if (!(await claim(run))) return;
  const ctx = await context(run);
  if (!ctx) return save(run, { status: "STOPPED", waitUntil: null });
  const node = ctx.graph.nodes.find((n) => n.id === run.nodeId);
  if (!node) return save(run, { status: "STOPPED", error: "O bloco foi apagado do fluxo", waitUntil: null });
  return walk(ctx, nextOf(ctx.graph, node.id, portFor(node, ev)));
}

/**
 * Mensagem recebida no chat. Devolve true se um fluxo cuidou dela (aí a resposta automática não vai).
 * 1) Tem alguém esperando resposta nessa conversa: segue pelo caminho da resposta.
 * 2) É a primeira resposta a um disparo com fluxo: começa o fluxo pelo bloco Início.
 */
export async function handleFlowInbound(conv: Pick<Conversation, "id" | "workspaceId">, recipient: CampaignRecipient | null, msg: any, text: string | null): Promise<boolean> {
  const buttonId: string | undefined = msg?.interactive?.button_reply?.id ?? undefined;
  const reply = text ?? "";
  const waiting = await prisma.flowRun.findFirst({ where: { conversationId: conv.id, status: "WAITING_REPLY" }, orderBy: { updatedAt: "desc" } });
  if (waiting) {
    await resume(waiting, { reply, buttonId });
    return true;
  }
  // Esperando um tempo ou ainda mandando: a resposta só fica no chat
  const busy = await prisma.flowRun.count({ where: { conversationId: conv.id, status: { in: ["WAITING_TIME", "RUNNING"] } } });
  if (busy) return true;
  if (!recipient) return false;
  const campaign = await prisma.campaign.findUnique({ where: { id: recipient.campaignId }, select: { id: true, flowId: true, workspaceId: true } });
  if (!campaign?.flowId || campaign.workspaceId !== conv.workspaceId) return false;
  const flow = await prisma.flow.findFirst({ where: { id: campaign.flowId, workspaceId: conv.workspaceId } });
  if (!flow) return false;
  const graph = flowGraph(flow.graph);
  const start = graph.nodes.find((n) => n.type === "start");
  if (!start) return false;
  // Uma vez por pessoa do disparo (o recipientId é único: webhook repetido não começa de novo)
  const run = await prisma.flowRun
    .create({ data: { workspaceId: conv.workspaceId, flowId: flow.id, conversationId: conv.id, campaignId: campaign.id, recipientId: recipient.id, nodeId: start.id, status: "RUNNING" } })
    .catch(() => null);
  if (!run) return true;
  const ctx = await context(run);
  if (!ctx) {
    await save(run, { status: "STOPPED" });
    return true;
  }
  await walk(ctx, nextOf(graph, start.id, portFor(start, { reply, buttonId })));
  return true;
}

/** Tick do worker: tempos que acabaram (Esperar e "não respondeu em X") e limpeza de quem sumiu. */
export async function runFlows() {
  const due = await prisma.flowRun.findMany({ where: { status: { in: ["WAITING_TIME", "WAITING_REPLY"] }, waitUntil: { lte: new Date() } }, orderBy: { waitUntil: "asc" }, take: 200 });
  for (const run of due) await resume(run, "timeout").catch((e) => console.error("[fluxo]", run.id, e));
  await prisma.flowRun.updateMany({ where: { status: "WAITING_REPLY", waitUntil: null, updatedAt: { lt: new Date(Date.now() - STALE_MS) } }, data: { status: "STOPPED" } });
  // Travou no meio (worker reiniciou enquanto mandava): libera depois de 10 min
  await prisma.flowRun.updateMany({ where: { status: "RUNNING", updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } }, data: { status: "FAILED", error: "Parou no meio do envio" } });
}

