import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { recordClick } from "@/lib/chat";
import { fillUrlVars } from "@/lib/template-utils";

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

  // Teste de envio: vai para o link da campanha (com os dados da 1ª linha) sem contar clique.
  // tst<código secreto da 1ª linha, 9 letras> ou, sem planilha, tstc<campanha> (aí sem dados de ninguém)
  const testRow = !recipient && /^tst[A-Za-z0-9]{9}$/.test(token);
  const testCampaign = !recipient && !testRow && /^tstc[a-z0-9]{20,28}$/.test(token);
  if (testRow || testCampaign) {
    const row = testRow
      ? await prisma.campaignRecipient.findUnique({ where: { clickToken: token.slice(3) }, select: { phone: true, name: true, data: true, campaignId: true } })
      : null;
    const campaignId = row?.campaignId ?? (testCampaign ? token.slice(4) : null);
    const campaign = campaignId ? await prisma.campaign.findUnique({ where: { id: campaignId }, select: { buttonUrl: true } }) : null;
    if (!campaign?.buttonUrl) return new Response("Link não encontrado", { status: 404 });
    const target = fillUrlVars(campaign.buttonUrl, row ?? { phone: "", name: null, data: {} });
    return /^https?:\/\//i.test(target) ? Response.redirect(target, 302) : new Response("Link não encontrado", { status: 404 });
  }
  // Não é de campanha do Fuzil: pode ser um link para outra plataforma (código fixo na variável do botão)
  if (!recipient) {
    const link = await prisma.externalLink.findUnique({ where: { code: token }, select: { id: true, url: true } });
    if (!link) return new Response("Link não encontrado", { status: 404 });
    if (!isBot) void prisma.externalLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 }, lastClickAt: new Date() } }).catch(() => undefined);
    return Response.redirect(link.url, 302);
  }
  // Link com dados da planilha ({{coluna}}): cada pessoa vai para o link com os dados dela
  const target = recipient.campaign.buttonUrl ? fillUrlVars(recipient.campaign.buttonUrl, recipient) : null;
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
