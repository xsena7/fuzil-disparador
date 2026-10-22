"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "@/components/toast";

/** Botão de copiar com aviso. */
export function CopyText({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        toast("success", `Copiado: ${text}`);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand-300 hover:bg-brand-50"
    >
      {done ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />} {label ?? "Copiar"}
    </button>
  );
}
