import { Plus, RefreshCw, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Drawer, MetaItem } from "@/components/drawer";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, Empty, LinkButton, PageHeader, type BadgeColor } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { Textarea } from "@/components/ui";
import { deleteBlueprintAction, deployNowAction, editBlueprintTextAction, toggleBlueprintAction, toggleKeepReadyAction } from "@/app/actions/templates";
import type { TComponent } from "@/lib/template-utils";
import { templateRejectReason, translateMetaText } from "@/lib/meta-errors";

export const dynamic = "force-dynamic";

const sentAt = (d: Date) => d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

const DEP: Record<string, [BadgeColor, string]> = {
  SUBMITTED: ["yellow", "Em análise"],
  APPROVED: ["green", "Aprovado"],
  REJECTED: ["red", "Rejeitado"],
  RECATEGORIZED_DELETED: ["red", "Virou marketing: criando próxima versão"],
  MARKETING_ON_CREATE: ["red", "Meta criou como marketing: mude o texto"],
  ERROR: ["red", "Erro"],
  RETRY: ["yellow", "Reenviando com o texto novo"],
  PAUSED: ["yellow", "Pausado pela Meta: enviando outro"],
};

// Motivos de rejeição da Meta, em português

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
              subtitle={bp.category === "AUTHENTICATION" ? "Código de acesso" : bp.category === "MARKETING" ? "Marketing" : "Utilidade"}
              tone={!bp.active ? "gray" : bad > 0 ? "red" : approved === scope.length ? "green" : "amber"}
              toneTitle={!bp.active ? "Desativado" : bad > 0 ? "Tem BM com problema" : approved === scope.length ? "Aprovado em todas as BMs" : "Em análise em alguma BM"}
              meta={
                <>
                  <MetaItem value={`${approved}/${scope.length}`} label="BMs aprovadas" />
                  {!bp.active && <Badge color="gray">Desativado</Badge>}
                  {bp.keepReady && <Badge color="blue">Não tira das prontas</Badge>}
                  <span>{bp.group ? `Grupo: ${bp.group.name}` : "Todas as BMs"}</span>
                </>
              }
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {bp.category !== "AUTHENTICATION" && (
                  <form action={toggleKeepReadyAction.bind(null, bp.id)} className="flex items-center gap-2 text-sm text-zinc-600">
                    <button className={clsx("relative h-5 w-9 shrink-0 rounded-full transition", bp.keepReady ? "bg-brand-500" : "bg-zinc-300")} title="Liga/desliga">
                      <span className={clsx("absolute top-0.5 size-4 rounded-full bg-white shadow transition", bp.keepReady ? "left-[18px]" : "left-0.5")} />
                    </button>
                    Não tirar as BMs prontas do disparo enquanto estiver em análise
                  </form>
                )}
                <div className="ml-auto flex gap-2">
                  <ConfirmButton action={toggleBlueprintAction.bind(null, bp.id)}>{bp.active ? "Desativar" : "Ativar"}</ConfirmButton>
                  <ConfirmButton action={deleteBlueprintAction.bind(null, bp.id)} variant="ghost" className="text-red-600" confirm="Remover este template padrão? (as cópias já criadas na Meta continuam lá)"><Trash2 className="size-4" /></ConfirmButton>
                </div>
              </div>
              {body && bp.category !== "AUTHENTICATION" && (
                <div className="mb-4 rounded-2xl bg-[#e7ddd3] p-4">
                  <div className="max-w-xl whitespace-pre-wrap rounded-xl rounded-tl-sm bg-white px-3.5 py-2.5 text-sm text-zinc-800 shadow-sm">{body}</div>
                </div>
              )}
              {bp.category === "AUTHENTICATION" ? (
                <p className="mb-3 text-zinc-600">Template de código (a Meta monta o texto sozinha).</p>
              ) : (
                <details className="mb-3 rounded-lg border border-zinc-100" open={bad > 0}>
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-700">
                    {bad > 0 ? "Foi rejeitado? Mude o texto e reenvie" : "Texto do template"}
                  </summary>
                  <div className="border-t border-zinc-100 p-3">
                    <ActionForm action={editBlueprintTextAction.bind(null, bp.id)} submit={bad > 0 ? "Salvar e reenviar onde foi rejeitado" : "Salvar texto"} variant={bad > 0 ? "primary" : "secondary"}>
                      <Textarea name="body" defaultValue={body} rows={5} />
                      <p className="mt-1 text-xs text-zinc-500">Mantenha as variáveis ({"{{1}}"}, {"{{2}}"}...). Evite emoji, letras maiúsculas demais e tom de oferta: a Meta rejeita.</p>
                    </ActionForm>
                  </div>
                </details>
              )}
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
                      {dep?.error && <span className="text-xs text-red-600">{dep.status === "REJECTED" ? `Motivo: ${templateRejectReason(dep.error)}` : translateMetaText(dep.error)}</span>}
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
