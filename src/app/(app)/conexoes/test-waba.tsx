"use client";

import { useState, useTransition, useEffect } from "react";
import { Loader2, Stethoscope } from "lucide-react";
import { testWabaAction } from "@/app/actions/connections";
import { toast } from "@/components/toast";

/** Botão que confere na Meta se o token guardado dessa conta funciona, e explica o resultado. */
export function TestWaba({ id }: { id: string }) {
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  useEffect(() => { if (msg) toast(msg.ok ? "success" : "error", msg.text); }, [msg]);
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
      {msg && !msg.ok && <span className="text-red-600">{msg.text}</span>}
    </div>
  );
}
