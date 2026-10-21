import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { campaignMetrics, duration, pct } from "@/lib/campaign-metrics";
import { Logo } from "@/components/brand";
import { AutoRefresh } from "@/app/(app)/campanhas/[id]/auto-refresh";
import { Funnel, MiniBar, OutcomeBar, PrintButton, Ring } from "./charts";

export const dynamic = "force-dynamic";

const n = (v: number) => v.toLocaleString("pt-BR");
const when = (d: Date | null | undefined) =>
  d ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "—";

const STATUS: Record<string, string> = { RUNNING: "Enviando", COMPLETED: "Concluída", PAUSED: "Pausada", SCHEDULED: "Agendada", CANCELLED: "Cancelada", DRAFT: "Rascunho" };

/** Relatório da campanha para mostrar/compartilhar: interativo na tela e pronto para salvar em PDF. */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, workspaceId: auth.workspace.id }, include: { group: { select: { name: true, system: true } } } });
  if (!campaign) notFound();
  const m = await campaignMetrics(id);
  const t = m.totals;
  const [read, delivered] = [t.read, t.delivered];
  // Resultado final pelo status de cada contato (soma sempre o público inteiro)
  const byStatus = await prisma.campaignRecipient.groupBy({ by: ["status"], where: { campaignId: id }, _count: true });
  const st = (k: string) => byStatus.find((x) => x.status === k)?._count ?? 0;
  const noWa = await prisma.campaignRecipient.count({ where: { campaignId: id, status: "FAILED", errorCode: 131026 } });
  const origin = campaign.group?.system?.startsWith("BM:") ? `Só a BM ${campaign.group.name}` : campaign.group ? campaign.group.name : "—";
  const elapsed = t.firstSent && t.lastSent ? (t.lastSent.getTime() - t.firstSent.getTime()) / 1000 : null;
  const maxSender = Math.max(1, ...m.senders.map((s) => s.sent));
  const maxErr = Math.max(1, ...m.errors.map((e) => e.count));
  const maxReply = Math.max(1, ...m.topReplies.map((r) => r.count));

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 print:bg-white">
      {campaign.status === "RUNNING" && <AutoRefresh every={4000} />}
      <style>{"@media print { @page { margin: 12mm } .report-card { break-inside: avoid } }"}</style>

      {/* Topo escuro com a marca e o número principal */}
      <header className="relative overflow-hidden bg-[#0b0b0f] text-white print:[print-color-adjust:exact]">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-[#ff6a1f]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-[#ef2d56]/15 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8">
          <div className="mb-8 flex items-center justify-between gap-3">
            <Logo className="h-7 w-auto" />
            <div className="flex items-center gap-2 print:hidden">
              <Link href={`/campanhas/${id}?step=metricas`} className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10">Voltar</Link>
              <PrintButton />
            </div>
          </div>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium">Relatório de envio</span>
                <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-medium">
                  <span className={`size-1.5 rounded-full ${campaign.status === "RUNNING" ? "animate-pulse bg-emerald-400" : campaign.status === "COMPLETED" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {STATUS[campaign.status] ?? campaign.status}
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{campaign.name}</h1>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                {[
                  ["Template", campaign.templateName ?? "—"],
                  ["Origem", origin],
                  ["Início", when(t.firstSent ?? campaign.startedAt)],
                  ["Duração", duration(elapsed)],
                ].map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{k}</dt>
                    <dd className="truncate font-medium text-zinc-100" title={v}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <Ring value={delivered} total={t.sent} label="entregues" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-5 py-8 sm:px-8">
        {/* Números principais */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { k: "Público", v: t.total, s: t.pending ? `${n(t.pending)} na fila` : "contatos na lista" },
            { k: "Enviadas", v: t.sent, s: pct(t.sent, t.total) + " do público" },
            { k: "Entregues", v: delivered, s: pct(delivered, t.sent) + " das enviadas", hi: true },
            { k: "Lidas", v: read, s: pct(read, delivered) + " das entregues" },
            { k: "Cliques", v: t.clicked, s: `${n(t.clicks)} cliques no total` },
            { k: "Respostas", v: t.replied, s: pct(t.replied, delivered) + " das entregues" },
          ].map((x) => (
            <div key={x.k} className={`report-card rounded-2xl border bg-white p-4 shadow-sm ${x.hi ? "border-orange-200 ring-1 ring-orange-100" : "border-zinc-200"}`}>
              <div className="text-xs font-medium text-zinc-500">{x.k}</div>
              <div className={`mt-1 text-2xl font-bold tabular-nums ${x.hi ? "text-brand-gradient" : "text-zinc-900"}`}>{n(x.v)}</div>
              <div className="mt-0.5 text-[11px] text-zinc-500">{x.s}</div>
            </div>
          ))}
        </section>

        <section className="report-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-zinc-900">Funil da campanha</h2>
          <p className="mb-2 text-sm text-zinc-500">De quem estava na lista até quem respondeu. Passe o mouse em cada etapa.</p>
          <Funnel
            steps={[
              { key: "total", label: "Público", value: t.total, hint: "Contatos válidos da lista (sem repetidos e sem descadastrados)." },
              { key: "sent", label: "Enviadas", value: t.sent, hint: "A Meta aceitou a mensagem." },
              { key: "delivered", label: "Entregues", value: delivered, hint: "Chegou no celular da pessoa." },
              { key: "read", label: "Lidas", value: read, hint: "A pessoa abriu (só conta quem deixa a confirmação de leitura ligada)." },
              { key: "clicked", label: "Clicaram", value: t.clicked, hint: "Clicaram no botão do link." },
              { key: "replied", label: "Responderam", value: t.replied, hint: "Mandaram alguma mensagem de volta." },
            ]}
          />
        </section>

        <section className="report-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-zinc-900">Como terminou cada mensagem</h2>
          <p className="mb-4 text-sm text-zinc-500">O resultado final de cada contato da lista.</p>
          <OutcomeBar
            items={[
              { key: "read", label: "Lida", value: st("READ"), color: "#047857" },
              { key: "delivered", label: "Entregue (não lida)", value: st("DELIVERED"), color: "#34d399" },
              { key: "sent", label: "Enviada, sem confirmação", value: st("SENT"), color: "#38bdf8" },
              { key: "undeliverable", label: "Não entregue (sem WhatsApp/bloqueou)", value: noWa, color: "#f59e0b" },
              { key: "failed", label: "Falhou", value: Math.max(0, st("FAILED") - noWa), color: "#e11d48" },
              { key: "other", label: "Na fila / não enviada", value: st("PENDING") + st("SENDING") + st("SKIPPED"), color: "#a1a1aa" },
            ]}
          />
        </section>

        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {[
            ["Até entregar", m.timing.deliver],
            ["Até ler", m.timing.read],
            ["Até clicar", m.timing.click],
          ].map(([k, v]) => (
            <div key={k as string} className="report-card rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="text-xs font-medium text-zinc-500"><span className="hidden sm:inline">Tempo mediano </span>{String(k).replace("Até", "até")}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{duration(v as number | null)}</div>
            </div>
          ))}
        </div>

        <section className="report-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 font-semibold text-zinc-900">Desempenho por número</h2>
          {m.senders.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhuma mensagem enviada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500">
                    <th className="pb-2 font-medium">Número</th>
                    <th className="pb-2 font-medium">Enviadas</th>
                    <th className="pb-2 text-right font-medium">Entrega</th>
                    <th className="pb-2 text-right font-medium">Lidas</th>
                    <th className="pb-2 text-right font-medium">Falhas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {m.senders.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-zinc-900">{s.display}</div>
                        <div className="truncate text-xs text-zinc-500">{s.business}</div>
                      </td>
                      <td className="w-2/5 py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <MiniBar value={s.sent} max={maxSender} />
                          <span className="w-12 text-right tabular-nums">{n(s.sent)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{pct(s.delivered, s.sent)}</td>
                      <td className="py-2.5 text-right tabular-nums">{pct(s.read, s.delivered)}</td>
                      <td className={`py-2.5 text-right tabular-nums ${s.failed ? "text-rose-600" : ""}`}>{n(s.failed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="report-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 font-semibold text-zinc-900">Motivos de falha</h2>
            {m.errors.length === 0 ? (
              <p className="text-sm text-emerald-700">Nenhuma falha nessa campanha.</p>
            ) : (
              <ul className="space-y-3">
                {m.errors.slice(0, 8).map((e, i) => (
                  <li key={i}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="line-clamp-2 text-zinc-700">{e.title}</span>
                      <b className="shrink-0 tabular-nums text-zinc-900">{n(e.count)}</b>
                    </div>
                    <MiniBar value={e.count} max={maxErr} tone="red" />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="report-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 font-semibold text-zinc-900">Respostas mais comuns</h2>
            {m.topReplies.length === 0 ? (
              <p className="text-sm text-zinc-500">Ninguém respondeu ainda.</p>
            ) : (
              <ul className="space-y-3">
                {m.topReplies.slice(0, 8).map((r, i) => (
                  <li key={i}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="truncate text-zinc-700">&ldquo;{r.text}&rdquo;</span>
                      <b className="shrink-0 tabular-nums text-zinc-900">{n(r.count)}</b>
                    </div>
                    <MiniBar value={r.count} max={maxReply} tone="green" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 pt-4 text-xs text-zinc-400">
          <span>Gerado pelo Fuzil Disparador em {when(new Date())}</span>
          <span>{n(t.credits)} créditos usados{t.optedOut ? ` · ${n(t.optedOut)} descadastraram` : ""}</span>
        </footer>
      </main>
    </div>
  );
}
