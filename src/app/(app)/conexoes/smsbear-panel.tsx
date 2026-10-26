"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import clsx from "clsx";
import { Check, CheckCircle2, Copy, Loader2, LogOut, MessageSquareText, RefreshCw, ShoppingCart, Square, Trash2, X, XCircle, Zap } from "lucide-react";
import { buyManualAction, cancelManualAction, clearSmsJobsAction, connectSmsBearAction, deleteSmsJobAction, disconnectSmsBearAction, hideManualAction, startSmsJobAction, stopSmsJobAction, swapManualAction } from "@/app/actions/smsbear";
import { cancelOpensIn } from "@/lib/smsbear-shared";
import { Button, Field, Input } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { toast, toastResult } from "@/components/toast";

type Job = {
  id: string;
  status: "RUNNING" | "DONE" | "FAILED" | "STOPPED";
  step: string;
  attempt: number;
  maxAttempts: number;
  number: string | null;
  stepAt: string;
  spentCents: number;
  bm: string;
  waba: string;
  log: Array<{ at: string; text: string; tone?: "ok" | "bad" | "info" }>;
  error: string | null;
  pendingCancel: number;
};
type Manual = { id: string; number: string; costCents: number; status: "PENDING" | "RECEIVED" | "CANCELLED"; code: string | null; smsText: string | null; createdAt: string };
type State = { connected: boolean; balance?: number | null; price?: { cost: number; stock: number } | null; error?: string | null; jobs?: Job[]; manual?: Manual[] };

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const WAIT_MS = 150_000;

