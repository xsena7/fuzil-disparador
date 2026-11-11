"use client";

// Efeitos do site novo, todos leves (CSS + um listener) e desligados com prefers-reduced-motion.
import { useEffect, useRef } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Entrada das seções: marca .shown em todo [data-reveal] quando aparece na tela. */
export function RevealRoot() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".v2 [data-reveal]"));
    if (reduced() || !("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("shown"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("shown"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  // Brilho dos cards (.spot) segue o cursor: um listener só para a página toda
  useEffect(() => {
    if (reduced() || !window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".spot");
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - r.left}px`);
        el.style.setProperty("--y", `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}

/**
 * Camadas que reagem ao mouse (--mx/--my de -1 a 1) e ao scroll (--sy em px).
 * Filhos usam: style={{ transform: "translate3d(calc(var(--mx) * 12px), calc(var(--my) * 12px), 0)" }}
 */
export function Parallax({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const tick = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.setProperty("--mx", cx.toFixed(3));
      el.style.setProperty("--my", cy.toFixed(3));
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      el.style.setProperty("--px", `${e.clientX - r.left}px`);
      el.style.setProperty("--py", `${e.clientY - r.top}px`);
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => el.style.setProperty("--sy", `${Math.min(window.scrollY, 1200)}px`);
    if (fine) el.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={ref} className={className} style={{ ["--mx" as string]: 0, ["--my" as string]: 0, ["--sy" as string]: "0px" }}>
      {children}
    </div>
  );
}
