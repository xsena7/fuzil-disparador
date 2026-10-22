import { ExternalLink as ExternalIcon, Link2, Trash2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { trackedUrlBase } from "@/lib/env";
import { Card, Empty, Field, Input, PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { Drawer, MetaItem } from "@/components/drawer";
import { createLinkAction, deleteLinkAction, updateLinkAction } from "@/app/actions/links";
import { CopyText } from "./copy";

export const dynamic = "force-dynamic";

const when = (d: Date | null) => (d ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "nunca");

/** Links para disparar o template do Fuzil por outra plataforma (o código vai na variável do botão). */
export default async function LinksPage() {
  const auth = await requireAuth();
  const links = await prisma.externalLink.findMany({ where: { workspaceId: auth.workspace.id }, orderBy: { createdAt: "desc" } });
  const base = trackedUrlBase();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Links externos"
        description="Para disparar os templates do Fuzil por outra plataforma e o botão continuar funcionando."
      />

      <Card className="mb-5 p-5">
        <div className="mb-3 font-semibold">Como funciona</div>
        <ol className="grid gap-3 text-sm text-zinc-600 md:grid-cols-3">
          <li className="rounded-xl bg-zinc-50 p-3">
            <b className="mb-1 block text-zinc-900">1. Crie o link aqui</b>
            Dê um nome e cole o site para onde o cliente deve ir quando clicar no botão.
          </li>
          <li className="rounded-xl bg-zinc-50 p-3">
            <b className="mb-1 block text-zinc-900">2. Copie o código</b>
            O Fuzil gera um código curto (ex.: <code className="rounded bg-white px-1">aB3kx9Q</code>).
          </li>
          <li className="rounded-xl bg-zinc-50 p-3">
            <b className="mb-1 block text-zinc-900">3. Use na outra plataforma</b>
            No disparo, no campo da <b>variável do botão</b> ({"{{1}}"}), cole só o código. Quem clicar vai para o seu site.
          </li>
        </ol>
        <p className="mt-3 text-xs text-zinc-500">
          O botão do template abre <code>https://{base}/</code> + o código. Dá para trocar o destino quando quiser, sem mexer na outra plataforma nem no template.
        </p>
      </Card>

      <Card className="mb-5 p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold"><Link2 className="size-4 text-brand-500" /> Novo link</div>
        <ActionForm action={createLinkAction} submit="Criar link">
          <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
            <Field label="Nome" hint="Só para você se organizar"><Input name="name" placeholder="Ex.: Cliente João - Loja" required /></Field>
            <Field label="Para onde o cliente vai"><Input name="url" placeholder="https://seusite.com.br/oferta" required /></Field>
          </div>
        </ActionForm>
      </Card>

      {links.length === 0 && <Empty icon={<Link2 className="size-6" />}>Nenhum link ainda. Crie o primeiro acima.</Empty>}

      <div className="space-y-3">
        {links.map((l) => (
          <Drawer
            key={l.id}
            tone={l.clicks > 0 ? "green" : "gray"}
            toneTitle={l.clicks > 0 ? "Já recebeu cliques" : "Ainda sem cliques"}
            title={l.name}
            subtitle={l.url}
            meta={
              <>
                <span className="rounded-lg bg-brand-50 px-2 py-1 font-mono text-sm font-semibold text-brand-700">{l.code}</span>
                <MetaItem value={l.clicks.toLocaleString("pt-BR")} label="cliques" />
              </>
            }
          >
            <div className="mb-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 p-3">
                <div className="mb-1 text-xs text-zinc-500">Código para a variável do botão</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-lg font-semibold">{l.code}</span>
                  <CopyText text={l.code} label="Copiar código" />
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <div className="mb-1 text-xs text-zinc-500">Link completo (para testar)</div>
                <div className="flex items-center justify-between gap-2">
                  <a href={`https://${base}/${l.code}`} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 truncate text-sm text-sky-700 hover:underline">
                    https://{base}/{l.code} <ExternalIcon className="size-3.5 shrink-0" />
                  </a>
                  <CopyText text={`https://${base}/${l.code}`} />
                </div>
              </div>
            </div>
            <p className="mb-4 text-xs text-zinc-500">Último clique: {when(l.lastClickAt)} · criado em {when(l.createdAt)}</p>
            <ActionForm action={updateLinkAction.bind(null, l.id)} submit="Salvar alterações" variant="secondary">
              <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
                <Field label="Nome"><Input name="name" defaultValue={l.name} required /></Field>
                <Field label="Para onde o cliente vai" hint="Trocou aqui, já vale para todo mundo que clicar"><Input name="url" defaultValue={l.url} required /></Field>
              </div>
            </ActionForm>
            <div className="mt-4 border-t border-zinc-100 pt-4">
              <ConfirmButton action={deleteLinkAction.bind(null, l.id)} variant="ghost" className="text-red-600" confirm={`Excluir o link "${l.name}"?\nQuem clicar no botão com o código ${l.code} vai ver "link não encontrado".`}>
                <Trash2 className="size-4" /> Excluir link
              </ConfirmButton>
            </div>
          </Drawer>
        ))}
      </div>
    </div>
  );
}
