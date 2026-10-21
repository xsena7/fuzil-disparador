"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { saveFieldsAction } from "@/app/actions/funnels";
import type { FormField } from "@/lib/funnel-types";
import { Button } from "@/components/ui";

const inp = "rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm";

/** Perguntas do cadastro final (o link que chega no WhatsApp). */
export function FieldsEditor({ funnelId, initial }: { funnelId: string; initial: FormField[] }) {
  const [fields, setFields] = useState(initial.map((f) => ({ ...f, optionsText: (f.options ?? []).join(", ") })));
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const patch = (i: number, p: Partial<(typeof fields)[number]>) => {
    setFields(fields.map((f, j) => (j === i ? { ...f, ...p } : f)));
    setMsg(null);
  };

  return (
    <div className="space-y-2">
      {fields.map((f, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 p-2.5">
          <input value={f.label} onChange={(e) => patch(i, { label: e.target.value })} placeholder="Pergunta" className={`${inp} min-w-0 flex-1`} />
          <select value={f.type} onChange={(e) => patch(i, { type: e.target.value as FormField["type"] })} className={inp}>
            <option value="text">Resposta curta</option>
            <option value="textarea">Resposta longa</option>
            <option value="select">Opções</option>
          </select>
          {f.type === "select" && (
            <input value={f.optionsText} onChange={(e) => patch(i, { optionsText: e.target.value })} placeholder="Opções separadas por vírgula" className={`${inp} w-full sm:w-64`} />
          )}
          <label className="flex items-center gap-1.5 text-xs text-zinc-600">
            <input type="checkbox" checked={Boolean(f.required)} onChange={(e) => patch(i, { required: e.target.checked })} /> Obrigatória
          </label>
          <button type="button" onClick={() => setFields(fields.filter((_, j) => j !== i))} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={() => setFields([...fields, { key: "", label: "", type: "text", required: false, optionsText: "" }])}>
          <Plus className="size-4" /> Pergunta
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveFieldsAction(
                funnelId,
                fields.map(({ optionsText, ...f }) => ({ ...f, options: optionsText.split(",").map((o) => o.trim()).filter(Boolean) })),
              );
              setMsg(res.ok ? { ok: true, text: "Perguntas salvas" } : { text: res.error ?? "Erro ao salvar" });
              if (res.ok) router.refresh();
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Salvar perguntas
        </Button>
        {msg && <span className={msg.ok ? "text-emerald-700" : "text-red-600"}>{msg.text}</span>}
      </div>
    </div>
  );
}
