import { CalendarClock, CheckCircle2, ClipboardCheck, GalleryHorizontal, Image as ImageIcon, ExternalLink, Images, Send, XCircle } from "lucide-react";
import clsx from "clsx";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cachedSetting } from "@/lib/settings-cache";
import { instagramStatus } from "@/lib/instagram";
import { FUZIL_BUSINESS_ID } from "@/lib/onboarding";
import { Drawer } from "@/components/drawer";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { Empty, Field, Input, PageHeader } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { adminSavePlatformAction } from "@/app/actions/misc";
import { cancelAllInstagramAction, cancelInstagramPostAction, confirmInstagramBatchAction, discardInstagramBatchAction, importInstagramZipAction, publishInstagramNowAction, rescheduleInstagramPostAction } from "@/app/actions/instagram";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Para conferir", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  SCHEDULED: { label: "Agendado", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  PUBLISHING: { label: "Publicando...", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  PUBLISHED: { label: "Publicado", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  FAILED: { label: "Falhou", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  CANCELLED: { label: "Cancelado", cls: "bg-zinc-100 text-zinc-500 ring-zinc-200" },
};
const when = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
/** Valor do campo datetime-local no horário de Brasília. */
const localInput = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 16);
const tomorrow = () => new Date(Date.now() - 3 * 3600_000 + 86400_000).toISOString().slice(0, 10);

