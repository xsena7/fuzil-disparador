"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Copy, FileDown } from "lucide-react";

const n = (v: number) => v.toLocaleString("pt-BR");
const pc = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1).replace(".", ",")}%` : "0%");
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Número que sobe até o valor (anima a partir do valor anterior quando a tela atualiza ao vivo). */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    if (reduced()) return setShown(value);
    const start = from.current;
    const t0 = performance.now();
    const dur = start === 0 ? 1100 : 600;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(start + (value - start) * e));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{n(shown)}</span>;
}

/** Anel com a % de enviadas (o número que mais importa no relatório). */
export function Ring({ value, total, label }: { value: number; total: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const p = total ? value / total : 0;
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(p));
    return () => cancelAnimationFrame(id);
  }, [p]);
  return (
    <div className="relative mx-auto size-44 shrink-0 sm:mx-0">
      <div className="glow inset-6 opacity-50" style={{ background: "var(--a)" }} />
      <svg viewBox="0 0 120 120" className="relative size-full -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--a)" }} />
            <stop offset="1" style={{ stopColor: "var(--b)" }} />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
        <circle cx="60" cy="60" r={r - 9} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="1" strokeDasharray="2 4" />
        {p > 0 && (
          <circle cx="60" cy="60" r={r} fill="none" stroke="url(#ring)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${c * drawn} ${c}`} style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.2,.7,.2,1)" }} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="t-num text-4xl text-white">{pc(value, total)}</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--gray)]">{label}</span>
      </div>
    </div>
  );
}

export type FunnelStep = { key: string; label: string; value: number; hint: string };

/** Funil: do público até quem respondeu. Passe o mouse para ver quanto ficou em cada etapa. */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const [base, setBase] = useState<"total" | "prev">("total");
  const [hover, setHover] = useState<number | null>(null);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const max = Math.max(1, steps[0]?.value ?? 1);
  return (
    <div>
      <div className="mb-5 flex justify-end print:hidden">
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-xs font-medium">
          {(["total", "prev"] as const).map((b) => (
            <button key={b} type="button" onClick={() => setBase(b)} className={clsx("rounded-full px-3.5 py-1.5 transition", base === b ? "bg-white text-black" : "text-[var(--gray)] hover:text-white")}>
              {b === "total" ? "% das enviadas" : "% da etapa anterior"}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {steps.map((s, i) => {
          const prev = i ? steps[i - 1].value : s.value;
          const lost = Math.max(0, prev - s.value);
          const w = Math.max(0.8, (s.value / max) * 100);
          return (
            <div key={s.key} className="relative" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[9rem_1fr_9rem]">
                <span className="truncate text-sm text-[var(--gray)]">{s.label}</span>
                <div className="order-last col-span-2 h-9 overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] sm:order-none sm:col-span-1">
                  <div
                    className={clsx("relative h-full rounded-xl bg-fire", hover === i && "brightness-110")}
                    style={{ width: grown ? `${w}%` : "0%", opacity: 1 - i * 0.12, transition: `width 1.1s cubic-bezier(.2,.7,.2,1) ${i * 90}ms`, boxShadow: "0 0 24px -6px var(--a)" }}
                  >
                    <span className="absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-white/25" />
                  </div>
                </div>
                <span className="text-right text-sm tabular-nums">
                  <b className="t-num text-base text-white">{n(s.value)}</b>{" "}
                  <span className="text-[var(--gray)]">{i === 0 ? "" : base === "total" ? pc(s.value, steps[0].value) : pc(s.value, prev)}</span>
                </span>
              </div>
              {hover === i && (
                <div className="pointer-events-none absolute left-0 top-full z-10 mt-1.5 w-64 rounded-xl border border-white/10 bg-[#15171c] px-3.5 py-2.5 text-xs text-zinc-200 shadow-2xl sm:left-[10rem]">
                  <div className="mb-1 font-semibold text-white">{s.label}: {n(s.value)}</div>
                  {i > 0 && <div>{pc(s.value, steps[0].value)} das enviadas · {pc(s.value, prev)} da etapa anterior</div>}
                  {i > 0 && lost > 0 && <div className="text-[var(--gray)]">{n(lost)} ficaram na etapa &quot;{steps[i - 1].label}&quot;</div>}
                  <div className="mt-1 text-[var(--gray)]">{s.hint}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-fire">
      <FileDown className="size-4" /> Salvar em PDF
    </button>
  );
}

/** Texto (chave Pix) com botão de copiar. */
export function PixCopy({ code, label = "Copiar" }: { code: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 font-mono text-sm text-zinc-200">{code}</code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        }}
        className="btn-fire shrink-0 print:hidden"
      >
        {done ? <><Check className="size-4" /> Copiado!</> : <><Copy className="size-4" /> {label}</>}
      </button>
    </div>
  );
}
