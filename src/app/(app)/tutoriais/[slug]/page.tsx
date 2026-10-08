import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, ArrowLeft, ArrowRight, Clock, ExternalLink, Lightbulb } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { TUTORIALS, findTutorial } from "@/lib/tutorials";
import { LinkButton } from "@/components/ui";
import { TUTORIAL_ICONS } from "../icons";


export const dynamic = "force-dynamic";

export default async function TutorialPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAuth();
  const { slug } = await params;
  const t = findTutorial(slug);
  if (!t) notFound();
  const i = TUTORIALS.indexOf(t);
  const prev = TUTORIALS[i - 1];
  const next = TUTORIALS[i + 1];
  const Icon = TUTORIAL_ICONS[t.icon];

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_240px]">
      <article className="min-w-0">
        <Link href="/tutoriais" className="mb-5 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"><ArrowLeft className="size-4" /> Todos os tutoriais</Link>
        <div className="mb-6 flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-soft"><Icon className="size-6" /></span>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <p className="mt-1 text-zinc-500">{t.summary} <span className="ml-1 inline-flex items-center gap-1 text-xs text-zinc-400"><Clock className="size-3.5" /> {t.minutes} min</span></p>
          </div>
          {t.href && <LinkButton href={t.href} variant="secondary" className="shrink-0">Abrir a tela <ExternalLink className="size-4" /></LinkButton>}
        </div>

        <div className="space-y-5 text-[15px] leading-relaxed text-zinc-700">
          {t.blocks.map((b, k) => {
            if (b.kind === "text") return <p key={k}>{b.text}</p>;
            if (b.kind === "steps")
              return (
                <ol key={k} className="space-y-2.5">
                  {b.items.map((it, j) => (
                    <li key={j} className="flex gap-3">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{j + 1}</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ol>
              );
            if (b.kind === "tip" || b.kind === "warn")
              return (
                <div key={k} className={clsx("flex gap-3 rounded-2xl border p-4 text-sm", b.kind === "tip" ? "border-sky-200 bg-sky-50 text-sky-900" : "border-amber-200 bg-amber-50 text-amber-900")}>
                  {b.kind === "tip" ? <Lightbulb className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
                  <span>{b.text}</span>
                </div>
              );
            return (
              <figure key={k} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-soft">
                <Image src={b.src} alt={b.caption} width={1440} height={900} className="h-auto w-full" />
                <figcaption className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">{b.caption}</figcaption>
              </figure>
            );
          })}
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link href={`/tutoriais/${prev.slug}`} className="rounded-2xl border border-zinc-200 bg-white p-4 transition hover:shadow-soft">
              <div className="text-xs text-zinc-400">← Anterior</div>
              <div className="font-medium">{prev.title}</div>
            </Link>
          ) : <span />}
          {next && (
            <Link href={`/tutoriais/${next.slug}`} className="rounded-2xl border border-zinc-200 bg-white p-4 text-right transition hover:shadow-soft">
              <div className="text-xs text-zinc-400">Próximo →</div>
              <div className="flex items-center justify-end gap-1 font-medium">{next.title} <ArrowRight className="size-4" /></div>
            </Link>
          )}
        </div>
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-8">
          <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Tutoriais</div>
          <nav className="space-y-0.5">
            {TUTORIALS.map((x) => {
              const XIcon = TUTORIAL_ICONS[x.icon];
              return (
                <Link key={x.slug} href={`/tutoriais/${x.slug}`} className={clsx("flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition", x.slug === t.slug ? "bg-white font-medium text-zinc-900 shadow-soft ring-1 ring-zinc-200/70" : "text-zinc-500 hover:bg-white/60 hover:text-zinc-800")}>
                  <XIcon className="size-4" /> {x.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </div>
  );
}
