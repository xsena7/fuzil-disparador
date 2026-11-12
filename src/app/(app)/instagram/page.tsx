import { CalendarClock, CheckCircle2, ClipboardCheck, GalleryHorizontal, Image as ImageIcon, ExternalLink, Images, LayoutGrid, RotateCcw, Send, Smartphone, Upload, XCircle } from "lucide-react";
import Link from "next/link";
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
import { cancelAllInstagramAction, cancelInstagramDayAction, cancelInstagramPostAction, confirmInstagramBatchAction, discardInstagramBatchAction, importInstagramZipAction, publishInstagramNowAction, rescheduleInstagramPostAction, retryFailedInstagramAction } from "@/app/actions/instagram";

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
const today = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const dayKey = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit" });
const hour = (d: Date) => d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
type P = Awaited<ReturnType<typeof prisma.instagramPost.findMany>>[number];
const dayIso = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
const groupByDay = (items: P[]) => {
  const m = new Map<string, P[]>();
  for (const p of items) m.set(dayIso(p.scheduledAt), [...(m.get(dayIso(p.scheduledAt)) ?? []), p]);
  return [...m.entries()];
};

/** Gaveta de um dia: resumo do lado de fora e, na fila, botão para cancelar o dia todo. */
function DayDrawer({ day, items, kind, queue, children }: { day: string; items: P[]; kind: "FEED" | "STORY"; queue: boolean; children: React.ReactNode }) {
  const failed = items.filter((p) => p.status === "FAILED").length;
  const label = dayKey(items[0].scheduledAt);
  const isToday = day === dayIso(new Date());
  return (
    <Drawer
      title={<span className="capitalize">{isToday ? `Hoje · ${label}` : label}</span>}
      tone={failed ? "amber" : kind === "STORY" ? "green" : "green"}
      meta={<span>{items.length} {kind === "STORY" ? "stories" : items.length > 1 ? "posts" : "post"} · {hour(items[0].scheduledAt)} às {hour(items[items.length - 1].scheduledAt)}{failed ? ` · ${failed} falhou` : ""}</span>}
      open={isToday}
    >
      {queue && (
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          {failed > 0 && (
            <ConfirmButton action={retryFailedInstagramAction.bind(null, kind, day)} variant="primary" className="text-xs" confirm={`Publicar de novo ${failed === 1 ? "o que falhou" : `os ${failed} que falharam`} em ${label}? Sai um a cada 2 minutos.`}>
              <RotateCcw className="size-3.5" /> Publicar de novo {failed === 1 ? "o que falhou" : `os ${failed} que falharam`}
            </ConfirmButton>
          )}
          <ConfirmButton action={cancelInstagramDayAction.bind(null, kind, day)} variant="ghost" className="text-xs text-rose-600" confirm={`Cancelar ${kind === "STORY" ? "todos os stories" : "os posts"} de ${label}? Nada desse dia vai ser publicado.`}>
            <XCircle className="size-3.5" /> Cancelar o dia
          </ConfirmButton>
        </div>
      )}
      {children}
    </Drawer>
  );
}

