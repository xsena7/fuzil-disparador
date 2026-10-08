import { AlertTriangle, Info, Siren } from "lucide-react";
import clsx from "clsx";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Empty, PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/action-form";
import { markAlertsReadAction } from "@/app/actions/misc";
import { EnableBrowserNotifications } from "@/components/alert-toaster";

export const dynamic = "force-dynamic";

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ nivel?: string }> }) {
  const auth = await requireAuth();
  const { nivel } = await searchParams;
  const alerts = await prisma.alert.findMany({
    where: { workspaceId: auth.workspace.id, ...(nivel ? { severity: nivel as never } : {}) },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const icon = { CRITICAL: Siren, WARNING: AlertTriangle, INFO: Info };
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Alertas"
        description="Recategorização de templates, qualidade e limite dos números, campanhas pausadas e mais. Os novos alertas também aparecem como notificação na tela enquanto o painel estiver aberto."
        actions={<><EnableBrowserNotifications /><ConfirmButton action={markAlertsReadAction}>Marcar todos como lidos</ConfirmButton></>}
      />
      <div className="mb-4 flex gap-2 text-sm">
        {[["", "Todos"], ["CRITICAL", "Críticos"], ["WARNING", "Atenção"], ["INFO", "Informativos"]].map(([v, l]) => (
          <a key={v} href={v ? `?nivel=${v}` : "?"} className={clsx("rounded-full border px-3 py-1", (nivel ?? "") === v ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white")}>{l}</a>
        ))}
      </div>
      {alerts.length === 0 && <Empty>Nenhum alerta.</Empty>}
      <div className="space-y-2">
        {alerts.map((a) => {
          const Icon = icon[a.severity];
          return (
            <div key={a.id} className={clsx("flex gap-3 rounded-xl border bg-white p-4", a.severity === "CRITICAL" ? "border-red-200" : a.severity === "WARNING" ? "border-amber-200" : "border-zinc-200", !a.readAt && "shadow-sm")}>
              <Icon className={clsx("mt-0.5 size-5 shrink-0", a.severity === "CRITICAL" ? "text-red-600" : a.severity === "WARNING" ? "text-amber-600" : "text-sky-600")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.title}</span>
                  {!a.readAt && <span className="size-2 rounded-full bg-red-500" />}
                </div>
                <p className="text-zinc-600">{a.message}</p>
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{a.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
