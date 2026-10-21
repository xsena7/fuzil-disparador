"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Download, Loader2, XCircle } from "lucide-react";
import { hygieneAction, type HygieneState } from "@/app/actions/hygiene";
import type { HygieneResult } from "@/lib/hygiene";
import { Button, Card, Textarea } from "@/components/ui";

/** Baixa uma lista de números em CSV (um por linha). */
function download(name: string, lines: string[]) {
  const blob = new Blob([`telefone\n${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function Hygiene() {
  const [state, action, pending] = useActionState<HygieneState, FormData>(hygieneAction, undefined);
  const [text, setText] = useState("");
  const ok = state && !("error" in state && state.error) ? (state as HygieneResult) : null;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form action={action} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Cole os números (um por linha)</label>
            <Textarea name="numbers" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"11 99999-8888\n5511988887777"} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">ou envie uma planilha (CSV, TXT ou Excel)</label>
            <input type="file" name="file" accept=".csv,.txt,.tsv,.xlsx,.xlsm" className="text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <Button disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Checar lista
            </Button>
            <span className="text-xs text-zinc-500">Até 3.000 números por vez. A checagem leva alguns segundos a cada 100.</span>
          </div>
          {state && "error" in state && state.error && <p className="text-red-600">{state.error}</p>}
        </form>
      </Card>

      {ok && (
        <Card className="p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Com WhatsApp" value={ok.valid.length} tone="green" />
            <Stat label="Sem WhatsApp" value={ok.invalid.length} tone="red" />
            <Stat label="Mal formados" value={ok.malformed} tone="gray" />
            <Stat label="Não checados" value={ok.notChecked.length} tone="gray" />
          </div>
          <p className="mt-3 text-xs text-zinc-500">Checado pelo número {ok.sender}. Total de linhas com número: {ok.total.toLocaleString("pt-BR")}.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!ok.valid.length} onClick={() => download("com-whatsapp.csv", ok.valid)}>
              <CheckCircle2 className="size-4" /> Baixar só os que têm WhatsApp
            </Button>
            <Button variant="ghost" disabled={!ok.invalid.length} onClick={() => download("sem-whatsapp.csv", ok.invalid)}>
              <XCircle className="size-4" /> Baixar os que não têm
            </Button>
            {ok.notChecked.length > 0 && (
              <Button variant="ghost" onClick={() => download("nao-checados.csv", ok.notChecked)}>
                <Download className="size-4" /> Baixar não checados
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "green" | "red" | "gray" }) {
  const c = { green: "text-emerald-700", red: "text-red-700", gray: "text-zinc-700" }[tone];
  return (
    <div className="rounded-xl border border-zinc-200 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${c}`}>{value.toLocaleString("pt-BR")}</div>
    </div>
  );
}
