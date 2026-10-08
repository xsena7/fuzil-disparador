"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import type { FormState } from "@/app/actions/auth";

export function StepSendForm({ action, defaultRate, skipRed, insufficient }: { action: (s: FormState, f: FormData) => Promise<FormState>; defaultRate: number; skipRed: boolean; insufficient: boolean }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [schedule, setSchedule] = useState(false);
  // datetime-local vem no fuso do navegador; enviamos em ISO (UTC) para o servidor
  const [iso, setIso] = useState("");
  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <Field label="Velocidade por número (mensagens/segundo)" hint="0 = automático (20/s por número). A Cloud API aguenta até 80/s por número.">
        <Input type="number" name="rate" min={0} max={80} defaultValue={defaultRate} />
      </Field>
      <label className="flex items-center gap-2"><input type="checkbox" name="skipRed" defaultChecked={skipRed} /> Não usar números com qualidade vermelha</label>
      {insufficient && <label className="flex items-center gap-2 text-amber-700"><input type="checkbox" name="ignoreBalance" /> Enviar até acabar o saldo (pausa automaticamente)</label>}
      <label className="flex items-center gap-2"><input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} /> Agendar envio</label>
      {schedule && (
        <Field label="Data e hora">
          <Input type="datetime-local" required onChange={(e) => setIso(e.target.value ? new Date(e.target.value).toISOString() : "")} />
          <input type="hidden" name="scheduledAt" value={schedule ? iso : ""} />
        </Field>
      )}
      <div className="flex items-center gap-3">
        <Button disabled={pending}>{pending ? "Iniciando..." : schedule ? "Agendar campanha" : "Iniciar disparo agora"}</Button>
        {state?.error && <span className="text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
