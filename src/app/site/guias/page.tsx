import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { TUTORIALS } from "@/lib/tutorials";

export const metadata: Metadata = {
  title: "Guias da API oficial do WhatsApp: disparo, templates, BMs e limites | Fuzil Disparador",
  description: "Guias passo a passo em português para disparar pela API oficial do WhatsApp: conectar a BM, criar template de utilidade, montar grupos, entender limites, qualidade do número e métricas.",
  alternates: { canonical: "/guias" },
};

export default function GuidesIndex() {
  return (
    <article className="mx-auto max-w-4xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Guias da API oficial do WhatsApp</h1>
      <p className="mt-3 max-w-2xl text-zinc-600">Passo a passo em português simples para conectar BMs, criar templates de utilidade e disparar em escala sem travar conta.</p>
      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {TUTORIALS.map((t) => (
          <li key={t.slug}>
            <Link href={`/guias/${t.slug}`} className="flex h-full flex-col rounded-2xl border border-zinc-200 p-5 transition hover:border-orange-300 hover:shadow-sm">
              <span className="font-semibold text-zinc-900">{t.title}</span>
              <span className="mt-1 flex-1 text-sm text-zinc-600">{t.summary}</span>
              <span className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {t.minutes} min</span>
                <ArrowRight className="size-4 text-orange-500" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
