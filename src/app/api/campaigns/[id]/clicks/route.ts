import ExcelJS from "exceljs";
import { getActiveAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";

/** Planilha (Excel) de quem clicou no link da campanha: nome, telefone, cliques, horários e as colunas da lista original. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getActiveAuth();
  if (!auth) return new Response("Não autenticado", { status: 401 });
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, workspaceId: auth.workspace.id }, select: { id: true, name: true } });
  if (!campaign) return new Response("Not found", { status: 404 });

  const rows = await prisma.campaignRecipient.findMany({
    where: { campaignId: id, clickCount: { gt: 0 } },
    select: { id: true, name: true, phone: true, clickCount: true, firstClickAt: true, repliedAt: true, data: true },
    orderBy: [{ firstClickAt: "asc" }, { position: "asc" }],
  });
  // Último clique de cada pessoa (sem robôs de pré-visualização)
  const clicks = await prisma.linkClick.groupBy({ by: ["recipientId"], where: { campaignId: id, isBot: false }, _max: { createdAt: true } });
  const last = new Map(clicks.map((c) => [c.recipientId, c._max.createdAt]));
  // Colunas da lista original (as mesmas da planilha que subiu na Audiência)
  const extra: string[] = [];
  for (const r of rows) {
    const d = r.data && typeof r.data === "object" && !Array.isArray(r.data) ? (r.data as Record<string, unknown>) : {};
    for (const k of Object.keys(d)) if (!extra.includes(k)) extra.push(k);
  }
  const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Clicaram no link");
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
      cliques: r.clickCount,
      primeiro: fmt(r.firstClickAt),
      ultimo: fmt(last.get(r.id) ?? r.firstClickAt),
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
  const fileName = `${campaign.name.replace(/[^\w-]+/g, "_")}_clicaram.xlsx`;
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${fileName}"` },
  });
}
