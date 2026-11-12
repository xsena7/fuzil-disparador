import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { campaignMetrics, duration, pct } from "@/lib/campaign-metrics";
import { Logo } from "@/components/brand";
import { AutoRefresh } from "@/app/(app)/campanhas/[id]/auto-refresh";
import { Countdown } from "@/components/countdown";
import { keysForReport, parsePixKeys } from "@/lib/pix-keys";
import { reportNumbers } from "@/lib/report-numbers";
import { campaignReplies } from "@/lib/campaign-replies";
import { CountUp, Funnel, PixCopy, PrintButton, Ring } from "./charts";
import "./report.css";
import { Download, MousePointerClick } from "lucide-react";
import { ReplyList } from "./replies";

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
    include: { group: { select: { name: true, system: true } }, workspace: { select: { pixKeys: true, reportPrice: true } }, reportBrand: true },
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
  // Só cobra se o valor foi preenchido nesta campanha (em branco = o relatório não mostra valor nem Pix)
  const price = campaign.reportPrice ?? 0;
  const total = Math.round(r.sent * price * 100) / 100;
  const allKeys = parsePixKeys(ws.pixKeys);
  // Quem respondeu: as respostas do disparo (mais novas primeiro), num quadro com rolagem
  const replies = await campaignReplies(id);
  const keys = total > 0 ? keysForReport(allKeys, campaign.reportPixKeyId) : [];
  // Marca do revendedor (se escolhida na campanha): troca logo, nome e cores; o rodapé continua dizendo que foi gerado pelo Fuzil
  const brand = campaign.reportBrand;
  const vars = (brand
    ? { "--rb-a": brand.color, "--rb-b": `color-mix(in srgb, ${brand.color} 65%, #fff)` }
    : { "--rb-a": "#ff6a00", "--rb-b": "#ff303d" }) as React.CSSProperties;
  const stats = [
    { k: "Público", v: r.total, s: "contatos na lista" },
    { k: "Entregues", v: r.sent, s: `${pct(r.sent, r.total)} do público`, hi: true },
    { k: "Lidas", v: r.read, s: `${pct(r.read, r.sent)} das entregues` },
    { k: "Cliques", v: r.clicked, s: `${pct(r.clicked, r.sent)} das entregues` },
    { k: "Respostas", v: r.replied, s: `${pct(r.replied, r.sent)} das entregues` },
  ];

  return (
    <div className="rpt relative min-h-screen overflow-x-clip" style={vars}>
      {/* Ao vivo: rápido enquanto envia; no link do cliente continua atualizando (leituras, cliques, respostas) */}
      {campaign.status === "RUNNING" ? <AutoRefresh every={4000} /> : publicView && <AutoRefresh every={15000} />}

      {/* Fundo: grade e luz na cor da marca */}
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[640px]" />
      <div className="glow -top-40 right-[-10%] size-[560px] opacity-30" style={{ background: "var(--a)" }} />
      <div className="glow left-[-10%] top-72 size-[420px] opacity-15" style={{ background: "var(--b)" }} />

      <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-6 sm:px-8">
        {/* Barra de cima: marca e ações */}
        <div className="mb-10 flex items-center justify-between gap-3 rounded-full border border-white/10 bg-black/30 py-2 pl-4 pr-2 backdrop-blur" style={brand?.headerColor ? { background: `color-mix(in srgb, ${brand.headerColor} 70%, transparent)` } : undefined}>
          {brand ? (
            <div className="flex min-w-0 items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {brand.logoUrl && <img src={brand.logoUrl} alt={brand.name} className="size-8 shrink-0 rounded-lg object-contain" />}
              <span className="truncate font-semibold tracking-tight">{brand.name}</span>
            </div>
          ) : (
            <Logo className="h-6 w-auto" />
          )}
          <div className="flex items-center gap-2 print:hidden">
            {!publicView && <Link href={`/campanhas/${id}?etapa=relatorio`} className="btn-ghost">Voltar</Link>}
            <PrintButton />
          </div>
        </div>

        {/* Topo: nome da campanha e o anel das enviadas */}
        <header className="rise flex flex-col gap-8 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="eyebrow">Relatório de envio</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium">
                <span className={`size-1.5 rounded-full ${campaign.status === "RUNNING" ? "pulse bg-emerald-400" : campaign.status === "COMPLETED" ? "bg-emerald-400" : "bg-amber-400"}`} />
                {STATUS[campaign.status] ?? campaign.status}
              </span>
            </div>
            <h1 className="t-num text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02]">{campaign.name}</h1>
            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
              {[
                ["Template", campaign.templateName ?? "—"],
                ...(publicView ? [] : [["Origem", origin]]),
                ["Início", when(t.firstSent ?? campaign.startedAt)],
                ["Duração", duration(elapsed)],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0 border-l border-white/10 pl-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gray)]">{k}</dt>
                  <dd className="mt-0.5 truncate font-medium text-zinc-100" title={v}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Ring value={r.sent} total={r.total} label="entregues" />
        </header>

        {/* Link do cliente no ar: contagem até sair */}
        {linkExp && (
          <div className="rise mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-100 print:hidden" style={{ animationDelay: "80ms" }}>
            <span className="pulse size-2 rounded-full bg-emerald-400" />
            Relatório ao vivo. Este link sai do ar em
            <b className="rounded-lg bg-black/30 px-2 py-0.5 font-mono text-base text-white ring-1 ring-white/10">
              <Countdown to={linkExp.toISOString()} done="instantes" />
            </b>
          </div>
        )}

        <main className="mt-8 space-y-5">
          {/* Números do disparo (os mesmos do valor e do funil) */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((x, i) => (
              <div key={x.k} className={`rc rise overflow-hidden p-4 sm:p-5 ${x.hi ? "rc-hi" : ""}`} style={{ animationDelay: `${120 + i * 60}ms` }}>
                {x.hi && <div className="glow -right-10 -top-10 size-28 opacity-40" style={{ background: "var(--a)" }} />}
                <div className="relative text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gray)]">{x.k}</div>
                <CountUp value={x.v} className={`t-num relative mt-2 block text-3xl ${x.hi ? "t-fire" : "text-white"}`} />
                <div className="relative mt-1 text-[11px] text-[var(--gray)]">{x.s}</div>
              </div>
            ))}
          </section>

          {/* Quem clicou: o próprio cliente baixa a planilha (só cliques). No link público só enquanto ele estiver no ar */}
          {r.clicked > 0 && !r.adjusted && (publicView ? Boolean(linkExp && campaign.shareToken) : true) && (
            <section className="rc rise flex flex-wrap items-center gap-4 p-5 sm:p-6 print:hidden" style={{ animationDelay: "400ms" }}>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fire text-white shadow-lg"><MousePointerClick className="size-5" /></span>
              <div className="min-w-[12rem] flex-1">
                <div className="font-semibold">Quem clicou no link</div>
                <div className="text-sm text-[var(--gray)]">{n(r.clicked)} pessoa{r.clicked === 1 ? "" : "s"} · nome, telefone e horário de cada clique, numa planilha Excel</div>
              </div>
              <a href={publicView ? `/api/relatorio/${campaign.shareToken}/cliques` : `/api/campaigns/${id}/clicks`} className="btn-fire">
                <Download className="size-4" /> Baixar planilha de cliques
              </a>
            </section>
          )}

          {keys.length ? (
            <section className="rc rc-hi rise overflow-hidden" style={{ animationDelay: "420ms" }}>
              <div className="glow -right-20 -top-24 size-72 opacity-25" style={{ background: "var(--a)" }} />
              <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_1.3fr] md:items-center">
                <div>
                  <div className="eyebrow">Valor desta campanha</div>
                  <div className="t-num t-fire mt-3 text-5xl sm:text-6xl">{brl(total)}</div>
                  <p className="mt-2 text-sm text-[var(--gray)]">{n(r.sent)} mensagens entregues × {brl(price)} por mensagem</p>
                </div>
                <div className="space-y-3">
                  {keys.map((k) => (
                    <div key={k.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-2 text-xs font-medium text-[var(--gray)]">{keys.length > 1 ? "Chave Pix" : "Pague por Pix com esta chave"}</div>
                      <PixCopy code={k.key} label="Copiar chave Pix" />
                      <p className="mt-2 text-xs text-[var(--gray)]">
                        Recebedor: <b className="text-zinc-200">{k.name}</b>
                        {k.bank && <> · Banco: <b className="text-zinc-200">{k.bank}</b></>}
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
              <p className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100 print:hidden">
                Valor desta campanha: <b>{brl(total)}</b>. Cadastre sua chave Pix em Configurações para o cliente poder pagar direto pelo relatório.
              </p>
            )
          )}

          <section className="rc rise p-6 sm:p-8" style={{ animationDelay: "480ms" }}>
            <div className="eyebrow">Funil da campanha</div>
            <p className="mb-3 mt-2 text-sm text-[var(--gray)]">De quem estava na lista até quem respondeu. Passe o mouse em cada etapa.</p>
            <Funnel
              steps={[
                { key: "total", label: "Público", value: r.total, hint: "Contatos válidos da lista (sem repetidos e sem descadastrados)." },
                { key: "sent", label: "Entregues", value: r.sent, hint: "Mensagens entregues pela Meta para os contatos." },
                { key: "read", label: "Lidas", value: r.read, hint: "A pessoa abriu (só conta quem deixa a confirmação de leitura ligada)." },
                { key: "clicked", label: "Clicaram", value: r.clicked, hint: "Clicaram no botão do link." },
                { key: "replied", label: "Responderam", value: r.replied, hint: "Mandaram alguma mensagem de volta." },
              ]}
            />
          </section>

          {replies.length > 0 && (
            <section className="rc rise overflow-hidden" style={{ animationDelay: "540ms" }}>
              <div className="p-6 pb-4 sm:p-8 sm:pb-4">
                <div className="eyebrow">Quem respondeu</div>
                <p className="mt-2 text-sm text-[var(--gray)]">As respostas que chegaram deste disparo, das mais novas para as mais antigas.</p>
              </div>
              <ReplyList replies={replies} />
            </section>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-5 text-xs text-zinc-500">
            <span>{brand ? <>Relatório {brand.name} · gerado pelo Fuzil Disparador em {when(new Date())}</> : <>Gerado pelo Fuzil Disparador em {when(new Date())}</>}</span>
            {/* Números ajustados: nada real aparece no relatório (nem os créditos, que mostrariam as enviadas reais) */}
            {!publicView && !r.adjusted && <span>{n(t.credits)} créditos usados{t.optedOut ? ` · ${n(t.optedOut)} descadastraram` : ""}</span>}
          </footer>
        </main>
      </div>
    </div>
  );
}
