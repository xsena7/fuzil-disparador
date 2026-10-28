// Prévia do template de uma campanha (com as variáveis preenchidas como na campanha), para o bloco Disparo do fluxo.
import { prisma } from "./db";
import { templateFamily } from "./blueprints";
import { renderText, type TComponent, type VariableMapping } from "./template-utils";
import type { PreviewData } from "@/components/whatsapp-preview";

export async function campaignPreview(workspaceId: string, campaignId: string): Promise<PreviewData | null> {
  const c = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId } });
  if (!c?.templateName || !c.templateLanguage) return null;
  const family = await templateFamily(workspaceId, c.templateName, c.templateLanguage);
  const tpl =
    (await prisma.template.findFirst({ where: { workspaceId, name: { in: family }, language: c.templateLanguage, status: "APPROVED" } })) ??
    (await prisma.template.findFirst({ where: { workspaceId, name: { in: family }, language: c.templateLanguage } }));
  if (!tpl) return null;
  const comps = tpl.components as unknown as TComponent[];
  const mapping = (c.variableMapping ?? {}) as VariableMapping;
  const r = await prisma.campaignRecipient.findFirst({ where: { campaignId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  const sample = r ? { phone: r.phone, name: r.name, data: r.data as Record<string, unknown> } : { phone: "5511999999999", name: "Maria Silva", data: {} };
  const header = comps.find((x) => x.type === "HEADER");
  return {
    headerType: header?.format ?? null,
    headerText: header?.format === "TEXT" ? renderText(header.text, mapping.header, sample) : undefined,
    headerMediaUrl: c.headerMediaUrl,
    body: renderText(comps.find((x) => x.type === "BODY")?.text, mapping.body, sample),
    footer: comps.find((x) => x.type === "FOOTER")?.text,
    buttons: (comps.find((x) => x.type === "BUTTONS")?.buttons ?? []).map((b) => ({ type: b.type, text: b.text })),
  };
}
