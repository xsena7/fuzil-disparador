import { Plus, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { CategoryBadge, TemplateStatusBadge } from "@/components/status";
import { ConfirmButton } from "@/components/action-form";
import { syncAllAction } from "@/app/actions/connections";
import { deleteTemplateAction, updateAutoDeleteAction } from "@/app/actions/templates";
import type { TComponent } from "@/lib/template-utils";

export const dynamic = "force-dynamic";

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

  // Agrupa as cópias do mesmo template (nome + idioma) espalhadas pelas WABAs
  const groups = new Map<string, typeof templates>();
  for (const t of templates) {
    const key = `${t.name}|${t.language}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const marketingCount = templates.filter((t) => t.category === "MARKETING").length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Templates"
        description="Templates de todas as WABAs conectadas. Só cópias APROVADAS e de UTILIDADE são usadas nos disparos."
        actions={
          <>
            <ConfirmButton action={syncAllAction}><RefreshCw className="size-4" /> Puxar da Meta</ConfirmButton>
            <LinkButton href="/templates/novo"><Plus className="size-4" /> Criar template</LinkButton>
          </>
        }
      />

      {marketingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          <AlertTriangle className="size-4" /> {marketingCount} cópia(s) de template estão como MARKETING. Elas nunca são usadas em disparos.
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

      {groups.size === 0 && <Empty>Nenhum template encontrado. Conecte uma BM ou crie um template.</Empty>}

      <div className="space-y-3">
        {[...groups.entries()].map(([key, copies]) => {
          const [name, language] = key.split("|");
          const body = (copies[0].components as unknown as TComponent[]).find((c) => c.type === "BODY")?.text ?? "";
          const usable = copies.filter((c) => c.status === "APPROVED" && c.category === "UTILITY").length;
          return (
            <Card key={key} className="p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{name}</span>
                <span className="text-xs text-zinc-500">{language}</span>
                <span className="ml-auto text-xs text-zinc-500">{usable}/{copies.length} cópias aptas para disparo</span>
              </div>
              <p className="mb-3 line-clamp-2 whitespace-pre-wrap text-zinc-600">{body}</p>
              <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-100">
                {copies.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <span className="min-w-48 flex-1 truncate">{t.waba.business.name} <span className="text-zinc-400">/ {t.waba.name}</span></span>
                    <TemplateStatusBadge s={t.status} />
                    <CategoryBadge c={t.category} />
                    {t.previousCategory && t.previousCategory !== t.category && <span className="text-xs text-red-600">era {t.previousCategory}</span>}
                    {t.rejectedReason && <span className="text-xs text-red-600">{t.rejectedReason}</span>}
                    {t.qualityScore && t.qualityScore !== "UNKNOWN" && <span className="text-xs text-zinc-500">qualidade {t.qualityScore}</span>}
                    <ConfirmButton action={deleteTemplateAction.bind(null, t.id)} variant="ghost" className="px-2 py-1 text-red-600" confirm={`Excluir "${t.name}" desta WABA na Meta?`}><Trash2 className="size-4" /></ConfirmButton>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
