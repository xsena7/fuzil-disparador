import { NextResponse, type NextRequest } from "next/server";
import { handleSyncPayNotice } from "@/lib/payments";

type Body = Record<string, unknown> & { data?: Record<string, unknown> };
const pickId = (b: Body): string | null => {
  for (const v of [b.data?.identifier, b.data?.reference_id, b.data?.id, b.identifier, b.reference_id, b.id]) {
    const s = typeof v === "string" || typeof v === "number" ? String(v) : "";
    if (/^[A-Za-z0-9-]{6,80}$/.test(s)) return s;
  }
  return null;
};

/**
 * Aviso da SyncPay (Pix pago, falhou...), das recargas e da loja. O aviso não tem assinatura:
 * o Fuzil só usa ele para conferir na API da SyncPay os Pix que ainda esperam (aviso falso não libera nada).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  try {
    await handleSyncPayNotice(pickId(body));
  } catch (e) {
    console.error("[vendas] aviso da SyncPay", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
