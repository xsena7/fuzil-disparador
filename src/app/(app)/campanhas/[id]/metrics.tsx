import Link from "next/link";
import { Download, FileBarChart, RotateCcw } from "lucide-react";
import { ConfirmButton } from "@/components/action-form";
import { retryFailedAction } from "@/app/actions/campaigns";
import { campaignMetrics, duration, pct } from "@/lib/campaign-metrics";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { Card, Stat, Table, Td } from "@/components/ui";
import { QualityBadge } from "@/components/status";
import { errorTitlePt } from "@/lib/meta-errors-text";
import { campaignReplies } from "@/lib/campaign-replies";
import { ReplyList } from "@/app/relatorio/replies";
import { getComponent, type TComponent } from "@/lib/template-utils";

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
  const [m, replies] = await Promise.all([campaignMetrics(campaignId), campaignReplies(campaignId)]);
  // Avisos de entrega da Meta (webhook): por WABA que disparou, quantas a Meta confirmou e quando chegou o último evento
  const hooks = await prisma.$queryRaw<Array<{ waba: string; bm: string; sent: bigint; confirmed: bigint; last: Date | null; rejected: Date | null }>>`
    SELECT w.name AS waba, b.name AS bm, COUNT(*) AS sent,
      COUNT(*) FILTER (WHERE r."deliveredAt" IS NOT NULL OR r."readAt" IS NOT NULL OR r.status = 'FAILED') AS confirmed,
      w."webhookLastAt" AS last, w."webhookRejectedAt" AS rejected
    FROM "CampaignRecipient" r
    JOIN "PhoneNumber" p ON p.id = r."senderId"
    JOIN "WhatsAppAccount" w ON w.id = p."wabaId"
    JOIN "BusinessManager" b ON b.id = w."businessId"
    WHERE r."campaignId" = ${campaignId} AND r."sentAt" IS NOT NULL AND r."sentAt" < NOW() - INTERVAL '10 minutes'
    GROUP BY w.id, w.name, b.name, w."webhookLastAt", w."webhookRejectedAt"`;
  // Mandou bastante e a Meta não confirmou nenhuma entrega: os avisos dessa conta não estão chegando no Fuzil
  const silent = hooks.filter((h) => Number(h.sent) >= 20 && Number(h.confirmed) === 0);
  // Botões de resposta rápida (ex.: Sair): quantas pessoas tocaram em cada um
  const clicked = (
    await prisma.$queryRaw<Array<{ text: string; people: bigint }>>`
      SELECT trim(i.text) AS text, COUNT(DISTINCT i."recipientId") AS people
      FROM "InboundMessage" i JOIN "CampaignRecipient" r ON r.id = i."recipientId"
      WHERE r."campaignId" = ${campaignId} AND i.type IN ('button', 'interactive') AND i.text IS NOT NULL AND trim(i.text) <> ''
      GROUP BY trim(i.text) ORDER BY people DESC LIMIT 6`
  ).map((b) => ({ text: b.text, people: Number(b.people) }));
  const campaignRow = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true, templateName: true, workspaceId: true, kind: true } });
  // Todos os botões de resposta do template aparecem (mesmo com 0 cliques), na ordem do template
  const tpl = campaignRow?.templateName
    ? await prisma.template.findFirst({ where: { workspaceId: campaignRow.workspaceId, name: campaignRow.templateName }, select: { components: true } })
    : null;
  const tplButtons = tpl ? (getComponent(tpl.components as unknown as TComponent[], "BUTTONS")?.buttons ?? []).filter((b) => b.type === "QUICK_REPLY").map((b) => b.text.trim()) : [];
  const key = (x: string) => x.trim().toLowerCase();
  const buttonClicks = [
    ...tplButtons.map((text) => ({ text, people: clicked.filter((c) => key(c.text) === key(text)).reduce((a, c) => a + c.people, 0) })),
    ...clicked.filter((c) => !tplButtons.some((t) => key(t) === key(c.text))),
  ];
  const canRetry = ["COMPLETED", "PAUSED"].includes(campaignRow?.status ?? "") && Number(m.totals.failed) > 0;
  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId },
    select: { phone: true, status: true, errorCode: true, errorTitle: true, sentAt: true, sender: { select: { displayPhoneNumber: true } } },
    // Mesma ordem da planilha
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    take: 300,
  });
  const t = m.totals;
  const progress = t.total ? Math.round(((t.total - t.pending) / t.total) * 100) : 0;
  const n = (v: number) => v.toLocaleString("pt-BR");

  return (
    <div className="space-y-6">
      {campaignRow?.kind !== "WARMUP" && <Link href={`/campanhas/${campaignId}?etapa=relatorio`} className="flex items-center gap-3 rounded-2xl bg-[#0b0b0f] px-4 py-3 text-white shadow-sm transition hover:opacity-95">
        <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient"><FileBarChart className="size-5" /></span>
        <span className="flex-1">
          <span className="block font-semibold">Relatório do cliente</span>
          <span className="block text-xs text-zinc-400">Resultados, valor a pagar e o seu Pix, num link para mandar ao cliente.</span>
        </span>
        <span className="text-sm font-medium text-orange-300">Abrir →</span>
      </Link>}
      <div>
        <div className="mb-1 flex justify-between text-xs text-zinc-500">
          <span>{n(t.total - t.pending)} de {n(t.total)} processados</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200/60"><div className="h-full rounded-full bg-brand-gradient transition-all" style={{ width: `${progress}%` }} /></div>
      </div>

      {silent.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Os avisos de entrega da Meta não estão chegando de {silent.length === 1 ? "uma conta" : `${silent.length} contas`}.</b> Por isso Entregues e Lidas aparecem baixos (só contam quem clicou ou respondeu): não quer dizer que as mensagens não chegaram.
          <ul className="mt-2 space-y-0.5">
            {silent.map((h) => (
              <li key={h.waba + h.bm}>
                • <b>{h.bm}</b> ({h.waba}): {n(Number(h.sent))} enviadas, nenhuma confirmação.{" "}
                {h.rejected && (!h.last || h.rejected > h.last) ? "A Meta está mandando, mas a chave secreta do app não confere." : !h.last ? "Nenhum evento dessa conta chegou ao Fuzil." : "Último evento chegou há tempo."}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">Para arrumar: em Conexões, abra essa BM e veja <b>Receber respostas no Chat</b> (chave secreta do app e webhook apontando para o Fuzil).</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Público" value={n(t.total)} sub={t.pending ? `${n(t.pending)} na fila` : undefined} />
        <Stat label="Enviadas" value={n(t.sent)} sub={`${pct(t.sent, t.total)} do público · aceitas pela Meta`} tone="brand" />
        <Stat label="Entregues" value={n(t.delivered)} sub={pct(t.delivered, t.sent) + " das enviadas"} tone="green" />
        <Stat label="Lidas (abriram)" value={n(t.read)} sub={pct(t.read, t.delivered) + " das entregues"} tone="blue" />
        <Stat label="Clicaram no link" value={n(t.clicked)} sub={`${pct(t.clicked, t.delivered)} das entregues · ${n(t.clicks)} cliques`} tone="violet" />
        <Stat label="Responderam" value={n(t.replied)} sub={pct(t.replied, t.delivered) + " das entregues"} tone="pink" />
        <Stat label="Descadastraram (SAIR)" value={n(t.optedOut)} sub={pct(t.optedOut, t.delivered)} tone={t.optedOut ? "amber" : "default"} />
        <Stat label="Não entregues" value={n(m.undeliverable)} sub="Sem WhatsApp, bloqueou ou app antigo" />
        <Stat label="Falhas" value={n(t.failed)} sub={`${pct(t.failed, t.total)}${t.failed ? " · não cobradas" : ""}`} tone={t.failed ? "red" : "default"} />
        <Stat label="Créditos usados" value={n(t.credits)} sub={`Falhas voltam para o saldo${t.skipped ? ` · ${n(t.skipped)} ignorados` : ""}`} />
      </div>

      {/* Quem clicou em cada botão (link e respostas rápidas, ex.: Sair): uma planilha por botão */}
      <Card className="border-violet-200 bg-violet-50/40 p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Download className="size-5" /></span>
          <div>
            <div className="font-semibold text-zinc-900">Quem clicou em cada botão</div>
            <div className="text-xs text-zinc-600">Uma planilha (Excel) por botão: nome, telefone, horário do clique e as colunas da sua lista.</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/campaigns/${campaignId}/clicks`} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700">
            <Download className="size-4" /> Link · {n(t.clicked)} {t.clicked === 1 ? "pessoa" : "pessoas"}
          </a>
          {buttonClicks.map((b) => (
            <a key={b.text} href={`/api/campaigns/${campaignId}/clicks?botao=${encodeURIComponent(b.text)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50">
              <Download className="size-4" /> {b.text} · {n(b.people)} {b.people === 1 ? "pessoa" : "pessoas"}
            </a>
          ))}
          <a href={`/api/campaigns/${campaignId}/export?status=clicked`} className="self-center text-xs font-medium text-zinc-500 hover:text-zinc-800">link em CSV</a>
        </div>
        {!buttonClicks.length && <p className="mt-2 text-xs text-zinc-500">Os botões de resposta (ex.: Sair) aparecem aqui assim que alguém tocar neles.</p>}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
              <Td className="py-2 text-xs text-zinc-600">{r.errorTitle || r.errorCode ? errorTitlePt(r.errorCode, r.errorTitle) : ""}</Td>
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
                <Td>
                  <div className="font-medium">{e.title}</div>
                  {e.explain && <div className="mt-0.5 text-xs text-zinc-500">{e.explain}</div>}
                </Td>
                <Td>{n(e.count)}</Td>
              </tr>
            ))}
            {m.errors.length === 0 && <tr><Td colSpan={3} className="text-center text-zinc-500">Nenhuma falha.</Td></tr>}
          </Table>
        </div>
        <div>
          <div className="mb-2 font-semibold">Quem respondeu</div>
          {replies.length ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-soft">
              <ReplyList replies={replies} />
            </div>
          ) : (
            <Card className="p-4 text-center text-sm text-zinc-500">Nenhuma resposta ainda.</Card>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Leituras só são contadas para quem deixa a confirmação de leitura ligada no WhatsApp. A Meta não informa bloqueios diretamente: eles aparecem como &quot;não entregue&quot; (erro 131026).
        Cliques de robôs de pré-visualização ({n(t.botClicks)}) são descartados.
      </p>
    </div>
  );
}
