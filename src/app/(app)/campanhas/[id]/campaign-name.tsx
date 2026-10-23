"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { renameCampaignAction } from "@/app/actions/campaigns";
import { toast } from "@/components/toast";

/** Nome da campanha no topo: clica no lápis, edita e salva (o relatório do cliente pega o nome novo). */
export function CampaignName({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, start] = useTransition();
  const router = useRouter();
  const save = () =>
    start(async () => {
      const r = await renameCampaignAction(id, value);
      if (r.error) return toast("error", r.error);
      toast("success", "Nome salvo! O relatório do cliente já mostra o nome novo.");
      setEditing(false);
      router.refresh();
    });
  if (!editing)
    return (
      <button type="button" onClick={() => setEditing(true)} className="group flex items-center gap-1.5 rounded-lg px-1 font-semibold hover:bg-orange-50" title="Renomear a campanha">
        {name}
        <Pencil className="size-3.5 text-zinc-400 group-hover:text-orange-600" />
      </button>
    );
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input
        autoFocus
        value={value}
        maxLength={120}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && (setValue(name), setEditing(false))}
        className="w-64 rounded-lg border border-orange-300 px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
      />
      <button disabled={pending} className="rounded-lg bg-brand-gradient p-1.5 text-white disabled:opacity-50" title="Salvar"><Check className="size-4" /></button>
      <button type="button" onClick={() => (setValue(name), setEditing(false))} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100" title="Cancelar"><X className="size-4" /></button>
    </form>
  );
}
