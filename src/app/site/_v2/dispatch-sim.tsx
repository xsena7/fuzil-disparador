"use client";

// Simulação ilustrativa (sem dados reais): uma mensagem saindo para vários contatos e mudando de status.
import { useEffect, useState } from "react";
import { Check, CheckCheck } from "lucide-react";

const ROWS = 6;
const ROW_H = 52;
const H = ROWS * ROW_H;
const STEPS = ROWS + 5; // tempo até todos lerem, depois recomeça

const path = (i: number) => {
  const y = i * ROW_H + ROW_H / 2;
  return `M0 ${H / 2} C 60 ${H / 2}, 60 ${y}, 120 ${y}`;
};

export function DispatchSim() {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(STEPS);
      return;
    }
    const id = setInterval(() => setT((v) => (v + 1) % (STEPS + 3)), 850);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="surface-solid relative p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 font-medium text-white/80">
          <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--orange)] opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-[var(--orange)]" /></span>
          Disparo em andamento
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--gray)]">Simulação ilustrativa</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_56px_minmax(0,1.1fr)] items-center gap-0 sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1.1fr)]">
        {/* Mensagem */}
        <div className="rounded-2xl bg-[#0f1115] p-3 ring-1 ring-white/10">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--gray)]">Sua mensagem</div>
          <div className="rounded-xl rounded-tl-sm bg-[#1f2c33] p-2.5 text-[12px] leading-snug text-white/90">
            Olá, <span className="text-[#ffb27a]">{"{nome}"}</span>! A oferta que você pediu chegou. Toque abaixo para ver.
            <div className="mt-2 border-t border-white/10 pt-1.5 text-center text-[11px] font-medium text-sky-300">Ver oferta</div>
          </div>
        </div>
        {/* Linhas */}
        <svg viewBox={`0 0 120 ${H}`} preserveAspectRatio="none" className="h-[312px] w-full" aria-hidden>
          <defs>
            <linearGradient id="v2line" x1="0" x2="1">
              <stop offset="0" stopColor="#ff6a00" stopOpacity="0.8" />
              <stop offset="1" stopColor="#ff303d" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {Array.from({ length: ROWS }, (_, i) => (
            <path key={i} d={path(i)} fill="none" stroke="url(#v2line)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity={t >= i ? 1 : 0.25} style={{ transition: "opacity .6s" }} />
          ))}
          {Array.from({ length: ROWS }, (_, i) =>
            t === i || t === i + 1 ? (
              <circle key={`${i}-${t}`} r="3" fill="#ff8a3d">
                <animateMotion dur="0.85s" repeatCount="1" fill="freeze" path={path(i)} />
              </circle>
            ) : null,
          )}
        </svg>
        {/* Contatos */}
        <ul className="space-y-0">
          {Array.from({ length: ROWS }, (_, i) => {
            const phase = t - i; // <1 aguardando, 1-2 enviada, 3 entregue, >=4 lida
            const status = phase < 1 ? "wait" : phase < 3 ? "sent" : phase < 4 ? "delivered" : "read";
            return (
              <li key={i} className="flex h-[52px] items-center gap-2.5">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors duration-500 ${status === "wait" ? "bg-white/5 text-white/30" : "bg-gradient-to-br from-[#2a2d35] to-[#1b1d22] text-white/80 ring-1 ring-white/10"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-[12px] font-medium transition-colors duration-500 ${status === "wait" ? "text-white/30" : "text-white/85"}`}>Contato {String(i + 1).padStart(2, "0")}</div>
                  <div className="text-[11px] text-[var(--gray)]">
                    {status === "wait" ? "na fila" : status === "sent" ? "enviada" : status === "delivered" ? "entregue" : "lida"}
                  </div>
                </div>
                <span className="w-4 shrink-0">
                  {status === "sent" && <Check className="size-4 text-white/50" />}
                  {status === "delivered" && <CheckCheck className="size-4 text-white/60" />}
                  {status === "read" && <CheckCheck className="size-4 text-sky-400" />}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
