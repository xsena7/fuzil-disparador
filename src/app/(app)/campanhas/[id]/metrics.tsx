import Link from "next/link";
import { Download, FileBarChart, RotateCcw } from "lucide-react";
import { ConfirmButton } from "@/components/action-form";
import { retryFailedAction } from "@/app/actions/campaigns";
import { campaignMetrics, duration, pct } from "@/lib/campaign-metrics";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { Card, Stat, Table, Td } from "@/components/ui";
import { QualityBadge } from "@/components/status";

const RESULT: Record<string, { label: string; cls: string }> = {
  READ: { label: "Lida", cls: "text-emerald-700" },
  DELIVERED: { label: "Entregue", cls: "text-emerald-700" },
  SENT: { label: "Enviada (aguardando entrega)", cls: "text-sky-700" },
  FAILED: { label: "Falhou", cls: "text-red-700" },
  SKIPPED: { label: "Não enviada", cls: "text-zinc-500" },
  PENDING: { label: "Na fila", cls: "text-zinc-500" },
  SENDING: { label: "Enviando", cls: "text-zinc-500" },
};

export async function Metrics({ campaignId }: { campaignId: string }) {
  const m = await campaignMetrics(campaignId);
  const campaignRow = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
  const canRetry = ["COMPLETED", "PAUSED"].includes(campaignRow?.status ?? "") && Number(m.totals.failed) > 0;
  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId },
    select: { phone: true, status: true, errorTitle: true, sentAt: true, sender: { select: { displayPhoneNumber: true } } },
    // Mesma ordem da planilha
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    take: 300,
  });
  const t = m.totals;
  const progress = t.total ? Math.round(((t.total - t.pending) / t.total) * 100) : 0;
  const n = (v: number) => v.toLocaleString("pt-BR");

  return (
    <div className="space-y-6">
      <Link href={`/campanhas/${campaignId}?etapa=relatorio`} className="flex items-center gap-3 rounded-2xl bg-[#0b0b0f] px-4 py-3 text-white shadow-sm transition hover:opacity-95">
        <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient"><FileBarChart className="size-5" /></span>
        <span className="flex-1">
          <span className="block font-semibold">Relatório do cliente</span>
          <span className="block text-xs text-zinc-400">Resultados, valor a pagar e o seu Pix, num link para mandar ao cliente.</span>
        </span>
        <span className="text-sm font-medium text-orange-300">Abrir →</span>
      </Link>
      <div>
        <div className="mb-1 flex justify-between text-xs text-zinc-500">
          <span>{n(t.total - t.pending)} de {n(t.total)} processados</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200/60"><div className="h-full rounded-full bg-brand-gradient transition-all" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Público" value={n(t.total)} sub={t.pending ? `${n(t.pending)} na fila` : undefined} />
        <Stat label="Enviadas" value={n(t.sent)} sub={pct(t.sent, t.total) + " do público"} tone="brand" />
        <Stat label="Entregues" value={n(t.delivered)} sub={pct(t.delivered, t.sent) + " das enviadas"} tone="green" />
        <Stat label="Lidas (abriram)" value={n(t.read)} sub={pct(t.read, t.delivered) + " das entregues"} tone="blue" />
        <Stat label="Clicaram no link" value={n(t.clicked)} sub={`${pct(t.clicked, t.delivered)} das entregues · ${n(t.clicks)} cliques`} tone="violet" />
        <Stat label="Responderam" value={n(t.replied)} sub={pct(t.replied, t.delivered) + " das entregues"} tone="pink" />
        <Stat label="Descadastraram (SAIR)" value={n(t.optedOut)} sub={pct(t.optedOut, t.delivered)} tone={t.optedOut ? "amber" : "default"} />
        <Stat label="Não entregues" value={n(m.undeliverable)} sub="Sem WhatsApp, bloqueou ou app antigo" />
        <Stat label="Falhas" value={n(t.failed)} sub={pct(t.failed, t.total)} tone={t.failed ? "red" : "default"} />
        <Stat label="Créditos usados" value={n(t.credits)} sub={t.skipped ? `${n(t.skipped)} ignorados` : undefined} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Tempo mediano até entregar" value={duration(m.timing.deliver)} />
        <Stat label="Tempo mediano até ler" value={duration(m.timing.read)} />
        <Stat label="Tempo mediano até clicar" value={duration(m.timing.click)} />
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold">O que aconteceu com cada número</div>
          <span className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            {recipients.length < t.total ? `Mostrando ${recipients.length} de ${n(t.total)} · ` : ""}baixe o CSV para a lista completa
            {canRetry && (
              <ConfirmButton action={retryFailedAction.bind(null, campaignId)} confirm="Reenviar para quem falhou por erro temporário? (erros permanentes, como número sem WhatsApp, não são reenviados)">
                <RotateCcw className="size-4" /> Reenviar falhas
              </ConfirmButton>
            )}
          </span>
        </div>
        {/* Mostra uns 10 por vez, o resto com a barra de rolagem */}
        <Table head={["Número", "Enviado pelo número", "Resultado", "Motivo"]} maxHeight="460px">
          {recipients.map((r, i) => (
            <tr key={i}>
              <Td className="whitespace-nowrap py-2 font-medium">{formatPhone(r.phone)}</Td>
              <Td className="whitespace-nowrap py-2">{r.sender?.displayPhoneNumber ?? "—"}</Td>
              <Td className={`whitespace-nowrap py-2 font-medium ${RESULT[r.status]?.cls ?? ""}`}>{RESULT[r.status]?.label ?? r.status}</Td>
              <Td className="py-2 text-xs text-zinc-600">{r.errorTitle ?? ""}</Td>
            </tr>
          ))}
        </Table>
      </div>


      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="font-semibold">Desempenho por número</div>
        </div>
        <Table head={["Número", "BM", "Qualidade", "Enviadas", "Entregues", "Lidas", "Cliques", "Respostas", "Falhas"]}>
          {m.senders.map((s) => (
            <tr key={s.id}>
              <Td className="whitespace-nowrap font-medium">{s.display}</Td>
              <Td className="whitespace-nowrap">{s.business}</Td>
              <Td><QualityBadge q={s.quality} /></Td>
              <Td className="whitespace-nowrap">{n(s.sent)}</Td>
              <Td className="whitespace-nowrap">{n(s.delivered)} <span className="text-xs text-zinc-400">{pct(s.delivered, s.sent)}</span></Td>
              <Td className="whitespace-nowrap">{n(s.read)} <span className="text-xs text-zinc-400">{pct(s.read, s.delivered)}</span></Td>
              <Td className="whitespace-nowrap">{n(s.clicked)} <span className="text-xs text-zinc-400">{pct(s.clicked, s.delivered)}</span></Td>
              <Td className="whitespace-nowrap">{n(s.replied)}</Td>
              <Td className={s.failed ? "whitespace-nowrap text-red-600" : "whitespace-nowrap"}>{n(s.failed)}</Td>
            </tr>
          ))}
          {m.senders.length === 0 && <tr><Td colSpan={9} className="text-center text-zinc-500">Nenhum envio ainda.</Td></tr>}
        </Table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-2 font-semibold">Falhas por motivo</div>
          <Table head={["Código", "Motivo", "Qtd."]}>
            {m.errors.map((e) => (
              <tr key={String(e.code) + e.title}>
                <Td className="font-mono text-xs">{e.code ?? "—"}</Td>
                <Td>{e.title}</Td>
                <Td>{n(e.count)}</Td>
              </tr>
            ))}
            {m.errors.length === 0 && <tr><Td colSpan={3} className="text-center text-zinc-500">Nenhuma falha.</Td></tr>}
          </Table>
        </div>
        <div>
          <div className="mb-2 font-semibold">Respostas mais comuns</div>
          <Table head={["Resposta", "Qtd."]}>
            {m.topReplies.map((r) => (
              <tr key={r.text}><Td>{r.text}</Td><Td>{n(r.count)}</Td></tr>
            ))}
            {m.topReplies.length === 0 && <tr><Td colSpan={2} className="text-center text-zinc-500">Nenhuma resposta.</Td></tr>}
          </Table>
        </div>
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-4">
        <span className="mr-2 font-medium">Exportar relatório (CSV):</span>
        {[
          ["", "Todos"], ["READ", "Leram"], ["DELIVERED", "Entregues sem leitura"], ["FAILED", "Falhas"], ["PENDING", "Pendentes"],
        ].map(([s, label]) => (
          <a key={s} href={`/api/campaigns/${campaignId}/export${s ? `?status=${s}` : ""}`} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50">
            <Download className="size-3.5" /> {label}
          </a>
        ))}
      </Card>

      <p className="text-xs text-zinc-500">
        Leituras só são contadas para quem deixa a confirmação de leitura ligada no WhatsApp. A Meta não informa bloqueios diretamente: eles aparecem como &quot;não entregue&quot; (erro 131026).
        Cliques de robôs de pré-visualização ({n(t.botClicks)}) são descartados.
      </p>
    </div>
  );
}
