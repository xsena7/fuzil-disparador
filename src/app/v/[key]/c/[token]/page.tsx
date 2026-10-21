import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { resolveFunnel } from "@/lib/funnel-public";
import { firstName } from "@/lib/template-utils";
import { funnelFields, funnelPage } from "@/lib/funnels";
import { Pixel } from "../../pixel";
import { AnswersForm } from "./answers-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Complete seu cadastro", robots: { index: false } };

export default async function Cadastro({ params }: { params: Promise<{ key: string; token: string }> }) {
  const { key, token } = await params;
  const funnel = await resolveFunnel(key);
  if (!funnel) notFound();
  const lead = await prisma.lead.findUnique({ where: { formToken: token } });
  if (!lead || lead.funnelId !== funnel.id || lead.status === "CODE_SENT" || lead.status === "STOPPED") notFound();
  const p = funnelPage(funnel);

  return (
    <div style={{ "--c": p.color } as React.CSSProperties} className="min-h-screen bg-[#f3f1ec] text-[#111]">
      {funnel.pixelId && <Pixel id={funnel.pixelId} />}
      <header className="px-5 pb-10 pt-8">
        <div className="mx-auto max-w-xl">
          <div className="text-lg font-bold tracking-tight">
            {p.company}
            <span className="text-[var(--c)]">.</span>
          </div>
          <h1 className="mt-10 text-4xl font-semibold leading-tight tracking-[-0.03em] md:text-5xl">Olá, {firstName(lead.name)}! Falta pouco.</h1>
          <p className="mt-3 text-black/60">Complete seu cadastro para continuar no processo seletivo de {lead.job || p.jobTitle}.</p>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-5 pb-16">
        <div className="border-t border-black bg-white p-6">
          {lead.status === "COMPLETED" ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Cadastro recebido!</h2>
              <p className="mt-2 text-black/55">Nosso time vai analisar suas respostas. O próximo contato será pelo WhatsApp.</p>
            </div>
          ) : (
            <AnswersForm token={token} fields={funnelFields(funnel)} />
          )}
        </div>
      </main>
    </div>
  );
}
