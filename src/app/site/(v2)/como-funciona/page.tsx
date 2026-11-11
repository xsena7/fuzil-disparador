import type { Metadata } from "next";
import { Diffs, FinalCta, Modes, PageHeader, ProcessSection } from "../../_v2/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Como funciona o disparo · Fuzil Disparador",
  description: "Você envia a lista e a mensagem, nossa equipe higieniza, organiza e dispara pela API oficial do WhatsApp. Relatório ao vivo e só paga o que sair.",
  alternates: { canonical: "/como-funciona" },
};

export default function HowPage() {
  return (
    <>
      <PageHeader eyebrow="Como funciona" title={<>Você envia a lista. <span className="t-fire">A gente cuida do disparo.</span></>} intro="Da contratação ao relatório final, a operação é toda da nossa equipe. Você não precisa de conta na Meta, número ou sistema." />
      <ProcessSection bare />
      <Modes />
      <Diffs />
      <FinalCta />
    </>
  );
}
