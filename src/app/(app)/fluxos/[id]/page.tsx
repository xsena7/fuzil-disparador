import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { flowGraph } from "@/lib/flows";
import { getComponent, type TComponent } from "@/lib/template-utils";
import { FlowEditor, type FlowCampaign } from "./flow-editor";

export const dynamic = "force-dynamic";

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth();
  const ws = auth.workspace.id;
  const flow = await prisma.flow.findFirst({ where: { id, workspaceId: ws } });
  if (!flow) notFound();
  const [runs, camps] = await Promise.all([
    prisma.flowRun.groupBy({ by: ["nodeId"], where: { flowId: flow.id, status: { in: ["WAITING_REPLY", "WAITING_TIME"] } }, _count: true }),
    prisma.campaign.findMany({
      where: { workspaceId: ws, funnelId: null, status: { not: "CANCELLED" } },
      select: { id: true, name: true, status: true, templateName: true, flowId: true },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
  ]);
  // Botões de resposta rápida do template de cada campanha (para montar os caminhos do bloco Disparo)
  const names = [...new Set(camps.map((c) => c.templateName).filter((x): x is string => Boolean(x)))];
  const tpls = names.length ? await prisma.template.findMany({ where: { workspaceId: ws, name: { in: names } }, select: { name: true, components: true }, distinct: ["name"] }) : [];
  const buttonsOf = new Map(
    tpls.map((t) => [t.name, (getComponent(t.components as unknown as TComponent[], "BUTTONS")?.buttons ?? []).filter((b) => b.type === "QUICK_REPLY").map((b) => b.text)]),
  );
  const campaigns: FlowCampaign[] = camps.map((c) => ({ id: c.id, name: c.name, status: c.status, buttons: (c.templateName && buttonsOf.get(c.templateName)) || [], other: Boolean(c.flowId && c.flowId !== flow.id) }));

  // O bloco Disparo mostra as campanhas que usam este fluxo agora (pode ter sido escolhido na campanha)
  const graph = flowGraph(flow.graph);
  const using = camps.filter((c) => c.flowId === flow.id).map((c) => c.id);
  graph.nodes = graph.nodes.map((n) => (n.type === "start" ? { ...n, data: { ...n.data, campaignIds: using } } : n));

  return <FlowEditor id={flow.id} initialName={flow.name} initialGraph={graph} campaigns={campaigns} waiting={Object.fromEntries(runs.map((r) => [r.nodeId, r._count]))} />;
}