/** Stories em grade, uma gaveta por dia. */
function StoryDays({ items, actions = false }: { items: P[]; actions?: boolean }) {
  return (
    <div className="space-y-3">
      {groupByDay(items).map(([day, list]) => (
        <DayDrawer key={day} day={day} items={list} kind="STORY" queue={actions}>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {list.map((p) => (
              <div key={p.id} className="w-24 shrink-0 text-center">
                <a href={`/media/${p.images[0]}`} target="_blank" rel="noreferrer" className="relative block">
                  {p.images[0].endsWith(".mp4") ? (
                    <video src={`/media/${p.images[0]}`} muted loop autoPlay playsInline preload="metadata" className={clsx("h-[171px] w-24 rounded-lg object-cover ring-1", p.status === "FAILED" ? "ring-2 ring-rose-400" : "ring-zinc-200")} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/media/${p.images[0]}`} alt={`Story ${p.number}`} loading="lazy" className={clsx("h-[171px] w-24 rounded-lg object-cover ring-1", p.status === "FAILED" ? "ring-2 ring-rose-400" : "ring-zinc-200")} />
                  )}
                  {p.images[0].endsWith(".mp4") && <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">▶ vídeo</span>}
                </a>
                <div className="mt-1 text-xs font-medium text-zinc-700">{hour(p.scheduledAt)}</div>
                {p.status === "FAILED" && <div className="line-clamp-3 text-[10px] leading-tight text-rose-600" title={p.error ?? ""}>Falhou{p.error ? `: ${p.error}` : ""}</div>}
                {actions && (
                  <div className="mt-1 flex flex-col items-center gap-0.5">
                    <ConfirmButton
                      action={publishInstagramNowAction.bind(null, p.id)}
                      variant={p.status === "FAILED" ? "primary" : "ghost"}
                      className={p.status === "FAILED" ? "whitespace-nowrap px-2.5 py-0.5 text-[11px]" : "whitespace-nowrap px-1 py-0 text-[11px] text-zinc-500"}
                      confirm={`${p.status === "FAILED" ? "Publicar de novo" : "Publicar agora"} o story das ${hour(p.scheduledAt)}?`}
                    >
                      {p.status === "FAILED" ? "republicar" : "publicar agora"}
                    </ConfirmButton>
                    <ConfirmButton action={cancelInstagramPostAction.bind(null, p.id)} variant="ghost" className="px-1 py-0 text-[11px] text-zinc-400" confirm={`Cancelar o story das ${hour(p.scheduledAt)}?`}>cancelar</ConfirmButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DayDrawer>
      ))}
    </div>
  );
}

/** Card de um post do feed (conferência ou fila). */
function FeedCard({ p, review = false }: { p: P; review?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-zinc-900">Post {p.number}{p.title ? ` · ${p.title}` : ""}</span>
        <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1", p.images.length > 1 ? "bg-orange-50 text-orange-700 ring-orange-200" : "bg-zinc-50 text-zinc-700 ring-zinc-200")}>
          {p.images.length > 1 ? <><GalleryHorizontal className="size-3.5" /> Carrossel · {p.images.length} imagens</> : <><ImageIcon className="size-3.5" /> Post único</>}
        </span>
        {!review && <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium ring-1", STATUS[p.status]?.cls)}>{STATUS[p.status]?.label ?? p.status}</span>}
        <span className="ml-auto text-sm font-medium text-zinc-700">{when(p.scheduledAt)}</span>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {p.images.map((f, i) => (
          <a key={f} href={`/media/${f}`} target="_blank" rel="noreferrer" className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/media/${f}`} alt={`Imagem ${i + 1}`} className={clsx("rounded-lg object-cover ring-1 ring-zinc-200", review ? "h-48 w-[154px]" : "h-32 w-[103px]")} />
            {p.images.length > 1 && <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-[11px] font-semibold text-white">{i + 1}/{p.images.length}</span>}
          </a>
        ))}
      </div>
      <div className={clsx("mt-1 whitespace-pre-wrap rounded-lg p-3 text-sm", p.caption ? "bg-zinc-50 text-zinc-700" : "bg-amber-50 text-amber-800", !review && "line-clamp-3")}>{p.caption || "Sem legenda: o post vai sair sem texto."}</div>
      {p.error && <p className="mt-2 text-xs text-rose-600">{p.error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
        <ActionForm action={rescheduleInstagramPostAction.bind(null, p.id)} submit="Mudar horário" variant="secondary" className="flex items-end gap-2 [&>div]:mt-0">
          <Input type="datetime-local" name="at" defaultValue={localInput(p.scheduledAt)} className="w-48 text-xs" />
        </ActionForm>
        {!review && (
          <>
            <ConfirmButton action={publishInstagramNowAction.bind(null, p.id)} className="text-xs" confirm={`${p.status === "FAILED" ? "Publicar de novo" : "Publicar agora"} o post ${p.number} no Instagram?`} variant={p.status === "FAILED" ? "primary" : "secondary"}><Send className="size-3.5" /> {p.status === "FAILED" ? "Publicar de novo" : "Publicar agora"}</ConfirmButton>
            <ConfirmButton action={cancelInstagramPostAction.bind(null, p.id)} variant="ghost" className="text-xs text-zinc-500" confirm={`Cancelar o post ${p.number}?`}><XCircle className="size-3.5" /> Cancelar</ConfirmButton>
          </>
        )}
      </div>
    </div>
  );
}

const nextOf = (items: P[]) => (items[0] ? when(items[0].scheduledAt) : null);

export default async function InstagramPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  await requireSuperAdmin();
  const aba = (await searchParams).aba === "stories" ? "stories" : "feed";
  const [st, posts] = await Promise.all([
    instagramStatus(),
    prisma.instagramPost.findMany({ where: { OR: [{ status: { not: "CANCELLED" } }, { createdAt: { gt: new Date(Date.now() - 7 * 86400_000) } }] }, orderBy: { scheduledAt: "asc" }, take: 500 }),
  ]);
  const isStory = (p: P) => p.kind === "STORY";
  const drafts = posts.filter((p) => p.status === "DRAFT");
  const batches = [...new Set(drafts.map((p) => p.batchId))].map((id) => drafts.filter((p) => p.batchId === id));
  const pending = posts.filter((p) => !["PUBLISHED", "CANCELLED", "DRAFT"].includes(p.status));
  const feedQueue = pending.filter((p) => !isStory(p));
  const storyQueue = pending.filter(isStory);
  const done = posts.filter((p) => (p.status === "PUBLISHED" || p.status === "CANCELLED") && (aba === "stories" ? isStory(p) : !isStory(p))).reverse();
  const hasToken = Boolean(cachedSetting("INSTAGRAM_TOKEN") || cachedSetting("META_SYSTEM_USER_TOKEN") || process.env.META_SYSTEM_USER_TOKEN);
  const tabs = [
    { id: "feed", label: "Feed", sub: "Posts e carrosséis", icon: LayoutGrid, count: feedQueue.length, next: nextOf(feedQueue), failed: feedQueue.filter((p) => p.status === "FAILED").length },
    { id: "stories", label: "Stories", sub: "Um por horário", icon: Smartphone, count: storyQueue.length, next: nextOf(storyQueue), failed: storyQueue.filter((p) => p.status === "FAILED").length },
  ];
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader title="Instagram" description="Suba o .zip e o Fuzil publica sozinho, no dia e na hora, pela API oficial do Instagram." />

      <Drawer
        title="Conta do Instagram"
        tone={st.ok ? "green" : "amber"}
        meta={<span>{st.ok ? `Conectada: @${st.username}` : `Pendente: ${st.error}`}</span>}
        open={!st.ok}
      >
        <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
          <li>
            <i>Se o Instagram já está na própria BM do Fuzil, pule este passo.</i> Na BM onde está o Instagram: <b>Configurações do negócio → Contas → Contas do Instagram</b>, clique na conta e em <b>Atribuir parceiro</b>. Cole o ID da BM do Fuzil{" "}
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

      <Drawer title="Subir .zip" tone="green" meta={<span>{drafts.length ? `${drafts.length} para conferir` : "Feed e stories no mesmo .zip"}</span>} open={!pending.length && !drafts.length}>
        <ActionForm action={importInstagramZipAction} submit="Subir e conferir">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Arquivo .zip">
              <input type="file" name="zip" accept=".zip,application/zip" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm" />
            </Field>
            <Field label="Primeiro dia" hint="Horário que já passou hoje fica de fora">
              <Input type="date" name="startDay" defaultValue={today()} required />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
              <div className="flex items-center gap-2 font-semibold text-zinc-900"><LayoutGrid className="size-4 text-orange-600" /> Feed</div>
              <p className="mt-1 text-xs text-zinc-600"><b>2.png</b> = post único · <b>5-1.png, 5-2.png…</b> = carrossel · legenda do <b>LEGENDAS.txt</b></p>
              <div className="mt-3">
                <Field label="Horários do feed" hint="Um post por horário. Ex.: 12:00, 19:00 = 2 por dia">
                  <Input name="times" defaultValue="12:00" />
                </Field>
              </div>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
              <div className="flex items-center gap-2 font-semibold text-zinc-900"><Smartphone className="size-4 text-violet-600" /> Stories</div>
              <p className="mt-1 text-xs text-zinc-600"><b>story-1.png, story-2.mp4…</b> = um story cada, foto ou vídeo (sem legenda)</p>
              <div className="mt-3">
                <Field label="Horários dos stories" hint="Um story por horário">
                  <Input name="storyTimes" defaultValue="10:00, 11:00, 12:00, 13:00, 14:00, 16:00, 17:00, 18:00, 19:00, 20:00" />
                </Field>
              </div>
            </div>
          </div>
        </ActionForm>
      </Drawer>

      {batches.map((all) => {
        const feed = all.filter((p) => !isStory(p));
        const sts = all.filter(isStory);
        return (
          <section key={all[0].batchId} className="rounded-2xl border-2 border-violet-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><ClipboardCheck className="size-5 text-violet-600" /> Confira antes de agendar</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {feed.length > 0 && <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-800 ring-1 ring-orange-200">Feed: {feed.length} posts ({feed.filter((p) => p.images.length > 1).length} carrosséis, {feed.filter((p) => p.images.length === 1).length} únicos)</span>}
              {sts.length > 0 && <span className="rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-800 ring-1 ring-violet-200">Stories: {sts.length} ({[...new Set(sts.map((p) => dayKey(p.scheduledAt)))].length} dias)</span>}
            </div>
            {feed.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-zinc-900"><LayoutGrid className="size-4 text-orange-600" /> Feed</h3>
                <div className="space-y-3">{feed.map((p) => <FeedCard key={p.id} p={p} review />)}</div>
              </div>
            )}
            {sts.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-zinc-900"><Smartphone className="size-4 text-violet-600" /> Stories</h3>
                <StoryDays items={sts} />
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
              <ConfirmButton action={confirmInstagramBatchAction.bind(null, all[0].batchId)} variant="primary" confirm={`Agendar ${[feed.length ? `${feed.length} posts do feed` : "", sts.length ? `${sts.length} stories` : ""].filter(Boolean).join(" e ")}? Eles vão sair sozinhos nos horários acima.`}><CheckCircle2 className="size-4" /> Confirmar agendamento</ConfirmButton>
              <ConfirmButton action={discardInstagramBatchAction.bind(null, all[0].batchId)} variant="ghost" className="text-zinc-500" confirm="Descartar tudo isso? Nada vai ser publicado."><XCircle className="size-4" /> Descartar</ConfirmButton>
            </div>
          </section>
        );
      })}

      {/* Abas: Feed e Stories, cada um com a sua fila */}
      <div className="grid gap-3 sm:grid-cols-2">
        {tabs.map((t) => (
          <Link key={t.id} href={`?aba=${t.id}`} scroll={false} className={clsx("flex items-center gap-4 rounded-2xl border-2 bg-white p-4 shadow-sm transition", aba === t.id ? (t.id === "feed" ? "border-orange-400" : "border-violet-400") : "border-zinc-200 hover:border-zinc-300")}>
            <span className={clsx("grid size-12 shrink-0 place-items-center rounded-2xl", t.id === "feed" ? "bg-orange-50 text-orange-600" : "bg-violet-50 text-violet-600")}><t.icon className="size-6" /></span>
            <span className="min-w-0">
              <span className="block text-lg font-semibold text-zinc-900">{t.label} <span className="text-sm font-normal text-zinc-500">· {t.sub}</span></span>
              <span className="block text-sm text-zinc-600">{t.count ? `${t.count} na fila · próximo ${t.next}` : "Nada agendado"}{t.failed ? <b className="ml-1 text-rose-600">· {t.failed} falhou</b> : null}</span>
            </span>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 font-semibold text-zinc-900"><CalendarClock className={clsx("size-5", aba === "feed" ? "text-orange-500" : "text-violet-500")} /> {aba === "feed" ? "Feed agendado" : "Stories agendados"}</h2>
          {pending.length > 0 && (
            <ConfirmButton action={cancelAllInstagramAction} variant="ghost" className="ml-auto text-xs text-zinc-500" confirm="Cancelar tudo que ainda não saiu (feed e stories)?">Cancelar tudo</ConfirmButton>
          )}
        </div>
        {aba === "feed" ? (
          feedQueue.length ? (
            <div className="space-y-3">
              {groupByDay(feedQueue).map(([day, list]) => (
                <DayDrawer key={day} day={day} items={list} kind="FEED" queue>
                  <div className="space-y-3">{list.map((p) => <FeedCard key={p.id} p={p} />)}</div>
                </DayDrawer>
              ))}
            </div>
          ) : <Empty icon={<Upload className="size-6" />}>Nenhum post do feed agendado. Suba um .zip acima.</Empty>
        ) : storyQueue.length ? (
          <StoryDays items={storyQueue} actions />
        ) : (
          <Empty icon={<Images className="size-6" />}>Nenhum story agendado. Suba um .zip com story-1.png, story-2.png…</Empty>
        )}
      </section>

      {done.length > 0 && (
        <Drawer title={aba === "feed" ? "Feed já publicado" : "Stories já publicados"} tone="green" meta={<span>{done.filter((p) => p.status === "PUBLISHED").length} publicados</span>}>
          <div className="divide-y divide-zinc-100">
            {done.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
                {p.status === "PUBLISHED" ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-zinc-400" />}
                <span className="font-medium text-zinc-800">{isStory(p) ? "Story" : "Post"} {p.number}{p.title ? ` · ${p.title}` : ""}</span>
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
