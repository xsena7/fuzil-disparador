"use client";

// Perguntas frequentes com abrir/fechar animado (grid-rows 0fr → 1fr) e acessível.
import { useId, useState } from "react";
import { Plus } from "lucide-react";

export function Faq({ items }: { items: Array<[string, string]> }) {
  const [open, setOpen] = useState<number | null>(0);
  const id = useId();
  return (
    <div className="divide-y divide-white/10 border-y border-white/10">
      {items.map(([q, a], k) => {
        const on = open === k;
        return (
          <div key={q}>
            <h3>
              <button
                id={`${id}-q${k}`}
                aria-expanded={on}
                aria-controls={`${id}-a${k}`}
                onClick={() => setOpen(on ? null : k)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] font-medium text-white/90 transition-colors hover:text-white"
              >
                {q}
                <span className={`grid size-8 shrink-0 place-items-center rounded-full border border-white/10 transition-transform duration-300 ${on ? "rotate-45 border-[#ff6a00]/50 text-[var(--orange)]" : "text-[var(--gray)]"}`}>
                  <Plus className="size-4" />
                </span>
              </button>
            </h3>
            <div id={`${id}-a${k}`} role="region" aria-labelledby={`${id}-q${k}`} className={`grid transition-[grid-template-rows] duration-400 ease-out ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <p className="t-muted max-w-3xl pb-6 leading-relaxed">{a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
