"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

export type Reply = { id: string; name: string | null; phone: string; phoneFmt: string; text: string; at: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Quadro "Quem respondeu" com busca ao vivo (nome, número ou o que respondeu). Mostra 10 por vez com rolagem; no PDF sai tudo. */
export function ReplyList({ replies }: { replies: Reply[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return replies;
    const digits = q.replace(/\D/g, "");
    return replies.filter((r) => norm(r.name ?? "").includes(t) || norm(r.text).includes(t) || (digits.length > 0 && r.phone.includes(digits)));
  }, [q, replies]);

  return (
    <>
      <div className="border-t border-zinc-100 px-5 py-3 sm:px-6 print:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Procurar pelo nome, número ou resposta"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-orange-400 focus:bg-white"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Limpar">
              <X className="size-4" />
            </button>
          )}
        </div>
        {q && <p className="mt-1.5 text-xs text-zinc-500">{shown.length ? `${shown.length.toLocaleString("pt-BR")} encontrada${shown.length > 1 ? "s" : ""}` : "Nenhuma resposta com isso. Esse número pode não ter respondido."}</p>}
      </div>
      <div className="max-h-[44rem] overflow-y-auto border-t border-zinc-100 print:max-h-none print:overflow-visible">
        <ul className="divide-y divide-zinc-100">
          {shown.map((x) => (
            <li key={x.id} className="flex gap-3 px-5 py-3 sm:px-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <b className="font-semibold text-zinc-900">{x.name || "Sem nome"}</b>
                  <span className="tabular-nums text-zinc-500">{x.phoneFmt}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-zinc-700">{x.text}</p>
              </div>
              <span className="shrink-0 pt-0.5 text-xs tabular-nums text-zinc-400">{x.at}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
