"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { BadgeCheck, Loader2, Minus, MousePointerClick, Plus, X } from "lucide-react";
import { createOrderAction } from "@/app/actions/market-public";
import type { TemplatePreview, VitrineProduct } from "@/lib/market";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Balão do WhatsApp com o template (variáveis aparecem como {{1}}). */
function Bubble({ t }: { t: TemplatePreview }) {
  return (
    <div className="rounded-2xl rounded-tl-sm bg-[#1f2c33] p-3 text-[13px] leading-relaxed text-zinc-100 shadow-xl">
      {t.header && <div className="mb-1 font-semibold">{t.header}</div>}
      <div className="whitespace-pre-line">{t.body}</div>
      {t.footer && <div className="mt-1 text-[11px] text-zinc-400">{t.footer}</div>}
      {t.buttons.map((b) => (
        <div key={b} className="mt-2 border-t border-white/10 pt-2 text-center font-medium text-sky-300">{b}</div>
      ))}
      <div className="mt-1 text-right text-[10px] text-zinc-500">{t.name}</div>
    </div>
  );
}

export function ProductCard({ product: p }: { product: VitrineProduct }) {
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState(0);
  const out = p.stock === 0;
  // Mais de um template no estoque: alterna sozinho na prévia
  useEffect(() => {
    if (p.templates.length < 2) return;
    const t = setInterval(() => setTpl((i) => i + 1), 3500);
    return () => clearInterval(t);
  }, [p.templates.length]);
  const withTemplate = p.kind === "TEMPLATE";
  return (
    <div className={clsx("group relative flex flex-col rounded-3xl bg-gradient-to-b from-white/[.09] to-white/[.03] p-6 ring-1 ring-white/10 transition duration-300", !out && "hover:-translate-y-1 hover:ring-orange-400/50 hover:shadow-2xl hover:shadow-orange-500/10")}>
      <div className="flex items-center justify-between gap-3">
        <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", withTemplate ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-zinc-300")}>
          {withTemplate ? "Com template aprovado" : "Sem template"}
        </span>
        <span className={clsx("inline-flex items-center gap-1.5 text-xs font-medium", out ? "text-zinc-500" : "text-emerald-300")}>
          {!out && <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative size-2 rounded-full bg-emerald-400" /></span>}
          {out ? "Esgotado" : `${p.stock} em estoque`}
        </span>
      </div>
      <h3 className="mt-4 text-xl font-bold text-white">{p.name}</h3>
      {p.description && <p className="mt-1.5 text-sm text-zinc-400">{p.description}</p>}

      {/* Prévia do template: abre acima do aviso, só com o mouse em cima dele, e nunca bloqueia os botões */}
      {withTemplate && p.templates.length > 0 && (
        <div className="group/tpl relative mt-4 self-start" tabIndex={0}>
          <div className="inline-flex cursor-help items-center gap-1.5 rounded-lg bg-orange-500/10 px-2.5 py-1.5 text-xs font-medium text-orange-200 ring-1 ring-orange-400/20 transition group-hover/tpl:bg-orange-500/20 group-focus/tpl:bg-orange-500/20">
            <MousePointerClick className="size-3.5" /> Passe o mouse para ver o template
          </div>
          <div className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-[19rem] max-w-[80vw] translate-y-1 opacity-0 transition duration-200 group-hover/tpl:visible group-hover/tpl:translate-y-0 group-hover/tpl:opacity-100 group-focus/tpl:visible group-focus/tpl:translate-y-0 group-focus/tpl:opacity-100">
            <div className="rounded-2xl bg-[#0b141a] p-3 shadow-2xl ring-1 ring-white/10">
              <Bubble t={p.templates[tpl % p.templates.length]} />
              {p.templates.length > 1 && (
                <div className="mt-2 flex justify-center gap-1.5">
                  {p.templates.map((t, i) => (
                    <span key={t.name + i} className={clsx("size-2 rounded-full", i === tpl % p.templates.length ? "bg-orange-400" : "bg-white/20")} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto pt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-3xl font-bold tabular-nums text-white">{brl(p.priceCents)}</div>
            <div className="text-xs text-zinc-500">por BM</div>
          </div>
          {!out && (
            <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 ring-1 ring-white/10">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex size-8 items-center justify-center rounded-lg text-white hover:bg-white/10" aria-label="Menos"><Minus className="size-4" /></button>
              <span className="w-8 text-center font-semibold tabular-nums text-white">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(p.stock, q + 1))} className="flex size-8 items-center justify-center rounded-lg text-white hover:bg-white/10" aria-label="Mais"><Plus className="size-4" /></button>
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={out}
          onClick={() => setOpen(true)}
          className="mt-4 w-full rounded-2xl bg-brand-gradient px-5 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {out ? "Esgotado" : `Comprar ${qty > 1 ? `${qty} por ${brl(p.priceCents * qty)}` : "agora"}`}
        </button>
      </div>
      {/* Portal: o card usa transform no hover, e um modal fixo dentro dele ficaria preso no card */}
      {open && createPortal(<Checkout product={p} qty={qty} onClose={() => setOpen(false)} />, document.body)}
    </div>
  );
}

function Checkout({ product: p, qty, onClose }: { product: VitrineProduct; qty: number; onClose: () => void }) {
  const [state, action, pending] = useActionState(createOrderAction, undefined);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !pending && onClose()}>
      <form action={action} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-3xl bg-white p-6 text-zinc-800 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100" aria-label="Fechar"><X className="size-5" /></button>
        <input type="hidden" name="productId" value={p.id} />
        <input type="hidden" name="quantity" value={qty} />
        <div className="text-xs font-semibold uppercase tracking-wider text-orange-600">Finalizar compra</div>
        <div className="mt-1 text-xl font-bold text-zinc-900">{qty}x {p.name}</div>
        <div className="mt-1 text-2xl font-bold text-brand-gradient">{brl(p.priceCents * qty)}</div>
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium">Seu nome
            <input name="name" required maxLength={80} className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
          </label>
          <label className="block text-sm font-medium">E-mail (o convite chega aqui)
            <input name="email" type="email" required maxLength={120} className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
          </label>
          <label className="block text-sm font-medium">WhatsApp (opcional)
            <input name="phone" inputMode="tel" maxLength={30} placeholder="(11) 99999-9999" className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
          </label>
        </div>
        <ul className="mt-4 space-y-1.5 text-xs text-zinc-500">
          <li className="flex gap-1.5"><BadgeCheck className="size-4 shrink-0 text-emerald-600" /> A BM fica separada para você por 15 minutos enquanto paga.</li>
          <li className="flex gap-1.5"><BadgeCheck className="size-4 shrink-0 text-emerald-600" /> Garantia de 24h: trocamos se o convite não funcionar ou se a conta chegar banida.</li>
        </ul>
        {state?.error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
        <button disabled={pending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/25 disabled:opacity-60">
          {pending && <Loader2 className="size-4 animate-spin" />} {pending ? "Gerando o Pix..." : "Gerar Pix"}
        </button>
      </form>
    </div>
  );
}