export default async function InstagramPage() {
  await requireSuperAdmin();
  const [st, posts] = await Promise.all([
    instagramStatus(),
    prisma.instagramPost.findMany({ where: { OR: [{ status: { not: "CANCELLED" } }, { createdAt: { gt: new Date(Date.now() - 7 * 86400_000) } }] }, orderBy: { scheduledAt: "asc" }, take: 200 }),
  ]);
  const drafts = posts.filter((p) => p.status === "DRAFT");
  const batches = [...new Set(drafts.map((p) => p.batchId))].map((id) => drafts.filter((p) => p.batchId === id));
  const upcoming = posts.filter((p) => !["PUBLISHED", "CANCELLED", "DRAFT"].includes(p.status));
  const done = posts.filter((p) => p.status === "PUBLISHED" || p.status === "CANCELLED").reverse();
  const hasToken = Boolean(cachedSetting("INSTAGRAM_TOKEN") || cachedSetting("META_SYSTEM_USER_TOKEN") || process.env.META_SYSTEM_USER_TOKEN);
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader title="Instagram" description="Suba o .zip dos posts e o Fuzil publica sozinho, no dia e na hora, pela API oficial do Instagram." />

      <Drawer
        title="Conta do Instagram"
        tone={st.ok ? "green" : "amber"}
        meta={<span>{st.ok ? `Conectada: @${st.username}` : `Pendente: ${st.error}`}</span>}
        open={!st.ok}
      >
        <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
          <li>
            Na BM onde está o Instagram: <b>Configurações do negócio → Contas → Contas do Instagram</b>, clique na conta e em <b>Atribuir parceiro</b>. Cole o ID da BM do Fuzil{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-800">{FUZIL_BUSINESS_ID}</code>, deixe em <b>Acesso total (Tudo)</b> e clique em <b>Atribuir</b>. A página do Facebook ligada ao Instagram vai junto.
          </li>
          <li>
            Na BM do Fuzil: <b>Configurações do negócio → Usuários → Usuários do sistema</b>, abra o usuário do Fuzil e clique em <b>Atribuir ativos</b>. Marque a conta do Instagram <b>e</b> a página do Facebook dela, com controle total.
          </li>
          <li>
            No mesmo usuário, clique em <b>Gerar novo token</b>, escolha o app do Fuzil e marque <b>instagram_basic</b>, <b>instagram_content_publish</b>, <b>pages_show_list</b>, <b>pages_read_engagement</b> e <b>business_management</b>. Copie o token.
          </li>
          <li>Cole o token aqui embaixo e salve. O ID da conta pode ficar vazio: o Fuzil acha o Instagram sozinho pela página. Deu certo, esta gaveta fica verde com o @ da conta.</li>
        </ol>
        <ActionForm action={adminSavePlatformAction} submit="Salvar conta do Instagram">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ID da conta do Instagram (opcional)" hint="Vazio: o Fuzil acha sozinho pela página">
              <Input name="INSTAGRAM_ACCOUNT_ID" defaultValue={cachedSetting("INSTAGRAM_ACCOUNT_ID") ?? ""} placeholder="17841400000000000" autoComplete="off" />
            </Field>
            <Field label="Token com permissão de publicar" hint={cachedSetting("INSTAGRAM_TOKEN") ? "Configurado ✓ (deixe em branco para manter)" : hasToken ? "Vazio: usando o Token do System User" : "Não configurado"}>
              <PasswordInput name="INSTAGRAM_TOKEN" defaultValue="" autoComplete="off" />
            </Field>
          </div>
        </ActionForm>
      </Drawer>

      <Drawer title="Agendar posts" tone="green" meta={<span>{drafts.length ? `${drafts.length} para conferir` : upcoming.length ? `${upcoming.length} na fila` : "Nenhum agendado"}</span>} open>
        <p className="mb-4 text-sm text-zinc-500">
          O .zip pode ser o pacote do jeito que veio: imagens <b>1-1.png, 1-2.png…</b> viram carrossel, <b>2.png</b> é post único, e as legendas saem do <b>LEGENDAS.txt</b>. Os posts entram na ordem dos números, um por horário.
        </p>
        <ActionForm action={importInstagramZipAction} submit="Subir e conferir">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Arquivo .zip">
              <input type="file" name="zip" accept=".zip,application/zip" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm" />
            </Field>
            <Field label="Primeiro dia">
              <Input type="date" name="startDay" defaultValue={tomorrow()} required />
            </Field>
            <Field label="Horários de cada dia" hint="Um post por horário. Ex.: 12:00, 19:00 = 2 por dia">
              <Input name="times" defaultValue="12:00" required />
            </Field>
          </div>
        </ActionForm>
      </Drawer>

      {batches.map((b) => (
        <section key={b[0].batchId} className="rounded-2xl border-2 border-violet-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-zinc-900"><ClipboardCheck className="size-5 text-violet-600" /> Confira antes de agendar</h2>
            <span className="text-sm text-zinc-500">
              {b.length} posts · {b.filter((p) => p.images.length > 1).length} carrosséis · {b.filter((p) => p.images.length === 1).length} únicos · de {when(b[0].scheduledAt)} até {when(b[b.length - 1].scheduledAt)}
            </span>
          </div>
          <div className="mt-4 space-y-4">
            {b.map((p) => (
              <div key={p.id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-zinc-900">Post {p.number}{p.title ? ` · ${p.title}` : ""}</span>
                  <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1", p.images.length > 1 ? "bg-orange-50 text-orange-700 ring-orange-200" : "bg-zinc-50 text-zinc-700 ring-zinc-200")}>
                    {p.images.length > 1 ? <><GalleryHorizontal className="size-3.5" /> Carrossel · {p.images.length} imagens</> : <><ImageIcon className="size-3.5" /> Post único</>}
                  </span>
                  <span className="text-sm text-zinc-600">{when(p.scheduledAt)}</span>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                  {p.images.map((f, i) => (
                    <a key={f} href={`/media/${f}`} target="_blank" rel="noreferrer" className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/media/${f}`} alt={`Imagem ${i + 1}`} className="h-48 w-[154px] rounded-lg object-cover ring-1 ring-zinc-200" />
                      {p.images.length > 1 && <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-[11px] font-semibold text-white">{i + 1}/{p.images.length}</span>}
                    </a>
                  ))}
                </div>
                <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto]">
                  <div className={clsx("whitespace-pre-wrap rounded-lg p-3 text-sm", p.caption ? "bg-zinc-50 text-zinc-700" : "bg-amber-50 text-amber-800")}>{p.caption || "Sem legenda: o post vai sair sem texto."}</div>
                  <ActionForm action={rescheduleInstagramPostAction.bind(null, p.id)} submit="Mudar horário" variant="secondary" className="flex flex-wrap items-end gap-2 self-start [&>div]:mt-0">
                    <Input type="datetime-local" name="at" defaultValue={localInput(p.scheduledAt)} className="w-48 text-xs" />
                  </ActionForm>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
            <ConfirmButton action={confirmInstagramBatchAction.bind(null, b[0].batchId)} variant="primary" confirm={`Agendar os ${b.length} posts? Eles vão sair sozinhos no Instagram nos horários acima.`}><CheckCircle2 className="size-4" /> Confirmar agendamento</ConfirmButton>
            <ConfirmButton action={discardInstagramBatchAction.bind(null, b[0].batchId)} variant="ghost" className="text-zinc-500" confirm="Descartar esses posts? Nada vai ser publicado."><XCircle className="size-4" /> Descartar</ConfirmButton>
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 font-semibold text-zinc-900"><CalendarClock className="size-5 text-orange-500" /> Próximos posts</h2>
          {upcoming.length > 0 && (
            <ConfirmButton action={cancelAllInstagramAction} variant="ghost" className="ml-auto text-xs text-zinc-500" confirm="Cancelar todos os posts que ainda não saíram?">Cancelar todos</ConfirmButton>
          )}
        </div>
        {!upcoming.length && <Empty icon={<Images className="size-6" />}>Nenhum post agendado. Suba um .zip acima.</Empty>}
        <div className="space-y-3">
          {upcoming.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 p-3">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/media/${p.images[0]}`} alt="" className="h-24 w-[77px] rounded-lg object-cover ring-1 ring-zinc-200" />
                {p.images.length > 1 && <span className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">{p.images.length}</span>}
              </div>
              <div className="min-w-[14rem] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-zinc-900">Post {p.number}{p.title ? ` · ${p.title}` : ""}</span>
                  <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium ring-1", STATUS[p.status]?.cls)}>{STATUS[p.status]?.label ?? p.status}</span>
                  <span className="text-xs text-zinc-500">{p.images.length > 1 ? `Carrossel · ${p.images.length} imagens` : "Post único"}</span>
                </div>
                <div className="mt-0.5 text-sm text-zinc-600">{when(p.scheduledAt)}</div>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{p.caption || "Sem legenda"}</p>
                {p.error && <p className="mt-1 text-xs text-rose-600">{p.error}</p>}
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
                <ActionForm action={rescheduleInstagramPostAction.bind(null, p.id)} submit="Mudar" variant="secondary" className="flex items-end gap-2 [&>div]:mt-0">
                  <Input type="datetime-local" name="at" defaultValue={localInput(p.scheduledAt)} className="w-48 text-xs" />
                </ActionForm>
                <ConfirmButton action={publishInstagramNowAction.bind(null, p.id)} className="text-xs" confirm={`Publicar o post ${p.number} agora no Instagram?`}><Send className="size-3.5" /> Publicar agora</ConfirmButton>
                <ConfirmButton action={cancelInstagramPostAction.bind(null, p.id)} variant="ghost" className="text-xs text-zinc-500" confirm={`Cancelar o post ${p.number}?`}><XCircle className="size-3.5" /> Cancelar</ConfirmButton>
              </div>
            </div>
          ))}
        </div>
      </section>

      {done.length > 0 && (
        <Drawer title="Já publicados" tone="green" meta={<span>{done.filter((p) => p.status === "PUBLISHED").length} publicados</span>}>
          <div className="divide-y divide-zinc-100">
            {done.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
                {p.status === "PUBLISHED" ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-zinc-400" />}
                <span className="font-medium text-zinc-800">Post {p.number}{p.title ? ` · ${p.title}` : ""}</span>
                <span className="text-xs text-zinc-500">{when(p.publishedAt ?? p.scheduledAt)}</span>
                {p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline">Ver no Instagram <ExternalLink className="size-3" /></a>}
              </div>
            ))}
          </div>
        </Drawer>
      )}
    </div>
  );
}
