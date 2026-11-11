import type { Metadata } from "next";
import Link from "next/link";
import { errorGroup, publicErrors } from "@/lib/seo-errors";

export const metadata: Metadata = {
  title: "Erros da API do WhatsApp explicados em português | Fuzil Disparador",
  description: "Lista dos códigos de erro da API oficial do WhatsApp (Meta) com o que cada um significa e como resolver, em português simples: 131026, 131048, 131049, 132018, 131042 e outros.",
  alternates: { canonical: "/erros" },
};

export default function ErrorsIndex() {
  const errors = publicErrors();
  const groups = [...new Set(errors.map((e) => errorGroup(e.code)))];
  return (
    <article className="mx-auto max-w-4xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Erros da API do WhatsApp, explicados em português</h1>
      <p className="mt-3 max-w-2xl text-zinc-600">
        Cada código que a Meta devolve quando uma mensagem não sai, traduzido para quem não é técnico: o que aconteceu e o que fazer. Clique no código para ver os detalhes.
      </p>
      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g}>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">{g}</h2>
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200">
              {errors.filter((e) => errorGroup(e.code) === g).map((e) => (
                <li key={e.code}>
                  <Link href={`/erros/${e.code}`} className="flex items-baseline gap-4 px-5 py-3 transition hover:bg-orange-50/60">
                    <span className="w-20 shrink-0 font-mono text-sm font-semibold text-orange-600">{e.code}</span>
                    <span className="font-medium text-zinc-900">{e.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
