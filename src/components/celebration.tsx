"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

const EVENT = "fuzil:celebrate";

/** Dispara a comemoração (confete + som). Ex.: celebrate("BM conectada!", "Já pode disparar por ela"). */
export function celebrate(title: string, text?: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT, { detail: { title, text } }));
}

/** "Plim-plim" de vitória gerado pelo navegador (sem arquivo de áudio). */
function playChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // dó, mi, sol, dó
    notes.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (i === notes.length - 1 ? 0.9 : 0.3));
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
    setTimeout(() => ctx.close().catch(() => undefined), 2000);
  } catch {
    // sem som (navegador bloqueou): fica só a animação
  }
}

const COLORS = ["#ff8a1f", "#ef2d56", "#fbbf24", "#10b981", "#38bdf8", "#a78bfa"];

export function CelebrationHost() {
  const [show, setShow] = useState<{ title: string; text?: string; key: number } | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { title: string; text?: string };
      setShow({ ...d, key: Date.now() });
      playChime();
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(null), 3600);
    return () => clearTimeout(t);
  }, [show]);
  if (!show) return null;
  const pieces = Array.from({ length: 90 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    dur: 1.8 + Math.random() * 1.4,
    size: 6 + Math.random() * 8,
    color: COLORS[i % COLORS.length],
    rot: Math.random() * 360,
    round: Math.random() > 0.6,
  }));
  return (
    <div key={show.key} className="fixed inset-0 z-[80] flex cursor-pointer items-center justify-center" onClick={() => setShow(null)} style={{ animation: "dialog-fade .2s ease-out" }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="absolute -top-4 block"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              background: p.color,
              borderRadius: p.round ? 999 : 2,
              transform: `rotate(${p.rot}deg)`,
              animation: `confetti-fall ${p.dur}s cubic-bezier(.2,.6,.4,1) ${p.delay}s forwards`,
            }}
          />
        ))}
      </div>
      <div className="relative flex flex-col items-center rounded-3xl bg-white px-10 py-8 text-center shadow-2xl ring-1 ring-black/5" style={{ animation: "celebrate-pop .5s cubic-bezier(.2,1.4,.4,1)" }}>
        <span className="mb-3 flex size-16 items-center justify-center rounded-full bg-brand-gradient text-white shadow-lg shadow-orange-500/40" style={{ animation: "celebrate-check .6s cubic-bezier(.2,1.6,.4,1) .15s both" }}>
          <CheckCircle2 className="size-9" />
        </span>
        <div className="text-2xl font-bold text-zinc-900">{show.title}</div>
        {show.text && <div className="mt-1 max-w-xs text-sm text-zinc-500">{show.text}</div>}
      </div>
    </div>
  );
}
