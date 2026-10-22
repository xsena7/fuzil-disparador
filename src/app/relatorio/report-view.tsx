import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { campaignMetrics, duration, pct } from "@/lib/campaign-metrics";
import { Logo } from "@/components/brand";
import { AutoRefresh } from "@/app/(app)/campanhas/[id]/auto-refresh";
import { Countdown } from "@/components/countdown";
import { keysForReport, parsePixKeys } from "@/lib/pix-keys";
import { Funnel, MiniBar, OutcomeBar, PixCopy, PrintButton, Ring } from "./charts";

const n = (v: number) => v.toLocaleString("pt-BR");
const when = (d: Date | null | undefined) =>
  d ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "—";

const STATUS: Record<string, string> = { RUNNING: "Enviando", COMPLETED: "Concluída", PAUSED: "Pausada", SCHEDULED: "Agendada", CANCELLED: "Cancelada", DRAFT: "Rascunho" };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Relatório da campanha: interativo na tela e pronto para salvar em PDF.
 * `publicView` = link do cliente (sem login): esconde o grupo de BM e o botão Voltar.
 */
export async function ReportView({ id, workspaceId, publicView = false, expiresAt }: { id: string; workspaceId?: string; publicView?: boolean; expiresAt?: Date | null }) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, ...(workspaceId ? { workspaceId } : {}) },
    include: { group: { select: { name: true, system: true } }, workspace: { select: { pixKeys: true, reportPrice: true } } },
  });
  if (!campaign) notFound();
  const m = await campaignMetrics(id);
  const t = m.totals;
  const read = t.read;
  // Resultado final pelo status de cada contato (soma sempre o público inteiro)
  const byStatus = await prisma.campaignRecipient.groupBy({ by: ["status"], where: { campaignId: id }, _count: true });
  const st = (k: string) => byStatus.find((x) => x.status === k)?._count ?? 0;
  const noWa = await prisma.campaignRecipient.count({ where: { campaignId: id, status: "FAILED", errorCode: 131026 } });
  const origin = campaign.group?.system?.startsWith("BM:") ? `Só a BM ${campaign.group.name}` : campaign.group ? campaign.group.name : "—";
  const elapsed = t.firstSent && t.lastSent ? (t.lastSent.getTime() - t.firstSent.getTime()) / 1000 : null;
  const maxErr = Math.max(1, ...m.errors.map((e) => e.count));
  const maxReply = Math.max(1, ...m.topReplies.map((r) => r.count));

  // Link do cliente ligado: mostra quanto tempo ele ainda fica no ar
  const linkExp = (expiresAt ?? (campaign.shareToken && campaign.shareExpiresAt && campaign.shareExpiresAt > new Date() ? campaign.shareExpiresAt : null));
  // Cobrança: enviadas × valor por mensagem (o da campanha ou o padrão da conta) e o Pix com o valor
  const ws = campaign.workspace;
  const price = campaign.reportPrice ?? ws.reportPrice ?? 0;
  const total = Math.round(t.sent * price * 100) / 100;
  const allKeys = parsePixKeys(ws.pixKeys);
  const keys = total > 0 ? keysForReport(allKeys, campaign.reportPixKeyId) : [];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 print:bg-white">
      {/* Ao vivo: rápido enquanto envia; no link do cliente continua atualizando (leituras, cliques, respostas) */}
      {campaign.status === "RUNNING" ? <AutoRefresh every={4000} /> : publicView && <AutoRefresh every={15000} />}
      <style>{"@media print { @page { margin: 12mm } .report-card { break-inside: avoid } }"}</style>

      {/* Topo escuro com a marca e o número principal */}
      <header className="relative overflow-hidden bg-[#0b0b0f] text-white print:[print-color-adjust:exact]">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-[#ff6a1f]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-[#ef2d56]/15 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8">
          <div className="mb-8 flex items-center justify-between gap-3">
            <Logo className="h-7 w-auto" />
            <div className="flex items-center gap-2 print:hidden">
              {!publicView && <Link href={`/campanhas/${id}?etapa=relatorio`} className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10">Voltar</Link>}
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
                {linkExp && (
                  <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-medium text-orange-200 print:hidden">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> Ao vivo · sai do ar em <Countdown to={linkExp.toISOString()} done="instantes" />
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{campaign.name}</h1>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                {[
                  ["Template", campaign.templateName ?? "—"],
                  ...(publicView ? [] : [["Origem", origin]]),
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
            <Ring value={t.sent} total={t.total} label="enviadas" />
          </div>
        </div>
      </header>

      {linkExp && (
        <div className="border-b border-orange-200 bg-orange-50 print:hidden">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-5 py-3 text-sm text-orange-900 sm:px-8">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            Relatório ao vivo. Este link sai do ar em
            <b className="rounded-lg bg-white px-2 py-0.5 font-mono text-base text-orange-700 ring-1 ring-orange-200">
              <Countdown to={linkExp.toISOString()} done="instantes" />
            </b>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl space-y-5 px-5 py-8 sm:px-8">
        {/* Números principais */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { k: "Público", v: t.total, s: t.pending ? `${n(t.pending)} na fila` : "contatos na lista" },
            { k: "Enviadas", v: t.sent, s: pct(t.sent, t.total) + " do público", hi: true },
            { k: "Lidas", v: read, s: pct(read, t.sent) + " das enviadas" },
            { k: "Cliques", v: t.clicked, s: `${n(t.clicks)} cliques no total` },
            { k: "Respostas", v: t.replied, s: pct(t.replied, t.sent) + " das enviadas" },
          ].map((x) => (
            <div key={x.k} className={`report-card rounded-2xl border bg-white p-4 shadow-sm ${x.hi ? "border-orange-200 ring-1 ring-orange-100" : "border-zinc-200"}`}>
              <div className="text-xs font-medium text-zinc-500">{x.k}</div>
              <div className={`mt-1 text-2xl font-bold tabular-nums ${x.hi ? "text-brand-gradient" : "text-zinc-900"}`}>{n(x.v)}</div>
              <div className="mt-0.5 text-[11px] text-zinc-500">{x.s}</div>
            </div>
          ))}
        </section>

        {keys.length ? (
          <section className="report-card overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
            <div className="p-5 sm:p-6">
              <h2 className="font-semibold text-zinc-900">Valor desta campanha</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {n(t.sent)} mensagens enviadas × {brl(price)} por mensagem
              </p>
              <div className="mt-3 text-4xl font-bold tracking-tight text-brand-gradient">{brl(total)}</div>
              <div className={`mt-5 grid gap-4 ${keys.length > 1 ? "md:grid-cols-2" : "max-w-xl"}`}>
                {keys.map((k) => (
                  <div key={k.id} className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
                    <div className="mb-2 text-xs font-medium text-zinc-500">{keys.length > 1 ? "Chave Pix" : "Pague por Pix com esta chave"}</div>
                    <PixCopy code={k.key} label="Copiar chave Pix" />
                    <p className="mt-2 text-xs text-zinc-500">
                      Recebedor: <b className="text-zinc-700">{k.name}</b>
                      {k.bank && <> · Banco: <b className="text-zinc-700">{k.bank}</b></>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          !publicView &&
          price > 0 &&
          !allKeys.length && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 print:hidden">
              Valor desta campanha: <b>{brl(total)}</b>. Cadastre sua chave Pix em Configurações para o cliente poder pagar direto pelo relatório.
            </p>
          )
        )}

        <section className="report-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-zinc-900">Funil da campanha</h2>
          <p className="mb-2 text-sm text-zinc-500">De quem estava na lista até quem respondeu. Passe o mouse em cada etapa.</p>
          <Funnel
            steps={[
              { key: "total", label: "Público", value: t.total, hint: "Contatos válidos da lista (sem repetidos e sem descadastrados)." },
              { key: "sent", label: "Enviadas", value: t.sent, hint: "A Meta aceitou a mensagem." },
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
              { key: "sent", label: "Enviada (ainda não lida)", value: st("DELIVERED") + st("SENT"), color: "#38bdf8" },
              { key: "undeliverable", label: "Sem WhatsApp ou bloqueou", value: noWa, color: "#f59e0b" },
              { key: "failed", label: "Falhou", value: Math.max(0, st("FAILED") - noWa), color: "#e11d48" },
              { key: "other", label: "Na fila / não enviada", value: st("PENDING") + st("SENDING") + st("SKIPPED"), color: "#a1a1aa" },
            ]}
          />
        </section>

        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          {[
            ["Até ler", m.timing.read],
            ["Até clicar", m.timing.click],
          ].map(([k, v]) => (
            <div key={k as string} className="report-card rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="text-xs font-medium text-zinc-500"><span className="hidden sm:inline">Tempo mediano </span>{String(k).replace("Até", "até")}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{duration(v as number | null)}</div>
            </div>
          ))}
        </div>


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
