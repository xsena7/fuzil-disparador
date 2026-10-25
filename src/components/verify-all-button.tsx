"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "./ui";
import { toast } from "./toast";
import { startLoadingTick } from "./celebration";
import { finishVerifyAction, verifyWabaIdsAction, verifyWabasAction } from "@/app/actions/connections";

/** Verifica todas as contas uma por vez, com carregamento no meio da tela, a % e um som de carregamento. */
export function VerifyAllButton({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const [run, setRun] = useState<{ done: number; total: number } | null>(null);

  async function verify() {
    if (run) return;
    setRun({ done: 0, total: 0 });
    const stopSound = startLoadingTick();
    try {
      const ids = await verifyWabaIdsAction();
      setRun({ done: 0, total: ids.length });
      // Lotes de 6 contas: cada lote roda em paralelo no servidor e a % anda de lote em lote
      for (let i = 0; i < ids.length; i += 6) {
        const n = await verifyWabasAction(ids.slice(i, i + 6));
        setRun((r) => (r ? { ...r, done: r.done + n } : r));
      }
      const r = await finishVerifyAction();
      toast("success", r.ok);
      router.refresh();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Não consegui verificar as contas agora.");
    } finally {
      stopSound();
      setRun(null);
    }
  }

  const pct = run && run.total ? Math.round((run.done / run.total) * 100) : 0;

  return (
    <>
      {run && (
        <div className="fixed inset-0 z-[90] flex cursor-wait select-none flex-col items-center justify-center bg-zinc-950/70 backdrop-blur-sm" role="alert" aria-busy="true">
          <div className="flex w-72 flex-col items-center rounded-3xl bg-white px-8 py-7 text-center shadow-2xl">
            <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-lg shadow-orange-500/40">
              <Loader2 className="size-7 animate-spin" />
            </span>
            <div className="text-xl font-bold text-zinc-900">Verificando suas BMs...</div>
            <div className="mt-1 text-3xl font-bold tabular-nums text-zinc-900">{pct}%</div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-brand-gradient transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              {run.done} de {run.total} contas · não feche a página
            </div>
          </div>
        </div>
      )}
      <Button variant="secondary" className={className} onClick={verify} disabled={run !== null} aria-busy={run !== null}>
        <RefreshCw className="size-4" />
        {children}
      </Button>
    </>
  );
}
