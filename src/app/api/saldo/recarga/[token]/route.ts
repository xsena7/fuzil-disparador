import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { purchaseStatus } from "@/lib/credit-purchase";

export const dynamic = "force-dynamic";

/** Situação da recarga (a tela de Saldo pergunta a cada poucos segundos). Só da conta logada. */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Entre de novo" }, { status: 401 });
  const s = await purchaseStatus((await params).token, auth.workspace.id);
  if (!s) return NextResponse.json({ error: "Recarga não encontrada" }, { status: 404 });
  return NextResponse.json(s, { headers: { "Cache-Control": "no-store" } });
}
