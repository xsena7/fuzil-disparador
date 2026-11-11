import type { Metadata } from "next";
import { FinalCta, PageHeader, Solutions } from "../../_v2/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Soluções de disparo no WhatsApp · Fuzil Disparador",
  description: "Disparo em massa para promoções, lançamentos, avisos, lembretes, cobranças, comunicação com clientes, financeiras e bets autorizadas.",
  alternates: { canonical: "/solucoes" },
};

export default function SolutionsPage() {
  return (
    <>
      <PageHeader eyebrow="Soluções" title={<>Para cada mensagem, <span className="t-fire">uma operação pronta.</span></>} intro="Atendemos qualquer negócio que fale com a própria base de clientes. Se o seu caso não está aqui, conta pra gente no WhatsApp." />
      <Solutions bare />
      <FinalCta />
    </>
  );
}
