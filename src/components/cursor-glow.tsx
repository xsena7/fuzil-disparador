"use client";

import { useEffect, useRef } from "react";

// Contorno da setinha padrão do mouse (ponta em 0,0)
const ARROW = "M0 0 L0 17 L4.2 13 L7.2 19.6 L10 18.4 L7.1 12 L12.4 12 Z";
const PAD = 10;

/** Brilho laranja com o formato da setinha, encaixado em volta do ponteiro (só enfeite; não bloqueia cliques). */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Só em computador com mouse, e respeitando quem pediu menos animação
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let x = -100, y = -100, frame = 0, visible = false, lastTarget: Element | null = null;

    // A setinha só aparece quando o cursor é a seta normal (na mãozinha de link ou no "I" de texto o brilho some)
    const isArrow = (t: Element) => {
      const c = getComputedStyle(t).cursor;
      if (c === "default") return true;
      if (c !== "auto") return false;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return false;
      return ![...t.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
    };
    const paint = () => {
      frame = 0;
      el.style.transform = `translate3d(${x - PAD}px, ${y - PAD}px, 0)`;
      el.style.opacity = visible ? "1" : "0";
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target instanceof Element ? e.target : null;
      if (t !== lastTarget) {
        lastTarget = t;
        visible = t ? isArrow(t) : false;
      }
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const leave = () => {
      visible = false;
      el.style.opacity = "0";
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[60] opacity-0 transition-opacity duration-150">
      <svg width={12.4 + PAD * 2} height={19.6 + PAD * 2} viewBox={`${-PAD} ${-PAD} ${12.4 + PAD * 2} ${19.6 + PAD * 2}`} overflow="visible">
        <defs>
          <filter id="fuzil-cursor-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>
        <path d={ARROW} fill="#f97316" stroke="#fb923c" strokeWidth={5} strokeLinejoin="round" opacity={0.55} filter="url(#fuzil-cursor-glow)" />
        <path d={ARROW} fill="none" stroke="#f97316" strokeWidth={2.4} strokeLinejoin="round" opacity={0.9} />
      </svg>
    </div>
  );
}
