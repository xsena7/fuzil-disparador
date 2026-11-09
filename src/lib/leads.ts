// Cadastro pelo site (webhook): o site manda cada contato para /api/leads/<token> e ele entra na campanha na hora.
// Se vier quem indicou (indicado_por), essa pessoa recebe a mensagem de confirmação (se falou com o número nas últimas 24h).
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { shortToken } from "./crypto";
import { canonicalWaId, normalizePhone } from "./phone";
import { sendChatMessage } from "./chat";

const PHONE_KEYS = ["telefone", "phone", "whatsapp", "celular", "numero", "número", "tel", "fone"];
const NAME_KEYS = ["nome", "name", "nome_completo", "full_name"];
const REF_KEYS = ["indicado_por", "indicadopor", "quem_indicou", "indicador", "referrer", "telefone_indicador", "whatsapp_indicador"];

const pick = (d: Record<string, string>, keys: string[]) => keys.map((k) => d[k]).find((v) => v && v.trim()) ?? "";

/** Junta JSON ou formulário num objeto de texto com chaves minúsculas sem espaço. */
export function flattenLead(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (obj: unknown, prefix = "") => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const key = `${prefix}${k}`.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 60);
      if (v && typeof v === "object" && !Array.isArray(v)) walk(v, `${key}_`);
      else if (v !== null && v !== undefined) out[key] = String(Array.isArray(v) ? v.join(", ") : v).slice(0, 500);
    }
  };
  walk(input);
  return out;
}

export type LeadResult = { ok: true; status: "added" | "duplicate" | "opted_out"; confirmed: boolean } | { ok: false; error: string; status: number };

export async function addLead(token: string, raw: unknown): Promise<LeadResult> {
  const campaign = await prisma.campaign.findUnique({ where: { leadToken: token }, select: { id: true, workspaceId: true, status: true, leadConfirmText: true } });
  if (!campaign) return { ok: false, error: "Link de cadastro não encontrado ou desligado", status: 404 };
  if (campaign.status === "CANCELLED") return { ok: false, error: "Campanha cancelada", status: 410 };
  const data = flattenLead(raw);
  const phone = normalizePhone(pick(data, PHONE_KEYS));
  if (!phone) return { ok: false, error: "Mande o telefone (campo telefone, com DDD)", status: 400 };
  const name = pick(data, NAME_KEYS) || null;
  if (name && !data.nome) data.nome = name;

  const opted = await prisma.contact.findUnique({ where: { workspaceId_phone: { workspaceId: campaign.workspaceId, phone } }, select: { optedOut: true } });
  let status: "added" | "duplicate" | "opted_out" = "added";
  if (opted?.optedOut) status = "opted_out";
  else {
    const last = await prisma.campaignRecipient.findFirst({ where: { campaignId: campaign.id }, orderBy: { position: "desc" }, select: { position: true } });
    const created = await prisma.campaignRecipient.createMany({
      data: [{ campaignId: campaign.id, phone, name, data: data as Prisma.InputJsonValue, clickToken: shortToken(), position: (last?.position ?? 0) + 1 }],
      skipDuplicates: true,
    });
    if (!created.count) status = "duplicate";
    await prisma.contact.createMany({ data: [{ workspaceId: campaign.workspaceId, phone, name, email: data.email || null }], skipDuplicates: true });
  }

  // Confirmação para quem indicou (conversa aberta nas últimas 24h com algum número da conta)
  let confirmed = false;
  const refPhone = normalizePhone(pick(data, REF_KEYS));
  if (refPhone && refPhone !== phone && campaign.leadConfirmText?.trim() && status !== "opted_out") {
    const conv = await prisma.conversation.findFirst({
      where: { workspaceId: campaign.workspaceId, contactPhone: { in: [refPhone, canonicalWaId(refPhone)] }, lastInboundAt: { gt: new Date(Date.now() - 23.5 * 3600_000) } },
      orderBy: { lastInboundAt: "desc" },
      select: { id: true },
    });
    if (conv) {
      // Aceita {nome} e {{nome}} (o mesmo jeito dos fluxos)
      const text = campaign.leadConfirmText.replace(/\{\{?\s*nome\s*\}?\}/gi, name ?? "a pessoa").replace(/\{\{?\s*telefone\s*\}?\}/gi, phone);
      confirmed = await sendChatMessage(conv.id, { text, source: "FLOW", campaignId: campaign.id }).then(() => true).catch((e) => {
        console.error("[leads] confirmação", e instanceof Error ? e.message : e);
        return false;
      });
    }
  }
  return { ok: true, status, confirmed };
}
