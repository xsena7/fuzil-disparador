import type { Metadata } from "next";
import { Explore, FinalCta, Hero, Proof, ServiceStrip } from "../_v2/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Fuzil Disparador · Sua mensagem. Nossa operação.",
  description: "Disparos em massa no WhatsApp com execução pela equipe da Fuzil, tecnologia própria e organização em cada etapa.",
};

// Página inicial curta: o detalhe de cada assunto fica nas páginas do topo (Como funciona, Soluções, Preços, Sobre, Contato)
export default async function Home() {
  return (
    <>
      <Hero />
      <ServiceStrip />
      <Explore />
      <Proof />
      <div className="h-16 sm:h-24" />
      <FinalCta />
    </>
  );
}
