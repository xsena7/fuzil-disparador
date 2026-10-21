"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Busca que filtra enquanto digita + escolha do grupo de BM (atualiza a URL, a lista recarrega sozinha). */
export function TemplateFilters({ groups }: { groups: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();

  const go = (next: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) (v ? sp.set(k, v) : sp.delete(k));
    start(() => router.replace(`${pathname}${sp.toString() ? `?${sp}` : ""}`, { scroll: false }));
  };

  // Espera a pessoa parar de digitar um instante antes de buscar
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => go({ q }), 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pelo nome da BM..." className="w-full rounded-lg border border-zinc-200 px-3 py-2" />
        {pending && <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-zinc-400" />}
      </div>
      <select value={params.get("group") ?? ""} onChange={(e) => go({ group: e.target.value })} className="rounded-lg border border-zinc-200 px-3 py-2">
        <option value="">Todos os grupos</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </div>
  );
}
