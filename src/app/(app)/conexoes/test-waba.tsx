"use client";

import { useState, useTransition } from "react";
import { Loader2, Stethoscope } from "lucide-react";
import { testWabaAction } from "@/app/actions/connections";

/** Botão que confere na Meta se o token guardado dessa conta funciona, e explica o resultado. */
export function TestWaba({ id }: { id: string }) {
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setMsg(await testWabaAction(id)))}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Stethoscope className="size-3.5" />} Testar conexão
      </button>
      {msg && <span className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</span>}
    </div>
  );
}
