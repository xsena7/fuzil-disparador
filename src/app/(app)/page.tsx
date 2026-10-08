import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, ArrowRight, Building2, Gauge, Info, MousePointerClick, Plus, Send, Siren } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { statsForBusinesses } from "@/lib/group-stats";
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
    prisma.businessManager.findMany({ where: { workspaceId: wsId }, select: { id: true } }),
    prisma.campaign.findMany({ where: { workspaceId: wsId, status: { in: ["RUNNING", "SCHEDULED", "PAUSED"] } }, orderBy: { updatedAt: "desc" }, take: 6 }),
    prisma.alert.findMany({ where: { workspaceId: wsId }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.template.count({ where: { workspaceId: wsId, category: "MARKETING" } }),
    prisma.$queryRaw<Array<{ sent: bigint; delivered: bigint; read: bigint; clicked: bigint; failed: bigint }>>`
      SELECT COUNT(*) FILTER (WHERE r."sentAt" > ${since}) AS sent,
        COUNT(*) FILTER (WHERE r."deliveredAt" > ${since}) AS delivered,
        COUNT(*) FILTER (WHERE r."readAt" > ${since}) AS read,
        COUNT(*) FILTER (WHERE r."firstClickAt" > ${since}) AS clicked,
        COUNT(*) FILTER (WHERE r."failedAt" > ${since}) AS failed
      FROM "CampaignRecipient" r JOIN "Campaign" c ON c.id = r."campaignId" WHERE c."workspaceId" = ${wsId}`,
  ]);
  const ids = active.map((c) => c.id);
  const progress = ids.length
    ? await prisma.$queryRaw<Array<{ id: string; total: bigint; done: bigint }>>`
        SELECT "campaignId" AS id, COUNT(*) AS total, COUNT(*) FILTER (WHERE status NOT IN ('PENDING','SENDING')) AS done
        FROM "CampaignRecipient" WHERE "campaignId" = ANY(${ids}) GROUP BY "campaignId"`
    : [];
  const progressById = new Map(progress.map((p) => [p.id, p]));
  const stats = await statsForBusinesses(businesses.map((b) => b.id));
  const t = today[0];
  const n = (v: bigint | number) => Number(v).toLocaleString("pt-BR");
  const q = stats.quality;
  const qTotal = q.GREEN + q.YELLOW + q.RED + q.UNKNOWN || 1;
  const usedRaw = stats.totalLimit ? Math.min(100, (stats.usedToday / stats.totalLimit) * 100) : 0;
  const usedPct = usedRaw < 10 ? Math.round(usedRaw * 10) / 10 : Math.round(usedRaw);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={`Olá, ${auth.user.name.split(" ")[0]} 👋`}
        description="Resumo da sua operação nas últimas 24 horas."
        actions={<LinkButton href="/campanhas/nova"><Plus className="size-4" /> Criar campanha</LinkButton>}
      />

      {marketing > 0 && (
        <Link href="/templates?cat=MARKETING" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 transition hover:bg-rose-100/70">
          <AlertTriangle className="size-5 shrink-0" />
          <span className="flex-1">{marketing} cópia(s) de template estão como <b>MARKETING</b> e foram bloqueadas para disparo.</span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="BMs conectadas" value={businesses.length} sub={`${stats.activePhones}/${stats.phones} números ativos`} icon={<Building2 className="size-4" />} />
        <Stat label="Disponível hoje" value={formatLimit(stats.available)} sub={`de ${formatLimit(stats.totalLimit)} de limite somado`} tone="brand" icon={<Gauge className="size-4" />} />
        <Stat label="Enviadas (24h)" value={n(t.sent)} sub={`${pct(Number(t.delivered), Number(t.sent))} entregues · ${pct(Number(t.read), Number(t.delivered))} lidas`} icon={<Send className="size-4" />} />
        <Stat label="Cliques (24h)" value={n(t.clicked)} sub={`${n(t.failed)} falhas no período`} icon={<MousePointerClick className="size-4" />} />
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
            <h2 className="mb-4 font-semibold">Uso do limite (24h)</h2>
            <div className="mb-2 flex items-end justify-between">
              <span className="text-3xl font-semibold tabular-nums tracking-tight">{usedPct.toLocaleString("pt-BR")}%</span>
              <span className="text-xs text-zinc-500">{n(stats.usedToday)} / {formatLimit(stats.totalLimit)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
              <div className={clsx("h-full rounded-full", usedPct > 85 ? "bg-rose-500" : "bg-brand-gradient")} style={{ width: `${usedPct}%` }} />
            </div>
          </Card>
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
              <div key={a.id} className="flex items-start gap-3 py-3">
                <div className={clsx("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl", a.severity === "CRITICAL" ? "bg-rose-50 text-rose-600" : a.severity === "WARNING" ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600")}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{a.title}</div>
                  <div className="truncate text-sm text-zinc-500">{a.message}</div>
                </div>
                <span className="shrink-0 text-xs text-zinc-400">{a.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
