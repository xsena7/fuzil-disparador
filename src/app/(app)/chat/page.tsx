import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { getComponent, type TComponent } from "@/lib/template-utils";
import { ChatApp, type ChatPhone, type ChatTemplate } from "./chat-app";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const auth = await requireAuth();
  const ws = auth.workspace.id;
  const [phones, groups, templates, quickReplies, campaigns] = await Promise.all([
    prisma.phoneNumber.findMany({
      where: { waba: { workspaceId: ws } },
      include: { waba: { include: { business: { select: { id: true, name: true } } } } },
      orderBy: [{ waba: { business: { name: "asc" } } }, { displayPhoneNumber: "asc" }],
    }),
    prisma.bmGroup.findMany({ where: { workspaceId: ws }, include: { members: { select: { businessId: true } } }, orderBy: { name: "asc" } }),
    prisma.template.findMany({ where: { workspaceId: ws, status: "APPROVED", category: "UTILITY" }, orderBy: { name: "asc" } }),
    prisma.quickReply.findMany({ where: { workspaceId: ws }, orderBy: { shortcut: "asc" } }),
    prisma.campaign.findMany({ where: { workspaceId: ws }, select: { id: true, name: true }, orderBy: { createdAt: "desc" }, take: 500 }),
  ]);

  const chatPhones: ChatPhone[] = phones.map((p) => ({
    id: p.id,
    display: formatPhone(p.displayPhoneNumber.replace(/\D/g, "")),
    name: p.verifiedName ?? "",
    bmId: p.waba.business.id,
    bm: p.waba.business.name,
    wabaId: p.wabaId,
    quality: p.qualityRating ?? "UNKNOWN",
  }));

  // Templates que dá para mandar no chat (cabeçalho de texto com variável fica de fora: raro e confuso)
  const chatTemplates: ChatTemplate[] = templates.flatMap((t) => {
    const comps = t.components as unknown as TComponent[];
    const header = getComponent(comps, "HEADER");
    if (header?.format === "TEXT" && /\{\{/.test(header.text ?? "")) return [];
    const body = getComponent(comps, "BODY")?.text ?? "";
    const urlButtons = (getComponent(comps, "BUTTONS")?.buttons ?? []).flatMap((b, index) =>
      b.type === "URL" && /\{\{/.test(b.url ?? "") ? [{ index, text: b.text, prefix: (b.url ?? "").replace(/\{\{.*$/, "") }] : [],
    );
    return [{
      id: t.id,
      wabaId: t.wabaId,
      name: t.name,
      language: t.language,
      body,
      vars: (body.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? []).length,
      headerMedia: header && ["IMAGE", "VIDEO", "DOCUMENT"].includes(header.format ?? "") ? (header.format as "IMAGE" | "VIDEO" | "DOCUMENT") : null,
      urlButtons,
    }];
  });

  return (
    <ChatApp
      me={{ id: auth.user.id, name: auth.user.name }}
      phones={chatPhones}
      groups={groups.map((g) => ({ id: g.id, name: g.name, bmIds: g.members.map((m) => m.businessId) }))}
      templates={chatTemplates}
      quickReplies={quickReplies.map((q) => ({ id: q.id, shortcut: q.shortcut, text: q.text }))}
      campaignNames={Object.fromEntries(campaigns.map((c) => [c.id, c.name]))}
    />
  );
}
