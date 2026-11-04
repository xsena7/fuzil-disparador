// SyncPay (Pix pela API de parceiro): alternativa ao Mercado Pago nas Vendas de BM e na compra de créditos.
// O aviso que a SyncPay manda no webhook_url não tem assinatura: o Fuzil só usa ele como "vai conferir" e consulta a transação na API.
import { env } from "./env";

type Token = { value: string; until: number; key: string };
let cached: Token | null = null;

export type SyncPayTx = { reference_id?: string; amount?: number; status?: string; description?: string | null };

function creds() {
  const id = env.syncpayClientId();
  const secret = env.syncpaySecret();
  if (!id || !secret) throw new Error("SyncPay não configurada (Admin → gaveta Vendas)");
  return { id, secret };
}

async function token(force = false): Promise<string> {
  const { id, secret } = creds();
  const key = `${id}:${secret.length}`;
  // O token vale 1 hora e a SyncPay pede para só gerar outro quando o anterior vencer
  if (!force && cached && cached.key === key && cached.until > Date.now()) return cached.value;
  const res = await fetch(`${env.syncpayApiUrl()}/api/partner/v1/auth-token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: id, client_secret: secret }),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; message?: string };
  if (!res.ok || !json.access_token) throw new Error(res.status === 401 ? "SyncPay: ID Público ou ID Privado errado" : `SyncPay ${res.status}: ${json.message ?? "não gerou o token"}`);
  cached = { value: json.access_token, until: Date.now() + Math.max(60, (json.expires_in ?? 3600) - 60) * 1000, key };
  return json.access_token;
}

async function sp<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${env.syncpayApiUrl()}/api/partner/v1${path}`, {
      method,
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${await token(attempt > 0)}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    // Token vencido antes da hora: gera outro uma vez
    if (res.status === 401 && attempt === 0) continue;
    const json = (await res.json().catch(() => ({}))) as T & { message?: string; errors?: Record<string, string[]> };
    if (!res.ok) {
      const first = json.errors ? Object.values(json.errors).flat()[0] : null;
      if (res.status === 403) throw new Error("SyncPay recusou: libere o IP do servidor em Developer → API → IPs Autorizados");
      throw new Error(`SyncPay ${res.status}: ${first ?? json.message ?? "erro"}`);
    }
    return json;
  }
}

/** Telefone com DDD, sem o 55 do Brasil (formato do exemplo da SyncPay). */
const localPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  return d.length >= 12 && d.startsWith("55") ? d.slice(2) : d;
};

/** Marca no banco (mpPaymentId) para saber que o Pix é da SyncPay. */
export const SP_PREFIX = "sp:";
export const isSyncPayId = (id: string | null | undefined) => Boolean(id?.startsWith(SP_PREFIX));

/** Gera um Pix. A SyncPay exige nome, CPF/CNPJ, e-mail e telefone de quem paga. */
export async function syncpayCreatePix(input: { amountCents: number; description: string; client: { name: string; document: string; email: string; phone: string } }) {
  const r = await sp<{ pix_code?: string; identifier?: string }>("POST", "/cash-in", {
    amount: input.amountCents / 100,
    description: input.description,
    webhook_url: `${env.appUrl()}/api/vendas/syncpay`,
    client: { name: input.client.name, document: input.client.document.replace(/\D/g, ""), email: input.client.email, phone: localPhone(input.client.phone) },
  });
  if (!r.pix_code || !r.identifier) throw new Error("SyncPay não devolveu o Pix");
  return { id: `${SP_PREFIX}${r.identifier}`, code: r.pix_code };
}

export async function syncpayGetTx(id: string): Promise<SyncPayTx> {
  const identifier = id.startsWith(SP_PREFIX) ? id.slice(SP_PREFIX.length) : id;
  const r = await sp<{ data?: SyncPayTx }>("GET", `/transaction/${encodeURIComponent(identifier)}`);
  return r.data ?? {};
}

/** Pago e com o valor certo (em centavos). */
export const syncpayPaid = (tx: SyncPayTx, cents: number) => tx.status === "completed" && Math.round((tx.amount ?? 0) * 100) >= cents;

/** Testa as chaves: gera o token e consulta o saldo (não cria cobrança). */
export async function syncpayTest(): Promise<{ ok: string } | { error: string }> {
  try {
    cached = null;
    const r = await sp<{ balance?: number | string }>("GET", "/balance");
    return { ok: `SyncPay funcionando${r.balance !== undefined ? ` (saldo: R$ ${r.balance})` : ""}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
