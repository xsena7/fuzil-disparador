import { Download } from "lucide-react";
import { campaignMetrics, duration, pct } from "@/lib/campaign-metrics";
import { Card, Stat, Table, Td } from "@/components/ui";
import { QualityBadge } from "@/components/status";
import { TimelineChart } from "@/components/timeline-chart";

export async function Metrics({ campaignId }: { campaignId: string }) {
  const m = await campaignMetrics(campaignId);
  const t = m.totals;
  const progress = t.total ? Math.round(((t.total - t.pending) / t.total) * 100) : 0;
  const n = (v: number) => v.toLocaleString("pt-BR");

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex justify-between text-xs text-zinc-500">
          <span>{n(t.total - t.pending)} de {n(t.total)} processados</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Público" value={n(t.total)} sub={t.pending ? `${n(t.pending)} na fila` : undefined} />
        <Stat label="Enviadas" value={n(t.sent)} sub={pct(t.sent, t.total) + " do público"} />
        <Stat label="Entregues" value={n(t.delivered)} sub={pct(t.delivered, t.sent) + " das enviadas"} tone="green" />
        <Stat label="Lidas (abriram)" value={n(t.read)} sub={pct(t.read, t.delivered) + " das entregues"} />
        <Stat label="Clicaram no link" value={n(t.clicked)} sub={`${pct(t.clicked, t.delivered)} das entregues · ${n(t.clicks)} cliques`} />
        <Stat label="Responderam" value={n(t.replied)} sub={pct(t.replied, t.delivered) + " das entregues"} />
        <Stat label="Descadastraram (SAIR)" value={n(t.optedOut)} sub={pct(t.optedOut, t.delivered)} />
        <Stat label="Não entregues" value={n(m.undeliverable)} sub="Sem WhatsApp, bloqueou ou app antigo" />
        <Stat label="Falhas" value={n(t.failed)} sub={pct(t.failed, t.total)} tone={t.failed ? "red" : "default"} />
        <Stat label="Créditos usados" value={n(t.credits)} sub={t.skipped ? `${n(t.skipped)} ignorados` : undefined} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Tempo mediano até entregar" value={duration(m.timing.deliver)} />
        <Stat label="Tempo mediano até ler" value={duration(m.timing.read)} />
        <Stat label="Tempo mediano até clicar" value={duration(m.timing.click)} />
      </div>

      <Card className="p-5">
        <div className="mb-3 font-semibold">Evolução por hora</div>
        <TimelineChart data={m.timeline.map((p) => ({ ...p, bucket: p.bucket.toISOString() }))} />
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="font-semibold">Desempenho por número</div>
        </div>
        <Table head={["Número", "BM", "Qualidade", "Enviadas", "Entregues", "Lidas", "Cliques", "Respostas", "Falhas"]}>
          {m.senders.map((s) => (
            <tr key={s.id}>
              <Td className="font-medium">{s.display}</Td>
              <Td>{s.business}</Td>
              <Td><QualityBadge q={s.quality} /></Td>
              <Td>{n(s.sent)}</Td>
              <Td>{n(s.delivered)} <span className="text-xs text-zinc-400">{pct(s.delivered, s.sent)}</span></Td>
              <Td>{n(s.read)} <span className="text-xs text-zinc-400">{pct(s.read, s.delivered)}</span></Td>
              <Td>{n(s.clicked)} <span className="text-xs text-zinc-400">{pct(s.clicked, s.delivered)}</span></Td>
              <Td>{n(s.replied)}</Td>
              <Td className={s.failed ? "text-red-600" : ""}>{n(s.failed)}</Td>
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
