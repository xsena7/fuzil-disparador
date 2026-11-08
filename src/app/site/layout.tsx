import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { company, ownerLine } from "@/lib/company";
import { siteWhatsApp } from "./cta";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const c = company();
  return {
    title: "Fuzil Disparador · A gente dispara pra você no WhatsApp",
    description: "Disparo em massa no WhatsApp pela API oficial, feito pela nossa equipe. Lista higienizada, relatório ao vivo e pacotes com até 47% de desconto: a partir de R$ 0,16 por disparo.",
    metadataBase: new URL(c.siteUrl),
    // Um código por BM (dá para colar vários, separados por vírgula ou espaço)
    ...(c.domainVerification ? { other: { "facebook-domain-verification": c.domainVerification.split(/[\s,;]+/).filter(Boolean) } } : {}),
  };
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const c = company();
  return (
    <div className="min-h-screen bg-white text-[15px] text-zinc-700">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#1C1C1E]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
          <Link href="/" className="w-28 shrink-0"><Logo className="w-full" /></Link>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-zinc-300 md:flex">
            <a href="/#por-que" className="hover:text-white">Por que a gente</a>
            <a href="/#nichos" className="hover:text-white">Para quem é</a>
            <a href="/#modalidades" className="hover:text-white">Como disparamos</a>
            <a href="/#como-funciona" className="hover:text-white">Como funciona</a>
            <a href="/#preco" className="hover:text-white">Preço</a>
            <a href="/#duvidas" className="hover:text-white">Dúvidas</a>
          </nav>
          <a href={siteWhatsApp("Oi! Vi o site e quero fazer um orçamento de disparo.")} target="_blank" rel="noreferrer" className="ml-auto rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm md:ml-0">Orçamento</a>
        </div>
      </header>

      <main>{children}</main>

      <footer className="bg-[#1C1C1E] text-sm text-zinc-400">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Logo className="mb-4 w-40" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/meta/meta-business-partner.png" alt="Meta Business Partner" width={140} height={80} className="mb-4 h-auto w-[140px]" />
            <p>
              O {c.brand} é um produto e marca de <span className="text-zinc-200">{ownerLine()}</span>.
            </p>
            {c.address && <p className="mt-2">{c.address}</p>}
            <p className="mt-2">
              {c.email && <a href={`mailto:${c.email}`} className="hover:text-white">{c.email}</a>}
              {c.email && c.phone && " · "}
              {c.phone}
            </p>
          </div>
          <div>
            <div className="mb-3 font-medium text-zinc-200">Disparos</div>
            <ul className="space-y-2">
              <li><a href="/#como-funciona" className="hover:text-white">Como funciona</a></li>
              <li><a href="/#preco" className="hover:text-white">Preço</a></li>
              <li><a href={siteWhatsApp("Oi! Vi o site e quero fazer um orçamento de disparo.")} target="_blank" rel="noreferrer" className="hover:text-white">Orçamento no WhatsApp</a></li>
              <li><a href={`${c.appUrl}/login`} className="hover:text-white">Área do cliente</a></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 font-medium text-zinc-200">Aprenda</div>
            <ul className="space-y-2">
              <li><Link href="/guias" className="hover:text-white">Guias da API do WhatsApp</Link></li>
              <li><Link href="/erros" className="hover:text-white">Erros do WhatsApp explicados</Link></li>
              <li><Link href="/perguntas" className="hover:text-white">Perguntas frequentes</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 font-medium text-zinc-200">Legal</div>
            <ul className="space-y-2">
              <li><Link href="/privacidade" className="hover:text-white">Política de Privacidade</Link></li>
              <li><Link href="/termos" className="hover:text-white">Termos de Uso</Link></li>
              <li><Link href="/exclusao-de-dados" className="hover:text-white">Exclusão de dados</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-5 py-5 text-xs text-zinc-500">
            © {new Date().getFullYear()} {c.legalName || c.brand} · CNPJ {c.cnpj}. WhatsApp é uma marca da Meta Platforms, Inc. O {c.brand} é Meta Business Partner e utiliza a API oficial do WhatsApp Business.
          </div>
        </div>
      </footer>
    </div>
  );
}
