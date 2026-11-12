import { MousePointerClick } from "lucide-react";
import { prisma } from "@/lib/db";
import { Drawer } from "@/components/drawer";

const today = () => new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}T00:00:00Z`);
const daysAgo = (n: number) => new Date(today().getTime() - n * 86_400_000);
const n = (v: number) => v.toLocaleString("pt-BR");

function Top({ title, rows, total }: { title: string; rows: Array<[string, number]>; total: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Sem cliques ainda.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map(([k, v]) => (
            <li key={k} className="text-sm">
              <div className="flex justify-between gap-3"><span className="truncate text-zinc-800">{k}</span><b className="tabular-nums">{n(v)}</b></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.max(3, (v / Math.max(1, total)) * 100)}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Admin: quantos cliques o botão do WhatsApp do site teve (contador próprio, conta todo mundo, com ou sem cookies). */
export async function SiteClicksPanel() {
  const rows = await prisma.siteClick.findMany({ where: { day: { gte: daysAgo(29) } } });
  const sum = (from: Date) => rows.filter((r) => r.day >= from).reduce((a, r) => a + r.count, 0);
  const t0 = sum(today()), t7 = sum(daysAgo(6)), t30 = sum(daysAgo(29));
  const group = (key: "source" | "button" | "page") => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + r.count);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  };
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = daysAgo(13 - i);
    return { d, v: rows.filter((r) => r.day.getTime() === d.getTime()).reduce((a, r) => a + r.count, 0) };
  });
  const max = Math.max(1, ...days.map((x) => x.v));
  return (
    <Drawer title="Cliques no WhatsApp do site" tone={t7 > 0 ? "green" : "gray"} meta={<span>Hoje {n(t0)} · 7 dias {n(t7)} · 30 dias {n(t30)}</span>}>
      <p className="mb-4 text-sm text-zinc-500">
        <MousePointerClick className="mr-1 inline size-4 text-brand-500" />
        Cada clique em um botão que abre o seu WhatsApp no site (fuzildisparador.com.br). Conta todo mundo, aceitando ou não os cookies (a Meta só vê quem aceita). A origem vem do link do anúncio (utm) ou de onde a pessoa chegou.
      </p>
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[["Hoje", t0], ["Últimos 7 dias", t7], ["Últimos 30 dias", t30]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-zinc-200 p-4">
            <div className="text-xs text-zinc-500">{l}</div>
            <div className="fz-num mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{n(v as number)}</div>
          </div>
        ))}
      </div>
      <div className="mb-4 rounded-xl border border-zinc-200 p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Últimos 14 dias</div>
        <div className="flex h-28 items-end gap-1.5">
          {days.map(({ d, v }) => (
            <div key={d.toISOString()} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.toLocaleDateString("pt-BR", { timeZone: "UTC" })}: ${v}`}>
              <span className="text-[10px] tabular-nums text-zinc-500">{v || ""}</span>
              <div className="w-full rounded-t bg-brand-gradient" style={{ height: `${(v / max) * 70}%`, minHeight: v ? 4 : 1, opacity: v ? 1 : 0.2 }} />
              <span className="text-[10px] text-zinc-400">{d.toLocaleDateString("pt-BR", { day: "2-digit", timeZone: "UTC" })}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Top title="De onde veio (30 dias)" rows={group("source")} total={t30} />
        <Top title="Qual botão (30 dias)" rows={group("button")} total={t30} />
        <Top title="Em qual página (30 dias)" rows={group("page")} total={t30} />
      </div>
    </Drawer>
  );
}
