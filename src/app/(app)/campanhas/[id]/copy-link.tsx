"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "@/components/toast";

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 truncate rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 ring-1 ring-zinc-200">{url}</code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setDone(true);
          toast("success", "Link copiado! Agora é só mandar para o cliente.");
          setTimeout(() => setDone(false), 1800);
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
      >
        {done ? <Check className="size-4" /> : <Copy className="size-4" />} Copiar link
      </button>
    </div>
  );
}
