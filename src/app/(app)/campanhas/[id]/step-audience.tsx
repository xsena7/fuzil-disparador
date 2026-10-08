"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, CheckCircle2 } from "lucide-react";
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

  async function upload(file: File) {
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
      <button
        type="button"
        disabled={busy || locked}
        onClick={() => input.current?.click()}
        className="flex w-full max-w-xl items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-left hover:bg-zinc-50 disabled:opacity-60"
      >
        <FileSpreadsheet className="size-8 text-emerald-600" />
        <div className="flex-1">
          <div className="font-medium">{busy ? "Processando planilha..." : fileName ?? "Selecionar planilha (CSV)"}</div>
          <div className="text-xs text-zinc-500">{fileName ? "Clique para substituir esta planilha e recalcular a audiência." : "Colunas reconhecidas: nome, telefone/celular/whatsapp, DDI, e-mail. Outras colunas viram variáveis."}</div>
        </div>
        {fileName && <CheckCircle2 className="size-5 text-emerald-600" />}
      </button>
      <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {error && <p className="text-red-600">{error}</p>}

      {stats && (
        <>
          <div className="grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          {!locked && <LinkButton href={`/campanhas/${campaignId}?etapa=envio`}>Continuar</LinkButton>}
        </>
      )}
    </div>
  );
}
