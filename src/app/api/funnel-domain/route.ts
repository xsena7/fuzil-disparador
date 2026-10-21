import { prisma } from "@/lib/db";

/** O Caddy pergunta aqui antes de gerar o certificado de um domínio: só domínios de funil cadastrados. */
export async function GET(req: Request) {
  const domain = (new URL(req.url).searchParams.get("domain") ?? "").toLowerCase().replace(/^www\./, "");
  if (!domain) return new Response("no", { status: 400 });
  const funnel = await prisma.funnel.findUnique({ where: { domain }, select: { id: true } });
  return new Response(funnel ? "ok" : "no", { status: funnel ? 200 : 404 });
}
