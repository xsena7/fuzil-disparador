"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CheckCircle2, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { LinkButton, Stat } from "@/components/ui";

export type AudienceStats = {
  totalLines: number; valid: number; invalid: number; duplicates: number; optedOut: number; sendable: number;
  alreadyKnown: number; newContacts: number; invalidSamples: string[]; columns: Record<string, string | undefined>;
};

export function StepAudience({ campaignId, fileName, stats, locked }: { campaignId: string; fileName: string | null; stats: AudienceStats | null; locked: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  async function upload(file: File) {
    if (!/\.(csv|txt|tsv|xlsx|xlsm|xls|ods)$/i.test(file.name)) {
      setError("Envie a planilha em Excel (.xlsx) ou CSV.");
      return;
    }
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/campaigns/${campaignId}/audience`, { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError(json.error ?? "Falha ao processar a planilha");
    else router.refresh();
  }

  const left = stats ? stats.invalid + stats.duplicates + stats.optedOut : 0;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Audiência</h2>
      {/* Clique ou arraste a planilha para cá */}
      <div
        role="button"
        tabIndex={0}
        aria-disabled={busy || locked}
        onClick={() => !busy && !locked && input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && !locked && input.current?.click()}
        onDragOver={(e) => {
          if (busy || locked) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !busy && !locked) upload(f);
        }}
        className={clsx(
          "flex w-full max-w-xl cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition",
          over ? "border-brand-500 bg-orange-50" : "border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50",
          (busy || locked) && "pointer-events-none opacity-60",
        )}
      >
        {busy ? <Loader2 className="size-9 animate-spin text-brand-500" /> : fileName ? <CheckCircle2 className="size-9 text-emerald-600" /> : <UploadCloud className="size-9 text-zinc-400" />}
        <div className="font-medium">
          {busy ? "Processando planilha..." : over ? "Solte o arquivo aqui" : fileName ? fileName : "Arraste a planilha para cá ou clique para escolher"}
        </div>
        <div className="text-xs text-zinc-500">
          {fileName ? "Arraste ou clique para trocar a planilha e recalcular a audiência." : "Excel (.xlsx) ou CSV · colunas reconhecidas: nome, telefone/celular/whatsapp, DDI, e-mail. Outras colunas viram variáveis."}
        </div>
        <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-emerald-700"><FileSpreadsheet className="size-3.5" /> Excel ou CSV, até 50 MB</span>
      </div>
      <input
        ref={input}
        type="file"
        accept=".csv,.txt,.tsv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f);
        }}
      />
      {error && <p className="text-red-600">{error}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Aptos ao envio" value={stats.sendable.toLocaleString("pt-BR")} tone="green" />
            <Stat label="Linhas no arquivo" value={stats.totalLines.toLocaleString("pt-BR")} />
            <Stat label="Já cadastrados" value={stats.alreadyKnown.toLocaleString("pt-BR")} />
            <Stat label="Novos contatos" value={stats.newContacts.toLocaleString("pt-BR")} />
          </div>
          <div className="max-w-4xl rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="font-medium">Sua campanha será enviada para <span className="text-brand-600">{stats.sendable.toLocaleString("pt-BR")}</span> contatos</div>
            {left > 0 && (
              <ul className="mt-2 space-y-0.5 text-amber-800">
                {stats.invalid > 0 && <li>{stats.invalid} telefone(s) inválido(s){stats.invalidSamples.length ? `: ${stats.invalidSamples.slice(0, 8).join(", ")}${stats.invalid > 8 ? "..." : ""}` : ""}</li>}
                {stats.duplicates > 0 && <li>{stats.duplicates} duplicado(s) (cada número recebe uma vez só)</li>}
                {stats.optedOut > 0 && <li>{stats.optedOut} descadastrado(s) (pediram para sair)</li>}
              </ul>
            )}
            <p className="mt-2 text-xs text-zinc-500">Coluna de telefone: <b>{stats.columns.phone}</b>{stats.columns.name && <> · nome: <b>{stats.columns.name}</b></>}{stats.columns.ddi && <> · DDI: <b>{stats.columns.ddi}</b></>}</p>
          </div>
          {!locked && <LinkButton href={`/campanhas/${campaignId}?etapa=conteudo`}>Continuar</LinkButton>}
        </>
      )}
    </div>
  );
}
