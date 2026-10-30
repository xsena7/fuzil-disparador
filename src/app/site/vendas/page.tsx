import type { Metadata } from "next";
import { BadgeCheck, Clock, Link2, Mail, ShieldCheck, Zap } from "lucide-react";
import { vitrine } from "@/lib/market";
import { ProductCard } from "./buy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "BMs para disparo · Fuzil Disparador", description: "BMs prontas para disparar pela API oficial do WhatsApp, com entrega automática." };

const STEPS = [
  { icon: Zap, title: "Escolha e pague no Pix", text: "Escolha o tipo e a quantidade. O Pix sai na hora e a sua BM fica separada por 15 minutos." },
  { icon: Mail, title: "Receba no e-mail", text: "Pagou, chegou: o convite de cada BM e um PDF com o passo a passo." },
  { icon: Link2, title: "Conecte e dispare", text: "Aceite o convite, conecte a BM no Fuzil com um clique e dispare com o link do botão funcionando." },
];

const FAQ: Array<[string, string]> = [
  ["Como recebo a BM?", "Por um convite da Meta, no seu e-mail, logo depois que o Pix cai. Você abre o link logado no Facebook que vai ser dono da BM e aceita."],
  ["Preciso usar o Fuzil?", "As BMs com template vêm com o template aprovado do Fuzil, e o link do botão funciona dentro do Fuzil. Para disparar pelo Fuzil, é só criar sua conta depois, com o mesmo e-mail. Para disparar por outra plataforma, o PDF ensina a usar o gerador de links."],
  ["E se o convite não funcionar?", "Você tem 24 horas depois da compra para avisar pelo WhatsApp, e respondemos em até 24 horas. Trocamos a BM se o link do convite não funcionar ou se a conta chegar banida."],
  ["Quanto tempo leva?", "A entrega é automática: chega no seu e-mail em poucos minutos depois do pagamento."],
];

export default async function VendasPage() {
  const products = await vitrine();
  const total = products.reduce((a, p) => a + p.stock, 0);
  return (
    <div className="bg-ink text-zinc-300">
      {/* Herói */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-32 -top-40 size-[34rem] animate-pulse rounded-full bg-orange-500/25 blur-3xl [animation-duration:6s]" />
        <div className="pointer-events-none absolute -right-24 top-20 size-[28rem] animate-pulse rounded-full bg-rose-600/25 blur-3xl [animation-duration:8s]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-16 md:pt-24">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-orange-200 ring-1 ring-white/15">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-emerald-400" /></span>
            {total > 0 ? `${total} BM${total > 1 ? "s" : ""} em estoque agora` : "Estoque sendo reposto"}
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight text-white md:text-6xl">
            BMs prontas para <span className="text-brand-gradient">disparar hoje</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-zinc-400">
            Com template de utilidade aprovado e link do botão funcionando no Fuzil. Pagou no Pix, o convite chega sozinho no seu e-mail.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            {[
              [BadgeCheck, "Template aprovado pela Meta"],
              [Clock, "Entrega automática em minutos"],
              [ShieldCheck, "Troca se chegar banida"],
            ].map(([Icon, t]) => {
              const I = Icon as typeof BadgeCheck;
              return (
                <span key={t as string} className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2 ring-1 ring-white/10">
                  <I className="size-4 text-orange-300" /> {t as string}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* Vitrine */}
      <section id="comprar" className="relative mx-auto max-w-6xl px-5 pb-20">
        {products.length === 0 ? (
          <div className="rounded-3xl bg-white/5 px-6 py-16 text-center ring-1 ring-white/10">
            <div className="text-xl font-semibold text-white">Estoque esgotado</div>
            <p className="mt-2 text-zinc-400">Estamos repondo. Volte em breve.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Como funciona */}
      <section className="border-t border-white/10 bg-black/30">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-bold text-white md:text-3xl">Como funciona</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="group relative rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition hover:-translate-y-1 hover:bg-white/[.08]">
                <span className="absolute right-5 top-4 text-5xl font-black text-white/5 transition group-hover:text-orange-500/20">{i + 1}</span>
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-lg shadow-orange-500/30"><s.icon className="size-5" /></span>
                <div className="mt-4 font-semibold text-white">{s.title}</div>
                <p className="mt-1.5 text-sm text-zinc-400">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perguntas */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="text-2xl font-bold text-white md:text-3xl">Perguntas frequentes</h2>
        <div className="mt-6 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl bg-white/5 px-5 py-4 ring-1 ring-white/10 open:bg-white/[.08]">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-white [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-orange-300 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-zinc-400">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
