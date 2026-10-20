import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Drawer, MetaItem } from "@/components/drawer";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, Empty, LinkButton, PageHeader, type BadgeColor } from "@/components/ui";
import { ConfirmButton } from "@/components/action-form";
import { deleteBlueprintAction, deployNowAction, toggleBlueprintAction } from "@/app/actions/templates";
import type { TComponent } from "@/lib/template-utils";

export const dynamic = "force-dynamic";

const sentAt = (d: Date) => d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

const DEP: Record<string, [BadgeColor, string]> = {
  SUBMITTED: ["yellow", "Em análise"],
  APPROVED: ["green", "Aprovado"],
  REJECTED: ["red", "Rejeitado"],
  RECATEGORIZED_DELETED: ["red", "Virou marketing: criando próxima versão"],
  MARKETING_ON_CREATE: ["red", "Meta criou como marketing: mude o texto"],
  ERROR: ["red", "Erro"],
};

export default async function BlueprintsPage() {
  const auth = await requireAuth();
  const [blueprints, wabas] = await Promise.all([
    prisma.templateBlueprint.findMany({
      where: { workspaceId: auth.workspace.id },
      include: { group: { include: { members: true } }, deployments: { include: { waba: { include: { business: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.whatsAppAccount.findMany({ where: { workspaceId: auth.workspace.id }, include: { business: { include: { groups: true } } } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Templates padrão"
        description="Sobem sozinhos em todas as BMs (ou num grupo) e são conferidos a cada 5 minutos."
        actions={
          <>
            <ConfirmButton action={deployNowAction}><RefreshCw className="size-4" /> Aplicar agora</ConfirmButton>
            <LinkButton href="/templates-padrao/novo"><Plus className="size-4" /> Novo template padrão</LinkButton>
          </>
        }
      />
      {blueprints.length === 0 && <Empty>Nenhum template padrão. Crie um e ele será replicado em todas as BMs.</Empty>}
      <div className="space-y-3">
        {blueprints.map((bp) => {
          const scope = wabas.filter((w) => !bp.groupId || w.business.groups.some((g) => g.groupId === bp.groupId));
          const body = (bp.components as unknown as TComponent[]).find((c) => c.type === "BODY")?.text ?? "";
          const deps = scope.map((w) => bp.deployments.find((d) => d.wabaId === w.id));
          const approved = deps.filter((d) => d?.status === "APPROVED").length;
          const bad = deps.filter((d) => d && ["REJECTED", "ERROR", "MARKETING_ON_CREATE"].includes(d.status)).length;
          return (
            <Drawer
              key={bp.id}
              title={<>{bp.name} <span className="text-xs font-normal text-zinc-400">{bp.language}</span></>}
              subtitle={body}
              tone={!bp.active ? "gray" : bad > 0 ? "red" : approved === scope.length ? "green" : "amber"}
              toneTitle={!bp.active ? "Desativado" : bad > 0 ? "Tem BM com problema" : approved === scope.length ? "Aprovado em todas as BMs" : "Em análise em alguma BM"}
              meta={
                <>
                  <MetaItem value={`${approved}/${scope.length}`} label="BMs aprovadas" />
                  {!bp.active && <Badge color="gray">Desativado</Badge>}
                  <span>{bp.group ? `Grupo: ${bp.group.name}` : "Todas as BMs"}</span>
                </>
              }
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="ml-auto flex gap-2">
                  <ConfirmButton action={toggleBlueprintAction.bind(null, bp.id)}>{bp.active ? "Desativar" : "Ativar"}</ConfirmButton>
                  <ConfirmButton action={deleteBlueprintAction.bind(null, bp.id)} variant="ghost" className="text-red-600" confirm="Remover este template padrão? (as cópias já criadas na Meta continuam lá)"><Trash2 className="size-4" /></ConfirmButton>
                </div>
              </div>
              <p className="mb-3 line-clamp-3 whitespace-pre-wrap text-zinc-600">{body}</p>
              <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-100">
                {scope.map((w) => {
                  const dep = bp.deployments.find((d) => d.wabaId === w.id);
                  const [color, label] = dep ? DEP[dep.status] : (["gray", "Aguardando"] as [BadgeColor, string]);
                  return (
                    <div key={w.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <span className="flex-1">{w.business.name} <span className="text-zinc-400">/ {w.name}</span></span>
                      {dep?.currentName && dep.currentName !== bp.name && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700" title="O nome anterior foi reclassificado pela Meta nessa conta, então o Fuzil criou a próxima versão">usando {dep.currentName}</span>}
                      {dep?.submittedAt && <span className="text-xs text-zinc-500">Enviado em {sentAt(dep.submittedAt)}</span>}
                      <Badge color={color}>{label}</Badge>
                      {dep?.error && <span className="text-xs text-red-600">{dep.error}</span>}
                    </div>
                  );
                })}
                {scope.length === 0 && <div className="px-3 py-2 text-zinc-500">Nenhuma WABA no escopo.</div>}
              </div>
            </Drawer>
          );
        })}
      </div>
    </div>
  );
}
