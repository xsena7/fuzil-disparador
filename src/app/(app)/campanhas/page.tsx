import Link from "next/link";
import { CalendarClock, ChevronRight, Clock, FileEdit, Folder, Pause, Plus, Send, XCircle } from "lucide-react";
import type { Campaign, CampaignStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pct } from "@/lib/campaign-metrics";
import { Badge, Empty, LinkButton, PageHeader } from "@/components/ui";
import { CampaignStatusBadge } from "@/components/status";
import { deleteFolderAction, renameFolderAction } from "@/app/actions/campaigns";
import { CampaignRowMenu, FolderMenu } from "./row-menu";

export const dynamic = "force-dynamic";

const SECTIONS: Array<{ status: CampaignStatus; label: string; icon: typeof Clock; chip: string }> = [
  { status: "RUNNING", label: "Em andamento", icon: Clock, chip: "bg-brand-gradient text-white" },
  { status: "SCHEDULED", label: "Agendadas", icon: CalendarClock, chip: "bg-sky-100 text-sky-700" },
  { status: "PAUSED", label: "Pausadas", icon: Pause, chip: "bg-amber-100 text-amber-700" },
  { status: "DRAFT", label: "Rascunhos", icon: FileEdit, chip: "bg-zinc-200 text-zinc-700" },
  { status: "COMPLETED", label: "Concluídas", icon: Send, chip: "bg-emerald-100 text-emerald-700" },
  { status: "CANCELLED", label: "Canceladas", icon: XCircle, chip: "bg-zinc-200 text-zinc-600" },
];

// Faixa colorida do lado de cada campanha, pela situação
const STRIPE: Record<CampaignStatus, string> = {
  RUNNING: "bg-brand-gradient",
  SCHEDULED: "bg-sky-400",
  PAUSED: "bg-amber-400",
  DRAFT: "bg-zinc-300",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-zinc-300",
};

