import { Plus, Trash2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatLimit, tierLabel } from "@/lib/limits";
import { statsForBusinesses } from "@/lib/group-stats";
import { bmWindows } from "@/lib/limit-windows";
import { LimitRow } from "@/components/limit-card";
import { Drawer, MetaItem } from "@/components/drawer";
import { Badge, Empty, Field, Input, PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { deleteGroupAction, saveGroupAction } from "@/app/actions/groups";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const auth = await requireAuth();
  const [groups, businesses] = await Promise.all([
    prisma.bmGroup.findMany({ where: { workspaceId: auth.workspace.id }, include: { members: { include: { business: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.businessManager.findMany({ where: { workspaceId: auth.workspace.id }, orderBy: { name: "asc" } }),
  ]);
  const stats = await Promise.all(groups.map((g) => statsForBusinesses(g.members.map((m) => m.businessId))));
  const windows = await bmWindows(businesses.map((b) => b.id));

  const bmCheckboxes = (selected: string[]) => (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {businesses.map((b) => (
        <label key={b.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
          <input type="checkbox" name="businessIds" value={b.id} defaultChecked={selected.includes(b.id)} />
          <span className="flex-1 truncate">{b.name}</span>
          <span className="text-xs text-zinc-500">{tierLabel(b.messagingLimitTier)}</span>
        </label>
      ))}
      {businesses.length === 0 && <span className="text-zinc-500">Conecte BMs primeiro.</span>}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Grupos de BM" description="Cada campanha dispara por um grupo, distribuindo os envios entre todos os números das BMs do grupo." />

      {groups.length === 0 && <Empty>Nenhum grupo criado.</Empty>}
      <div className="space-y-3">
        {groups.map((g, i) => {
          const s = stats[i];
          const tone = s.activePhones === 0 ? "red" : s.available === 0 ? "amber" : "green";
          return (
            <Drawer
              key={g.id}
              title={g.name}
              subtitle={g.description || g.members.map((m) => m.business.name).join(" · ") || "Sem BMs"}
              tone={tone}
              toneTitle={tone === "red" ? "Nenhum número ativo" : tone === "amber" ? "Limite esgotado agora" : "Pronto para disparar"}
              meta={
                <>
                  <MetaItem value={g.members.length} label="BMs" />
                  <MetaItem value={`${s.activePhones}/${s.phones}`} label="números ativos" />
                  <MetaItem value={formatLimit(s.available)} label={`de ${formatLimit(s.totalLimit)} disponíveis`} />
                </>
              }
            >
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                Qualidade dos números:
                <Badge color="green">{s.quality.GREEN} alta</Badge>
                <Badge color="yellow">{s.quality.YELLOW} média</Badge>
                <Badge color="red">{s.quality.RED} baixa</Badge>
                <span className="ml-auto text-xs text-zinc-500">{s.usedToday.toLocaleString("pt-BR")} envios nas últimas 24h</span>
              </div>
              <div className="mb-5 divide-y divide-zinc-100 rounded-xl border border-zinc-100">
                {g.members.map((m) => {
                  const w = windows.get(m.businessId);
                  return w ? <LimitRow key={m.businessId} name={m.business.name} w={w} /> : null;
                })}
              </div>
              <details className="group/edit">
                <summary className="cursor-pointer list-none text-sm font-medium text-zinc-600 hover:text-zinc-900 [&::-webkit-details-marker]:hidden">Editar grupo</summary>
                <ActionForm action={saveGroupAction} submit="Salvar" className="mt-4">
                  <input type="hidden" name="id" value={g.id} />
                  <div className="mb-4 grid gap-4 md:grid-cols-2">
                    <Field label="Nome"><Input name="name" defaultValue={g.name} required /></Field>
                    <Field label="Descrição"><Input name="description" defaultValue={g.description ?? ""} /></Field>
                  </div>
                  {bmCheckboxes(g.members.map((m) => m.businessId))}
                </ActionForm>
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <ConfirmButton action={deleteGroupAction.bind(null, g.id)} variant="ghost" className="px-0 text-red-600" confirm="Excluir este grupo?"><Trash2 className="size-4" /> Excluir grupo</ConfirmButton>
                </div>
              </details>
            </Drawer>
          );
        })}

        <Drawer title={<span className="flex items-center gap-2"><Plus className="size-4" /> Novo grupo</span>} open={groups.length === 0}>
          <ActionForm action={saveGroupAction} submit="Criar grupo">
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <Field label="Nome"><Input name="name" placeholder="Ex.: Disparos principais" required /></Field>
              <Field label="Descrição"><Input name="description" /></Field>
            </div>
            {bmCheckboxes([])}
          </ActionForm>
        </Drawer>
      </div>
    </div>
  );
}
