import type { Metadata } from "next";
import { FaqSection, FinalCta, PageHeader, PricingSection } from "../../_v2/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Preços dos pacotes de disparo · Fuzil Disparador",
  description: "Seis pacotes de disparo no WhatsApp: de R$ 0,30 (Avulso, a partir de 1.000) a R$ 0,16 por disparo (Máximo, a partir de 100.000). Economia de até 47%.",
  alternates: { canonical: "/precos" },
};

export default function PricesPage() {
  return (
    <>
      <PageHeader eyebrow="Preços" title={<>Quanto maior o volume, <span className="t-fire">menor o preço.</span></>} intro="Escolha o pacote para ver os detalhes. Economia de até 47% em relação ao Avulso, e todo pacote vale por 1 mês a partir da contratação." />
      <PricingSection bare />
      <FaqSection />
      <FinalCta />
    </>
  );
}
