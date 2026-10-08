import Papa from "papaparse";
import { getActiveAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";

const STATUS_PT: Record<string, string> = {
  PENDING: "Pendente", SENDING: "Enviando", SENT: "Enviada", DELIVERED: "Entregue", READ: "Lida", FAILED: "Falhou", SKIPPED: "Ignorada",
};

/** Exporta o relatório completo da campanha, um destinatário por linha. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getActiveAuth();
  if (!auth) return new Response("Não autenticado", { status: 401 });
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!campaign) return new Response("Not found", { status: 404 });
  const filter = new URL(req.url).searchParams.get("status");

  const rows = await prisma.campaignRecipient.findMany({
    where: { campaignId: id, ...(filter ? { status: filter as never } : {}) },
    include: { sender: { include: { waba: { include: { business: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const fmt = (d: Date | null) => (d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");
  const csv = Papa.unparse(
    rows.map((r) => ({
      nome: r.name ?? "",
      telefone: r.phone,
      status: STATUS_PT[r.status],
      enviado_por: r.sender ? formatPhone(r.sender.displayPhoneNumber.replace(/\D/g, "")) : "",
      bm: r.sender?.waba.business.name ?? "",
      enviada_em: fmt(r.sentAt),
      entregue_em: fmt(r.deliveredAt),
      lida_em: fmt(r.readAt),
      clicou: r.clickCount > 0 ? "sim" : "não",
      cliques: r.clickCount,
      primeiro_clique: fmt(r.firstClickAt),
      respondeu_em: fmt(r.repliedAt),
      descadastrou: r.optedOutAt ? "sim" : "não",
      erro_codigo: r.errorCode ?? "",
      erro: r.errorTitle ?? "",
      erro_detalhe: r.errorDetail ?? "",
    })),
    { delimiter: ";" },
  );
  const fileName = `${campaign.name.replace(/[^\w-]+/g, "_")}${filter ? `_${filter}` : ""}.csv`;
  return new Response("﻿" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${fileName}"` },
  });
}
