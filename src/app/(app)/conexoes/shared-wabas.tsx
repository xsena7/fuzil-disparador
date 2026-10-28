"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Handshake, Loader2, RefreshCw } from "lucide-react";
import { connectSharedWabaAction, listSharedWabasAction, type SharedWaba } from "@/app/actions/connections";
import { toast } from "@/components/toast";

/** Só o dono: contas do WhatsApp que chegaram na BM do Fuzil por parceria, para conectar com um clique. */
export function SharedWabas({ workspace }: { workspace: string }) {
  const router = useRouter();
  const [list, setList] = useState<SharedWaba[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  const load = () =>
    startLoad(async () => {
      const r = await listSharedWabasAction();
      setError(r.error ?? null);
      setList(r.wabas ?? []);
    });

  const connect = async (w: Pick<SharedWaba, "id">) => {
    setBusy(w.id);
    const r = await connectSharedWabaAction(w.id);
    setBusy(null);
    if (r?.error) return toast("error", r.error);
    toast("success", r?.ok ?? "Conectada!");
    setList((l) => l?.map((x) => (x.id === w.id ? { ...x, connectedIn: workspace, here: true } : x)) ?? null);
    setTyped("");
    router.refresh();
  };

  return (
    <details className="group mt-4 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm" onToggle={(e) => (e.currentTarget.open && list === null ? load() : undefined)}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500 text-white"><Handshake className="size-4" /></span>
        <span className="flex-1">
          <span className="block font-semibold text-zinc-900">Contas compartilhadas com o Fuzil</span>
          <span className="block text-xs text-zinc-600">BMs que adicionaram a BM do Fuzil como parceira. Só você, dono do Fuzil, vê isso</span>
        </span>
      </summary>
      <div className="border-t border-zinc-100 p-5">
        <div className="mb-3 flex items-center gap-3">
          <p className="flex-1 text-sm text-zinc-600">
            Conecta em <b>{workspace}</b> (a conta em que você está agora). Usa o usuário do sistema da BM do Fuzil: não precisa de token do cliente.
          </p>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Procurar
          </button>
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>}
        {list && !error && list.length === 0 && <p className="text-sm text-zinc-500">Nenhuma conta compartilhada ainda. Na BM do cliente: Configurações do negócio → Parceiros → adicionar a BM do Fuzil e compartilhar a conta do WhatsApp.</p>}
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const id = typed.replace(/\D/g, "");
            if (id) void connect({ id });
          }}
        >
          <span className="text-sm text-zinc-600">Ou pelo ID da conta do WhatsApp:</span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} inputMode="numeric" placeholder="1089435753910494" className="w-56 rounded-xl border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-violet-400" />
          <button disabled={busy !== null || !typed.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy && busy === typed.replace(/\D/g, "") && <Loader2 className="size-4 animate-spin" />} Conectar pelo ID
          </button>
        </form>
        <div className="mt-3 space-y-2">
          {list?.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 px-4 py-2.5 ring-1 ring-zinc-200/70">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-zinc-900">{w.owner ?? w.name}</span>
                <span className="block truncate text-xs text-zinc-500">{w.name} · WABA {w.id}</span>
              </span>
              {w.here ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700"><Check className="size-4" /> Conectada aqui</span>
              ) : w.connectedIn ? (
                <span className="text-xs text-zinc-500">Já está na conta {w.connectedIn}</span>
              ) : (
                <button onClick={() => connect(w)} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3.5 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                  {busy === w.id && <Loader2 className="size-4 animate-spin" />} Conectar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
