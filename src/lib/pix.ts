// Pix das recargas e da loja: escolhe o gateway (Mercado Pago ou SyncPay, em Admin → Vendas) e deixa a resposta no mesmo formato.
import QRCode from "qrcode";
import { env } from "./env";
import { mpCreatePix, mpGetPayment } from "./mercadopago";
import { isSyncPayId, syncpayCreatePix, syncpayGetTx } from "./syncpay";

export type PixPayment = {
  /** Como fica salvo no banco (mpPaymentId). SyncPay começa com "sp:". */
  id: string;
  approved: boolean;
  status: string;
  /** Só no Mercado Pago: de quem é ("cred:<id>" ou id do pedido). Na SyncPay acha pelo id. */
  reference?: string;
  amountCents: number;
};

/** A SyncPay exige CPF/CNPJ e telefone de quem paga (o Mercado Pago não). */
export const pixNeedsPayerDoc = () => env.paymentProvider() === "syncpay";

export async function createPix(input: {
  amountCents: number;
  description: string;
  reference: string;
  email: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  expiresAt: Date;
  idempotency: string;
}): Promise<{ id: string; code: string; qr: string | null }> {
  if (env.paymentProvider() === "syncpay") {
    if (!input.document || !input.phone) throw new Error("Falta CPF/CNPJ ou telefone de quem paga");
    const pix = await syncpayCreatePix({ amountCents: input.amountCents, description: input.description, client: { name: input.name, document: input.document, email: input.email, phone: input.phone } });
    const qr = await QRCode.toDataURL(pix.code, { margin: 1, width: 440 }).then((u) => u.replace(/^data:image\/png;base64,/, "")).catch(() => null);
    return { id: pix.id, code: pix.code, qr };
  }
  return mpCreatePix({ amountCents: input.amountCents, description: input.description, reference: input.reference, email: input.email, firstName: input.name.split(" ")[0], expiresAt: input.expiresAt, idempotency: input.idempotency });
}

/** Consulta o pagamento direto no gateway (nunca confia só no aviso). */
export async function getPixPayment(id: string): Promise<PixPayment> {
  if (isSyncPayId(id)) {
    const tx = await syncpayGetTx(id);
    const status = tx.status ?? "unknown";
    return { id, approved: status === "completed", status, amountCents: Math.round((tx.amount ?? 0) * 100) };
  }
  const pay = await mpGetPayment(id);
  return { id: String(pay.id), approved: pay.status === "approved", status: pay.status, reference: pay.external_reference, amountCents: Math.round((pay.transaction_amount ?? 0) * 100) };
}

/** CPF ou CNPJ com dígito verificador certo. */
export function validDocument(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) {
    if (/^(\d)\1+$/.test(d)) return false;
    const dv = (n: number) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
      const r = (s * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
  }
  if (d.length === 14) {
    if (/^(\d)\1+$/.test(d)) return false;
    const dv = (n: number) => {
      const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const s = w.reduce((a, x, i) => a + x * Number(d[i]), 0);
      const r = s % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
  }
  return false;
}
