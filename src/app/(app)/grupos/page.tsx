import { Trash2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatLimit, tierLabel } from "@/lib/limits";
import { statsForBusinesses } from "@/lib/group-stats";
import { Badge, Card, Empty, Field, Input, PageHeader, Stat } from "@/components/ui";
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
      <div className="space-y-4">
        {groups.map((g, i) => {
          const s = stats[i];
          return (
            <Card key={g.id} className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="text-base font-semibold">{g.name}</div>
                {g.description && <span className="text-zinc-500">{g.description}</span>}
                <div className="ml-auto">
                  <ConfirmButton action={deleteGroupAction.bind(null, g.id)} variant="ghost" className="text-red-600" confirm="Excluir este grupo?"><Trash2 className="size-4" /></ConfirmButton>
                </div>
              </div>
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Limite total (24h)" value={formatLimit(s.totalLimit)} sub={`${g.members.length} BMs`} />
                <Stat label="Disponível agora" value={formatLimit(s.available)} sub={`${s.usedToday.toLocaleString("pt-BR")} usados nas últimas 24h`} tone="green" />
                <Stat label="Números ativos" value={`${s.activePhones}/${s.phones}`} />
                <Stat label="Qualidade" value={<span className="flex gap-2 text-base"><Badge color="green">{s.quality.GREEN}</Badge><Badge color="yellow">{s.quality.YELLOW}</Badge><Badge color="red">{s.quality.RED}</Badge></span>} />
              </div>
              <details>
                <summary className="cursor-pointer text-zinc-600">Editar grupo</summary>
                <ActionForm action={saveGroupAction} submit="Salvar" className="mt-4">
                  <input type="hidden" name="id" value={g.id} />
                  <div className="mb-4 grid gap-4 md:grid-cols-2">
                    <Field label="Nome"><Input name="name" defaultValue={g.name} required /></Field>
                    <Field label="Descrição"><Input name="description" defaultValue={g.description ?? ""} /></Field>
                  </div>
                  {bmCheckboxes(g.members.map((m) => m.businessId))}
                </ActionForm>
              </details>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 p-5">
        <div className="mb-4 font-semibold">Novo grupo</div>
        <ActionForm action={saveGroupAction} submit="Criar grupo">
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <Field label="Nome"><Input name="name" placeholder="Ex.: Grupo Felipe" required /></Field>
            <Field label="Descrição"><Input name="description" /></Field>
          </div>
          {bmCheckboxes([])}
        </ActionForm>
      </Card>
    </div>
  );
}
