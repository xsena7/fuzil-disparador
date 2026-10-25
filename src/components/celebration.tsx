"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

const EVENT = "fuzil:celebrate";

/** Dispara a comemoração (confete + som). Ex.: celebrate("BM conectada!", "Já pode disparar por ela"). */
export function celebrate(title: string, text?: string, opts: { sticky?: boolean } = {}) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT, { detail: { title, text, sticky: opts.sticky } }));
}

/**
 * "Subiu de nível" no estilo videogame 8 bits (onda quadrada, notas rápidas subindo e um acorde final).
 * Melodia própria do Fuzil, gerada pelo navegador (sem arquivo de áudio).
 */
function playChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    // Alguns navegadores deixam o áudio suspenso até liberar: tenta liberar antes de tocar
    void ctx.resume?.().catch(() => undefined);
    const master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);
    const note = (freq: number, start: number, dur: number, slideTo?: number) => {
      const t = ctx.currentTime + start;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(1, t);
      g.gain.setValueAtTime(1, t + dur * 0.85);
      g.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    };
    // Escadinha rápida subindo (sol, si, ré, sol, si) e um "tchan" final com brilho subindo
    const steps = [392, 493.88, 587.33, 783.99, 987.77];
    steps.forEach((f, i) => note(f, i * 0.075, 0.07));
    note(1174.66, steps.length * 0.075, 0.12);
    note(1567.98, steps.length * 0.075 + 0.13, 0.32, 2093);
    note(783.99, steps.length * 0.075 + 0.13, 0.32);
    setTimeout(() => ctx.close().catch(() => undefined), 1800);
  } catch {
    // sem som (navegador bloqueou): fica só a animação
  }
}

/** "Game over" estilo 8 bits (notas descendo e um tombo final): usado quando a conexão falha. */
export function playFailChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    // Alguns navegadores deixam o áudio suspenso até liberar: tenta liberar antes de tocar
    void ctx.resume?.().catch(() => undefined);
    const master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);
    const steps = [659.25, 587.33, 523.25, 466.16, 392];
    steps.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.16;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(1, t);
      g.gain.linearRampToValueAtTime(0, t + 0.15);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + 0.16);
    });
    // Tombo final: a nota cai bem grave
    const t = ctx.currentTime + steps.length * 0.16;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.9);
    g.gain.setValueAtTime(1, t);
    g.gain.linearRampToValueAtTime(0, t + 0.9);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.95);
    setTimeout(() => ctx.close().catch(() => undefined), 2500);
  } catch {
    // sem som
  }
}

const COLORS = ["#ff8a1f", "#ef2d56", "#fbbf24", "#10b981", "#38bdf8", "#a78bfa"];

export function CelebrationHost() {
  const [show, setShow] = useState<{ title: string; text?: string; sticky?: boolean; key: number } | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { title: string; text?: string; sticky?: boolean };
      setShow({ ...d, key: Date.now() });
      playChime();
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  useEffect(() => {
    if (!show) return;
    // Comemoração "sticky" (conexão concluída) fica até o clique, como uma tela de carregamento concluído
    if (show.sticky) return;
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
      {show.sticky && <div className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/80">Clique em qualquer lugar para continuar</div>}
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
