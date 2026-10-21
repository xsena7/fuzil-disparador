"use client";

import { useActionState, useEffect } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { answersAction } from "@/app/actions/funnel-public";
import type { FormField } from "@/lib/funnel-types";
import { track } from "../../pixel";

const input = "w-full rounded-none border-0 border-b border-black/25 bg-transparent px-0 py-3 text-base outline-none transition placeholder:text-black/35 focus:border-[var(--c)]";

export function AnswersForm({ token, fields }: { token: string; fields: FormField[] }) {
  const [state, action, pending] = useActionState(answersAction.bind(null, token), undefined);
  useEffect(() => {
    if (state?.ok) track("SubmitApplication");
  }, [state]);

  if (state?.ok)
    return (
      <div className="py-6 text-center">
        <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Cadastro recebido!</h2>
        <p className="mt-2 text-black/55">Nosso time vai analisar suas respostas. O próximo contato será pelo WhatsApp.</p>
      </div>
    );

  return (
    <form action={action} className="space-y-4">
      {fields.map((f) => (
        <label key={f.key} className="block">
          <span className="mb-1.5 block text-sm font-semibold">
            {f.label} {!f.required && <span className="font-normal text-black/40">(opcional)</span>}
          </span>
          {f.type === "textarea" ? (
            <textarea name={f.key} required={f.required} rows={4} className={input} />
          ) : f.type === "select" ? (
            <div className="grid grid-cols-2 gap-2">
              {f.options?.map((o) => (
                <label key={o} className="flex cursor-pointer items-center gap-2 border border-black/15 px-3 py-2.5 has-[:checked]:border-[var(--c)] has-[:checked]:bg-[var(--c)]/5">
                  <input type="radio" name={f.key} value={o} required={f.required} className="accent-[var(--c)]" />
                  {o}
                </label>
              ))}
            </div>
          ) : (
            <input name={f.key} required={f.required} className={input} />
          )}
        </label>
      ))}
      {state?.error && <p className="bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#111] px-4 py-4 text-base font-medium text-white transition hover:bg-[var(--c)] disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : "Enviar cadastro"}
      </button>
    </form>
  );
}
