"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { addBusinessToGroupAction } from "@/app/actions/groups";

/** Move a BM para outro grupo (ela sai do grupo em que estava: uma BM só fica em um grupo de disparo). */
export function SendToGroup({ businessId, groups }: { businessId: string; groups: Array<{ id: string; name: string }> }) {
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  if (!groups.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <select value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-lg border border-zinc-200 bg-white px-2 py-1">
        <option value="">Mandar para o grupo…</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!target || pending}
        onClick={() =>
          start(async () => {
            const res = await addBusinessToGroupAction(businessId, target);
            const name = groups.find((g) => g.id === target)?.name;
            setMsg(res.ok ? { ok: true, text: `Adicionada em ${name}` } : { text: res.error ?? "Erro" });
          })
        }
        className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1 font-medium text-white disabled:opacity-40"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />} Enviar
      </button>
      {msg && <span className={msg.ok ? "text-emerald-700" : "text-red-600"}>{msg.text}</span>}
    </div>
  );
}
