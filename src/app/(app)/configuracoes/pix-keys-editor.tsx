"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import type { PixKey } from "@/lib/pix-keys";

const newId = () => Math.random().toString(36).slice(2, 10);

/** Lista de chaves Pix (vai como JSON no formulário de cobrança). */
export function PixKeysEditor({ initial }: { initial: PixKey[] }) {
  const [keys, setKeys] = useState<PixKey[]>(initial.length ? initial : [{ id: newId(), key: "", name: "", bank: "" }]);
  const patch = (i: number, p: Partial<PixKey>) => setKeys(keys.map((k, j) => (j === i ? { ...k, ...p } : k)));
  return (
    <div className="space-y-3">
      <input type="hidden" name="pixKeys" value={JSON.stringify(keys)} />
      {keys.map((k, i) => (
        <div key={k.id} className="grid items-end gap-3 rounded-xl border border-zinc-200 p-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <Field label={`Chave Pix ${keys.length > 1 ? i + 1 : ""}`}>
            <Input value={k.key} onChange={(e) => patch(i, { key: e.target.value })} placeholder="CPF, CNPJ, e-mail, celular ou aleatória" autoComplete="off" />
          </Field>
          <Field label="Nome de quem recebe">
            <Input value={k.name} onChange={(e) => patch(i, { name: e.target.value })} maxLength={60} />
          </Field>
          <Field label="Banco">
            <Input value={k.bank} onChange={(e) => patch(i, { bank: e.target.value })} placeholder="Ex.: Nubank" maxLength={40} />
          </Field>
          <Button type="button" variant="ghost" className="mb-0.5 text-red-600" onClick={() => setKeys(keys.filter((_, j) => j !== i))} aria-label="Remover chave">
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={() => setKeys([...keys, { id: newId(), key: "", name: "", bank: "" }])}>
        <Plus className="size-4" /> Outra chave Pix
      </Button>
    </div>
  );
}
