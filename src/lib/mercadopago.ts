// Mercado Pago (Pix pela API de pagamentos): usado nas Vendas de BM e na compra de créditos.
import { env } from "./env";

export type MpPayment = {
  id: number;
  status: string; // pending | approved | rejected | cancelled | refunded | in_process ...
  external_reference?: string;
  transaction_amount?: number;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
};

export async function mp<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown, idempotency?: string): Promise<T> {
  const token = env.mpAccessToken();
  if (!token) throw new Error("Mercado Pago não configurado (Admin → gaveta Vendas)");
  const res = await fetch(`${env.mpApiUrl()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(idempotency ? { "X-Idempotency-Key": idempotency } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${json.message ?? "erro"}`);
  return json;
}

/** "2026-10-26T12:15:00.000-03:00" (formato que o Mercado Pago pede para o vencimento do Pix). */
export function mpDate(d: Date) {
  return `${new Date(d.getTime() - 3 * 3600_000).toISOString().replace("Z", "")}-03:00`;
}

export const mpGetPayment = (id: string) => mp<MpPayment>("GET", `/v1/payments/${encodeURIComponent(id)}`);

/** Gera um Pix com vencimento. `reference` volta no aviso de pagamento e diz de quem é (pedido de BM ou recarga). */
export async function mpCreatePix(input: { amountCents: number; description: string; reference: string; email: string; firstName?: string; expiresAt: Date; idempotency: string }) {
  const pay = await mp<MpPayment>(
    "POST",
    "/v1/payments",
    {
      transaction_amount: input.amountCents / 100,
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.reference,
      notification_url: `${env.appUrl()}/api/vendas/mercadopago`,
      date_of_expiration: mpDate(input.expiresAt),
      payer: { email: input.email, ...(input.firstName ? { first_name: input.firstName } : {}) },
    },
    input.idempotency,
  );
  const tx = pay.point_of_interaction?.transaction_data;
  if (!tx?.qr_code) throw new Error("Mercado Pago não devolveu o Pix");
  return { id: String(pay.id), code: tx.qr_code, qr: tx.qr_code_base64 ?? null };
}

/** Valor pago confere com o cobrado (em centavos, sem erro de arredondamento). */
export const paidEnough = (pay: MpPayment, cents: number) => Math.round((pay.transaction_amount ?? 0) * 100) >= cents;
