import { NextResponse } from "next/server";
import { addLead } from "@/lib/leads";
import { clientIp, tooMany } from "@/lib/rate-limit";

// Pode ser chamado do navegador (formulário do site) ou do servidor/ferramenta de automação
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/** Teste rápido no navegador: só diz se o link está ligado. */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { prisma } = await import("@/lib/db");
  const c = /^[\w-]{10,60}$/.test(token) ? await prisma.campaign.findUnique({ where: { leadToken: token }, select: { name: true } }) : null;
  return NextResponse.json(c ? { ok: true, campanha: c.name, como_usar: "Mande POST com JSON ou formulário: telefone (obrigatório), nome e indicado_por (telefone de quem indicou, opcional)" } : { ok: false, error: "Link desligado" }, { status: c ? 200 : 404, headers: CORS });
}

/** Cadastro do site: entra na campanha e recebe a mensagem na hora. Aceita JSON, formulário ou query string. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{10,60}$/.test(token)) return NextResponse.json({ ok: false, error: "Link inválido" }, { status: 404, headers: CORS });
  const ip = await clientIp();
  if (tooMany(`leads:${token}:${ip}`, 60, 60_000)) return NextResponse.json({ ok: false, error: "Muitos cadastros seguidos. Espere um minuto." }, { status: 429, headers: CORS });
  let body: unknown = {};
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("json")) body = await req.json();
    else if (type.includes("form")) body = Object.fromEntries((await req.formData()).entries());
    else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = Object.fromEntries(new URLSearchParams(text));
      }
    }
  } catch {
    body = {};
  }
  const q = Object.fromEntries(new URL(req.url).searchParams);
  const r = await addLead(token, { ...q, ...(body as object) });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status, headers: CORS });
  return NextResponse.json({ ok: true, status: r.status, confirmacao_enviada: r.confirmed }, { headers: CORS });
}
