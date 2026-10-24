import Link from "next/link";
import clsx from "clsx";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CheckCircle2, Paperclip, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { FINANCE_CATEGORIES, brl, settle, type FinanceKind } from "@/lib/finance";
import { financePartners, requireFinancePartner } from "@/lib/finance-partners";
import { Card, Empty, PageHeader, Stat } from "@/components/ui";
import { DeleteEntry, FinanceForm, PixKeyForm, SettleButton } from "./finance-form";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
// "2026-10" no fuso de Brasília
const monthKey = (d: Date) => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).formatToParts(d);
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}`;
};
const monthLabel = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  const s = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const when = (d: Date) => d.toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const first = (name: string) => name.split(" ")[0];

/** Financeiro dos sócios: despesas, entradas e quem passa quanto para quem (partes iguais). Só para os administradores do Fuzil. */
export default async function FinancePage({ searchParams }: { searchParams: Promise<{ mes?: string; cat?: string }> }) {
  const auth = await requireFinancePartner();
  const sp = await searchParams;
  const [partners, entries] = await Promise.all([
    financePartners(),
    prisma.financeEntry.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } }, toUser: { select: { name: true } } } }),
  ]);
  const nameOf = new Map(partners.map((p) => [p.id, first(p.name)]));
  const nm = (id: string) => nameOf.get(id) ?? "Ex-sócio";

  // Acerto: sempre com tudo o que já foi anotado (não por mês)
  const all = settle(
    entries.map((e) => ({ kind: e.kind as FinanceKind, amountCents: e.amountCents, userId: e.userId, toUserId: e.toUserId })),
    partners.map((p) => p.id),
  );

  const now = monthKey(new Date());
  const months = [...new Set([now, ...entries.map((e) => monthKey(e.createdAt))])].sort().reverse();
  const mes = sp.mes === "todos" ? "todos" : sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : now;
  const cat = sp.cat && (FINANCE_CATEGORIES as readonly string[]).includes(sp.cat) ? sp.cat : null;
  const inMonth = entries.filter((e) => mes === "todos" || monthKey(e.createdAt) === mes);
  const list = inMonth.filter((e) => !cat || e.category === cat);

  const income = inMonth.filter((e) => e.kind === "INCOME").reduce((a, e) => a + e.amountCents, 0);
  const expense = inMonth.filter((e) => e.kind === "EXPENSE").reduce((a, e) => a + e.amountCents, 0);
  const profit = income - expense;
  const byCat = FINANCE_CATEGORIES.map((c) => ({ c, v: inMonth.filter((e) => e.kind === "EXPENSE" && e.category === c).reduce((a, e) => a + e.amountCents, 0) })).filter((x) => x.v > 0);
  const maxCat = Math.max(1, ...byCat.map((x) => x.v));
  const link = (q: { mes?: string; cat?: string | null }) => {
    const p = new URLSearchParams();
    const m = q.mes ?? mes;
    if (m !== now) p.set("mes", m);
    const c = q.cat === undefined ? cat : q.cat;
    if (c) p.set("cat", c);
    const s = p.toString();
    return `/financeiro${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="Financeiro" description="Despesas e entradas dos sócios, divididas meio a meio. O Fuzil soma tudo e diz quem passa quanto para quem." />

      {/* Quem passa quanto para quem (com tudo o que já foi anotado) */}
      <div className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-orange-500/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-gradient"><Wallet className="size-6" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-orange-200">Acerto entre os sócios</div>
            {all.transfers.length ? (
              all.transfers.map((t) => (
                <div key={`${t.from}-${t.to}`} className="mt-1 text-2xl font-bold md:text-3xl">
                  {t.from === auth.user.id ? "Você" : nm(t.from)} deve passar <span className="text-brand-gradient">{brl(t.amountCents)}</span> {t.to === auth.user.id ? "para você" : `para ${nm(t.to)}`}
                </div>
              ))
            ) : (
              <div className="mt-1 flex items-center gap-2 text-2xl font-bold md:text-3xl"><CheckCircle2 className="size-7 text-emerald-400" /> Tudo acertado</div>
            )}
            <div className="mt-2 text-sm text-zinc-400">
              Lucro de tudo até agora: <b className="text-white">{brl(all.profit)}</b> · parte de cada um: <b className="text-white">{brl(all.share)}</b>
            </div>
          </div>
          {all.transfers
            .filter((t) => t.from === auth.user.id)
            .map((t) => (
              <SettleButton key={t.to} amount={(t.amountCents / 100).toFixed(2).replace(".", ",")} toUserId={t.to} toName={nm(t.to)} pixKey={partners.find((p) => p.id === t.to)?.pixKey ?? null} />
            ))}
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
          {all.partners
            .filter((p) => nameOf.has(p.userId))
            .map((p) => (
              <div key={p.userId} className="rounded-2xl bg-white/5 px-4 py-3 text-sm ring-1 ring-white/10">
                <div className="font-semibold">{nm(p.userId)}{p.userId === auth.user.id && " (você)"}</div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-zinc-300">
                  <span>Pagou <b className="text-rose-300">{brl(p.paid)}</b></span>
                  <span>Recebeu <b className="text-emerald-300">{brl(p.received)}</b></span>
                  {(p.sent > 0 || p.got > 0) && <span>Acertos: mandou {brl(p.sent)} · recebeu {brl(p.got)}</span>}
                </div>
              </div>
            ))}
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="text-sm text-zinc-600">
          <b className="text-zinc-900">Sócios:</b> {partners.map((p) => first(p.name)).join(" e ")} · divisão em partes iguais
        </div>
        <PixKeyForm current={partners.find((p) => p.id === auth.user.id)?.pixKey ?? null} />
      </Card>

      <Card className="p-5">
        <div className="mb-4 font-semibold">Nova anotação</div>
        <FinanceForm others={partners.filter((p) => p.id !== auth.user.id).map((p) => ({ id: p.id, name: p.name }))} />
      </Card>

      {/* Visão do mês */}
      <div className="flex flex-wrap items-center gap-2">
        {months.map((m) => (
          <Link key={m} href={link({ mes: m })} className={clsx("rounded-full px-3.5 py-1.5 text-sm font-medium transition", mes === m ? "bg-brand-gradient text-white shadow-sm" : "border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100")}>
            {monthLabel(m)}
          </Link>
        ))}
        <Link href={link({ mes: "todos" })} className={clsx("rounded-full px-3.5 py-1.5 text-sm font-medium transition", mes === "todos" ? "bg-brand-gradient text-white shadow-sm" : "border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100")}>
          Todos os meses
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Entradas" value={brl(income)} tone="green" icon={<ArrowDownLeft className="size-4" />} />
        <Stat label="Despesas" value={brl(expense)} tone="red" icon={<ArrowUpRight className="size-4" />} />
        <Stat label="Lucro" value={brl(profit)} tone={profit >= 0 ? "brand" : "red"} />
        <Stat label="Parte de cada um" value={brl(Math.round(profit / Math.max(1, partners.length)))} tone="violet" sub={mes === "todos" ? "de tudo" : monthLabel(mes)} />
      </div>

      {byCat.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 font-semibold">Despesas por categoria</div>
          <div className="space-y-2.5">
            {byCat.map((x) => (
              <div key={x.c} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
                <span className="font-medium text-zinc-700">{x.c}</span>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-brand-gradient" style={{ width: `${(x.v / maxCat) * 100}%` }} /></div>
                <span className="font-semibold tabular-nums">{brl(x.v)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Anotações */}
      <div className="flex flex-wrap gap-2">
        <Link href={link({ cat: null })} className={clsx("rounded-full px-3 py-1 text-xs font-semibold", !cat ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200")}>Todos</Link>
        {FINANCE_CATEGORIES.map((c) => (
          <Link key={c} href={link({ cat: c })} className={clsx("rounded-full px-3 py-1 text-xs font-semibold", cat === c ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200")}>{c}</Link>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty icon={<Wallet className="size-5" />}>Nenhuma anotação {mes === "todos" ? "ainda" : `em ${monthLabel(mes)}`}{cat ? ` na categoria ${cat}` : ""}.</Empty>
      ) : (
        <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {list.map((e) => {
            const k = e.kind as FinanceKind;
            const Icon = k === "EXPENSE" ? ArrowUpRight : k === "INCOME" ? ArrowDownLeft : ArrowLeftRight;
            const who = k === "EXPENSE" ? `${nm(e.userId)} pagou` : k === "INCOME" ? `${nm(e.userId)} recebeu` : `${nm(e.userId)} → ${e.toUserId ? nm(e.toUserId) : "?"}`;
            return (
              <div key={e.id} className={clsx("flex flex-wrap items-center gap-3 border-l-4 px-4 py-3", k === "EXPENSE" ? "border-l-rose-400" : k === "INCOME" ? "border-l-emerald-500" : "border-l-sky-400")}>
                <span className={clsx("flex size-9 shrink-0 items-center justify-center rounded-xl", k === "EXPENSE" ? "bg-rose-100 text-rose-700" : k === "INCOME" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700")}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-zinc-900">{e.description}</div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                    <span>{who}</span>
                    <span>· {when(e.createdAt)}</span>
                    {e.category && <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">{e.category}</span>}
                    {e.attachmentPath && (
                      <a href={`/api/finance/file/${e.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-orange-700 hover:underline">
                        <Paperclip className="size-3" /> comprovante
                      </a>
                    )}
                  </div>
                </div>
                <span className={clsx("text-base font-bold tabular-nums", k === "EXPENSE" ? "text-rose-700" : k === "INCOME" ? "text-emerald-700" : "text-sky-700")}>
                  {k === "EXPENSE" ? "−" : k === "INCOME" ? "+" : ""}
                  {brl(e.amountCents)}
                </span>
                {e.userId === auth.user.id && <DeleteEntry id={e.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
