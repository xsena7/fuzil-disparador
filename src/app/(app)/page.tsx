import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, ArrowRight, Building2, Gauge, Info, MousePointerClick, Plus, Send, Siren } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { statsForBusinesses } from "@/lib/group-stats";
import { readyBusinessIds } from "@/lib/readiness";
import { groupDot, groupTag } from "@/lib/group-colors";
import { bmWindows } from "@/lib/limit-windows";
import { LimitRow } from "@/components/limit-card";
import { formatLimit } from "@/lib/limits";
import { pct } from "@/lib/campaign-metrics";
import { Card, LinkButton, PageHeader, Stat } from "@/components/ui";
import { CampaignStatusBadge } from "@/components/status";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const auth = await requireAuth();
  const wsId = auth.workspace.id;
  const since = new Date(Date.now() - 86400_000);
  const [businesses, active, recentAlerts, marketing, today] = await Promise.all([
    prisma.businessManager.findMany({
      where: { workspaceId: wsId },
      select: { id: true, name: true, groups: { select: { group: { select: { id: true, name: true, color: true, system: true } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.campaign.findMany({ where: { workspaceId: wsId, funnelId: null, status: { in: ["RUNNING", "SCHEDULED", "PAUSED"] } }, orderBy: { updatedAt: "desc" }, take: 6 }),
    prisma.alert.findMany({ where: { workspaceId: wsId }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.template.count({ where: { workspaceId: wsId, category: "MARKETING" } }),
    prisma.$queryRaw<Array<{ sent: bigint; delivered: bigint; read: bigint; clicked: bigint; failed: bigint }>>`
      SELECT COUNT(*) FILTER (WHERE r."sentAt" > ${since}) AS sent,
        COUNT(*) FILTER (WHERE COALESCE(r."deliveredAt", r."readAt", r."firstClickAt", r."repliedAt") > ${since}) AS delivered,
        COUNT(*) FILTER (WHERE COALESCE(r."readAt", r."firstClickAt", r."repliedAt") > ${since}) AS read,
        COUNT(*) FILTER (WHERE r."firstClickAt" > ${since}) AS clicked,
        COUNT(*) FILTER (WHERE r."failedAt" > ${since}) AS failed
      FROM "CampaignRecipient" r JOIN "Campaign" c ON c.id = r."campaignId"
      -- Só quem foi enviado nos últimos dias (usa o índice de sentAt em vez de varrer o histórico inteiro)
      WHERE c."workspaceId" = ${wsId} AND r."sentAt" > ${since} - INTERVAL '3 days'`,
  ]);
  const ids = active.map((c) => c.id);
  const bmIds = businesses.map((b) => b.id);
  // Disponível para disparo = só as BMs prontas (aptas e fora dos grupos de problema)
  const ready = await readyBusinessIds({ workspaceId: wsId });
  const [progress, stats, readyStats, windows] = await Promise.all([
    ids.length
      ? prisma.$queryRaw<Array<{ id: string; total: bigint; done: bigint }>>`
          SELECT "campaignId" AS id, COUNT(*) AS total, COUNT(*) FILTER (WHERE status NOT IN ('PENDING','SENDING')) AS done
          FROM "CampaignRecipient" WHERE "campaignId" = ANY(${ids}) GROUP BY "campaignId"`
      : Promise.resolve([]),
    statsForBusinesses(bmIds),
    statsForBusinesses([...ready]),
    bmWindows(bmIds),
  ]);
  const progressById = new Map(progress.map((p) => [p.id, p]));
  const t = today[0];
  const n = (v: bigint | number) => Number(v).toLocaleString("pt-BR");
  const q = stats.quality;
  const qTotal = q.GREEN + q.YELLOW + q.RED + q.UNKNOWN || 1;
  const usedRaw = readyStats.totalLimit ? Math.min(100, (readyStats.usedToday / readyStats.totalLimit) * 100) : 0;
  const usedPct = usedRaw < 10 ? Math.round(usedRaw * 10) / 10 : Math.round(usedRaw);

  // Primeiros passos (conta nova): some sozinho quando tudo estiver feito
  const [approvedTpl, campaignsCount] = await Promise.all([
    prisma.template.count({ where: { workspaceId: wsId, status: "APPROVED", category: "UTILITY" } }),
    prisma.campaign.count({ where: { workspaceId: wsId, funnelId: null } }),
  ]);
  const steps = [
    { done: businesses.length > 0, title: "Conecte sua BM", text: "Pelo botão, em poucos minutos", href: "/conexoes" },
    { done: auth.workspace.creditBalance > 0, title: "Coloque créditos", text: "1 crédito = 1 disparo, pelo Pix", href: "/saldo" },
    { done: approvedTpl > 0, title: "Tenha um template aprovado", text: "Crie um template de utilidade", href: "/templates-padrao/novo" },
    { done: campaignsCount > 0, title: "Crie sua primeira campanha", text: "Suba a lista e dispare", href: "/campanhas/nova" },
  ];
  const nextStep = steps.findIndex((s) => !s.done);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={`Olá, ${auth.user.name.split(" ")[0]} 👋`}
        description="Resumo da sua operação nas últimas 24 horas."
        actions={<LinkButton href="/campanhas/nova"><Plus className="size-4" /> Criar campanha</LinkButton>}
      />

      {nextStep >= 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Primeiros passos</h2>
            <span className="text-xs font-medium text-zinc-500">{steps.filter((s) => s.done).length} de {steps.length} feitos</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Link
                key={s.title}
                href={s.href}
                className={clsx(
                  "flex items-start gap-3 rounded-xl border p-3 transition",
                  s.done ? "border-emerald-200 bg-emerald-50/60" : i === nextStep ? "border-orange-300 bg-orange-50 ring-2 ring-orange-100 hover:bg-orange-100/60" : "border-zinc-200 hover:bg-zinc-50",
                )}
              >
                <span className={clsx("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", s.done ? "bg-emerald-500 text-white" : i === nextStep ? "bg-brand-gradient text-white" : "bg-zinc-200 text-zinc-600")}>
                  {s.done ? "✓" : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={clsx("block text-sm font-semibold", s.done ? "text-emerald-800" : "text-zinc-900")}>{s.title}</span>
                  <span className="block text-xs text-zinc-500">{s.text}</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {marketing > 0 && (
        <Link href="/templates?cat=MARKETING" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 transition hover:bg-rose-100/70">
          <AlertTriangle className="size-5 shrink-0" />
          <span className="flex-1">{marketing} cópia(s) de template estão como <b>MARKETING</b> e foram bloqueadas para disparo.</span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="BMs conectadas" value={businesses.length} sub={`${ready.size} ${ready.size === 1 ? "pronta" : "prontas"} para disparar`} tone="blue" icon={<Building2 className="size-4" />} />
        <Stat label="Disponível hoje" value={formatLimit(readyStats.available)} sub={`só das BMs prontas · ${usedPct.toLocaleString("pt-BR")}% usado`} tone="brand" icon={<Gauge className="size-4" />} />
        <Stat label="Enviadas (24h)" value={n(t.sent)} sub={`${pct(Number(t.delivered), Number(t.sent))} entregues · ${pct(Number(t.read), Number(t.delivered))} lidas`} tone="green" icon={<Send className="size-4" />} />
        <Stat label="Cliques (24h)" value={n(t.clicked)} sub={`${pct(Number(t.clicked), Number(t.delivered))} das entregues clicaram`} tone="violet" icon={<MousePointerClick className="size-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Campanhas em andamento</h2>
            <Link href="/campanhas" className="text-sm text-zinc-500 hover:text-brand-600">Ver todas</Link>
          </div>
          {active.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-zinc-500">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Send className="size-5" /></div>
              Nenhuma campanha rodando agora.
              <LinkButton href="/campanhas/nova" variant="secondary"><Plus className="size-4" /> Nova campanha</LinkButton>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((c) => {
                const p = progressById.get(c.id);
                const total = Number(p?.total ?? 0);
                const done = Number(p?.done ?? 0);
                const pc = total ? Math.round((done / total) * 100) : 0;
                return (
                  <Link key={c.id} href={`/campanhas/${c.id}?etapa=metricas`} className="block rounded-xl border border-zinc-100 p-4 transition hover:border-brand-200 hover:bg-brand-50/30">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="truncate font-medium">{c.name}</span>
                      <CampaignStatusBadge s={c.status} />
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-brand-gradient transition-all" style={{ width: `${pc}%` }} />
                    </div>
                    <div className="mt-1.5 text-xs text-zinc-500">{n(done)} de {n(total)} · {pc}%{c.pausedReason ? ` · ${c.pausedReason}` : ""}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="mb-4 font-semibold">Qualidade dos números</h2>
            <div className="mb-3 flex h-2 gap-0.5 overflow-hidden rounded-full bg-zinc-100">
              {q.GREEN > 0 && <div className="bg-emerald-500" style={{ width: `${(q.GREEN / qTotal) * 100}%` }} />}
              {q.YELLOW > 0 && <div className="bg-amber-400" style={{ width: `${(q.YELLOW / qTotal) * 100}%` }} />}
              {q.RED > 0 && <div className="bg-rose-500" style={{ width: `${(q.RED / qTotal) * 100}%` }} />}
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {[["Alta", q.GREEN, "bg-emerald-500"], ["Média", q.YELLOW, "bg-amber-400"], ["Baixa", q.RED, "bg-rose-500"]].map(([label, v, c]) => (
                <div key={label as string}>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500"><span className={clsx("size-2 rounded-full", c as string)} />{label}</div>
                  <div className="text-lg font-semibold tabular-nums">{v}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {businesses.length > 0 && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Limite de cada BM (24h)</h2>
            <Link href="/conexoes" className="text-sm text-zinc-500 hover:text-brand-600">Ver conexões</Link>
          </div>
          <div className="-mx-2 divide-y divide-zinc-100">
            {/* Prontas primeiro; as outras aparecem marcadas, porque não entram no disparo */}
            {[...businesses].sort((a, b) => Number(ready.has(b.id)) - Number(ready.has(a.id))).map((b) => {
              const w = windows.get(b.id);
              // Etiqueta do grupo, na cor do grupo (o grupo oculto de campanha de uma BM só não aparece)
              const gs = b.groups.map((x) => x.group).filter((g) => !g.system?.startsWith("BM:"));
              const tag = (
                <span className="flex flex-wrap gap-1">
                  {gs.map((g) => (
                    <span key={g.id} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${groupTag(g.color)}`}>
                      <span className={`size-1.5 rounded-full ${groupDot(g.color)}`} />
                      {g.name}
                    </span>
                  ))}
                  {!gs.length && <span className="text-xs text-zinc-400">Sem grupo</span>}
                  {!ready.has(b.id) && !gs.some((g) => g.system) && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">fora do disparo</span>}
                </span>
              );
              return w ? <LimitRow key={b.id} name={b.name} w={w} tag={tag} /> : null;
            })}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Alertas recentes</h2>
          <Link href="/alertas" className="text-sm text-zinc-500 hover:text-brand-600">Ver todos</Link>
        </div>
        {recentAlerts.length === 0 && <p className="text-zinc-500">Tudo tranquilo por aqui.</p>}
        <div className="divide-y divide-zinc-100">
          {recentAlerts.map((a) => {
            const Icon = a.severity === "CRITICAL" ? Siren : a.severity === "WARNING" ? AlertTriangle : Info;
            return (
              <div key={a.id} className="flex items-center gap-3 py-2.5">
                <Icon className={clsx("size-4 shrink-0", a.severity === "CRITICAL" ? "text-rose-600" : a.severity === "WARNING" ? "text-amber-600" : "text-sky-600")} />
                <div className="min-w-0 flex-1 truncate text-sm font-medium">{a.title}</div>
                <span className="shrink-0 text-xs text-zinc-400">{a.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
