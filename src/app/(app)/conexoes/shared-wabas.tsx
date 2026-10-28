"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Copy, ExternalLink, Loader2, Lock, RefreshCw } from "lucide-react";
import { connectSharedWabaAction, listSharedWabasAction, type SharedWaba } from "@/app/actions/connections";
import { toast } from "@/components/toast";
import { celebrate } from "@/components/celebration";

function CopyId({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        toast("success", "ID copiado!");
        setTimeout(() => setDone(false), 1800);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1 font-mono text-xs font-semibold text-white hover:bg-zinc-700"
    >
      {value} {done ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 opacity-70" />}
    </button>
  );
}

/**
 * Conectar contas com cadeado: o cliente atribui a BM do Fuzil como parceira na conta do WhatsApp e digita o ID aqui.
 * O dono do Fuzil também vê a lista de todas as contas compartilhadas (de todos os clientes).
 */
export function SharedWabas({ workspace, partnerId, owner }: { workspace: string; partnerId: string; owner: boolean }) {
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

  const connect = async (id: string) => {
    setBusy(id);
    const r = await connectSharedWabaAction(id);
    setBusy(null);
    if (r?.error) return toast("error", r.error);
    celebrate("BM conectada! 🎉", r?.ok);
    setList((l) => l?.map((x) => (x.id === id ? { ...x, connectedIn: workspace, here: true } : x)) ?? null);
    setTyped("");
    router.refresh();
  };

  const steps = [
    <>
      Na BM, abra <b className="text-zinc-900">Configurações do negócio → Contas → Contas do WhatsApp</b> e clique na sua conta.
    </>,
    <>
      Clique em <b className="text-zinc-900">Atribuir parceiro</b>, cole o ID <CopyId value={partnerId} />, marque <b className="text-zinc-900">Controle total</b> e confirme.
    </>,
    <>
      Copie a <b className="text-zinc-900">Identificação</b> da conta do WhatsApp (o número embaixo do nome dela) e cole aqui embaixo.
    </>,
  ];

  return (
    <details className="group mt-4 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500 text-white"><Lock className="size-4" /></span>
        <span className="flex-1">
          <span className="block font-semibold text-zinc-900">Conectar contas com cadeado</span>
          <span className="block text-xs text-zinc-600">Sem token: você dá acesso ao Fuzil como parceiro na conta do WhatsApp e cola o ID aqui. Leva 1 minuto</span>
        </span>
        <ChevronRight className="size-4 text-zinc-400 transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t border-zinc-100 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-zinc-900">Como conectar</div>
          <a href="https://business.facebook.com/settings/whatsapp-business-accounts" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
            Abrir as contas do WhatsApp na Meta <ExternalLink className="size-3.5" />
          </a>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {steps.map((body, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-zinc-50 p-3.5 text-sm leading-relaxed text-zinc-600 ring-1 ring-zinc-200/70">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white">{i + 1}</span>
              <div className="min-w-0">{body}</div>
            </li>
          ))}
        </ol>

        <form
          className="mt-4 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const id = typed.replace(/\D/g, "");
            if (id) void connect(id);
          }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            inputMode="numeric"
            placeholder="ID da conta do WhatsApp (ex.: 1089435753910494)"
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
          <button disabled={busy !== null || !typed.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50">
            {busy && busy === typed.replace(/\D/g, "") && <Loader2 className="size-4 animate-spin" />} Conectar
          </button>
        </form>
        <p className="mt-2 text-xs text-zinc-500">A conta entra em <b>{workspace}</b> e já recebe os templates padrão. O cartão de pagamento continua sendo o da BM dona da conta.</p>

        {owner && (
          <div className="mt-5 border-t border-zinc-100 pt-4">
            <div className="mb-2 flex items-center gap-3">
              <p className="flex-1 text-sm text-zinc-600">Só você (dono do Fuzil): todas as contas compartilhadas com o Fuzil, de todos os clientes.</p>
              <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Procurar
              </button>
            </div>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>}
            {list && !error && list.length === 0 && <p className="text-sm text-zinc-500">Nenhuma conta compartilhada encontrada.</p>}
            <div className="space-y-2">
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
                    <button onClick={() => connect(w.id)} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3.5 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                      {busy === w.id && <Loader2 className="size-4 animate-spin" />} Conectar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
