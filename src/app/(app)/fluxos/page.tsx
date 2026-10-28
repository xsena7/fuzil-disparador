import Link from "next/link";
import { ChevronRight, Copy, Trash2, Workflow } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { flowGraph } from "@/lib/flows";
import { Drawer, MetaItem, StatusDot } from "@/components/drawer";
import { Empty, PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { createFlowAction, deleteFlowAction, duplicateFlowAction } from "@/app/actions/flows";

export const dynamic = "force-dynamic";

export default async function FlowsPage() {
  const auth = await requireAuth();
  const ws = auth.workspace.id;
  const [flows, runs] = await Promise.all([
    prisma.flow.findMany({ where: { workspaceId: ws }, orderBy: { updatedAt: "desc" }, include: { campaigns: { select: { id: true, status: true } } } }),
    prisma.flowRun.groupBy({ by: ["flowId", "status"], where: { workspaceId: ws }, _count: true }),
  ]);
  const count = (id: string, st?: string[]) => runs.filter((r) => r.flowId === id && (!st || st.includes(r.status))).reduce((a, r) => a + r._count, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fluxos"
        description="Monte a conversa em blocos: quando o contato responde o disparo, ele segue o caminho do botão que clicou ou da resposta que deu. Escolha o disparo no bloco Disparo do fluxo (ou na campanha, etapa Conteúdo)."
      />

      {flows.length ? (
        <div className="space-y-2">
          {flows.map((f) => {
            const g = flowGraph(f.graph);
            const live = f.campaigns.filter((c) => c.status === "RUNNING" || c.status === "SCHEDULED").length;
            return (
              <div key={f.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 shadow-sm hover:bg-zinc-50">
                <StatusDot tone={live ? "green" : f.campaigns.length ? "amber" : "gray"} title={live ? "Em campanha rodando" : f.campaigns.length ? "Ligado em campanha" : "Sem campanha"} />
                <Link href={`/fluxos/${f.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{f.name}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {g.nodes.length} blocos · {f.campaigns.length ? `${f.campaigns.length} campanha(s)` : "nenhuma campanha usa ainda"}
                  </span>
                </Link>
                <span className="flex flex-wrap items-center gap-x-4 text-xs text-zinc-500">
                  <MetaItem value={count(f.id)} label="entraram" />
                  <MetaItem value={count(f.id, ["WAITING_REPLY", "WAITING_TIME", "RUNNING"])} label="no meio" />
                  <MetaItem value={count(f.id, ["DONE"])} label="terminaram" />
                </span>
                <ConfirmButton action={duplicateFlowAction.bind(null, f.id)} variant="ghost" className="px-2 py-1">
                  <Copy className="size-4" />
                </ConfirmButton>
                <ConfirmButton action={deleteFlowAction.bind(null, f.id)} variant="ghost" className="px-2 py-1 text-red-600" confirm={`Apagar o fluxo "${f.name}"?\nQuem está no meio dele para de receber.`}>
                  <Trash2 className="size-4" />
                </ConfirmButton>
                <Link href={`/fluxos/${f.id}`}>
                  <ChevronRight className="size-4 text-zinc-400" />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty icon={<Workflow className="size-6" />}>
          <p>Nenhum fluxo ainda. Crie o primeiro abaixo e monte os blocos: mensagem, botões, esperar e condição.</p>
        </Empty>
      )}

      <Drawer title="Novo fluxo" subtitle="Dê um nome e monte os blocos na próxima tela" open={!flows.length}>
        <ActionForm action={createFlowAction} submit="Criar fluxo">
          <input
            name="name"
            required
            placeholder="Ex.: Atendimento do cartão"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm shadow-soft outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </ActionForm>
      </Drawer>
    </div>
  );
}
