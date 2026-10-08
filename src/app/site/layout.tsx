import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { company, ownerLine } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const c = company();
  return {
    title: "Fuzil Disparador · Disparos pela API oficial do WhatsApp",
    description: "Plataforma para empresas enviarem mensagens em escala pela API oficial do WhatsApp Business (Cloud API), com gestão de várias contas, métricas e controle de qualidade.",
    metadataBase: new URL(c.siteUrl),
    ...(c.domainVerification ? { other: { "facebook-domain-verification": c.domainVerification } } : {}),
  };
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const c = company();
  return (
    <div className="min-h-screen bg-white text-[15px] text-zinc-700">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
          <Link href="/" className="w-36 shrink-0"><Logo className="w-full" /></Link>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-zinc-300 md:flex">
            <a href="/#recursos" className="hover:text-white">Recursos</a>
            <a href="/#como-funciona" className="hover:text-white">Como funciona</a>
            <a href="/#contato" className="hover:text-white">Contato</a>
          </nav>
          <a href={`${c.appUrl}/login`} className="ml-auto rounded-xl bg-brand-gradient px-4 py-2 text-sm font-medium text-white shadow-sm md:ml-0">Entrar</a>
        </div>
      </header>

      <main>{children}</main>

      <footer className="bg-ink text-sm text-zinc-400">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Logo className="mb-4 w-40" />
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
            <div className="mb-3 font-medium text-zinc-200">Plataforma</div>
            <ul className="space-y-2">
              <li><a href={`${c.appUrl}/login`} className="hover:text-white">Entrar no painel</a></li>
              <li><a href="/#recursos" className="hover:text-white">Recursos</a></li>
              <li><a href="/#contato" className="hover:text-white">Contato</a></li>
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
            © {new Date().getFullYear()} {c.legalName || c.brand} · CNPJ {c.cnpj}. WhatsApp é uma marca da Meta Platforms, Inc. O {c.brand} utiliza a API oficial do WhatsApp Business e não é afiliado nem endossado pela Meta.
          </div>
        </div>
      </footer>
    </div>
  );
}
