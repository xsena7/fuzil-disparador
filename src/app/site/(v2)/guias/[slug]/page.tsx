import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Clock, Lightbulb } from "lucide-react";
import { TUTORIALS, findTutorial } from "@/lib/tutorials";
import { siteWhatsApp } from "@/app/site/cta";

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
    <article className="mx-auto max-w-3xl px-5 pb-20 pt-36 sm:pt-40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <Link href="/guias" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--gray)] hover:text-white/90"><ArrowLeft className="size-4" /> Todos os guias</Link>
      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t.title}</h1>
      <p className="mt-2 text-[var(--gray)]">{t.summary} <span className="ml-1 inline-flex items-center gap-1 text-xs text-white/40"><Clock className="size-3.5" /> {t.minutes} min</span></p>

      <div className="mt-8 space-y-5 text-[15px] leading-relaxed">
        {t.blocks.map((b, k) => {
          if (b.kind === "text") return <p key={k}>{b.text}</p>;
          if (b.kind === "steps")
            return (
              <ol key={k} className="space-y-2.5">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ff6a00]/10 text-xs font-semibold text-[#ff8a3d]">{j + 1}</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ol>
            );
          if (b.kind === "tip" || b.kind === "warn")
            return (
              <div key={k} className={`flex gap-3 rounded-2xl border p-4 text-sm ${b.kind === "tip" ? "border-sky-400/30 bg-sky-500/10 text-sky-200" : "border-amber-400/30 bg-amber-500/10 text-amber-200"}`}>
                {b.kind === "tip" ? <Lightbulb className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
                <span>{b.text}</span>
              </div>
            );
          return (
            <figure key={k} className="overflow-hidden rounded-2xl border border-white/10">
              <Image src={b.src} alt={b.caption} width={1440} height={900} className="h-auto w-full" />
              <figcaption className="border-t border-white/5 px-4 py-2.5 text-xs text-[var(--gray)]">{b.caption}</figcaption>
            </figure>
          );
        })}
      </div>

      <section className="surface-solid mt-12 p-6 text-white sm:p-8">
        <h2 className="text-xl font-semibold">Prefere que a gente dispare por você?</h2>
        <p className="mt-2 text-sm text-zinc-300">Nossa equipe faz o disparo pela API oficial, com as nossas contas e números. Você só manda a lista e a mensagem.</p>
        <a href={siteWhatsApp(`Oi! Li o guia "${t.title}" e quero um orçamento de disparo.`)} className="btn-fire mt-6">
          Fale com nossa equipe no WhatsApp
        </a>
      </section>

      {next && (
        <Link href={`/guias/${next.slug}`} className="mt-8 flex items-center justify-between rounded-2xl border border-white/10 p-4 transition hover:border-white/20">
          <span><span className="block text-xs text-white/40">Próximo guia</span><span className="font-medium text-white">{next.title}</span></span>
          <ArrowRight className="size-4 text-[#ff8a3d]" />
        </Link>
      )}
    </article>
  );
}
