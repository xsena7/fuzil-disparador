import Papa from "papaparse";
import type { Prisma } from "@prisma/client";
import { getActiveAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { errorTitlePt, metaErrorExplain, translateMetaText } from "@/lib/meta-errors-text";

const STATUS_PT: Record<string, string> = {
  PENDING: "Pendente", SENDING: "Enviando", SENT: "Enviada", DELIVERED: "Entregue", READ: "Lida", FAILED: "Falhou", SKIPPED: "Ignorada",
};

/** Filtros da exportação, com a mesma conta das Métricas (quem clicou ou respondeu também leu e recebeu). */
const READ: Prisma.CampaignRecipientWhereInput = { OR: [{ readAt: { not: null } }, { clickCount: { gt: 0 } }, { repliedAt: { not: null } }] };
const FILTERS: Record<string, { where: Prisma.CampaignRecipientWhereInput; file: string }> = {
  clicked: { where: { clickCount: { gt: 0 } }, file: "clicaram" },
  replied: { where: { repliedAt: { not: null } }, file: "responderam" },
  read: { where: READ, file: "leram" },
  delivered_unread: { where: { deliveredAt: { not: null }, NOT: READ }, file: "entregues_sem_leitura" },
  failed: { where: { status: "FAILED" }, file: "falhas" },
  pending: { where: { status: { in: ["PENDING", "SENDING"] } }, file: "pendentes" },
  // Endereços antigos (?status=READ etc.)
  READ: { where: READ, file: "leram" },
  DELIVERED: { where: { deliveredAt: { not: null }, NOT: READ }, file: "entregues_sem_leitura" },
  FAILED: { where: { status: "FAILED" }, file: "falhas" },
  PENDING: { where: { status: { in: ["PENDING", "SENDING"] } }, file: "pendentes" },
};

/** Exporta o relatório completo da campanha, um destinatário por linha. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getActiveAuth();
  if (!auth) return new Response("Não autenticado", { status: 401 });
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!campaign) return new Response("Not found", { status: 404 });
  const filter = FILTERS[new URL(req.url).searchParams.get("status") ?? ""] ?? null;

  const rows = await prisma.campaignRecipient.findMany({
    where: { campaignId: id, ...(filter?.where ?? {}) },
    include: { sender: { include: { waba: { include: { business: true } } } } },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  // Horário do último clique de cada pessoa (sem contar robôs de pré-visualização)
  const clicks = await prisma.linkClick.groupBy({ by: ["recipientId"], where: { campaignId: id, isBot: false }, _max: { createdAt: true } });
  const lastClick = new Map(clicks.map((c) => [c.recipientId, c._max.createdAt]));
  const fmt = (d: Date | null) => (d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");
  const data = rows.map((r) => ({
      nome: r.name ?? "",
      // Formatado: número puro vira "5,51E+12" no Excel
      telefone: formatPhone(r.phone),
      status: STATUS_PT[r.status],
      enviado_por: r.sender ? formatPhone(r.sender.displayPhoneNumber.replace(/\D/g, "")) : "",
      bm: r.sender?.waba.business.name ?? "",
      enviada_em: fmt(r.sentAt),
      entregue_em: fmt(r.deliveredAt),
      lida_em: fmt(r.readAt),
      clicou: r.clickCount > 0 ? "sim" : "não",
      cliques: r.clickCount,
      primeiro_clique: fmt(r.firstClickAt),
      ultimo_clique: fmt(lastClick.get(r.id) ?? null),
      respondeu_em: fmt(r.repliedAt),
      descadastrou: r.optedOutAt ? "sim" : "não",
      erro_codigo: r.errorCode ?? "",
      erro: r.errorTitle || r.errorCode ? errorTitlePt(r.errorCode, r.errorTitle) : "",
      erro_detalhe: r.errorDetail ? translateMetaText(r.errorDetail) ?? "" : metaErrorExplain(r.errorCode) ?? "",
  }));
  // Sempre sai com os títulos das colunas, mesmo sem ninguém no filtro (antes saía um arquivo em branco)
  const fields = ["nome", "telefone", "status", "enviado_por", "bm", "enviada_em", "entregue_em", "lida_em", "clicou", "cliques", "primeiro_clique", "ultimo_clique", "respondeu_em", "descadastrou", "erro_codigo", "erro", "erro_detalhe"];
  const csv = Papa.unparse({ fields, data: data.map((d) => fields.map((f) => (d as Record<string, unknown>)[f] ?? "")) }, { delimiter: ";" });
  const fileName = `${campaign.name.replace(/[^\w-]+/g, "_")}${filter ? `_${filter.file}` : ""}.csv`;
  return new Response("﻿" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${fileName}"` },
  });
}
