import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { flowGraph } from "@/lib/flows";
import { FlowEditor } from "./flow-editor";

export const dynamic = "force-dynamic";

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth();
  const flow = await prisma.flow.findFirst({ where: { id, workspaceId: auth.workspace.id }, include: { campaigns: { select: { id: true, name: true }, orderBy: { createdAt: "desc" }, take: 5 } } });
  if (!flow) notFound();
  const runs = await prisma.flowRun.groupBy({ by: ["nodeId"], where: { flowId: flow.id, status: { in: ["WAITING_REPLY", "WAITING_TIME"] } }, _count: true });
  return (
    <FlowEditor
      id={flow.id}
      initialName={flow.name}
      initialGraph={flowGraph(flow.graph)}
      campaigns={flow.campaigns}
      waiting={Object.fromEntries(runs.map((r) => [r.nodeId, r._count]))}
    />
  );
}
