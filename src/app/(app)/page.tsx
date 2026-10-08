import Link from "next/link";
import { AlertTriangle } from "lucide-react";
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
  const [businesses, running, recentAlerts, marketing, today] = await Promise.all([
    prisma.businessManager.findMany({ where: { workspaceId: wsId }, select: { id: true } }),
    prisma.campaign.findMany({ where: { workspaceId: wsId, status: { in: ["RUNNING", "SCHEDULED", "PAUSED"] } }, orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.alert.findMany({ where: { workspaceId: wsId, severity: { not: "INFO" } }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.template.count({ where: { workspaceId: wsId, category: "MARKETING" } }),
    prisma.$queryRaw<Array<{ sent: bigint; delivered: bigint; read: bigint; clicked: bigint; failed: bigint }>>`
      SELECT COUNT(*) FILTER (WHERE r."sentAt" > ${since}) AS sent,
        COUNT(*) FILTER (WHERE r."deliveredAt" > ${since}) AS delivered,
        COUNT(*) FILTER (WHERE r."readAt" > ${since}) AS read,
        COUNT(*) FILTER (WHERE r."firstClickAt" > ${since}) AS clicked,
        COUNT(*) FILTER (WHERE r."failedAt" > ${since}) AS failed
      FROM "CampaignRecipient" r JOIN "Campaign" c ON c.id = r."campaignId" WHERE c."workspaceId" = ${wsId}`,
  ]);
  const stats = await statsForBusinesses(businesses.map((b) => b.id));
  const t = today[0];
  const n = (v: bigint | number) => Number(v).toLocaleString("pt-BR");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={`Olá, ${auth.user.name.split(" ")[0]}`} description="Resumo das últimas 24 horas." actions={<LinkButton href="/campanhas/nova">Criar campanha</LinkButton>} />
      {marketing > 0 && (
        <Link href="/templates?cat=MARKETING" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          <AlertTriangle className="size-4" /> {marketing} cópia(s) de template estão como MARKETING e foram bloqueadas para disparo.
        </Link>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="BMs conectadas" value={businesses.length} sub={`${stats.activePhones}/${stats.phones} números ativos`} />
        <Stat label="Limite total (24h)" value={formatLimit(stats.totalLimit)} sub={`${formatLimit(stats.available)} disponíveis`} tone="green" />
        <Stat label="Enviadas (24h)" value={n(t.sent)} sub={`${pct(Number(t.delivered), Number(t.sent))} entregues · ${pct(Number(t.read), Number(t.delivered))} lidas`} />
        <Stat label="Cliques (24h)" value={n(t.clicked)} sub={`${n(t.failed)} falhas`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 font-semibold">Campanhas ativas</div>
          {running.length === 0 && <p className="text-zinc-500">Nenhuma campanha em andamento.</p>}
          <div className="divide-y divide-zinc-100">
            {running.map((c) => (
              <Link key={c.id} href={`/campanhas/${c.id}?etapa=metricas`} className="flex items-center justify-between py-2 hover:text-brand-600">
                <span>{c.name}</span>
                <CampaignStatusBadge s={c.status} />
              </Link>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between font-semibold">Alertas recentes <Link href="/alertas" className="text-xs font-normal text-zinc-500 underline">ver todos</Link></div>
          {recentAlerts.length === 0 && <p className="text-zinc-500">Tudo tranquilo.</p>}
          <div className="space-y-2">
            {recentAlerts.map((a) => (
              <div key={a.id} className="text-sm">
                <span className={a.severity === "CRITICAL" ? "text-red-600" : "text-amber-700"}>●</span> {a.title}
                <span className="ml-2 text-xs text-zinc-400">{a.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Qualidade verde" value={stats.quality.GREEN} />
        <Stat label="Qualidade amarela" value={stats.quality.YELLOW} />
        <Stat label="Qualidade vermelha" value={stats.quality.RED} tone={stats.quality.RED ? "red" : "default"} />
      </div>
    </div>
  );
}
