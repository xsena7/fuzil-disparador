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
  // Alertas antigos de número não diziam a BM: descobre pelo número do título (os novos já trazem no texto)
  const phoneIn = (t: string) => t.match(/\+?\d[\d\s()-]{8,}\d/)?.[0].replace(/\D/g, "") ?? null;
  const wanted = [...new Set(alerts.map((a) => phoneIn(a.title)).filter((x): x is string => Boolean(x)))];
  const phones = wanted.length
    ? await prisma.phoneNumber.findMany({ where: { waba: { workspaceId: auth.workspace.id } }, select: { displayPhoneNumber: true, waba: { select: { business: { select: { name: true } } } } } })
    : [];
  const bmOf = new Map(phones.map((p) => [p.displayPhoneNumber.replace(/\D/g, ""), p.waba.business.name]));
  const bmFor = (title: string) => {
    const d = phoneIn(title);
    const bm = d ? bmOf.get(d) : undefined;
    return bm && !title.includes(bm) ? bm : null;
  };
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Alertas"
        description="Clique num alerta para ver o detalhe e o que fazer."
        actions={<><EnableBrowserNotifications /><ConfirmButton action={markAlertsReadAction}>Marcar todos como lidos</ConfirmButton></>}
      />
      <div className="mb-4 flex gap-2 text-sm">
        {[["", "Todos"], ["CRITICAL", "Críticos"], ["WARNING", "Atenção"], ["INFO", "Informativos"]].map(([v, l]) => (
          <a key={v} href={v ? `?nivel=${v}` : "?"} className={clsx("rounded-full border px-3.5 py-1.5 font-medium transition", (nivel ?? "") === v ? "border-transparent bg-brand-gradient text-white shadow-sm shadow-orange-500/30" : "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100")}>{l}</a>
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
              <details key={a.id} className={clsx("group border-l-4", a.severity === "CRITICAL" ? "border-l-red-500" : a.severity === "WARNING" ? "border-l-amber-400" : "border-l-sky-400")}>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-orange-50/50 [&::-webkit-details-marker]:hidden">
                  <span className={clsx("flex size-7 shrink-0 items-center justify-center rounded-lg", a.severity === "CRITICAL" ? "bg-red-100 text-red-600" : a.severity === "WARNING" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-600")}>
                    <Icon className="size-4" />
                  </span>
                  <span className={clsx("min-w-0 flex-1 truncate text-sm", a.readAt ? "text-zinc-600" : "font-medium text-zinc-900")}>
                    {a.title}
                    {bmFor(a.title) && <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{/^bm\b/i.test(bmFor(a.title)!) ? "" : "BM "}{bmFor(a.title)}</span>}
                  </span>
                  {!a.readAt && <span className="size-2 shrink-0 rounded-full bg-red-500" />}
                  <span className="shrink-0 text-xs text-zinc-400">{a.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  <ChevronRight className="size-4 shrink-0 text-zinc-300 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-14 pb-4 text-sm">
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
