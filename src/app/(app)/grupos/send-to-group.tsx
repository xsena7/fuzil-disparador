"use client";

import { useState, useTransition, useEffect } from "react";
import { Loader2, Send } from "lucide-react";
import { addBusinessToGroupAction, moveBusinessToProblemsAction } from "@/app/actions/groups";

const PROBLEMS = "__problems__";
import { toast } from "@/components/toast";

/** Move a BM para outro grupo (ela sai do grupo em que estava: uma BM só fica em um grupo de disparo). */
export function SendToGroup({ businessId, groups }: { businessId: string; groups: Array<{ id: string; name: string; color?: string | null }> }) {
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  useEffect(() => { if (msg) toast(msg.ok ? "success" : "error", msg.text); }, [msg]);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <select value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-lg border border-zinc-200 bg-white px-2 py-1">
        <option value="">Mandar para o grupo…</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
        <option value={PROBLEMS}>⚠️ BMs com problema</option>
      </select>
      <button
        type="button"
        disabled={!target || pending}
        onClick={() =>
          start(async () => {
            const problems = target === PROBLEMS;
            const res = problems ? await moveBusinessToProblemsAction(businessId) : await addBusinessToGroupAction(businessId, target);
            const name = problems ? "BMs com problema" : groups.find((g) => g.id === target)?.name;
            setMsg(res.ok ? { ok: true, text: problems ? "A BM foi para BMs com problema e saiu dos grupos de disparo. Clique em Resolvido quando quiser que ela volte." : `A BM foi para o grupo ${name}.` } : { text: res.error ?? "Erro" });
          })
        }
        className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1 font-medium text-white disabled:opacity-40"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />} Enviar
      </button>
      {msg && !msg.ok && <span className="text-red-600">{msg.text}</span>}
    </div>
  );
}
