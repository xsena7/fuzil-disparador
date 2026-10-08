import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const BOT_UA = /facebookexternalhit|facebot|whatsapp|bot\b|crawler|spider|preview|slurp|headless|curl|wget|python-requests/i;

/** Redirecionador dos botões: registra o clique e manda a pessoa para o link da campanha. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { clickToken: token },
    include: { campaign: { select: { id: true, buttonUrl: true } } },
  });
  const target = recipient?.campaign.buttonUrl;
  if (!recipient || !target) return new Response("Link não encontrado", { status: 404 });

  const ua = req.headers.get("user-agent") ?? "";
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || null;
  const isBot = !ua || BOT_UA.test(ua);

  // Não bloqueia o redirecionamento esperando o banco
  void (async () => {
    try {
      await prisma.linkClick.create({ data: { campaignId: recipient.campaignId, recipientId: recipient.id, ip, userAgent: ua.slice(0, 500), isBot } });
      if (!isBot) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { clickCount: { increment: 1 }, firstClickAt: recipient.firstClickAt ?? new Date() },
        });
      }
    } catch (err) {
      console.error("[redirect]", err);
    }
  })();

  return Response.redirect(target, 302);
}
