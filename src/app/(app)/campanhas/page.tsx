import Link from "next/link";
import { Plus, Clock, Send, Pause, FileEdit, CalendarClock, XCircle } from "lucide-react";
import type { CampaignStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pct } from "@/lib/campaign-metrics";
import { Badge, LinkButton, PageHeader } from "@/components/ui";
import { CampaignStatusBadge } from "@/components/status";

export const dynamic = "force-dynamic";

const SECTIONS: Array<{ status: CampaignStatus; label: string; icon: typeof Clock }> = [
  { status: "RUNNING", label: "Em andamento", icon: Clock },
  { status: "SCHEDULED", label: "Agendadas", icon: CalendarClock },
  { status: "PAUSED", label: "Pausadas", icon: Pause },
  { status: "DRAFT", label: "Rascunhos", icon: FileEdit },
  { status: "COMPLETED", label: "Concluídas", icon: Send },
  { status: "CANCELLED", label: "Canceladas", icon: XCircle },
];

export default async function CampaignsPage() {
  const auth = await requireAuth();
  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId: auth.workspace.id },
    include: { group: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const ids = campaigns.map((c) => c.id);
  const stats = ids.length
    ? await prisma.$queryRaw<Array<{ id: string; total: bigint; sent: bigint; delivered: bigint; read: bigint; clicked: bigint; failed: bigint }>>`
        SELECT "campaignId" AS id, COUNT(*) AS total,
          COUNT(*) FILTER (WHERE "sentAt" IS NOT NULL) AS sent,
          COUNT(*) FILTER (WHERE "deliveredAt" IS NOT NULL) AS delivered,
          COUNT(*) FILTER (WHERE "readAt" IS NOT NULL) AS read,
          COUNT(*) FILTER (WHERE "clickCount" > 0) AS clicked,
          COUNT(*) FILTER (WHERE status = 'FAILED') AS failed
        FROM "CampaignRecipient" WHERE "campaignId" = ANY(${ids}) GROUP BY "campaignId"`
    : [];
  const byId = new Map(stats.map((s) => [s.id, s]));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Campanhas" description="Disparos de templates de utilidade distribuídos entre os números de um grupo de BM." actions={<LinkButton href="/campanhas/nova"><Plus className="size-4" /> Criar campanha</LinkButton>} />
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {SECTIONS.map(({ status, label, icon: Icon }) => {
          const list = campaigns.filter((c) => c.status === status);
          if (!list.length && !["RUNNING", "COMPLETED"].includes(status)) return null;
          return (
            <div key={status}>
              <div className="flex items-center gap-2 border-y border-zinc-100 bg-zinc-50 px-5 py-2.5 font-medium first:border-t-0"><Icon className="size-4 text-zinc-500" /> {label} <span className="text-xs text-zinc-400">({list.length})</span></div>
              {list.length === 0 && <div className="py-4 text-center text-xs text-zinc-400">Nenhuma campanha nessa categoria.</div>}
              {list.map((c) => {
                const s = byId.get(c.id);
                const total = Number(s?.total ?? 0);
                const sent = Number(s?.sent ?? 0);
                return (
                  <Link key={c.id} href={`/campanhas/${c.id}?etapa=${c.status === "DRAFT" ? "template" : "metricas"}`} className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-3 last:border-0 hover:bg-zinc-50">
                    <div className="min-w-56 flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-zinc-500">
                        {c.templateName ?? "sem template"} · {c.group?.name ?? "sem grupo"} · {c.createdAt.toLocaleDateString("pt-BR")}
                        {c.pausedReason && <span className="text-amber-700"> · {c.pausedReason}</span>}
                      </div>
                    </div>
                    {total > 0 && (
                      <div className="flex flex-wrap gap-4 text-xs text-zinc-600">
                        <span><b>{sent.toLocaleString("pt-BR")}</b>/{total.toLocaleString("pt-BR")} enviadas</span>
                        <span>Entregues <b>{pct(Number(s?.delivered ?? 0), sent)}</b></span>
                        <span>Lidas <b>{pct(Number(s?.read ?? 0), sent)}</b></span>
                        <span>Cliques <b>{pct(Number(s?.clicked ?? 0), sent)}</b></span>
                        {Number(s?.failed ?? 0) > 0 && <Badge color="red">{Number(s?.failed).toLocaleString("pt-BR")} falhas</Badge>}
                      </div>
                    )}
                    <CampaignStatusBadge s={c.status} />
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
