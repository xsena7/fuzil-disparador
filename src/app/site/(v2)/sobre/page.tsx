import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { FinalCta, PageHeader, Proof, Section, Tech } from "../../_v2/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sobre a Fuzil · Fuzil Disparador",
  description: "Estrutura operacional, tecnologia própria e experiência em disparos em massa pela API oficial do WhatsApp. A Fuzil é Meta Business Partner.",
  alternates: { canonical: "/sobre" },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="Sobre a Fuzil" title={<>Operação de verdade, <span className="t-fire">tecnologia própria.</span></>} intro="A Fuzil é uma equipe especializada em disparos no WhatsApp. Construímos o nosso próprio sistema para organizar campanhas, conexões e métricas, e usamos ele para disparar por você." />
      <Proof />
      <Tech />
      <Section eyebrow="Parceria" title="Meta Business Partner">
        <div data-reveal className="surface flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/meta/meta-business-partner.png" alt="Meta Business Partner" width={160} height={92} className="h-auto w-[160px] rounded-lg" />
          <p className="t-muted max-w-2xl leading-relaxed">
            <ShieldCheck className="mr-2 inline size-5 text-[var(--orange)]" />
            Somos parceiros oficiais da Meta e disparamos pela API oficial do WhatsApp Business, seguindo as regras de mensagens da plataforma.
          </p>
        </div>
      </Section>
      <FinalCta />
    </>
  );
}
