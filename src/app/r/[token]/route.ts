import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { recordClick } from "@/lib/chat";

const BOT_UA = /facebookexternalhit|facebot|whatsapp|bot\b|crawler|spider|preview|slurp|headless|curl|wget|python-requests/i;

/** Redirecionador dos botões: registra o clique e manda a pessoa para o link da campanha. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { clickToken: token },
    include: { campaign: { select: { id: true, buttonUrl: true } } },
  });
  const ua = req.headers.get("user-agent") ?? "";
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || null;
  const isBot = !ua || BOT_UA.test(ua);

  // Não é de campanha do Fuzil: pode ser um link para outra plataforma (código fixo na variável do botão)
  if (!recipient) {
    const link = await prisma.externalLink.findUnique({ where: { code: token }, select: { id: true, url: true } });
    if (!link) return new Response("Link não encontrado", { status: 404 });
    if (!isBot) void prisma.externalLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 }, lastClickAt: new Date() } }).catch(() => undefined);
    return Response.redirect(link.url, 302);
  }
  const target = recipient.campaign.buttonUrl;
  if (!target) return new Response("Link não encontrado", { status: 404 });

  // Não bloqueia o redirecionamento esperando o banco
  void (async () => {
    try {
      await prisma.linkClick.create({ data: { campaignId: recipient.campaignId, recipientId: recipient.id, ip, userAgent: ua.slice(0, 500), isBot } });
      if (!isBot) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { clickCount: { increment: 1 }, firstClickAt: recipient.firstClickAt ?? new Date() },
        });
        await recordClick(recipient);
      }
    } catch (err) {
      console.error("[redirect]", err);
    }
  })();

  return Response.redirect(target, 302);
}
