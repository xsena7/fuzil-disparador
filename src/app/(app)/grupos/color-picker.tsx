"use client";

import { useState } from "react";
import { GROUP_COLORS, type GroupColor } from "@/lib/group-colors";

/** Escolha da cor da etiqueta do grupo (vai junto no formulário de Salvar). */
export function ColorPicker({ current }: { current?: string | null }) {
  const [value, setValue] = useState<string>(current ?? "");
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-sm font-medium text-zinc-700">Cor do grupo <span className="font-normal text-zinc-500">(aparece nas etiquetas das BMs)</span></div>
      <input type="hidden" name="color" value={value} />
      <div className="flex flex-wrap gap-2">
        {(Object.keys(GROUP_COLORS) as GroupColor[]).map((c) => (
          <button
            key={c}
            type="button"
            title={GROUP_COLORS[c].label}
            onClick={() => setValue(c)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${value === c ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"}`}
          >
            <span className={`size-2.5 rounded-full ${GROUP_COLORS[c].dot}`} />
            {GROUP_COLORS[c].label}
          </button>
        ))}
      </div>
    </div>
  );
}
