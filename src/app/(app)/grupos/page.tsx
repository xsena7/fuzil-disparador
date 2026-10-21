import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatLimit, tierLabel } from "@/lib/limits";
import { statsForBusinesses } from "@/lib/group-stats";
import { bmWindows } from "@/lib/limit-windows";
import { LimitWindow } from "@/components/limit-card";
import { Drawer, MetaItem } from "@/components/drawer";
import { Badge, Empty, Field, Input, PageHeader, Stat } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { deleteGroupAction, restoreBusinessAction, saveGroupAction } from "@/app/actions/groups";
import { PROBLEMS_GROUP } from "@/lib/bm-problems";
import { bmAptidao } from "@/lib/readiness";
import { StatusDot } from "@/components/drawer";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const auth = await requireAuth();
  const [groups, businesses] = await Promise.all([
    prisma.bmGroup.findMany({ where: { workspaceId: auth.workspace.id }, include: { members: { include: { business: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.businessManager.findMany({
      where: { workspaceId: auth.workspace.id },
      orderBy: { name: "asc" },
      include: {
        groups: { include: { group: { select: { id: true, name: true, system: true } } } },
        wabas: {
          include: {
            phones: { select: { enabled: true, invalidReason: true, status: true } },
            templates: { select: { category: true, status: true } },
          },
        },
      },
    }),
  ]);
  // Aptidão de cada BM (mesmos critérios das conexões): cartão, número ativo e template de utilidade aprovado
  const apt = new Map(businesses.map((b) => [b.id, bmAptidao(b.wabas)]));
  const aptDot = (id: string) => {
    const a = apt.get(id);
    return a?.apta ? <StatusDot tone="green" title="Apta para disparar" /> : <StatusDot tone="red" title={`Falta: ${a?.falta.join(", ") || "conta"}`} />;
  };
  // O grupo automático "BMs com problema" aparece separado, no topo
  const problems = groups.find((g) => g.system === PROBLEMS_GROUP);
  const regular = groups.filter((g) => !g.system);
  const stats = await Promise.all(regular.map((g) => statsForBusinesses(g.members.map((m) => m.businessId))));
  const windows = await bmWindows(businesses.map((b) => b.id));

  // currentGroupId: no grupo que está sendo editado, não conta como "já está em outro grupo"
  const bmCheckboxes = (selected: string[], currentGroupId?: string) => (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {businesses.map((b) => {
        const others = b.groups.filter((m) => !m.group.system && m.group.id !== currentGroupId).map((m) => m.group.name);
        return (
          <label key={b.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
            <input type="checkbox" name="businessIds" value={b.id} defaultChecked={selected.includes(b.id)} />
            {aptDot(b.id)}
            <span className="min-w-0 flex-1 truncate">{b.name}</span>
            {others.length > 0 && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-600/20" title="Uma BM pode estar em mais de um grupo">
                já está em: {others.join(", ")}
              </span>
            )}
            <span className="text-xs text-zinc-500">{tierLabel(b.messagingLimitTier)}</span>
          </label>
        );
      })}
      {businesses.length === 0 && <span className="text-zinc-500">Conecte BMs primeiro.</span>}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Grupos de BM" description="Cada campanha dispara por um grupo, distribuindo os envios entre todos os números das BMs do grupo." />

      {problems && problems.members.length > 0 && (
        <Drawer
          className="mb-3 border-red-200"
          title={problems.name}
          subtitle="Saíram sozinhas dos grupos de disparo depois de dar problema. Resolva e clique em Resolvido."
          tone="red"
          meta={<span className="font-semibold text-red-700">{problems.members.length} BM(s)</span>}
          open
          bodyClassName="divide-y divide-red-100"
        >
          {problems.members.map(({ business: b }) => (
            <div key={b.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{b.name}</div>
                <div className="mt-0.5 text-sm text-red-700">{b.problemReason ?? "Problema detectado"}</div>
                {b.problemFix && <div className="mt-1 text-sm text-zinc-600"><b className="text-zinc-800">Como resolver:</b> {b.problemFix}</div>}
                <div className="mt-1 text-xs text-zinc-400">
                  {b.problemAt ? `Desde ${b.problemAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}
                  {b.problemPrevGroups.length > 0 && ` · volta para: ${groups.filter((g) => b.problemPrevGroups.includes(g.id)).map((g) => g.name).join(", ") || "—"}`}
                </div>
              </div>
              <ConfirmButton action={restoreBusinessAction.bind(null, b.id)} confirm={`Já resolveu o problema da BM ${b.name}? Ela volta para os grupos de disparo.`}>
                <CheckCircle2 className="size-4" /> Resolvido
              </ConfirmButton>
            </div>
          ))}
        </Drawer>
      )}

      {regular.length === 0 && <Empty>Nenhum grupo criado.</Empty>}
      <div className="space-y-3">
        {regular.map((g, i) => {
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
                  <span className="flex items-center gap-1.5" title="Quantas BMs estão aptas para disparar">
                    <StatusDot tone={g.members.every((m) => apt.get(m.businessId)?.apta) ? "green" : "red"} />
                    <b className="font-semibold text-zinc-800">{g.members.filter((m) => apt.get(m.businessId)?.apta).length}</b> aptas
                  </span>
                  <MetaItem value={`${s.activePhones}/${s.phones}`} label="números ativos" />
                  <span className="text-right leading-tight">
                    <b className="text-lg font-semibold tabular-nums text-zinc-900">{formatLimit(s.available)}</b>
                    <span className="block text-[11px]">de {formatLimit(s.totalLimit)} disponíveis</span>
                  </span>
                </>
              }
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Limite total (24h)" value={formatLimit(s.totalLimit)} sub={`${g.members.length} BMs somadas`} />
                <Stat label="Disponível agora" value={formatLimit(s.available)} sub={`${s.usedToday.toLocaleString("pt-BR")} usados nas últimas 24h`} tone="green" />
                <Stat label="Números ativos" value={`${s.activePhones}/${s.phones}`} />
                <Stat label="Qualidade" value={<span className="flex gap-2 text-base"><Badge color="green">{s.quality.GREEN}</Badge><Badge color="yellow">{s.quality.YELLOW}</Badge><Badge color="red">{s.quality.RED}</Badge></span>} />
              </div>
              <div className="mb-5 grid gap-3 md:grid-cols-2">
                {g.members.map((m) => {
                  const w = windows.get(m.businessId);
                  return w ? (
                    <div key={m.businessId}>
                      <div className="mb-1.5 flex items-center gap-2 truncate text-sm font-medium">
                        {aptDot(m.businessId)}
                        <span className="truncate">{m.business.name}</span>
                      </div>
                      <LimitWindow w={w} compact />
                    </div>
                  ) : null;
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
                  {bmCheckboxes(g.members.map((m) => m.businessId), g.id)}
                </ActionForm>
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <ConfirmButton action={deleteGroupAction.bind(null, g.id)} variant="ghost" className="px-0 text-red-600" confirm="Excluir este grupo?"><Trash2 className="size-4" /> Excluir grupo</ConfirmButton>
                </div>
              </details>
            </Drawer>
          );
        })}

        <Drawer title={<span className="flex items-center gap-2"><Plus className="size-4" /> Novo grupo</span>} open={regular.length === 0}>
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
