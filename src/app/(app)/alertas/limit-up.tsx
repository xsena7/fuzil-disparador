import { ChevronRight, Rocket, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { tierToLimit } from "@/lib/limits";

const fmt = (n: number | null) => (n === null ? "?" : n === Infinity ? "Ilimitado" : n >= 1000 ? `${(n / 1000).toLocaleString("pt-BR")} mil` : n.toLocaleString("pt-BR"));
/** "2k/dia" → 2000 (alertas antigos só têm o texto). */
const fromLabel = (s?: string) => {
  if (!s) return null;
  if (/ilimitado/i.test(s)) return Infinity;
  const m = s.match(/([\d.,]+)\s*(k)?/i);
  return m ? Number(m[1].replace(",", ".")) * (m[2] ? 1000 : 1) : null;
};

/** Limite da BM subiu: cartão colorido em vez da linha simples. */
export function LimitUpCard({ a, bm }: { a: { title: string; message: string; data: unknown; readAt: Date | null; createdAt: Date }; bm: string }) {
  const d = (a.data ?? {}) as { from?: string; to?: string };
  const [l, r] = a.message.split("→").map((x) => x.trim());
  const from = tierToLimit(d.from) ?? fromLabel(l);
  const to = tierToLimit(d.to) ?? fromLabel(r);
  const gain = from !== null && to !== null && Number.isFinite(to) ? to - from : null;
  return (
    <details className="group">
      <summary className="relative flex cursor-pointer list-none items-center gap-3 overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-orange-400 px-4 py-3 text-white [&::-webkit-details-marker]:hidden">
        <span className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-white/15 blur-xl" />
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
          <Rocket className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">🚀 Limite subiu! {bm}</span>
          <span className="block text-xs text-white/90">
            {fmt(from)} → <b>{fmt(to)}</b> por dia{gain ? ` · +${fmt(gain)} disparos por dia` : ""}
          </span>
        </span>
        {!a.readAt && <span className="size-2 shrink-0 rounded-full bg-white" />}
        <span className="shrink-0 text-xs text-white/80">{a.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
        <ChevronRight className="size-4 shrink-0 text-white/70 transition-transform group-open:rotate-90" />
      </summary>
      <div className="bg-gradient-to-b from-emerald-50 to-white px-4 py-5">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="rounded-2xl bg-white px-5 py-3 text-center shadow-soft ring-1 ring-zinc-200">
            <div className="text-xs font-medium text-zinc-500">Antes</div>
            <div className="text-2xl font-bold text-zinc-400 line-through decoration-2">{fmt(from)}</div>
          </div>
          <TrendingUp className="size-7 text-emerald-500" />
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 px-5 py-3 text-center text-white shadow-lg shadow-emerald-500/30">
            <div className="text-xs font-medium text-white/85">Agora</div>
            <div className="text-3xl font-extrabold">{fmt(to)}</div>
          </div>
        </div>
        <p className={clsx("mt-4 text-center text-sm text-zinc-600")}>
          A Meta aumentou o limite da <b className="text-zinc-900">{bm}</b>
          {gain ? <> e ela pode mandar <b className="text-emerald-700">{fmt(gain)} mensagens a mais por dia</b></> : null}. Já vale nos próximos disparos.
        </p>
      </div>
    </details>
  );
}

export const isLimitUp = (a: { type: string; title: string }) => a.type === "LIMIT_CHANGE" && / subiu$/.test(a.title);
export const limitUpBm = (title: string) => title.replace(/^Limite da BM /, "").replace(/ subiu$/, "");
