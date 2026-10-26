import { NextResponse } from "next/server";
import { publicOrder } from "@/lib/market";

export const dynamic = "force-dynamic";

/** Situação do pedido (a página do Pix pergunta a cada poucos segundos). */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const o = await publicOrder((await params).token);
  if (!o) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  return NextResponse.json(o, { headers: { "Cache-Control": "no-store" } });
}
