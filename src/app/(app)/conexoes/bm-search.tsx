"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { groupDot, groupTag } from "@/lib/group-colors";

export type BmSearchItem = { id: string; name: string; metaId: string | null; phones: string[]; groups: Array<{ name: string; color: string | null }>; tone: "red" | "amber" | "green" };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca de BM em Conexões: filtra enquanto digita (nome, BM ID ou número) e abre a gaveta da BM escolhida. */
export function BmSearch({ items }: { items: BmSearchItem[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const results = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return [];
    const digits = t.replace(/\D/g, "");
    return items.filter((b) => norm(b.name).includes(t) || (digits.length >= 4 && (b.metaId?.includes(digits) || b.phones.some((p) => p.includes(digits))))).slice(0, 12);
  }, [q, items]);

  const go = (id: string) => {
    const el = document.getElementById(`bm-${id}`) as HTMLDetailsElement | null;
    if (!el) return;
    // Abre a seção do grupo e a gaveta da BM, rola até ela e pisca
    const section = el.parentElement?.closest("details") as HTMLDetailsElement | null;
    if (section) section.open = true;
    el.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-orange-400");
    setTimeout(() => el.classList.remove("ring-2", "ring-orange-400"), 2200);
    setOpen(false);
  };

  return (
    <div ref={box} className="relative w-full sm:w-80">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && results[0]) go(results[0].id); if (e.key === "Escape") setOpen(false); }}
        placeholder="Pesquisar BM pelo nome, BM ID ou número"
        className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-8 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      />
      {q && (
        <button type="button" onClick={() => { setQ(""); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-700" aria-label="Limpar">
          <X className="size-3.5" />
        </button>
      )}
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lift">
          {results.length === 0 && <div className="px-3 py-2.5 text-sm text-zinc-500">Nenhuma BM com &quot;{q.trim()}&quot;</div>}
          {results.map((b) => (
            <button key={b.id} type="button" onClick={() => go(b.id)} className="flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left hover:bg-orange-50">
              <span className="flex items-center gap-2">
                <span className={`size-2 shrink-0 rounded-full ${b.tone === "red" ? "bg-red-500" : b.tone === "amber" ? "bg-amber-400" : "bg-emerald-500"}`} />
                <span className="truncate text-sm font-semibold text-zinc-900">{b.name}</span>
              </span>
              <span className="flex flex-wrap items-center gap-1.5 pl-4">
                {b.groups.length ? (
                  b.groups.map((g) => (
                    <span key={g.name} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${groupTag(g.color)}`}>
                      <span className={`size-1.5 rounded-full ${groupDot(g.color)}`} />
                      {g.name}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-zinc-400">sem grupo</span>
                )}
                {b.metaId && <span className="text-[11px] text-zinc-400">ID {b.metaId}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
