import { prisma } from "@/lib/db";
import { clicksXlsxResponse } from "@/lib/clicks-export";
import { clientIp, tooMany } from "@/lib/rate-limit";
import { reportNumbers } from "@/lib/report-numbers";

/** Link do relatório do cliente: o próprio cliente baixa a planilha de quem clicou no link (só cliques). Vale enquanto o link estiver no ar. */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{8,80}$/.test(token)) return new Response("Link inválido", { status: 404 });
  if (tooMany(`rpt-clicks:${await clientIp()}`, 20, 60_000)) return new Response("Muitos pedidos. Espere um minuto.", { status: 429 });
  const c = await prisma.campaign.findFirst({ where: { shareToken: token, shareExpiresAt: { gt: new Date() } }, select: { id: true, name: true, reportOverrides: true } });
  // Relatório com números ajustados não entrega a lista real (não bateria com o que o cliente vê)
  if (!c) return new Response("Este link saiu do ar", { status: 404 });
  if ((await reportNumbers(c.id, c.reportOverrides)).adjusted) return new Response("Planilha indisponível para este relatório", { status: 404 });
  return clicksXlsxResponse(c, null);
}
