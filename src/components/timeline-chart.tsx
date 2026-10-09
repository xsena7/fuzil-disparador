"use client";

import { useState } from "react";

type Point = { bucket: string; sent: number; delivered: number; read: number; clicked: number };
const SERIES = [
  { key: "sent", label: "Enviadas", color: "#2a78d6" },
  { key: "delivered", label: "Entregues", color: "#eb6834" },
  { key: "read", label: "Lidas", color: "#1baf7a" },
  { key: "clicked", label: "Cliques", color: "#eda100" },
] as const;

/** Linhas por hora (enviadas, entregues, lidas, cliques) com tooltip por hora. */
export function TimelineChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return <p className="py-8 text-center text-zinc-500">Ainda sem dados.</p>;
  const W = 760, H = 220, L = 44, R = 80, T = 12, B = 28;
  const max = Math.max(1, ...data.flatMap((d) => SERIES.map((s) => d[s.key])));
  const x = (i: number) => L + (data.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (data.length - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, max / 2, max].map((v) => Math.round(v));
  const fmtHour = (s: string) => new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit" }) + "h";
  const step = Math.max(1, Math.ceil(data.length / 8));
  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-zinc-600">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: s.color }} />{s.label}</span>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolução por hora" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e4e4e7" strokeWidth={1} />
              <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#71717a">{t.toLocaleString("pt-BR")}</text>
            </g>
          ))}
          {data.map((d, i) => i % step === 0 && (
            <text key={d.bucket} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="#71717a">{fmtHour(d.bucket)}</text>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#a1a1aa" strokeDasharray="3 3" />}
          {SERIES.map((s) => {
            const pts = data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ");
            const last = data[data.length - 1];
            return (
              <g key={s.key}>
                <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {data.length <= 3 && data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d[s.key])} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />)}
                {hover !== null && <circle cx={x(hover)} cy={y(data[hover][s.key])} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />}
                <text x={x(data.length - 1) + 6} y={y(last[s.key]) + 3} fontSize={10} fill="#52525b">{s.label}</text>
              </g>
            );
          })}
          {data.map((d, i) => (
            <rect key={d.bucket} x={x(i) - (W - L - R) / Math.max(1, data.length - 1) / 2} y={T} width={(W - L - R) / Math.max(1, data.length - 1)} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
        {h && (
          <div className="pointer-events-none absolute top-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow" style={{ left: `${(x(hover!) / W) * 100}%`, transform: "translateX(-50%)" }}>
            <div className="mb-1 font-medium">{fmtHour(h.bucket)}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: s.color }} />{s.label}<b className="ml-auto pl-3">{h[s.key].toLocaleString("pt-BR")}</b></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
