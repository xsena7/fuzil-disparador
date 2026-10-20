import { AlertTriangle, ChevronRight, Info, Siren } from "lucide-react";
import clsx from "clsx";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Empty, PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/action-form";
import { markAlertsReadAction } from "@/app/actions/misc";
import { EnableBrowserNotifications } from "@/components/alert-toaster";
import { explainAlert } from "@/lib/explain";

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
        description="Clique num alerta para ver o detalhe e o que fazer."
        actions={<><EnableBrowserNotifications /><ConfirmButton action={markAlertsReadAction}>Marcar todos como lidos</ConfirmButton></>}
      />
      <div className="mb-4 flex gap-2 text-sm">
        {[["", "Todos"], ["CRITICAL", "Críticos"], ["WARNING", "Atenção"], ["INFO", "Informativos"]].map(([v, l]) => (
          <a key={v} href={v ? `?nivel=${v}` : "?"} className={clsx("rounded-full border px-3 py-1", (nivel ?? "") === v ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white")}>{l}</a>
        ))}
      </div>
      {alerts.length === 0 && <Empty>Nenhum alerta.</Empty>}
      {alerts.length > 0 && (
        <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {alerts.map((a) => {
            const Icon = icon[a.severity];
            const ex = a.severity === "INFO" ? null : explainAlert(a);
            return (
              // Uma linha por alerta; o detalhe abre ao clicar
              <details key={a.id} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
                  <Icon className={clsx("size-4 shrink-0", a.severity === "CRITICAL" ? "text-red-600" : a.severity === "WARNING" ? "text-amber-600" : "text-sky-600")} />
                  <span className={clsx("min-w-0 flex-1 truncate text-sm", a.readAt ? "text-zinc-600" : "font-medium text-zinc-900")}>{a.title}</span>
                  {!a.readAt && <span className="size-2 shrink-0 rounded-full bg-red-500" />}
                  <span className="shrink-0 text-xs text-zinc-400">{a.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  <ChevronRight className="size-4 shrink-0 text-zinc-300 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-11 pb-4 text-sm">
                  <p className="text-zinc-600">{a.message}</p>
                  {ex && ex.urgency !== "INFO" && <p className="mt-1.5 text-zinc-500"><b className="text-zinc-700">O que fazer:</b> {ex.action}</p>}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
