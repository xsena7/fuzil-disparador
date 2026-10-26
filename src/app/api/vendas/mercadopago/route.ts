import { NextResponse, type NextRequest } from "next/server";
import { handlePaymentNotice } from "@/lib/payments";

/**
 * Aviso do Mercado Pago (Pix pago, cancelado...), das Vendas de BM e das recargas de créditos. O aviso só diz o ID do pagamento:
 * o Fuzil consulta o pagamento direto na API do Mercado Pago antes de entregar (aviso falso não entrega nada).
 */
export async function POST(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const body = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } };
  const type = body.type ?? body.topic ?? q.get("type") ?? q.get("topic");
  const id = String(body.data?.id ?? q.get("data.id") ?? q.get("id") ?? "");
  if (type === "payment" && /^\d{1,30}$/.test(id)) {
    try {
      await handlePaymentNotice(id);
    } catch (e) {
      console.error("[vendas] aviso do Mercado Pago", e);
      // 500 = o Mercado Pago manda o aviso de novo depois
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
