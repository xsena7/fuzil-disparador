import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Clock, Lightbulb } from "lucide-react";
import { TUTORIALS, findTutorial } from "@/lib/tutorials";
import { siteWhatsApp } from "../../cta";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = findTutorial((await params).slug);
  if (!t) return {};
  return { title: `${t.title}: guia da API oficial do WhatsApp | Fuzil Disparador`, description: t.summary, alternates: { canonical: `/guias/${t.slug}` } };
}

/** Guia público (mesmo conteúdo dos Tutoriais do painel), para quem chega pelo Google. */
export default async function GuidePage({ params }: Props) {
  const t = findTutorial((await params).slug);
  if (!t) notFound();
  const i = TUTORIALS.indexOf(t);
  const next = TUTORIALS[i + 1];
  const article = { "@context": "https://schema.org", "@type": "HowTo", name: t.title, description: t.summary, totalTime: `PT${t.minutes}M` };
  return (
    <article className="mx-auto max-w-3xl px-5 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <Link href="/guias" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"><ArrowLeft className="size-4" /> Todos os guias</Link>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">{t.title}</h1>
      <p className="mt-2 text-zinc-600">{t.summary} <span className="ml-1 inline-flex items-center gap-1 text-xs text-zinc-400"><Clock className="size-3.5" /> {t.minutes} min</span></p>

      <div className="mt-8 space-y-5 text-[15px] leading-relaxed">
        {t.blocks.map((b, k) => {
          if (b.kind === "text") return <p key={k}>{b.text}</p>;
          if (b.kind === "steps")
            return (
              <ol key={k} className="space-y-2.5">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-semibold text-orange-700">{j + 1}</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ol>
            );
          if (b.kind === "tip" || b.kind === "warn")
            return (
              <div key={k} className={`flex gap-3 rounded-2xl border p-4 text-sm ${b.kind === "tip" ? "border-sky-200 bg-sky-50 text-sky-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                {b.kind === "tip" ? <Lightbulb className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
                <span>{b.text}</span>
              </div>
            );
          return (
            <figure key={k} className="overflow-hidden rounded-2xl border border-zinc-200">
              <Image src={b.src} alt={b.caption} width={1440} height={900} className="h-auto w-full" />
              <figcaption className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">{b.caption}</figcaption>
            </figure>
          );
        })}
      </div>

      <section className="mt-12 rounded-3xl bg-ink p-6 text-white sm:p-8">
        <h2 className="text-xl font-semibold">Quer disparar assim sem dor de cabeça?</h2>
        <p className="mt-2 text-sm text-zinc-300">O Fuzil Disparador junta suas BMs, faz o rodízio dos números, traduz os erros da Meta e devolve o crédito do que falhar.</p>
        <a href={siteWhatsApp(`Oi! Li o guia "${t.title}" e quero conhecer o Fuzil Disparador.`)} className="mt-6 inline-flex rounded-xl bg-brand-gradient px-5 py-3 font-semibold text-white shadow-lg shadow-orange-500/30 hover:brightness-110">
          Falar com a gente
        </a>
      </section>

      {next && (
        <Link href={`/guias/${next.slug}`} className="mt-8 flex items-center justify-between rounded-2xl border border-zinc-200 p-4 transition hover:shadow-sm">
          <span><span className="block text-xs text-zinc-400">Próximo guia</span><span className="font-medium text-zinc-900">{next.title}</span></span>
          <ArrowRight className="size-4 text-orange-500" />
        </Link>
      )}
    </article>
  );
}
