import clsx from "clsx";
import { Clock, RotateCcw } from "lucide-react";
import { clock, type BmWindow } from "@/lib/limit-windows";
import { formatLimit } from "@/lib/limits";
import { Countdown } from "./countdown";

const n = (v: number) => v.toLocaleString("pt-BR");
const time = clock;

/** Barra de uso do limite de 24h de uma BM + contagem regressiva da liberação. */
export function LimitWindow({ w, compact = false }: { w: BmWindow; compact?: boolean }) {
  const unlimited = w.limit === Infinity;
  const pct = unlimited || !w.limit ? 0 : Math.min(100, (w.used / w.limit) * 100);
  const full = !unlimited && w.available === 0;
  return (
    <div className={clsx("rounded-xl border p-4", full ? "border-rose-200 bg-rose-50/50" : "border-zinc-200/70 bg-zinc-50/40")}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">
          {full ? <span className="text-rose-700">Limite atingido</span> : <>{formatLimit(w.available)} disponíveis</>}
        </span>
        <span className="text-xs text-zinc-500 tabular-nums">{n(w.used)} / {formatLimit(w.limit)} nas últimas 24h</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200/70">
        <div className={clsx("h-full rounded-full transition-all", full ? "bg-rose-500" : pct > 85 ? "bg-amber-400" : "bg-brand-gradient")} style={{ width: `${pct}%` }} />
      </div>
      {w.nextReleaseAt ? (
        <div className={clsx("mt-3 grid gap-2 text-xs text-zinc-600", !compact && "sm:grid-cols-2")}>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-brand-500" />
            Libera <b className="text-zinc-800">{n(w.nextReleaseCount)}</b> em <b className="text-zinc-800"><Countdown to={w.nextReleaseAt.toISOString()} /></b>
            <span className="text-zinc-400">({time(w.nextReleaseAt)})</span>
          </div>
          {w.fullResetAt && (
            <div className="flex items-center gap-1.5">
              <RotateCcw className="size-3.5 text-emerald-500" />
              Zera totalmente em <b className="text-zinc-800"><Countdown to={w.fullResetAt.toISOString()} /></b>
              <span className="text-zinc-400">({time(w.fullResetAt)})</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 text-xs text-zinc-500">Nenhum envio nas últimas 24h — limite cheio.</div>
      )}
      {!compact && w.releases.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {w.releases.slice(0, 8).map((r) => (
            <span key={r.at.toISOString()} className="rounded-lg bg-white px-2 py-1 text-[11px] text-zinc-600 ring-1 ring-zinc-200/70">
              {time(r.at)} <b className="text-emerald-700">+{n(r.count)}</b>
            </span>
          ))}
          {w.releases.length > 8 && <span className="px-1 py-1 text-[11px] text-zinc-400">+{w.releases.length - 8} horários</span>}
        </div>
      )}
    </div>
  );
}
