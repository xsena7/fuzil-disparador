import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { campaignMetrics, duration, pct } from "@/lib/campaign-metrics";
import { Logo } from "@/components/brand";
import { AutoRefresh } from "@/app/(app)/campanhas/[id]/auto-refresh";
import { Countdown } from "@/components/countdown";
import { keysForReport, parsePixKeys } from "@/lib/pix-keys";
import { reportNumbers } from "@/lib/report-numbers";
import { formatPhone } from "@/lib/phone";
import { Funnel, PixCopy, PrintButton, Ring } from "./charts";

const n = (v: number) => v.toLocaleString("pt-BR");
const when = (d: Date | null | undefined) =>
  d ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "—";

const STATUS: Record<string, string> = { RUNNING: "Enviando", COMPLETED: "Concluída", PAUSED: "Pausada", SCHEDULED: "Agendada", CANCELLED: "Cancelada", DRAFT: "Rascunho" };

// Resposta sem texto (áudio, foto...): mostra o tipo
const TYPE_PT: Record<string, string> = { audio: "🎤 Áudio", image: "📷 Foto", video: "🎬 Vídeo", document: "📄 Documento", sticker: "Figurinha", location: "📍 Localização", contacts: "👤 Contato" };

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
  // Números do relatório: os reais ou os ajustados pelo dono em Métricas (tudo abaixo usa esses)
  const r = await reportNumbers(id, campaign.reportOverrides);
  const origin = campaign.group?.system?.startsWith("BM:") ? `Só a BM ${campaign.group.name}` : campaign.group ? campaign.group.name : "—";
  const elapsed = t.firstSent && t.lastSent ? (t.lastSent.getTime() - t.firstSent.getTime()) / 1000 : null;

  // Link do cliente ligado: mostra quanto tempo ele ainda fica no ar
  const linkExp = (expiresAt ?? (campaign.shareToken && campaign.shareExpiresAt && campaign.shareExpiresAt > new Date() ? campaign.shareExpiresAt : null));
  // Cobrança: enviadas × valor por mensagem (o da campanha ou o padrão da conta) e o Pix com o valor
  const ws = campaign.workspace;
  const price = campaign.reportPrice ?? ws.reportPrice ?? 0;
  const total = Math.round(r.sent * price * 100) / 100;
  const allKeys = parsePixKeys(ws.pixKeys);
  // Quem respondeu: as respostas do disparo (mais novas primeiro), num quadro com rolagem
  const replies = await prisma.$queryRaw<Array<{ id: string; text: string | null; type: string; at: Date; phone: string; name: string | null }>>`
    SELECT i.id, i.text, i.type, i."receivedAt" AS at, r.phone, r.name
    FROM "InboundMessage" i JOIN "CampaignRecipient" r ON r.id = i."recipientId"
    WHERE r."campaignId" = ${id} AND i.type <> 'reaction'
    ORDER BY i."receivedAt" DESC
    LIMIT 1000`;
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
            <Ring value={r.sent} total={r.total} label="enviadas" />
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

        {/* Números do disparo (os mesmos do valor e do funil) */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { k: "Público", v: r.total, s: "contatos na lista" },
            { k: "Enviadas", v: r.sent, s: pct(r.sent, r.total) + " do público", hi: true },
            { k: "Lidas", v: r.read, s: pct(r.read, r.sent) + " das enviadas" },
            { k: "Cliques", v: r.clicked, s: pct(r.clicked, r.sent) + " das enviadas" },
            { k: "Respostas", v: r.replied, s: pct(r.replied, r.sent) + " das enviadas" },
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
                {n(r.sent)} mensagens enviadas × {brl(price)} por mensagem
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
              { key: "total", label: "Público", value: r.total, hint: "Contatos válidos da lista (sem repetidos e sem descadastrados)." },
              { key: "sent", label: "Enviadas", value: r.sent, hint: "A Meta aceitou a mensagem." },
              { key: "read", label: "Lidas", value: r.read, hint: "A pessoa abriu (só conta quem deixa a confirmação de leitura ligada)." },
              { key: "clicked", label: "Clicaram", value: r.clicked, hint: "Clicaram no botão do link." },
              { key: "replied", label: "Responderam", value: r.replied, hint: "Mandaram alguma mensagem de volta." },
            ]}
          />
        </section>

        {replies.length > 0 && (
          <section className="report-card rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="p-5 pb-3 sm:p-6 sm:pb-3">
              <h2 className="font-semibold text-zinc-900">Quem respondeu</h2>
              <p className="text-sm text-zinc-500">As respostas que chegaram deste disparo, das mais novas para as mais antigas.</p>
            </div>
            {/* Mostra umas 10 e o resto na rolagem (no PDF sai tudo) */}
            <div className="max-h-[44rem] overflow-y-auto border-t border-zinc-100 print:max-h-none print:overflow-visible">
              <ul className="divide-y divide-zinc-100">
                {replies.map((x) => (
                  <li key={x.id} className="flex gap-3 px-5 py-3 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <b className="font-semibold text-zinc-900">{x.name || "Sem nome"}</b>
                        <span className="tabular-nums text-zinc-500">{formatPhone(x.phone)}</span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-zinc-700">{x.text || TYPE_PT[x.type] || "Mensagem"}</p>
                    </div>
                    <span className="shrink-0 pt-0.5 text-xs tabular-nums text-zinc-400">{when(x.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 pt-4 text-xs text-zinc-400">
          <span>Gerado pelo Fuzil Disparador em {when(new Date())}</span>
          {/* Números ajustados: nada real aparece no relatório (nem os créditos, que mostrariam as enviadas reais) */}
          {!publicView && !r.adjusted && <span>{n(t.credits)} créditos usados{t.optedOut ? ` · ${n(t.optedOut)} descadastraram` : ""}</span>}
        </footer>
      </main>
    </div>
  );
}
