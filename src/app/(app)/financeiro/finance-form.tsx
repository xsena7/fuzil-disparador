"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Paperclip } from "lucide-react";
import { addFinanceEntryAction, deleteFinanceEntryAction } from "@/app/actions/finance";
import { FINANCE_CATEGORIES, type FinanceKind } from "@/lib/finance";
import { Button, Field, Input, Select } from "@/components/ui";
import { toast, toastResult } from "@/components/toast";
import { confirmDialog } from "@/components/confirm-dialog";

const KINDS: Array<{ kind: FinanceKind; label: string; hint: string; icon: typeof ArrowUpRight; on: string }> = [
  { kind: "EXPENSE", label: "Despesa", hint: "Você pagou", icon: ArrowUpRight, on: "border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-100" },
  { kind: "INCOME", label: "Entrada", hint: "Caiu na sua conta", icon: ArrowDownLeft, on: "border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100" },
  { kind: "SETTLEMENT", label: "Acerto", hint: "Você passou Pix pro sócio", icon: ArrowLeftRight, on: "border-sky-300 bg-sky-50 text-sky-800 ring-2 ring-sky-100" },
];

/** Nova anotação: quem anota é quem pagou/recebeu; data e hora são as de agora. Limpa os campos depois de salvar. */
export function FinanceForm({ others }: { others: Array<{ id: string; name: string }> }) {
  const [kind, setKind] = useState<FinanceKind>("EXPENSE");
  const [state, action, pending] = useActionState(addFinanceEntryAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    toastResult(state);
    if (state?.ok) {
      ref.current?.reset();
      router.refresh();
    }
  }, [state, router]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <div className="grid gap-2 sm:grid-cols-3">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => setKind(k.kind)}
            className={clsx("flex items-center gap-3 rounded-xl border p-3 text-left transition", kind === k.kind ? k.on : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50")}
          >
            <k.icon className="size-5 shrink-0" />
            <span>
              <b className="block text-sm">{k.label}</b>
              <span className="text-xs opacity-80">{k.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        <Field label={kind === "SETTLEMENT" ? "Descrição (opcional)" : "Descrição"}>
          <Input name="description" placeholder={kind === "EXPENSE" ? "Ex.: Compra de 5 BMs" : kind === "INCOME" ? "Ex.: Disparo cliente Ericky" : "Ex.: Pix do acerto de outubro"} required={kind !== "SETTLEMENT"} maxLength={200} />
        </Field>
        <Field label="Valor (R$)">
          <Input name="amount" placeholder="300,00" inputMode="decimal" required />
        </Field>
        {kind === "SETTLEMENT" ? (
          others.length > 1 ? (
            <Field label="Para quem">
              <Select name="toUserId" required defaultValue="">
                <option value="" disabled>Escolha</option>
                {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Para quem"><div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm font-medium">{others[0]?.name ?? "—"}</div></Field>
          )
        ) : (
          <Field label="Categoria">
            <Select name="category" defaultValue="Sem categoria">
              {FINANCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        )}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
        <Paperclip className="size-4" /> Comprovante (opcional, foto ou PDF)
        <input type="file" name="attachment" accept="image/jpeg,image/png,image/webp,application/pdf" className="text-xs" />
      </label>
      <div className="flex items-center gap-3">
        <Button disabled={pending}>{pending ? "Salvando..." : "Anotar"}</Button>
        <span className="text-xs text-zinc-500">A data e a hora são as de agora.</span>
        {state?.error && <span className="text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

/** Apagar (só aparece para quem anotou). */
export function DeleteEntry({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
      onClick={async () => {
        if (!(await confirmDialog("Apagar essa anotação?\nNão dá para desfazer (e ninguém pode editar: se errou, apague e anote de novo)."))) return;
        const r = await deleteFinanceEntryAction(id);
        if (r.error) toast("error", r.error);
        else toast("success", r.ok);
        router.refresh();
      }}
    >
      Apagar
    </button>
  );
}

/** "Já fiz o Pix": anota o acerto com o valor certinho (só para quem deve), com o comprovante do Pix se quiser. */
export function SettleButton({ amount, toUserId, toName }: { amount: string; toUserId: string; toName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addFinanceEntryAction, undefined);
  const router = useRouter();
  useEffect(() => {
    toastResult(state);
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-orange-50">
        Já fiz o Pix
      </button>
    );
  return (
    <form action={action} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-4 text-zinc-800 shadow-lg">
      <input type="hidden" name="kind" value="SETTLEMENT" />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="toUserId" value={toUserId} />
      <div className="text-sm">
        Confirmar o Pix de <b>R$ {amount}</b> para <b>{toName}</b>? O saldo zera.
      </div>
      <label className="flex cursor-pointer flex-col gap-1 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5 font-medium"><Paperclip className="size-3.5" /> Comprovante do Pix (opcional)</span>
        <input type="file" name="attachment" accept="image/jpeg,image/png,image/webp,application/pdf" className="text-xs" />
      </label>
      <div className="flex items-center gap-2">
        <button disabled={pending} className="rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Anotando..." : "Já passei"}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100">Cancelar</button>
        {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
