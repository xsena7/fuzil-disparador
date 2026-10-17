import { AlertTriangle, ChevronRight, Plus, RefreshCw, Trash2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { CategoryBadge, TemplateStatusBadge } from "@/components/status";
import { ConfirmButton } from "@/components/action-form";
import { syncAllAction } from "@/app/actions/connections";
import { deleteTemplateAction, updateAutoDeleteAction } from "@/app/actions/templates";
import type { TComponent } from "@/lib/template-utils";
import { ago, templateUsage } from "@/lib/limit-windows";

export const dynamic = "force-dynamic";

/** Templates de exemplo que a própria Meta coloca nas contas: não dá para apagar. */
const isMetaSample = (name: string) => name === "hello_world" || /^(jaspers_market_|sample_)/.test(name);

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const auth = await requireAuth();
  const { q, cat } = await searchParams;
  const [templates, ws] = await Promise.all([
    prisma.template.findMany({
      where: {
        workspaceId: auth.workspace.id,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...(cat ? { category: cat } : {}),
      },
      include: { waba: { include: { business: true } } },
      orderBy: [{ name: "asc" }, { language: "asc" }],
    }),
    prisma.workspace.findUniqueOrThrow({ where: { id: auth.workspace.id } }),
  ]);
  const usage = await templateUsage(auth.workspace.id);

  // Uma gaveta por conta (WABA): primeiro as contas, ao abrir aparecem os templates dela
  const wabas = await prisma.whatsAppAccount.findMany({
    where: { workspaceId: auth.workspace.id },
    include: { business: true },
    orderBy: [{ business: { name: "asc" } }, { name: "asc" }],
  });
  const byWaba = new Map<string, typeof templates>();
  for (const t of templates) byWaba.set(t.wabaId, [...(byWaba.get(t.wabaId) ?? []), t]);
  const filtering = Boolean(q || cat);
  const shown = filtering ? wabas.filter((w) => byWaba.has(w.id)) : wabas;
  const marketingCount = templates.filter((t) => t.category === "MARKETING").length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Templates"
        description="Clique numa conta para ver os templates dela. Só templates APROVADOS e de UTILIDADE são usados nos disparos."
        actions={
          <>
            <ConfirmButton action={syncAllAction}><RefreshCw className="size-4" /> Puxar da Meta</ConfirmButton>
            <LinkButton href="/templates/novo"><Plus className="size-4" /> Criar template</LinkButton>
          </>
        }
      />

      {marketingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          <AlertTriangle className="size-4" /> {marketingCount} template(s) estão como MARKETING. Eles nunca são usados em disparos.
        </div>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-4 p-4">
        <form className="flex flex-1 gap-2">
          <input name="q" defaultValue={q} placeholder="Buscar por nome..." className="flex-1 rounded-lg border border-zinc-200 px-3 py-2" />
          <select name="cat" defaultValue={cat ?? ""} className="rounded-lg border border-zinc-200 px-3 py-2">
            <option value="">Todas as categorias</option>
            <option value="UTILITY">Utilidade</option>
            <option value="MARKETING">Marketing</option>
            <option value="AUTHENTICATION">Autenticação</option>
          </select>
          <button className="rounded-lg border border-zinc-200 px-3">Filtrar</button>
        </form>
        <form action={updateAutoDeleteAction} className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="autoDelete" defaultChecked={ws.autoDeleteMarketing} />
            Excluir automaticamente qualquer template que virar marketing
          </label>
          <button className="rounded-lg border border-zinc-200 px-3 py-1">Salvar</button>
        </form>
      </Card>

      {shown.length === 0 && <Empty>{filtering ? "Nenhum template encontrado com esse filtro." : "Nenhuma conta conectada. Conecte uma BM ou crie um template."}</Empty>}

      <div className="space-y-3">
        {shown.map((w) => {
          const list = byWaba.get(w.id) ?? [];
          const usable = list.filter((t) => t.status === "APPROVED" && t.category === "UTILITY").length;
          const pending = list.filter((t) => t.status === "PENDING").length;
          const mkt = list.filter((t) => t.category === "MARKETING").length;
          return (
            <details key={w.id} open={filtering} className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{w.business.name}</span>
                  <span className="block truncate text-xs text-zinc-500">{w.name} · WABA {w.wabaId}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">{list.length} template(s)</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{usable} aptos</span>
                  {pending > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">{pending} em análise</span>}
                  {mkt > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">{mkt} marketing</span>}
                </span>
              </summary>
              <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                {list.length === 0 && <p className="px-4 py-3 text-zinc-500">Essa conta ainda não tem templates.</p>}
                {list.map((t) => {
                  const body = (t.components as unknown as TComponent[]).find((c) => c.type === "BODY")?.text ?? "";
                  const u = usage.get(`${t.wabaId}|${t.name}|${t.language}`);
                  return (
                    <div key={t.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                      <div className="min-w-56 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{t.name}</span>
                          <span className="text-xs text-zinc-500">{t.language}</span>
                          <TemplateStatusBadge s={t.status} />
                          <CategoryBadge c={t.category} />
                          {t.previousCategory && t.previousCategory !== t.category && <span className="text-xs text-red-600">era {t.previousCategory}</span>}
                          {t.qualityScore && t.qualityScore !== "UNKNOWN" && <span className="text-xs text-zinc-500">qualidade {t.qualityScore}</span>}
                        </div>
                        {body && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-zinc-600">{body}</p>}
                        {t.rejectedReason && t.rejectedReason !== "NONE" && <p className="mt-1 text-xs text-red-600">{t.rejectedReason}</p>}
                        <p className="mt-1 text-xs text-zinc-500">
                          Último envio: <b className="font-medium text-zinc-700">{ago(u?.last)}</b>
                          {u ? <> · {u.day.toLocaleString("pt-BR")} nas últimas 24h · {u.total.toLocaleString("pt-BR")} no total</> : null}
                        </p>
                      </div>
                      {isMetaSample(t.name) ? (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500" title="A Meta coloca esse template em toda conta nova e não deixa apagar. Ele não atrapalha os disparos.">
                          Exemplo da Meta
                        </span>
                      ) : (
                      <ConfirmButton
                        action={deleteTemplateAction.bind(null, t.id)}
                        variant="ghost"
                        className="px-2 py-1 text-red-600"
                        confirm={`Excluir "${t.name}" (${t.language}) da conta ${w.business.name} direto na Meta?\n\nIsso não tem volta, e a Meta só deixa usar esse mesmo nome de novo depois de algumas semanas.`}
                      >
                        <Trash2 className="size-4" /> Excluir
                      </ConfirmButton>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
