import type { ReactNode } from "react";

/** Moldura das páginas legais (privacidade, termos, exclusão de dados). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-5 pb-20 pt-36 sm:pt-40">
      <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
      <p className="mt-2 text-sm text-white/40">Última atualização: {updated}</p>
      <div className="mt-10 space-y-4 leading-relaxed text-white/70 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
