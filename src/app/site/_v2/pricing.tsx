"use client";

// Pacotes com seleção: o card escolhido mostra o resumo e o botão já leva a mensagem do pacote para o WhatsApp oficial.
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

export type V2Package = { name: string; from: string; price: string; off: number | null; best?: boolean; href: string };

export function Pricing({ packages }: { packages: V2Package[] }) {
  const [sel, setSel] = useState(packages.findIndex((p) => p.best));
  const p = packages[sel] ?? packages[0];
  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div role="radiogroup" aria-label="Escolha o pacote" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {packages.map((pk, k) => {
          const on = k === sel;
          return (
            <button
              key={pk.name}
              role="radio"
              aria-checked={on}
              onClick={() => setSel(k)}
              className={`spot relative rounded-2xl border p-4 text-left transition-all duration-300 sm:p-5 ${on ? "border-[#ff6a00]/70 bg-[#ff6a00]/[0.07] shadow-[0_20px_50px_-20px_rgba(255,90,20,0.55)]" : "border-white/10 bg-white/[0.025] hover:border-white/20"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{pk.name}</span>
                {pk.best ? <span className="rounded-full bg-gradient-to-r from-[#ff7a00] to-[#ff303d] whitespace-nowrap px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"><span className="sm:hidden">Top</span><span className="hidden sm:inline">Melhor preço</span></span> : pk.off ? <span className="text-xs font-semibold text-emerald-300">-{pk.off}%</span> : null}
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-xs text-[var(--gray)]">R$</span>
                <span className="t-title text-3xl tabular-nums sm:text-4xl">{pk.price}</span>
              </div>
              <div className="mt-1 text-xs text-[var(--gray)]">por disparo · mín. {pk.from}</div>
            </button>
          );
        })}
      </div>

      <div className="surface-solid relative flex flex-col p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-[#ff6a00]/20 blur-3xl" />
        <div className="eyebrow">Pacote selecionado</div>
        <div key={p.name} className="motion-safe:animate-[v2-in_.45s_cubic-bezier(.2,.7,.2,1)]">
          <div className="t-title mt-4 text-4xl">{p.name}</div>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-[var(--gray)]">R$</span>
            <span className="t-display text-6xl tabular-nums">{p.price}</span>
            <span className="text-[var(--gray)]">por disparo</span>
          </div>
          <ul className="mt-6 space-y-3 text-[15px]">
            <li className="flex items-center gap-3"><Check className="size-4 shrink-0 text-[var(--orange)]" /> <span>A partir de <b className="font-semibold">{p.from} disparos</b></span></li>
            <li className="flex items-center gap-3"><Check className="size-4 shrink-0 text-[var(--orange)]" /> <span>{p.off ? <>Economia de <b className="font-semibold">{p.off}%</b> em relação ao Avulso</> : "Preço de referência dos pacotes"}</span></li>
            <li className="flex items-center gap-3"><Check className="size-4 shrink-0 text-[var(--orange)]" /> Vale por 1 mês a partir da contratação</li>
            <li className="flex items-center gap-3"><Check className="size-4 shrink-0 text-[var(--orange)]" /> Relatório de entregas, leituras e cliques</li>
          </ul>
        </div>
        <a href={p.href} target="_blank" rel="noreferrer" data-px="AddToCart" data-px-name={`Pacote ${p.name}`} className="btn-fire mt-8 w-full">
          Quero o pacote {p.name} <ArrowRight className="arrow size-4" />
        </a>
        <p className="mt-3 text-center text-xs text-[var(--gray)]">Você fala direto com a nossa equipe no WhatsApp.</p>
      </div>
      <style>{`@keyframes v2-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
