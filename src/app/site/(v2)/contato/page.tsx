import type { Metadata } from "next";
import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { company, ownerLine } from "@/lib/company";
import { siteWhatsApp } from "../../cta";
import { V2_MSG } from "../../_v2/content";
import { PageHeader } from "../../_v2/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Contato · Fuzil Disparador",
  description: "Fale com a equipe da Fuzil no WhatsApp e faça o orçamento do seu disparo.",
  alternates: { canonical: "/contato" },
};

export default function ContactPage() {
  const c = company();
  const wa = siteWhatsApp(V2_MSG);
  return (
    <>
      <PageHeader eyebrow="Contato" title={<>Vamos falar da sua <span className="t-fire">próxima campanha.</span></>} intro="O jeito mais rápido é pelo WhatsApp: conta o que você vende, o tamanho da lista e a mensagem. A nossa equipe responde com o orçamento." />
      <section className="mx-auto max-w-6xl px-5 pb-28 pt-10">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <a href={wa} target="_blank" rel="noreferrer" data-reveal className="spot group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0e0f13] p-8 sm:p-10">
            <div className="pointer-events-none absolute -bottom-32 -right-20 size-80 rounded-full bg-[radial-gradient(circle,rgba(255,106,0,0.35),transparent_65%)] blur-2xl" />
            <MessageCircle className="size-9 text-[#25D366]" strokeWidth={1.6} />
            <div className="t-title relative mt-8 text-3xl sm:text-4xl">WhatsApp da equipe</div>
            <p className="t-muted relative mt-3 max-w-md">Atendimento direto com quem monta e executa o seu disparo.</p>
            <span className="btn-fire relative mt-8">Fale com nossa equipe no WhatsApp <ArrowRight className="arrow size-4" /></span>
          </a>
          <div data-reveal style={{ ["--d" as string]: "80ms" }} className="surface space-y-5 p-8 text-[15px]">
            {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-3 hover:text-white"><Mail className="size-5 text-[var(--orange)]" /> {c.email}</a>}
            {c.phone && <div className="flex items-center gap-3"><Phone className="size-5 text-[var(--orange)]" /> {c.phone}</div>}
            {c.address && <div className="flex items-start gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-[var(--orange)]" /> {c.address}</div>}
            <p className="t-muted border-t border-white/10 pt-5 text-sm">O {c.brand} é um produto e marca de {ownerLine()}.</p>
          </div>
        </div>
      </section>
    </>
  );
}
