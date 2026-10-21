import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveFunnel } from "@/lib/funnel-public";
import { funnelPage } from "@/lib/funnels";

export const metadata: Metadata = { title: "Política de privacidade", robots: { index: false } };

export default async function Privacidade({ params }: { params: Promise<{ key: string }> }) {
  const funnel = await resolveFunnel((await params).key);
  if (!funnel) notFound();
  const { company } = funnelPage(funnel);
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-5 py-12 leading-relaxed text-slate-700">
      <h1 className="text-2xl font-extrabold text-slate-900">Política de privacidade</h1>
      <p>
        Esta página explica como {company} usa os dados enviados no formulário de inscrição, de acordo com a Lei Geral de Proteção de Dados (LGPD).
      </p>
      <h2 className="pt-2 font-bold text-slate-900">Quais dados coletamos</h2>
      <p>Nome, WhatsApp, e-mail e as respostas do cadastro do processo seletivo.</p>
      <h2 className="pt-2 font-bold text-slate-900">Para que usamos</h2>
      <p>
        Para confirmar seu número, falar com você sobre o processo seletivo e sobre novas oportunidades pelo WhatsApp. Não vendemos seus dados.
      </p>
      <h2 className="pt-2 font-bold text-slate-900">Seus direitos</h2>
      <p>
        Você pode parar de receber mensagens a qualquer momento respondendo SAIR no WhatsApp, e pode pedir a exclusão dos seus dados pela mesma conversa.
      </p>
    </main>
  );
}
