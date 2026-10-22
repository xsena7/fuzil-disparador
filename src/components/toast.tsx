"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; title: string; message?: string };

const EVENT = "fuzil:toast";
const TITLES: Record<ToastKind, string> = { success: "Prontinho!", error: "Opa, não deu certo", info: "Aviso" };

/** Mostra um aviso no canto direito da tela (de qualquer componente do painel). */
export function toast(kind: ToastKind, message?: string, title?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { kind, message, title: title ?? TITLES[kind] } }));
}

/** Resposta de server action ({ ok } ou { error }) vira aviso. Texto "true" vira a mensagem padrão. */
export function toastResult(r: unknown, okText = "Tudo salvo.") {
  if (!r || typeof r !== "object") return;
  const o = r as { ok?: unknown; error?: unknown };
  if (o.error) toast("error", String(o.error));
  else if (o.ok) toast("success", typeof o.ok === "string" ? o.ok : okText);
}

const STYLE: Record<ToastKind, { icon: typeof Info; ring: string; iconCls: string; bar: string }> = {
  success: { icon: CheckCircle2, ring: "ring-emerald-200", iconCls: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" },
  error: { icon: AlertTriangle, ring: "ring-rose-200", iconCls: "bg-rose-50 text-rose-600", bar: "bg-rose-500" },
  info: { icon: Info, ring: "ring-orange-200", iconCls: "bg-orange-50 text-orange-600", bar: "bg-brand-gradient" },
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    let seq = 0;
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as Omit<ToastItem, "id">;
      const id = ++seq;
      setItems((list) => [...list.slice(-3), { id, ...d }]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), d.kind === "error" ? 9000 : 5500);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3" aria-live="polite">
      {items.map((t) => {
        const s = STYLE[t.kind];
        const Icon = s.icon;
        return (
          <div key={t.id} className={clsx("toast-in pointer-events-auto relative overflow-hidden rounded-2xl bg-white p-4 pr-10 shadow-xl ring-1", s.ring)}>
            <div className="flex gap-3">
              <span className={clsx("grid size-10 shrink-0 place-items-center rounded-xl", s.iconCls)}><Icon className="size-5" /></span>
              <div className="min-w-0 pt-0.5">
                <div className="font-semibold text-zinc-900">{t.title}</div>
                {t.message && <div className="mt-0.5 whitespace-pre-line break-words text-sm leading-snug text-zinc-600">{t.message}</div>}
              </div>
            </div>
            <button type="button" onClick={() => setItems((list) => list.filter((x) => x.id !== t.id))} className="absolute right-2.5 top-2.5 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Fechar">
              <X className="size-4" />
            </button>
            <span className={clsx("toast-bar absolute bottom-0 left-0 h-1", s.bar)} style={{ animationDuration: t.kind === "error" ? "9s" : "5.5s" }} />
          </div>
        );
      })}
    </div>
  );
}
