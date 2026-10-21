"use client";

import { useActionState, useState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import type { FormState } from "@/app/actions/auth";

export type TemplateOption = { key: string; name: string; language: string; usable: number; total: number; body: string; notApt: string[] };

export function StepTemplate({
  action,
  name,
  groups,
  optionsByGroup,
  groupId,
  templateKey,
  locked,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  name: string;
  groups: Array<{ id: string; name: string }>;
  optionsByGroup: Record<string, TemplateOption[]>;
  groupId: string;
  templateKey: string;
  locked: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [group, setGroup] = useState(groupId || groups[0]?.id || "");
  const [tpl, setTpl] = useState(templateKey);
  const options = optionsByGroup[group] ?? [];
  const selected = options.find((o) => o.key === tpl);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <h2 className="text-xl font-semibold drop-shadow-[0_0_14px_rgba(255,149,0,0.35)]">Template</h2>
      <Field label="Nome da campanha"><Input name="name" defaultValue={name} disabled={locked} /></Field>
      <Field label="Grupo de BM" hint="Os envios serão distribuídos entre todos os números aptos das BMs desse grupo.">
        <Select name="groupId" value={group} onChange={(e) => { setGroup(e.target.value); setTpl(""); }} disabled={locked}>
          {groups.length === 0 && <option value="">Crie um grupo de BM primeiro</option>}
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
      </Field>
      <Field label="Template aprovado (somente Utilidade)" hint="Mostra só templates aprovados como UTILIDADE em pelo menos uma WABA do grupo.">
        <Select name="template" value={tpl} onChange={(e) => setTpl(e.target.value)} disabled={locked}>
          <option value="">Selecione...</option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>{o.name} · {o.language} · apto em {o.usable}/{o.total} WABAs</option>
          ))}
        </Select>
      </Field>
      {selected && (
        <Card className="p-4">
          <div className="mb-1 text-xs text-zinc-500">Corpo</div>
          <p className="whitespace-pre-wrap">{selected.body}</p>
          {selected.notApt.length > 0 && (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-medium">Não apto em {selected.notApt.length} WABA(s) do grupo. Os números dessas contas ficam de fora da campanha:</p>
              <ul className="mt-1 list-disc pl-5">
                {selected.notApt.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}
      {locked && <input type="hidden" name="groupId" value={group} />}
      <div className="flex items-center gap-3">
        <Button disabled={pending || locked}>{pending ? "Salvando..." : "Continuar"}</Button>
        {state?.error && <span className="text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
