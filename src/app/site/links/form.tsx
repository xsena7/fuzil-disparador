"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, ArrowRight, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { createPublicLinkAction } from "@/app/actions/links";
import { CopyBtn } from "./copy";

const inp = "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[15px] outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

export function CreateLinkForm() {
  const [state, action, pending] = useActionState(createPublicLinkAction, undefined);
  // Campos controlados: se der erro (ex.: senha errada), o que a pessoa digitou continua lá
  const [v, setV] = useState({ name: "", url: "", access: "" });
  const bind = (k: keyof typeof v) => ({ name: k, value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value }) });

  if (state?.code)
    return (
      <div className="rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5 sm:p-7">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-600"><ShieldCheck className="size-4" /> Link criado!</div>
        <h2 className="text-xl font-semibold text-zinc-900">Este é o seu código</h2>
        <p className="mt-1 text-sm text-zinc-500">Cole ele na variável do botão ({"{{1}}"}) na plataforma de disparo.</p>
        <div className="my-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-orange-50 px-5 py-4 ring-1 ring-orange-200">
          <span className="font-mono text-3xl font-bold tracking-wide text-orange-700">{state.code}</span>
          <CopyBtn text={state.code} label="Copiar código" big />
        </div>
        <div className="mb-4 rounded-xl border border-zinc-200 p-3">
          <div className="mb-1 text-xs text-zinc-500">Link completo, para testar antes de disparar</div>
          <div className="flex items-center justify-between gap-2">
            <a href={state.fullUrl} target="_blank" rel="noreferrer" className="truncate text-sm text-sky-700 hover:underline">{state.fullUrl}</a>
            <CopyBtn text={state.fullUrl!} />
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-amber-800"><AlertTriangle className="size-4" /> Guarde este link</div>
          <p className="mb-2 text-xs text-amber-800">É com ele que você troca o destino e vê os cliques depois. Ele só aparece agora.</p>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
            <span className="truncate font-mono text-xs text-zinc-700">{state.manageUrl}</span>
            <CopyBtn text={state.manageUrl!} />
          </div>
        </div>
        <a href="/links" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:underline">Criar outro link <ArrowRight className="size-4" /></a>
      </div>
    );

  return (
    <form action={action} className="rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5 sm:p-7">
      <h2 className="text-xl font-semibold text-zinc-900">Criar link do botão</h2>
      <p className="mb-5 mt-1 text-sm text-zinc-500">Leva menos de um minuto.</p>
      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-700">Nome do link</span>
        <input {...bind("name")} required placeholder="Ex.: Loja do João - outubro" className={inp} />
      </label>
      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-700">Para onde a pessoa vai quando clicar</span>
        <input {...bind("url")} required placeholder="https://seusite.com.br" className={inp} />
      </label>
      <label className="mb-5 block">
        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700"><KeyRound className="size-4 text-zinc-400" /> Senha de acesso</span>
        <input {...bind("access")} type="password" required autoComplete="off" placeholder="A senha que te passaram" className={inp} />
      </label>
      {state?.error && <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{state.error}</p>}
      <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:opacity-90 disabled:opacity-60">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null} Gerar meu código
      </button>
    </form>
  );
}
