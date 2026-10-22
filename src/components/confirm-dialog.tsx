"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, HelpCircle, Trash2 } from "lucide-react";

type Ask = { message: string; title?: string; confirmText?: string; danger?: boolean };
type Pending = Ask & { resolve: (ok: boolean) => void };

const EVENT = "fuzil:confirm";

/**
 * Pergunta "tem certeza?" numa janela bonita no meio da tela (no lugar do confirm do navegador).
 * Ex.: if (await confirmDialog("Excluir a campanha X? Não dá pra desfazer.")) ...
 */
export function confirmDialog(message: string, opts: Omit<Ask, "message"> = {}): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, ...opts, resolve } })));
}

/** Separa "Pergunta? Explicação." em título e texto. */
function split(message: string) {
  const i = message.indexOf("?");
  if (i > 0 && i < 160) return { title: message.slice(0, i + 1).trim(), body: message.slice(i + 1).trim().replace(/^\(([\s\S]*)\)$/, "$1") };
  return { title: "Tem certeza?", body: message };
}

export function ConfirmHost() {
  const [ask, setAsk] = useState<Pending | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const on = (e: Event) => setAsk((e as CustomEvent).detail as Pending);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  useEffect(() => {
    if (!ask) return;
    okRef.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  function close(ok: boolean) {
    ask?.resolve(ok);
    setAsk(null);
  }

  if (!ask) return null;
  const { title, body } = ask.title ? { title: ask.title, body: ask.message } : split(ask.message);
  const danger = ask.danger ?? /^(excluir|apagar|remover|cancelar|bloquear|tirar)\b/i.test(title);
  const Icon = danger ? (/^(excluir|apagar|remover)/i.test(title) ? Trash2 : AlertTriangle) : HelpCircle;
  // "Excluir a campanha?" vira o botão "Sim, excluir"
  const verb = title.match(/^(\p{L}+r)\b/iu)?.[1];
  const confirmText = ask.confirmText ?? (verb ? `Sim, ${verb.toLowerCase()}` : "Sim, continuar");
  const lines = body.split("\n").filter((l) => l.trim());

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="dialog-fade absolute inset-0 bg-zinc-950/50 backdrop-blur-[3px]" onClick={() => close(false)} />
      <div className="dialog-pop relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className={clsx("h-1.5", danger ? "bg-gradient-to-r from-rose-500 to-red-600" : "bg-brand-gradient")} />
        <div className="p-6 text-center sm:p-7">
          <div className={clsx("mx-auto mb-4 grid size-14 place-items-center rounded-2xl", danger ? "bg-rose-50 text-rose-600" : "bg-orange-50 text-orange-600")}>
            <Icon className="size-7" />
          </div>
          <h2 className="text-lg font-semibold leading-snug text-zinc-900">{title}</h2>
          {lines.map((l, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-zinc-600">{l}</p>
          ))}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => close(false)} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 font-medium text-zinc-700 transition hover:bg-zinc-50">
              Cancelar
            </button>
            <button
              ref={okRef}
              type="button"
              onClick={() => close(true)}
              className={clsx("rounded-xl px-4 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90", danger ? "bg-rose-600" : "bg-brand-gradient")}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
