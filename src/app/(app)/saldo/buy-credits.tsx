"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, CheckCircle2, Clock, Copy, Loader2, QrCode, XCircle, Zap } from "lucide-react";
import { buyCreditsAction } from "@/app/actions/credits";
import type { PurchaseStatus } from "@/lib/credit-purchase";
import { celebrate } from "@/components/celebration";

const n = (v: number) => v.toLocaleString("pt-BR");
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Comprar créditos: escolhe o pacote (ou digita), gera o Pix e o saldo entra sozinho quando o pagamento cai. */
export function BuyCredits({ price, packages, min, max, resume }: { price: number; packages: number[]; min: number; max: number; resume: { token: string; status: PurchaseStatus } | null }) {
  const [credits, setCredits] = useState(packages[1] ?? packages[0]);
  const [custom, setCustom] = useState("");
  const [state, action, pending] = useActionState(buyCreditsAction, undefined);
  const [token, setToken] = useState<string | null>(resume?.token ?? null);
  const [st, setSt] = useState<PurchaseStatus | null>(resume?.status ?? null);
  const stRef = useRef(st);
  useEffect(() => {
    stRef.current = st;
  }, [st]);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const chosen = custom ? Number(custom.replace(/\D/g, "")) || 0 : credits;
  const cents = useMemo(() => Math.round(chosen * price * 100), [chosen, price]);
  const invalid = chosen < min || chosen > max || cents < 100;

  // Pix gerado: começa a acompanhar
  useEffect(() => {
    if (state?.token) {
      setToken(state.token);
      setSt(null);
    }
  }, [state]);

  // Pergunta a situação a cada 3s enquanto o Pix está em aberto
  useEffect(() => {
    if (!token) return;
    let alive = true;
    const tick = async () => {
      const r = await fetch(`/api/saldo/recarga/${token}`, { cache: "no-store" }).catch(() => null);
      if (!alive || !r?.ok) return;
      setSt((await r.json()) as PurchaseStatus);
    };
    void tick();
    const t = setInterval(() => {
      if (stRef.current && stRef.current.status !== "PENDING") return;
      void tick();
    }, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [token]);

  // Pagou: comemora uma vez e atualiza o saldo da tela
  const celebrated = useRef<string | null>(resume?.status.status === "PAID" ? resume.token : null);
  useEffect(() => {
    if (st?.status === "PAID" && token && celebrated.current !== token) {
      celebrated.current = token;
      celebrate(`${n(st.credits)} créditos adicionados!`, "Já dá para disparar.");
      router.refresh();
    }
  }, [st, token, router]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const reset = () => {
    setToken(null);
    setSt(null);
  };

  // Pix em andamento / pago / vencido
  if (token) {
    const left = st ? Math.max(0, new Date(st.expiresAt).getTime() - now) : 0;
    const mm = String(Math.floor(left / 60000)).padStart(2, "0");
    const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    if (!st) return <div className="flex items-center gap-2 py-6 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" /> Gerando o Pix...</div>;
    if (st.status === "PAID")
      return (
        <div className="rounded-2xl bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
          <div className="mt-2 text-lg font-bold text-emerald-900">{n(st.credits)} créditos adicionados!</div>
          <p className="mt-1 text-sm text-emerald-800">Pix de {brl(st.amountCents)} confirmado. O saldo já está atualizado.</p>
          <button type="button" onClick={reset} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">Comprar mais</button>
        </div>
      );
    if (st.status !== "PENDING")
      return (
        <div className="rounded-2xl bg-zinc-50 p-6 text-center">
          <XCircle className="mx-auto size-10 text-zinc-400" />
          <div className="mt-2 font-semibold text-zinc-900">Esse Pix venceu</div>
          <p className="mt-1 text-sm text-zinc-600">Nenhum valor foi cobrado. Gere um novo para continuar.</p>
          <button type="button" onClick={reset} className="mt-4 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white">Gerar novo Pix</button>
        </div>
      );
    return (
      <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
        {st.pixQr ? (
          // QR do Pix gerado pelo Mercado Pago (imagem em base64)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`data:image/png;base64,${st.pixQr}`} alt="QR Code do Pix" className="mx-auto size-52 rounded-2xl ring-1 ring-zinc-200" />
        ) : (
          <div className="mx-auto flex size-52 items-center justify-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-200"><QrCode className="size-10 text-zinc-300" /></div>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl font-bold text-zinc-900">{brl(st.amountCents)}</span>
            <span className="text-sm text-zinc-500">· {n(st.credits)} créditos</span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-orange-700"><Clock className="size-3.5" /> {mm}:{ss}</span>
          </div>
          <p className="mt-2 text-sm text-zinc-600">Abra o app do banco, escolha Pix → QR Code (ou Copia e Cola) e pague. Os créditos entram sozinhos, em segundos.</p>
          {st.pixCode && (
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(st.pixCode!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 font-semibold text-white shadow-lg shadow-orange-500/25 md:w-auto"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Código copiado!" : "Copiar Pix copia e cola"}
            </button>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" /> Esperando o pagamento. A tela atualiza sozinha.</span>
            <button type="button" onClick={reset} className="font-medium text-zinc-600 underline-offset-2 hover:underline">Escolher outro valor</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="credits" value={chosen} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {packages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setCredits(p);
              setCustom("");
            }}
            className={clsx(
              "rounded-xl border px-3 py-3 text-left transition",
              !custom && credits === p ? "border-orange-300 bg-orange-50 ring-2 ring-orange-100" : "border-zinc-200 bg-white hover:bg-zinc-50",
            )}
          >
            <div className="text-sm font-bold text-zinc-900">{n(p)}</div>
            <div className="text-xs text-zinc-500">{brl(Math.round(p * price * 100))}</div>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block text-sm font-medium text-zinc-700">
          Outra quantidade
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            placeholder={`mínimo ${n(min)}`}
            className="mt-1 block w-44 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </label>
        <div className="ml-auto text-right">
          <div className="text-xs text-zinc-500">{chosen ? `${n(chosen)} créditos = ${n(chosen)} disparos` : "Escolha a quantidade"}</div>
          <div className="text-2xl font-bold text-zinc-900">{brl(cents)}</div>
        </div>
        <button disabled={pending || invalid} className="inline-flex items-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 font-semibold text-white shadow-lg shadow-orange-500/25 disabled:opacity-50">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} {pending ? "Gerando o Pix..." : "Gerar Pix"}
        </button>
      </div>
      {custom && invalid && chosen > 0 && <p className="mt-2 text-sm text-amber-700">{chosen < min ? `O mínimo é ${n(min)} créditos.` : chosen > max ? `O máximo por Pix é ${n(max)} créditos.` : "O Pix mínimo é de R$ 1,00."}</p>}
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
