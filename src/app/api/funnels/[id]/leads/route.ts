import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { funnelFields } from "@/lib/funnels";

const STATUS = { CODE_SENT: "Falta o código", VERIFIED: "Confirmado", COMPLETED: "Cadastro completo" };

/** Planilha (CSV) com todos os leads do funil: dá para subir direto numa campanha. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  const funnel = await prisma.funnel.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!funnel) return new Response("Não encontrado", { status: 404 });
  const leads = await prisma.lead.findMany({ where: { funnelId: id }, orderBy: { createdAt: "asc" } });
  const fields = funnelFields(funnel);
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["nome", "telefone", "email", "vaga", "situacao", "inscrito_em", ...fields.map((f) => f.label), "utm_source", "utm_campaign"];
  const rows = leads.map((l) => {
    const a = (l.answers ?? {}) as Record<string, string>;
    const u = (l.utm ?? {}) as Record<string, string>;
    return [l.name, l.phone, l.email, l.job, STATUS[l.status], l.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), ...fields.map((f) => a[f.key]), u.utm_source, u.utm_campaign];
  });
  const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leads-${funnel.slug}.csv"` },
  });
}
