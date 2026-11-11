"use client";

import { useEffect, useState } from "react";
import { Check, CheckCircle2, Clock, Copy, Loader2, Mail, MessageCircle, XCircle } from "lucide-react";
import type { PublicOrder } from "@/lib/market";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Página do pedido: Pix enquanto espera, e a entrega aparece sozinha quando o pagamento cai. */
export function OrderLive({ token, initial, shopHref }: { token: string; initial: PublicOrder; shopHref: string }) {
  const [o, setO] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const waiting = o.status === "PENDING" || o.status === "PAID";

  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/vendas/pedido/${token}`, { cache: "no-store" }).catch(() => null);
      if (r?.ok) setO(await r.json());
    }, 4000);
    return () => clearInterval(t);
  }, [token, waiting]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, new Date(o.expiresAt).getTime() - now);
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-3xl bg-white p-6 text-zinc-800 shadow-2xl md:p-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-orange-600">Pedido</div>
        <div className="mt-1 text-xl font-bold text-zinc-900">{o.quantity}x {o.product}</div>
        <div className="text-2xl font-bold text-brand-gradient">{brl(o.totalCents)}</div>

        {o.status === "PENDING" && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-zinc-900">Pague com Pix</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 font-semibold tabular-nums text-orange-700"><Clock className="size-3.5" /> {mm}:{ss}</span>
            </div>
            {o.pixQr && (
              // QR do Pix gerado pelo Mercado Pago (imagem em base64)
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`data:image/png;base64,${o.pixQr}`} alt="QR Code do Pix" className="mx-auto mt-4 size-56 rounded-2xl ring-1 ring-zinc-200" />
            )}
            {o.pixCode && (
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(o.pixCode!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/25"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Código copiado!" : "Copiar Pix copia e cola"}
              </button>
            )}
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" /> Esperando o pagamento. A tela atualiza sozinha.</p>
            <p className="mt-1 text-center text-xs text-zinc-400">A BM fica separada para você até o tempo acabar.</p>
          </div>
        )}

        {o.status === "PAID" && (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-center">
            <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
            <div className="mt-2 font-semibold text-emerald-900">Pagamento confirmado!</div>
            <p className="mt-1 text-sm text-emerald-800">Estamos separando seus convites. Eles chegam em instantes no e-mail {o.email}.</p>
          </div>
        )}

        {o.status === "DELIVERED" && (
          <div className="mt-6">
            <div className="rounded-2xl bg-emerald-50 p-5 text-center">
              <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
              <div className="mt-2 font-semibold text-emerald-900">Entregue!</div>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-emerald-800"><Mail className="size-4" /> Mandamos tudo para {o.email}, com o PDF de instruções.</p>
            </div>
            <div className="mt-4 space-y-2">
              {o.invites.map((u, i) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-50">
                  <span className="font-semibold text-zinc-900">Convite da BM {i + 1}</span>
                  <span className="text-orange-600">Abrir</span>
                </a>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">Abra cada convite logado no Facebook que vai ser dono da BM. Cada convite é único: não repasse o link.</p>
          </div>
        )}

        {(o.status === "EXPIRED" || o.status === "CANCELLED") && (
          <div className="mt-6 rounded-2xl bg-zinc-50 p-5 text-center">
            <XCircle className="mx-auto size-10 text-zinc-400" />
            <div className="mt-2 font-semibold text-zinc-900">O tempo para pagar acabou</div>
            <p className="mt-1 text-sm text-zinc-600">A BM voltou para o estoque. Se já pagou, fale com a gente no WhatsApp.</p>
            <a href={shopHref} className="mt-3 inline-block text-sm font-semibold text-orange-600">Fazer um novo pedido</a>
          </div>
        )}

        <a href={o.support} target="_blank" rel="noreferrer" className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
          <MessageCircle className="size-4" /> Problema com a compra? Fale no WhatsApp
        </a>
        <p className="mt-3 text-center text-xs text-zinc-400">Garantia de 24 horas: trocamos se o convite não funcionar ou se a conta chegar banida.</p>
      </div>
    </div>
  );
}