function Pill({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${cls}`}>
      {label} <b className="tabular-nums">{value}</b>
    </span>
  );
}

type Stats = { total: number; sent: number; delivered: number; read: number; clicked: number; failed: number };
type Row = Campaign & { group: { name: string } | null };

export default async function CampaignsPage() {
  const auth = await requireAuth();
  const [campaigns, folders] = await Promise.all([
    prisma.campaign.findMany({ where: { workspaceId: auth.workspace.id, funnelId: null }, include: { group: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 1000 }),
    prisma.campaignFolder.findMany({ where: { workspaceId: auth.workspace.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const ids = campaigns.map((c) => c.id);
  const rows = ids.length
    ? await prisma.$queryRaw<Array<{ id: string; total: bigint; sent: bigint; delivered: bigint; read: bigint; clicked: bigint; failed: bigint }>>`
        SELECT "campaignId" AS id, COUNT(*) AS total,
          COUNT(*) FILTER (WHERE "sentAt" IS NOT NULL) AS sent,
          COUNT(*) FILTER (WHERE "deliveredAt" IS NOT NULL) AS delivered,
          COUNT(*) FILTER (WHERE "readAt" IS NOT NULL) AS read,
          COUNT(*) FILTER (WHERE "clickCount" > 0) AS clicked,
          COUNT(*) FILTER (WHERE status = 'FAILED') AS failed
        FROM "CampaignRecipient" WHERE "campaignId" = ANY(${ids}) GROUP BY "campaignId"`
    : [];
  const stats = new Map<string, Stats>(
    rows.map((r) => [r.id, { total: Number(r.total), sent: Number(r.sent), delivered: Number(r.delivered), read: Number(r.read), clicked: Number(r.clicked), failed: Number(r.failed) }]),
  );
  const folderList = folders.map((f) => ({ id: f.id, name: f.name }));
  const loose = campaigns.filter((c) => !c.folderId);

  const row = (c: Row) => {
    const s = stats.get(c.id);
    return (
      <div key={c.id} className="group relative flex items-center gap-2 border-b border-zinc-100 pr-3 last:border-0 hover:bg-orange-50/40">
        <span aria-hidden className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${STRIPE[c.status]}`} />
        <Link href={`/campanhas/${c.id}?etapa=${c.status === "DRAFT" ? "template" : "metricas"}`} className="flex min-w-0 flex-1 flex-wrap items-center gap-3 px-5 py-4">
          <div className="min-w-56 flex-1">
            <div className="font-semibold text-zinc-900 group-hover:text-brand-700">{c.name}</div>
            <div className="text-xs text-zinc-500">
              {c.templateName ?? "sem template"} · {c.group?.name ?? "sem grupo"} · {c.createdAt.toLocaleDateString("pt-BR")}
              {c.pausedReason && <span className="font-medium text-amber-700"> · {c.pausedReason}</span>}
            </div>
            {s && s.total > 0 && (
              <div className="mt-2 h-1.5 max-w-72 overflow-hidden rounded-full bg-zinc-100" title={`${pct(s.sent, s.total)} enviado`}>
                <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.min(100, (s.sent / s.total) * 100)}%` }} />
              </div>
            )}
          </div>
          {s && s.total > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Pill label="Enviadas" value={`${s.sent.toLocaleString("pt-BR")}/${s.total.toLocaleString("pt-BR")}`} cls="bg-orange-50 text-orange-800" />
              <Pill label="Entregues" value={pct(s.delivered, s.sent)} cls="bg-emerald-50 text-emerald-800" />
              <Pill label="Lidas" value={pct(s.read, s.sent)} cls="bg-sky-50 text-sky-800" />
              <Pill label="Cliques" value={pct(s.clicked, s.sent)} cls="bg-violet-50 text-violet-800" />
              {s.failed > 0 && <Badge color="red">{s.failed.toLocaleString("pt-BR")} falhas</Badge>}
            </div>
          )}
          <CampaignStatusBadge s={c.status} />
        </Link>
        <CampaignRowMenu id={c.id} name={c.name} running={c.status === "RUNNING"} folderId={c.folderId} folders={folderList} />
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Campanhas"
        description="Disparos de templates de utilidade distribuídos entre os números de um grupo de BM. Use o menu ⋮ para guardar campanhas em pastas ou excluir."
        actions={<LinkButton href="/campanhas/nova"><Plus className="size-4" /> Criar campanha</LinkButton>}
      />

      {campaigns.length === 0 && <Empty icon={<Send className="size-5" />}>Nenhuma campanha ainda. Crie a primeira!</Empty>}

      {loose.length > 0 && (
        <div className="overflow-visible rounded-2xl border border-zinc-200/70 bg-white shadow-soft">
          {SECTIONS.map(({ status, label, icon: Icon, chip }) => {
            const list = loose.filter((c) => c.status === status);
            if (!list.length) return null;
            return (
              <div key={status}>
                <div className="flex items-center gap-2.5 border-b border-zinc-100 bg-zinc-50 px-5 py-2.5 text-sm font-semibold text-zinc-800 first:rounded-t-2xl">
                  <span className={`flex size-6 items-center justify-center rounded-md ${chip}`}><Icon className="size-3.5" /></span> {label}
                  <span className="rounded-full bg-white px-2 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">{list.length}</span>
                </div>
                {list.map(row)}
              </div>
            );
          })}
        </div>
      )}

      {folders.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">Pastas</h2>
          <div className="space-y-3">
            {folders.map((f) => {
              const list = campaigns.filter((c) => c.folderId === f.id);
              const sent = list.reduce((a, c) => a + (stats.get(c.id)?.sent ?? 0), 0);
              return (
                <details key={f.id} className="group/folder overflow-visible rounded-2xl border border-zinc-200/70 bg-white shadow-soft">
                  <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-5 py-3.5 hover:bg-zinc-50/70 [&::-webkit-details-marker]:hidden">
                    <ChevronRight className="size-4 text-zinc-400 transition group-open/folder:rotate-90" />
                    <div className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Folder className="size-4" /></div>
                    <span className="flex-1 font-medium">{f.name}</span>
                    <span className="text-xs text-zinc-500">{list.length} campanha{list.length === 1 ? "" : "s"} · {sent.toLocaleString("pt-BR")} enviadas</span>
                    <FolderMenu id={f.id} name={f.name} onRename={renameFolderAction} onDelete={deleteFolderAction} />
                  </summary>
                  <div className="border-t border-zinc-100">
                    {list.length ? list.map(row) : <div className="px-5 py-4 text-sm text-zinc-500">Pasta vazia.</div>}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
