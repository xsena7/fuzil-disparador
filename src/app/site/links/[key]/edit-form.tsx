"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { updatePublicLinkAction } from "@/app/actions/links";

const inp = "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[15px] outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

export function EditLinkForm({ editKey, name, url }: { editKey: string; name: string; url: string }) {
  const [state, action, pending] = useActionState(updatePublicLinkAction.bind(null, editKey), undefined);
  const [v, setV] = useState({ name, url });
  return (
    <form action={action}>
      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-700">Nome do link</span>
        <input name="name" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inp} />
      </label>
      <label className="mb-5 block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-700">Para onde a pessoa vai quando clicar</span>
        <input name="url" required value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} className={inp} />
        <span className="mt-1 block text-xs text-zinc-500">Trocou aqui, já vale para todo mundo que clicar. Não precisa mudar nada no disparo.</span>
      </label>
      {state?.error && <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{state.error}</p>}
      {state?.ok && <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">{state.ok}</p>}
      <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:opacity-90 disabled:opacity-60">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null} Salvar alterações
      </button>
    </form>
  );
}
