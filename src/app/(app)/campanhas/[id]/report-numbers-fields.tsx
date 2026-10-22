"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui";

type Key = "total" | "sent" | "read" | "clicked" | "replied";
const FIELDS: Array<{ key: Key; label: string; base?: Key; baseLabel?: string }> = [
  { key: "total", label: "Público" },
  { key: "sent", label: "Enviadas", base: "total", baseLabel: "do público" },
  { key: "read", label: "Lidas", base: "sent", baseLabel: "das enviadas" },
  { key: "clicked", label: "Clicaram", base: "read", baseLabel: "das lidas" },
  { key: "replied", label: "Responderam", base: "read", baseLabel: "das lidas" },
];

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "—");
const fmt = (v: number) => v.toLocaleString("pt-BR");

/** Campos dos números do relatório com a % de cada etapa (a real e a do que você está digitando). */
export function ReportNumbersFields({ real, initial }: { real: Record<Key, number>; initial: Record<Key, number> }) {
  const [v, setV] = useState<Record<Key, string>>(Object.fromEntries(FIELDS.map((f) => [f.key, String(initial[f.key])])) as Record<Key, string>);
  const num = (k: Key) => Number(v[k].replace(/\D/g, "") || 0);
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {FIELDS.map((f) => (
        <Field
          key={f.key}
          label={f.label}
          hint={
            <>
              Real: <b className="font-medium text-zinc-700">{fmt(real[f.key])}</b>
              {f.base && <> · {pct(real[f.key], real[f.base])} {f.baseLabel}</>}
            </>
          }
        >
          <Input name={f.key} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value.replace(/[^\d.]/g, "") })} inputMode="numeric" />
          {f.base && (
            <span className={`mt-1 block text-xs font-semibold ${num(f.key) > num(f.base) ? "text-rose-600" : "text-orange-700"}`}>
              = {pct(num(f.key), num(f.base))} {f.baseLabel}
              {num(f.key) > num(f.base) && " (passou do limite)"}
            </span>
          )}
        </Field>
      ))}
    </div>
  );
}
