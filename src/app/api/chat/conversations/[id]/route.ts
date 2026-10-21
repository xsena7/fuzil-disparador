import { NextResponse } from "next/server";
import { getActiveAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { windowOpen, WINDOW_MS } from "@/lib/chat";
import type { TComponent } from "@/lib/template-utils";

export const dynamic = "force-dynamic";

/** Mensagens de uma conversa (?after=<iso> só as novas; ?before=<iso> mais antigas) + dados do contato. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getActiveAuth();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const conv = await prisma.conversation.findFirst({
    where: { id, workspaceId: auth.workspace.id },
    include: { phone: { include: { waba: { include: { business: { select: { name: true } } } } } } },
  });
  if (!conv) return NextResponse.json({ error: "not found" }, { status: 404 });
  const sp = new URL(req.url).searchParams;
  const after = sp.get("after");
  const before = sp.get("before");

  const messages = after
    ? await prisma.chatMessage.findMany({ where: { conversationId: id, createdAt: { gt: new Date(after) } }, orderBy: { createdAt: "asc" }, take: 200 })
    : (await prisma.chatMessage.findMany({
        where: { conversationId: id, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
        orderBy: { createdAt: "desc" },
        take: 60,
      })).reverse();
  // Status de mensagens enviadas recentes (para atualizar os tracinhos)
  const statuses = after
    ? await prisma.chatMessage.findMany({ where: { conversationId: id, direction: "OUT", createdAt: { gt: new Date(Date.now() - 2 * 86400_000) } }, select: { id: true, status: true, error: true } })
    : [];

  // Disparos: imagem do cabeçalho, rodapé e botões do template, para aparecer como o cliente recebeu
  const campaignIds = [...new Set(messages.filter((m) => m.source === "CAMPAIGN" && m.campaignId).map((m) => m.campaignId!))];
  const layouts = new Map<string, { headerKind: string | null; headerUrl: string | null; headerName: string | null; headerText: string | null; footer: string | null; buttons: string[] }>();
  if (campaignIds.length) {
    const camps = await prisma.campaign.findMany({
      where: { id: { in: campaignIds }, workspaceId: auth.workspace.id },
      select: { id: true, templateName: true, templateLanguage: true, headerMediaUrl: true, headerMediaType: true, headerMediaName: true },
    });
    const tpls = await prisma.template.findMany({
      where: { workspaceId: auth.workspace.id, OR: camps.filter((c) => c.templateName).map((c) => ({ name: c.templateName!, language: c.templateLanguage ?? undefined })) },
      select: { name: true, language: true, wabaId: true, components: true },
    });
    for (const c of camps) {
      const same = tpls.filter((t) => t.name === c.templateName && (!c.templateLanguage || t.language === c.templateLanguage));
      const tpl = same.find((t) => t.wabaId === conv.phone.wabaId) ?? same[0];
      const comps = (tpl?.components ?? []) as unknown as TComponent[];
      const header = comps.find((x) => x.type === "HEADER");
      const format = header?.format ?? (c.headerMediaUrl ? c.headerMediaType : null);
      layouts.set(c.id, {
        headerKind: format && format !== "TEXT" ? format : null,
        headerUrl: format && format !== "TEXT" ? c.headerMediaUrl : null,
        headerName: c.headerMediaName,
        headerText: format === "TEXT" ? header?.text ?? null : null,
        footer: comps.find((x) => x.type === "FOOTER")?.text ?? null,
        buttons: comps.filter((x) => x.type === "BUTTONS").flatMap((x) => x.buttons ?? []).map((b) => b.text),
      });
    }
  }
  const withLayout = messages.map((m) => (m.campaignId && layouts.has(m.campaignId) ? { ...m, layout: layouts.get(m.campaignId) } : m));

  let extra = null;
  if (!after && !before) {
    // Painel do contato: campanhas que ele recebeu desse workspace
    const [history, contact, campaignNames] = await Promise.all([
      prisma.campaignRecipient.findMany({
        where: { phone: conv.contactPhone, campaign: { workspaceId: auth.workspace.id }, sentAt: { not: null } },
        orderBy: { sentAt: "desc" },
        take: 10,
        select: { campaignId: true, sentAt: true, status: true, clickCount: true, repliedAt: true, autoReplySentAt: true },
      }),
      prisma.contact.findUnique({ where: { workspaceId_phone: { workspaceId: auth.workspace.id, phone: conv.contactPhone } } }),
      prisma.campaign.findMany({ where: { workspaceId: auth.workspace.id }, select: { id: true, name: true } }),
    ]);
    const names = new Map(campaignNames.map((c) => [c.id, c.name]));
    extra = {
      history: history.map((h) => ({ ...h, campaignName: names.get(h.campaignId) ?? "Campanha" })),
      optedOut: Boolean(contact?.optedOut),
    };
  }

  return NextResponse.json({
    conversation: {
      id: conv.id,
      contactPhone: conv.contactPhone,
      contactName: conv.contactName,
      status: conv.status,
      unread: conv.unread,
      lastInboundAt: conv.lastInboundAt,
      windowOpen: windowOpen(conv),
      windowEndsAt: conv.lastInboundAt ? new Date(conv.lastInboundAt.getTime() + WINDOW_MS) : null,
      phone: { id: conv.phone.id, display: conv.phone.displayPhoneNumber, name: conv.phone.verifiedName, bm: conv.phone.waba.business.name, wabaId: conv.phone.wabaId },
    },
    messages: withLayout,
    statuses,
    extra,
    now: new Date().toISOString(),
  });
}
