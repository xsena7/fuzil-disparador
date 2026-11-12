import { getActiveAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clicksXlsxResponse } from "@/lib/clicks-export";

/**
 * Planilha (Excel) de quem clicou num botão da campanha: nome, telefone, horários e as colunas da lista original.
 * Sem ?botao = botão de link (cliques contados pelo Fuzil). ?botao=Sair = botão de resposta rápida com esse texto.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getActiveAuth();
  if (!auth) return new Response("Não autenticado", { status: 401 });
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, workspaceId: auth.workspace.id }, select: { id: true, name: true } });
  if (!campaign) return new Response("Not found", { status: 404 });
  const button = new URL(req.url).searchParams.get("botao")?.trim().slice(0, 60) || null;
  return clicksXlsxResponse(campaign, button);
}
