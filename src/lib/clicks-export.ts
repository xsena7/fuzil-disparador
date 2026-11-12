// Planilha (Excel) de quem clicou num botão da campanha. Usada nas Métricas (logado) e no link do relatório do cliente.
import ExcelJS from "exceljs";
import { prisma } from "./db";
import { formatPhone } from "./phone";

/**
 * Sem `button` = botão de link (cliques contados pelo Fuzil). Com `button` (ex.: "Sair") = botão de resposta rápida com esse texto.
 */
export async function clicksXlsxResponse(campaign: { id: string; name: string }, button: string | null): Promise<Response> {
  // Botão de resposta rápida (ex.: Sair): quem respondeu tocando nele, com o horário do primeiro e do último toque
  const replies = button
    ? await prisma.$queryRaw<Array<{ recipientId: string; first: Date; last: Date; n: bigint }>>`
        SELECT i."recipientId", MIN(i."receivedAt") AS first, MAX(i."receivedAt") AS last, COUNT(*) AS n
        FROM "InboundMessage" i JOIN "CampaignRecipient" r ON r.id = i."recipientId"
        WHERE r."campaignId" = ${campaign.id} AND i.type IN ('button', 'interactive') AND lower(trim(i.text)) = lower(${button})
        GROUP BY i."recipientId"`
    : [];
  const byReply = new Map(replies.map((r) => [r.recipientId, r]));
  const rows = await prisma.campaignRecipient.findMany({
    where: button ? { campaignId: campaign.id, id: { in: [...byReply.keys()] } } : { campaignId: campaign.id, clickCount: { gt: 0 } },
    select: { id: true, name: true, phone: true, clickCount: true, firstClickAt: true, repliedAt: true, data: true },
    orderBy: [{ firstClickAt: "asc" }, { position: "asc" }],
  });
  // Último clique de cada pessoa (sem robôs de pré-visualização)
  const clicks = button ? [] : await prisma.linkClick.groupBy({ by: ["recipientId"], where: { campaignId: campaign.id, isBot: false }, _max: { createdAt: true } });
  const last = new Map(clicks.map((c) => [c.recipientId, c._max.createdAt]));
  // Colunas da lista original (as mesmas da planilha que subiu na Audiência)
  const extra: string[] = [];
  for (const r of rows) {
    const d = r.data && typeof r.data === "object" && !Array.isArray(r.data) ? (r.data as Record<string, unknown>) : {};
    for (const k of Object.keys(d)) if (!extra.includes(k)) extra.push(k);
  }
  const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(button ? `Clicaram em ${button}`.slice(0, 31).replace(/[\\/?*[\]:]/g, "") : "Clicaram no link");
  ws.columns = [
    { header: "Nome", key: "nome", width: 28 },
    { header: "Telefone", key: "telefone", width: 20 },
    { header: "Cliques", key: "cliques", width: 10 },
    { header: "Primeiro clique", key: "primeiro", width: 20 },
    { header: "Último clique", key: "ultimo", width: 20 },
    { header: "Respondeu", key: "respondeu", width: 12 },
    ...extra.map((k, i) => ({ header: k, key: `x${i}`, width: Math.min(40, Math.max(12, k.length + 4)) })),
  ];
  for (const r of rows) {
    const d = r.data && typeof r.data === "object" && !Array.isArray(r.data) ? (r.data as Record<string, unknown>) : {};
    ws.addRow({
      nome: r.name ?? "",
      telefone: formatPhone(r.phone),
      cliques: button ? Number(byReply.get(r.id)?.n ?? 1) : r.clickCount,
      primeiro: fmt(button ? byReply.get(r.id)?.first : r.firstClickAt),
      ultimo: fmt(button ? byReply.get(r.id)?.last : (last.get(r.id) ?? r.firstClickAt)),
      respondeu: r.repliedAt ? "sim" : "não",
      ...Object.fromEntries(extra.map((k, i) => [`x${i}`, d[k] == null ? "" : String(d[k])])),
    });
  }
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6A2B" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

  const buf = await wb.xlsx.writeBuffer();
  const fileName = `${campaign.name.replace(/[^\w-]+/g, "_")}_clicaram_${button ? button.replace(/[^\w-]+/g, "_") : "link"}.xlsx`;
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${fileName}"` },
  });
}