/** Painel do SMSBear em Conexões: conecta a conta, mostra o saldo e registra números BR na WABA sozinho. */
export function SmsBearPanel({ wabas }: { wabas: Array<{ id: string; label: string; name: string }> }) {
  const [st, setSt] = useState<State | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Ao vivo: registro automático rodando ou número manual esperando SMS
  const running = (st?.jobs?.some((j) => j.status === "RUNNING") ?? false) || (st?.manual?.some((m) => m.status === "PENDING") ?? false);

  const load = useCallback(async () => {
    const r = await fetch("/api/smsbear", { cache: "no-store" }).catch(() => null);
    if (r?.ok) setSt((await r.json()) as State);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  // Ao vivo enquanto tem registro rodando; parado, atualiza o saldo de vez em quando
  useEffect(() => {
    const t = setInterval(load, running ? 3000 : 30_000);
    return () => clearInterval(t);
  }, [load, running]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-gradient text-white"><MessageSquareText className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-zinc-900">SMSBear</div>
          <div className="text-xs text-zinc-500">Números BR para WhatsApp, registrados sozinhos</div>
        </div>
      </div>
      <div className="p-4">
        {!st ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" /> Carregando...</div>
        ) : !st.connected ? (
          <Connect onDone={load} />
        ) : (
          <Connected st={st} wabas={wabas} now={now} reload={load} />
        )}
      </div>
    </div>
  );
}

function Connect({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(connectSmsBearAction, undefined);
  useEffect(() => {
    toastResult(state);
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-zinc-600">Conecte a sua conta do SMSBear: no painel do SMSBear, abra a parte de <b>API</b>, copie o <b>token</b> e cole aqui. Ele fica guardado criptografado, só nesta conta.</p>
      <Field label="Token da API do SMSBear">
        <PasswordInput name="token" autoComplete="off" data-lpignore="true" data-1p-ignore="true" />
      </Field>
      <Button disabled={pending} className="w-full">{pending ? "Conferindo..." : "Conectar SMSBear"}</Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function Connected({ st, wabas, now, reload }: { st: State; wabas: Array<{ id: string; label: string; name: string }>; now: number; reload: () => void }) {
  const [wabaId, setWabaId] = useState(wabas[0]?.id ?? "");
  const [state, action, pending] = useActionState(startSmsJobAction, undefined);
  const [busy, start] = useTransition();
  const chosen = wabas.find((w) => w.id === wabaId);
  useEffect(() => {
    toastResult(state);
    if (state?.ok) reload();
  }, [state, reload]);
  const jobs = st.jobs ?? [];
  const [tab, setTab] = useState<"auto" | "manual">(() => {
    try {
      return localStorage.getItem("smsbear-tab") === "manual" ? "manual" : "auto";
    } catch {
      return "auto";
    }
  });
  const pickTab = (t: "auto" | "manual") => {
    setTab(t);
    try {
      localStorage.setItem("smsbear-tab", t);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
          <div className="text-xs text-zinc-500">Saldo</div>
          <div className="text-lg font-bold tabular-nums text-zinc-900">{st.balance === null || st.balance === undefined ? "—" : brl(st.balance)}</div>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
          <div className="text-xs text-zinc-500">WhatsApp Brasil</div>
          <div className="text-lg font-bold tabular-nums text-zinc-900">{st.price ? brl(st.price.cost) : "—"}</div>
          {st.price && <div className="text-[11px] text-zinc-500">{st.price.stock.toLocaleString("pt-BR")} em estoque</div>}
        </div>
      </div>
      {st.error && <p className="text-sm text-red-600">{st.error}</p>}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 text-sm">
        {([["auto", "Automático"], ["manual", "Manual"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => pickTab(k)} className={clsx("rounded-lg py-1.5 font-semibold transition", tab === k ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800")}>{l}</button>
        ))}
      </div>

      {tab === "manual" && <ManualTab orders={st.manual ?? []} now={now} reload={reload} />}

      {tab === "auto" && (<>
      {wabas.length === 0 ? (
        <p className="text-sm text-zinc-500">Conecte uma BM primeiro para registrar números nela.</p>
      ) : (
        <form action={action} className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/50 p-3">
          <Field label="Registrar na WABA">
            <select name="wabaId" value={wabaId} onChange={(e) => setWabaId(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm">
              {wabas.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
            </select>
          </Field>
          <Field label="Nome de exibição" hint="O nome que aparece no WhatsApp (a Meta analisa)">
            <Input key={wabaId} name="name" defaultValue={chosen?.name ?? ""} maxLength={100} required />
          </Field>
          <Field label="Máximo de tentativas" hint="Cada número sem SMS em 2,5 min é cancelado e o saldo volta">
            <Input name="maxAttempts" type="number" min={1} max={20} defaultValue={10} className="w-24" />
          </Field>
          <Button disabled={pending} className="w-full">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} {pending ? "Começando..." : "Registrar número automático"}
          </Button>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        </form>
      )}

      {jobs.some((j) => j.status !== "RUNNING") && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => start(async () => { toastResult(await clearSmsJobsAction()); reload(); })}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-red-600"
          >
            <Trash2 className="size-3.5" /> Limpar histórico
          </button>
        </div>
      )}
      {jobs.map((j) => {
        const left = j.status === "RUNNING" && j.step === "WAIT" ? Math.max(0, WAIT_MS - (now - new Date(j.stepAt).getTime())) : null;
        const last = j.log.at(-1);
        const lines = (
          <ol className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
            {[...j.log].reverse().map((l, i) => (
              <li key={i} className={clsx(l.tone === "ok" ? "text-emerald-700" : l.tone === "bad" ? "text-red-600" : "text-zinc-600")}>
                <span className="mr-1 text-zinc-400">{new Date(l.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                {l.text}
              </li>
            ))}
          </ol>
        );
        return (
          <div key={j.id} className={clsx("rounded-xl p-3 ring-1", j.status === "DONE" ? "bg-emerald-50 ring-emerald-200" : j.status === "RUNNING" ? "bg-white ring-orange-200" : "bg-zinc-50 ring-zinc-200")}>
            <div className="flex items-center gap-2">
              {j.status === "RUNNING" ? <Loader2 className="size-4 animate-spin text-orange-600" /> : j.status === "DONE" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-zinc-400" />}
              <div className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{j.bm}</div>
              {j.status === "RUNNING" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => start(async () => { toastResult(await stopSmsJobAction(j.id)); reload(); })}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Square className="size-3" /> Parar
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || j.pendingCancel > 0}
                  title={j.pendingCancel > 0 ? "Esperando cancelar número no SMSBear (o saldo volta)" : "Apagar do histórico"}
                  onClick={() => start(async () => { toastResult(await deleteSmsJobAction(j.id)); reload(); })}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-zinc-500">
              <span>Tentativa {j.attempt} de {j.maxAttempts}</span>
              {j.spentCents > 0 && <span>Comprado: {brl(j.spentCents)}</span>}
              {left !== null && <span className="font-semibold text-orange-700">SMS: {Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}</span>}
              {j.pendingCancel > 0 && <span className="font-medium text-amber-700">{j.pendingCancel} esperando cancelar</span>}
            </div>
            {j.status === "RUNNING" ? (
              lines
            ) : (
              // Terminado: fica fechado, só com a última linha (clica para ver tudo)
              <details className="group/log mt-1">
                <summary className={clsx("cursor-pointer list-none truncate text-xs [&::-webkit-details-marker]:hidden", last?.tone === "ok" ? "text-emerald-700" : last?.tone === "bad" ? "text-red-600" : "text-zinc-600")}>
                  {last?.text ?? "—"} <span className="text-zinc-400 group-open/log:hidden">· ver tudo</span>
                </summary>
                {lines}
              </details>
            )}
          </div>
        );
      })}

      </>)}

      <button
        type="button"
        disabled={busy}
        onClick={() => start(async () => { const r = await disconnectSmsBearAction(); if (r?.error) toast("error", r.error); else { toast("success", r?.ok ?? "SMSBear desconectado."); reload(); } })}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800"
      >
        <LogOut className="size-3.5" /> Desconectar SMSBear
      </button>
    </div>
  );
}

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
      title={label}
    >
      {done ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />} {done ? "Copiado" : label}
    </button>
  );
}

/** Modo manual: compra o número, você coloca na WABA pelo "Adicionar número" e o código aparece aqui ao vivo. */
function ManualTab({ orders, now, reload }: { orders: Manual[]; now: number; reload: () => void }) {
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<{ ok?: string; error?: string } | undefined>) =>
    start(async () => {
      toastResult(await fn());
      reload();
    });
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Compre o número, copie e coloque na BM em <b>Adicionar número nesta WABA</b> (aqui em Conexões). Quando a Meta mandar o SMS, o código aparece aqui.
      </p>
      <Button type="button" disabled={busy} className="w-full" onClick={() => run(() => buyManualAction())}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />} Comprar número BR para WhatsApp
      </Button>
      {orders.map((o) => {
        const opens = o.status === "PENDING" ? cancelOpensIn(o.createdAt, now) : 0;
        const locked = opens > 0;
        // Dígitos sem o 55 (é o que se digita no "Adicionar número")
        const local = o.number.replace(/\D/g, "").replace(/^55/, "");
        return (
          <div key={o.id} className={clsx("rounded-xl p-3 ring-1", o.status === "RECEIVED" ? "bg-emerald-50 ring-emerald-200" : o.status === "PENDING" ? "bg-white ring-orange-200" : "bg-zinc-50 ring-zinc-200")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-bold text-zinc-900">+55 {local.slice(0, 2)} {local.slice(2, -4)}-{local.slice(-4)}</span>
              <CopyBtn text={local} label="Copiar" />
              {o.status !== "PENDING" && (
                <button type="button" disabled={busy} onClick={() => run(() => hideManualAction(o.id))} className="ml-auto rounded-lg p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600" title="Tirar do painel">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
            <div className="mt-2 text-sm">
              {o.status === "RECEIVED" && o.code ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-zinc-600">Código:</span>
                  <span className="font-mono text-xl font-bold tracking-widest text-emerald-700">{o.code.length === 6 ? `${o.code.slice(0, 3)}-${o.code.slice(3)}` : o.code}</span>
                  <CopyBtn text={o.code} label="Copiar código" />
                </div>
              ) : o.status === "PENDING" ? (
                <span className="inline-flex items-center gap-1.5 text-orange-700"><Loader2 className="size-3.5 animate-spin" /> Aguardando SMS · {mmss(now - new Date(o.createdAt).getTime())}</span>
              ) : (
                <span className="text-zinc-500">Cancelado: o saldo voltou</span>
              )}
            </div>
            {o.smsText && <p className="mt-1 text-xs text-zinc-500">{o.smsText}</p>}
            {o.status === "PENDING" && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy || locked}
                  onClick={() => run(() => cancelManualAction(o.id))}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white enabled:bg-red-500 enabled:hover:bg-red-600 disabled:bg-zinc-300"
                >
                  <X className="size-3.5" /> Cancelar
                </button>
                <button
                  type="button"
                  disabled={busy || locked}
                  onClick={() => run(() => swapManualAction(o.id))}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white enabled:bg-sky-500 enabled:hover:bg-sky-600 disabled:bg-zinc-300"
                >
                  <RefreshCw className="size-3.5" /> Trocar número
                </button>
                {locked && <span className="text-xs text-zinc-500">libera em {mmss(opens)}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
