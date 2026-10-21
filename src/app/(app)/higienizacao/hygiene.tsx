"use client";

import { useActionState, useRef, useState } from "react";
import clsx from "clsx";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { CheckCircle2, Download, Loader2, XCircle } from "lucide-react";
import { hygieneAction, type HygieneState } from "@/app/actions/hygiene";
import { HYGIENE_MAX } from "@/lib/hygiene-limits";
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
  const [over, setOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Arrastou ou escolheu a planilha: coloca o arquivo no campo e já checa (igual à audiência da campanha)
  const useFile = (f: File) => {
    if (!fileInput.current || !formRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    fileInput.current.files = dt.files;
    setFileName(f.name);
    formRef.current.requestSubmit();
  };
  const ok = state && !("error" in state && state.error) ? (state as HygieneResult) : null;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form ref={formRef} action={action} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Cole os números (um por linha)</label>
            <Textarea name="numbers" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"11 99999-8888\n5511988887777"} />
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => !pending && fileInput.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !pending && fileInput.current?.click()}
            onDragOver={(e) => {
              if (pending) return;
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f && !pending) useFile(f);
            }}
            className={clsx(
              "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition",
              over ? "border-brand-500 bg-orange-50" : "border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50",
              pending && "pointer-events-none opacity-60",
            )}
          >
            {pending ? <Loader2 className="size-9 animate-spin text-brand-500" /> : fileName ? <CheckCircle2 className="size-9 text-emerald-600" /> : <UploadCloud className="size-9 text-zinc-400" />}
            <div className="font-medium">{pending ? "Checando na Meta..." : over ? "Solte a planilha aqui" : fileName || "Arraste a planilha para cá ou clique para escolher"}</div>
            <div className="text-xs text-zinc-500">Excel (.xlsx) ou CSV · a coluna do telefone é reconhecida sozinha</div>
            <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-emerald-700"><FileSpreadsheet className="size-3.5" /> até 5 MB</span>
          </div>
          <input
            ref={fileInput}
            type="file"
            name="file"
            accept=".csv,.txt,.tsv,.xlsx,.xlsm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFileName(f.name);
                formRef.current?.requestSubmit();
              }
            }}
          />
          <div className="flex items-center gap-3">
            <Button disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Checar lista
            </Button>
            <span className="text-xs text-zinc-500">Até {HYGIENE_MAX.toLocaleString("pt-BR")} números por vez; o que passar disso vai para "não checados".</span>
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
          {ok.metaError && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              A Meta recusou a checagem: <b>{ok.metaError}</b>
            </p>
          )}
          {ok.beyondLimit > 0 && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              A planilha tinha mais de {HYGIENE_MAX.toLocaleString("pt-BR")} números. Os {HYGIENE_MAX.toLocaleString("pt-BR")} primeiros foram checados; os {ok.beyondLimit.toLocaleString("pt-BR")} restantes estão no arquivo de não checados. Suba esse arquivo de novo para continuar.
            </p>
          )}
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
