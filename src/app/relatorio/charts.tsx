"use client";

import { useState } from "react";
import clsx from "clsx";

const n = (v: number) => v.toLocaleString("pt-BR");
const pc = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1).replace(".", ",")}%` : "0%");

/** Anel com a % de enviadas (o número que mais importa no relatório). */
export function Ring({ value, total, label }: { value: number; total: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const p = total ? value / total : 0;
  return (
    <div className="relative size-40 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff8a1f" />
            <stop offset="1" stopColor="#ef2d56" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10" />
        {p > 0 && <circle cx="60" cy="60" r={r} fill="none" stroke="url(#ring)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} className="transition-all duration-700" />}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-white">{pc(value, total)}</span>
        <span className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</span>
      </div>
    </div>
  );
}

export type FunnelStep = { key: string; label: string; value: number; hint: string };

/** Funil: do público até quem respondeu. Passe o mouse para ver quanto ficou em cada etapa. */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const [base, setBase] = useState<"total" | "prev">("total");
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, steps[0]?.value ?? 1);
  return (
    <div>
      <div className="mb-4 flex justify-end print:hidden">
        <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-xs font-medium">
          {(["total", "prev"] as const).map((b) => (
            <button key={b} type="button" onClick={() => setBase(b)} className={clsx("rounded-md px-3 py-1.5 transition", base === b ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800")}>
              {b === "total" ? "% do público" : "% da etapa anterior"}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2.5">
        {steps.map((s, i) => {
          const prev = i ? steps[i - 1].value : s.value;
          const lost = Math.max(0, prev - s.value);
          const w = Math.max(0.6, (s.value / max) * 100);
          return (
            <div key={s.key} className="relative" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[10rem_1fr_8rem]">
                <span className="truncate text-sm text-zinc-600">{s.label}</span>
                <div className="order-last col-span-2 h-7 rounded-md bg-zinc-100/70 sm:order-none sm:col-span-1 sm:h-8">
                  <div
                    className={clsx("h-full rounded-md transition-all duration-700", hover === i ? "bg-[#ea580c]" : "bg-[#f97316]")}
                    style={{ width: `${w}%`, opacity: 1 - i * 0.09 }}
                  />
                </div>
                <span className="text-right text-sm tabular-nums">
                  <b className="font-semibold text-zinc-900">{n(s.value)}</b>{" "}
                  <span className="text-zinc-500">{i === 0 ? "" : base === "total" ? pc(s.value, steps[0].value) : pc(s.value, prev)}</span>
                </span>
              </div>
              {hover === i && (
                <div className="pointer-events-none absolute left-0 top-full z-10 mt-1 w-64 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-200 shadow-lg sm:left-[11rem]">
                  <div className="mb-1 font-semibold text-white">{s.label}: {n(s.value)}</div>
                  {i > 0 && <div>{pc(s.value, steps[0].value)} do público · {pc(s.value, prev)} da etapa anterior</div>}
                  {i > 0 && lost > 0 && <div className="text-zinc-400">{n(lost)} ficaram na etapa &quot;{steps[i - 1].label}&quot;</div>}
                  <div className="mt-1 text-zinc-400">{s.hint}</div>
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
    <button type="button" onClick={() => window.print()} className="rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90">
      Salvar em PDF
    </button>
  );
}

/** Texto (chave Pix) com botão de copiar. */
export function PixCopy({ code, label = "Copiar" }: { code: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-zinc-50 px-3 py-2.5 font-mono text-xs text-zinc-600 ring-1 ring-zinc-200">{code}</code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        }}
        className="shrink-0 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 print:hidden"
      >
        {done ? "Copiado!" : label}
      </button>
    </div>
  );
}
