// Visual novo do site (redesign). Por enquanto só em /novo (prévia, fora do Google) até ser aprovado.
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand";
import { company, ownerLine } from "@/lib/company";
import { siteWhatsApp } from "../cta";
import { V2_MSG } from "../_v2/content";
import "../_v2/v2.css";

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#solucoes", label: "Soluções" },
  { href: "#precos", label: "Preços" },
  { href: "#sobre", label: "Sobre" },
  { href: "#contato", label: "Contato" },
];

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const c = company();
  const wa = siteWhatsApp(V2_MSG);
  return (
    <div className="v2 min-h-screen overflow-x-clip text-[15px]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-black">Pular para o conteúdo</a>
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto mt-3 flex max-w-6xl items-center gap-6 rounded-full border border-white/10 bg-[#0d0e12]/70 px-4 py-2.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:mx-4 sm:px-5 lg:mx-auto">
          <Link href="/" className="w-24 shrink-0" aria-label="Fuzil Disparador, início"><Logo className="w-full" /></Link>
          <nav className="ml-auto hidden items-center gap-7 text-sm text-[var(--gray)] md:flex" aria-label="Principal">
            {NAV.map((n) => <a key={n.href} href={n.href} className="transition-colors hover:text-white">{n.label}</a>)}
          </nav>
          <a href={wa} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 md:ml-0">
            Falar com a equipe <ArrowUpRight className="size-4" />
          </a>
        </div>
      </header>

      <main id="conteudo">{children}</main>

      <footer className="border-t border-white/10 bg-[#07080a] text-sm text-[var(--gray)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Logo className="mb-5 w-36" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/meta/meta-business-partner.png" alt="Meta Business Partner" width={130} height={74} className="mb-5 h-auto w-[130px] opacity-90" />
            <p className="max-w-sm">O {c.brand} é um produto e marca de <span className="text-white/80">{ownerLine()}</span>.</p>
            {c.address && <p className="mt-2">{c.address}</p>}
            <p className="mt-2">
              {c.email && <a href={`mailto:${c.email}`} className="hover:text-white">{c.email}</a>}
              {c.email && c.phone && " · "}
              {c.phone}
            </p>
          </div>
          <div>
            <div className="mb-3 font-medium text-white/85">Serviço</div>
            <ul className="space-y-2">
              {NAV.slice(0, 3).map((n) => <li key={n.href}><a href={n.href} className="hover:text-white">{n.label}</a></li>)}
              <li><a href={wa} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp da equipe</a></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 font-medium text-white/85">Conteúdo</div>
            <ul className="space-y-2">
              <li><Link href="/guias" className="hover:text-white">Guias da API do WhatsApp</Link></li>
              <li><Link href="/erros" className="hover:text-white">Erros do WhatsApp explicados</Link></li>
              <li><Link href="/perguntas" className="hover:text-white">Perguntas frequentes</Link></li>
              <li><a href={`${c.appUrl}/login`} className="hover:text-white">Área do cliente</a></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 font-medium text-white/85">Legal</div>
            <ul className="space-y-2">
              <li><Link href="/privacidade" className="hover:text-white">Política de Privacidade</Link></li>
              <li><Link href="/termos" className="hover:text-white">Termos de Uso</Link></li>
              <li><Link href="/exclusao-de-dados" className="hover:text-white">Exclusão de dados</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-5 py-5 text-xs text-white/40">
            © {new Date().getFullYear()} {c.legalName || c.brand} · CNPJ {c.cnpj}. WhatsApp é uma marca da Meta Platforms, Inc. O {c.brand} é Meta Business Partner e utiliza a API oficial do WhatsApp Business.
          </div>
        </div>
      </footer>
    </div>
  );
}
