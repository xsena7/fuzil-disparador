"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyBtn({ text, label = "Copiar", big = false }: { text: string; label?: string; big?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className={
        big
          ? "inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 font-semibold text-white shadow-sm hover:opacity-90"
          : "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-orange-300 hover:bg-orange-50"
      }
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />} {done ? "Copiado!" : label}
    </button>
  );
}
