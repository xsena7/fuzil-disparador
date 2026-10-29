"use client";

import { toast } from "@/components/toast";
import { useActionState, useMemo, useState, useEffect } from "react";
import { Button, Field, Input } from "@/components/ui";
import type { FormState } from "@/app/actions/auth";

const PRESETS = [
  { key: "slow", label: "Devagar", rate: 10, hint: "Lista nova ou BM ainda subindo" },
  { key: "normal", label: "Normal", rate: 30, hint: "BMs com qualidade verde e histórico" },
  { key: "fast", label: "Rápido", rate: 60, hint: "BMs maduras, qualidade alta" },
];

/** 90 min, 2 h 05 min, 1 dia 3 h... (texto curto e exato) */
function fmt(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [d && `${d} dia${d > 1 ? "s" : ""}`, h && `${h} h`, m && `${m} min`, (!d && !h && !m) || sec ? `${sec} s` : ""].filter(Boolean);
  return parts.join(" ");
}

export function StepSendForm({
  action,
  defaultTotal,
  skipRed,
  insufficient,
  pending,
  senders,
  capacity,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  defaultTotal: number | null;
  skipRed: boolean;
  insufficient: boolean;
  /** Mensagens que ainda vão sair */
  pending: number;
  /** Números aptos no rodízio agora */
  senders: number;
  /** Quantas mensagens as BMs ainda aceitam nas próximas 24h (null = sem limite) */
  capacity: number | null;
}) {
  const [state, formAction, busy] = useActionState(action, undefined);
  useEffect(() => { if (state?.error) toast("error", state.error); }, [state]);
  const [schedule, setSchedule] = useState(false);
  const [iso, setIso] = useState("");
  const [total, setTotal] = useState(defaultTotal ?? 30);

  // Mesma conta do servidor: a velocidade total é dividida entre os números aptos
  const est = useMemo(() => {
    if (!senders || !pending) return null;
    const perSender = Math.max(1, Math.ceil(total / senders));
    const effective = perSender * senders;
    const sendSeconds = pending / effective;
    // Nada espera o limite liberar: tudo sai no mesmo envio (o que passar do limite e a Meta recusar vira falha)
    return { effective, seconds: sendSeconds, batches: capacity !== null && pending > capacity ? 2 : 1 };
  }, [total, senders, pending, capacity]);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <div>
        <div className="mb-2 text-sm font-medium text-zinc-700">Velocidade do disparo</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setTotal(p.rate)}
              className={`rounded-xl border p-3 text-left transition ${total === p.rate ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
            >
              <div className="font-semibold">{p.label}</div>
              <div className={`text-lg tabular-nums ${total === p.rate ? "text-white" : "text-zinc-800"}`}>{p.rate}/s</div>
              <div className={`text-xs ${total === p.rate ? "text-zinc-300" : "text-zinc-500"}`}>{p.hint}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Field label="Ou digite a velocidade total (mensagens por segundo)">
            <Input type="number" name="totalRate" min={1} max={300} value={total} onChange={(e) => setTotal(Math.max(1, Math.min(300, Number(e.target.value) || 1)))} />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <div className="text-zinc-500">Números aptos no grupo</div>
            <div className="text-lg font-semibold tabular-nums">{senders}</div>
          </div>
          <div>
            <div className="text-zinc-500">Mensagens a enviar</div>
            <div className="text-lg font-semibold tabular-nums">{pending.toLocaleString("pt-BR")}</div>
          </div>
          <div>
            <div className="text-zinc-500">Por número</div>
            <div className="font-medium tabular-nums">{est ? `${Math.max(1, Math.ceil(total / Math.max(1, senders)))} msg/s` : "—"}</div>
          </div>
          <div>
            <div className="text-zinc-500">Tempo até concluir</div>
            <div className="text-lg font-semibold">{est ? fmt(est.seconds) : "—"}</div>
          </div>
        </div>
        {est && est.batches > 1 && (
          <p className="mt-3 text-amber-700">
            O limite oficial das BMs é {capacity?.toLocaleString("pt-BR")} mensagens por dia, menor que a audiência. O Fuzil tenta mandar tudo mesmo assim (a Meta costuma aceitar um pouco mais); o que ela recusar vira falha e o crédito volta.
          </p>
        )}
        {!senders && <p className="mt-3 text-red-700">Nenhum número apto no grupo. Confira a etapa Template.</p>}
        {est && est.batches === 1 && capacity !== null && pending > capacity * 0.8 && (
          <p className="mt-3 text-amber-700">Isso usa quase todo o limite das BMs hoje. Se quiser ir com mais calma, escolha uma velocidade menor.</p>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Tempo estimado: a velocidade é respeitada, mas a Meta pode atrasar um pouco. Se a Meta recusar por limite, a mensagem vira falha e o envio segue; nada recusado é cobrado.
        </p>
      </div>

      <label className="flex items-center gap-2"><input type="checkbox" name="skipRed" defaultChecked={skipRed} /> Não usar números com qualidade vermelha</label>
      {insufficient && <label className="flex items-center gap-2 text-amber-700"><input type="checkbox" name="ignoreBalance" /> Enviar até acabar o saldo (pausa automaticamente)</label>}
      <label className="flex items-center gap-2"><input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} /> Agendar envio</label>
      {schedule && (
        <Field label="Data e hora (horário de Brasília)" hint={iso ? `Vai começar em ${new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full", timeStyle: "short" })} (Brasília)` : undefined}>
          {/* Sempre no horário de Brasília (UTC−3, sem horário de verão), qualquer que seja o fuso do computador */}
          <Input type="datetime-local" required onChange={(e) => setIso(e.target.value ? new Date(`${e.target.value}:00-03:00`).toISOString() : "")} />
          <input type="hidden" name="scheduledAt" value={schedule ? iso : ""} />
        </Field>
      )}
      <div className="flex items-center gap-3">
        <Button disabled={busy || !senders}>{busy ? "Iniciando..." : schedule ? "Agendar campanha" : "Iniciar disparo agora"}</Button>
        {state?.error && <span className="text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
