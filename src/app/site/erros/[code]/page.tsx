import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { company } from "@/lib/company";
import { siteWhatsApp } from "../../cta";
import { errorGroup, publicError, publicErrors } from "@/lib/seo-errors";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = publicError(Number((await params).code));
  if (!e) return {};
  return {
    title: `Erro ${e.code} do WhatsApp: ${e.title} | Fuzil Disparador`,
    description: `O que significa o erro ${e.code} da API do WhatsApp (Meta) e como resolver: ${e.meaning}`.slice(0, 160),
    alternates: { canonical: `/erros/${e.code}` },
  };
}

export default async function ErrorPage({ params }: Props) {
  const e = publicError(Number((await params).code));
  if (!e) notFound();
  const c = company();
  const related = publicErrors().filter((x) => x.code !== e.code && errorGroup(x.code) === errorGroup(e.code)).slice(0, 6);
  // Perguntas e respostas no formato que o Google e as IAs leem (FAQ)
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: `O que significa o erro ${e.code} no WhatsApp?`, acceptedAnswer: { "@type": "Answer", text: e.meaning } },
      { "@type": "Question", name: `Como resolver o erro ${e.code} no WhatsApp?`, acceptedAnswer: { "@type": "Answer", text: e.action } },
    ],
  };
  return (
    <article className="mx-auto max-w-3xl px-5 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <Link href="/erros" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"><ArrowLeft className="size-4" /> Todos os erros</Link>
      <div className="font-mono text-sm font-semibold text-orange-600">Erro {e.code} · {errorGroup(e.code)}</div>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Erro {e.code} do WhatsApp: {e.title}</h1>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-zinc-900">O que significa</h2>
        <p className="leading-relaxed">{e.meaning}</p>
      </section>
      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-zinc-900">Como resolver</h2>
        <p className="leading-relaxed">{e.action}</p>
        {e.urgent && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Esse erro impede a conta de disparar até ser resolvido. Vale resolver logo.</p>}
      </section>

      <section className="mt-10 rounded-3xl bg-ink p-6 text-white sm:p-8">
        <h2 className="text-xl font-semibold">Cansado de caçar erro na mão?</h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-300">
          {["Traduz cada erro da Meta para português e diz o que fazer", "Tira do disparo o número ou a conta com problema e segue pelas outras BMs", "Falha não é cobrada: o crédito volta para o saldo"].map((t) => (
            <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-orange-400" /> {t}</li>
          ))}
        </ul>
        <a href={siteWhatsApp(`Oi! Vi a página do erro ${e.code} e quero conhecer o Fuzil Disparador.`)} className="mt-6 inline-flex rounded-xl bg-brand-gradient px-5 py-3 font-semibold text-white shadow-lg shadow-orange-500/30 hover:brightness-110">
          Conhecer o {c.brand}
        </a>
      </section>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">Erros parecidos</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.code}>
                <Link href={`/erros/${r.code}`} className="block rounded-xl border border-zinc-200 px-4 py-3 text-sm transition hover:border-orange-300 hover:bg-orange-50/60">
                  <span className="font-mono font-semibold text-orange-600">{r.code}</span> <span className="text-zinc-800">{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
