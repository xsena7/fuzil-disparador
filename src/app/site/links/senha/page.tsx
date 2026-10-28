import type { Metadata } from "next";
import { ResetForm } from "../login-form";

export const metadata: Metadata = { title: "Senha nova · Gerador de links", robots: { index: false, follow: false } };

export default async function LinksResetPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <section className="bg-ink px-5 py-16 text-white">
      <div className="mx-auto max-w-md">
        {t ? <ResetForm token={t} /> : <p className="text-center text-zinc-400">Link inválido. Peça outro em &quot;Esqueci minha senha&quot;.</p>}
      </div>
    </section>
  );
}
