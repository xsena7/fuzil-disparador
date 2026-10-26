import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { funnelModels, funnelPage, funnelUrl } from "@/lib/funnels";
import { StatusDot, MetaItem, Drawer } from "@/components/drawer";
import { Empty, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { createFunnelAction } from "@/app/actions/funnels";
import { company } from "@/lib/company";
import { NewFunnelFields } from "./new-funnel-fields";

import { usableGroupWhere } from "@/lib/bm-problems";
export const dynamic = "force-dynamic";

export default async function WarmupPage() {
  const auth = await requireAuth();
  const ws = auth.workspace.id;
  const [funnels, groups, counts] = await Promise.all([
    prisma.funnel.findMany({ where: { workspaceId: ws }, orderBy: { createdAt: "desc" } }),
    prisma.bmGroup.findMany({ where: { workspaceId: ws, ...usableGroupWhere }, orderBy: { name: "asc" } }),
    prisma.lead.groupBy({ by: ["funnelId", "status"], where: { workspaceId: ws }, _count: true }),
  ]);
  const adminWs = (await prisma.membership.count({ where: { workspaceId: ws, user: { isSuperAdmin: true } } })) > 0;
  const models = (await funnelModels(ws)).map((m) => ({ id: m.id, name: m.workspaceId === ws ? `${m.name} (seu)` : m.name }));
  const count = (id: string, status?: string) => counts.filter((c) => c.funnelId === id && (!status || c.status === status)).reduce((a, c) => a + c._count, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Aquecimento"
        description="Funis que aquecem suas BMs com gente real: a pessoa confirma o WhatsApp com um código e recebe as mensagens do funil, cada uma por uma BM diferente do grupo. Dois tipos: página de vagas de emprego ou login do gerador de links."
      />

      {funnels.length ? (
        <div className="space-y-2">
          {funnels.map((f) => (
            <Link
              key={f.id}
              href={`/aquecimento/${f.id}`}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 shadow-sm hover:bg-zinc-50"
            >
              <StatusDot tone={f.status === "ACTIVE" ? "green" : "gray"} title={f.status === "ACTIVE" ? "Rodando" : "Pausado"} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{f.name}</span>
                <span className="block truncate text-xs text-zinc-500">
                  {f.kind === "LINKS"
                    ? `Gerador de links · ${company().siteUrl.replace(/^https?:\/\//, "")}/links`
                    : `${funnelUrl(f).replace(/^https?:\/\//, "")} · ${funnelPage(f).jobs.filter((j) => j.open).length} vagas abertas`}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-x-4 text-xs text-zinc-500">
                <MetaItem value={count(f.id)} label={f.kind === "LINKS" ? "pediram código" : "inscritos"} />
                <MetaItem value={count(f.id, "VERIFIED") + count(f.id, "COMPLETED")} label={f.kind === "LINKS" ? "com acesso" : "confirmados"} />
                {f.kind !== "LINKS" && <MetaItem value={count(f.id, "COMPLETED")} label="cadastros" />}
              </span>
              <ChevronRight className="size-4 text-zinc-400" />
            </Link>
          ))}
        </div>
      ) : (
        <Empty icon={<Flame className="size-6" />}>
          <p>Nenhum funil ainda. Crie o primeiro abaixo: ele já vem com página de vagas, perguntas, mensagens e timers prontos.</p>
        </Empty>
      )}

      <Drawer title="Novo funil" subtitle="Leva 10 segundos. Os templates já vêm prontos" open={!funnels.length}>
        {groups.length ? (
          <ActionForm action={createFunnelAction} submit="Criar funil">
            <NewFunnelFields models={models} groups={groups.map((g) => ({ id: g.id, name: g.name }))} canLinks={auth.user.isSuperAdmin && adminWs} linksExists={funnels.some((f) => f.kind === "LINKS")} />
          </ActionForm>
        ) : (
          <p className="text-zinc-500">
            Primeiro crie um grupo de BM em{" "}
            <Link href="/grupos" className="text-brand-700 underline">
              Grupos de BM
            </Link>{" "}
            com as BMs que você quer aquecer.
          </p>
        )}
      </Drawer>
    </div>
  );
}
