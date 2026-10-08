"use client";

import { useEffect, useRef } from "react";

/** Brilho laranja suave que acompanha o ponteiro do mouse (só enfeite; não bloqueia cliques). */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Só em computador com mouse, e respeitando quem pediu menos animação
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let x = -1000, y = -1000, frame = 0;
    const paint = () => {
      frame = 0;
      el.style.transform = `translate3d(${x - 200}px, ${y - 200}px, 0)`;
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      el.style.opacity = "1";
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const leave = () => (el.style.opacity = "0");
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] size-[400px] rounded-full opacity-0 transition-opacity duration-300"
      style={{ background: "radial-gradient(circle, rgba(249,115,22,0.16) 0%, rgba(244,63,94,0.06) 40%, transparent 70%)" }}
    />
  );
}
