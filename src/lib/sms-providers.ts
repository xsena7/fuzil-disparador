// Serviços de número virtual (só WhatsApp Brasil): SMSBear e SMS24h, no mesmo formato para o painel e o registro automático.
import { prisma } from "./db";
import { decrypt } from "./crypto";
import type { SmsProviderKey } from "./smsbear-shared";

export type SmsOrderState = { status: "pending" | "received" | "cancelled"; sms: Array<{ code?: string; text?: string }> };
export type SmsProvider = {
  label: string;
  /** Saldo em centavos. */
  balance(token: string): Promise<number>;
  /** Preço do WhatsApp Brasil (centavos) e quantos números tem. */
  price(token: string): Promise<{ costCents: number; stock: number } | null>;
  buy(token: string, idempotency: string): Promise<{ id: string; number: string; costCents: number }>;
  order(token: string, id: string): Promise<SmsOrderState>;
  cancel(token: string, id: string): Promise<void>;
  /** Avisa que o código foi usado (alguns serviços pedem para fechar a ativação). */
  finish?(token: string, id: string): Promise<void>;
};

export class SmsProviderError extends Error {}

// ---------------------------------------------------------------------------
// SMSBear (API REST, token no cabeçalho)
// ---------------------------------------------------------------------------

const bearUrl = () => (process.env.SMSBEAR_API_URL || "https://api.smsbear.net").replace(/\/$/, "");

async function bear<T>(token: string, method: "GET" | "POST", path: string, body?: unknown, idempotency?: string): Promise<T> {
  const res = await fetch(`${bearUrl()}${path}`, {
    method,
    headers: {
      "x-api-token": token,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(idempotency ? { "Idempotency-Key": idempotency } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { success?: boolean; message?: string; error?: string };
  if (!res.ok || json.success === false) {
    const msg = json.message || json.error || `erro ${res.status}`;
    throw new SmsProviderError(res.status === 401 || res.status === 403 ? "Token do SMSBear inválido" : `SMSBear: ${msg}`);
  }
  return json;
}

type BearOrder = { id: string; status: string; number?: string; sms?: Array<{ code?: string; text?: string }>; cost?: number };

const smsbear: SmsProvider = {
  label: "SMSBear",
  balance: (t) => bear<{ balance: number }>(t, "GET", "/v1/getBalance").then((r) => Number(r.balance) || 0),
  price: (t) =>
    bear<{ prices: Array<{ service: string; country: string; cost: number; stock: number }> }>(t, "GET", "/v1/sms/prices?service=whatsapp&country=brazil").then((r) => {
      const p = r.prices?.find((x) => x.service === "whatsapp" && x.country === "brazil");
      return p ? { costCents: Number(p.cost) || 0, stock: Number(p.stock) || 0 } : null;
    }),
  buy: (t, idem) =>
    bear<{ id: string; number: string; cost: number }>(t, "POST", "/v1/sms/buy", { service: "whatsapp", country: "brazil" }, idem).then((o) => ({
      id: o.id,
      number: o.number,
      costCents: Number(o.cost) || 0,
    })),
  order: (t, id) =>
    bear<{ order: BearOrder }>(t, "GET", `/v1/sms/orders/${encodeURIComponent(id)}`).then(({ order }) => {
      const sms = order?.sms ?? [];
      const st = String(order?.status ?? "").toLowerCase();
      return { status: sms.length ? "received" : /refund|cancel|devolv|reembols/.test(st) ? "cancelled" : "pending", sms };
    }),
  cancel: (t, id) => bear(t, "GET", `/v1/sms/cancel/${encodeURIComponent(id)}`).then(() => undefined),
};

// ---------------------------------------------------------------------------
// SMS24h (padrão SMS-Activate: handler_api com api_key e action, resposta em texto)
// ---------------------------------------------------------------------------

const s24Url = () => process.env.SMS24H_API_URL || "https://api.sms24h.org/stubs/handler_api";
const S24_ERRORS: Record<string, string> = {
  BAD_KEY: "Chave do SMS24h inválida",
  errorBadKey: "Chave do SMS24h inválida",
  NO_BALANCE: "SMS24h: Saldo insuficiente",
  NO_NUMBERS: "SMS24h: sem número de WhatsApp Brasil disponível agora",
  WRONG_SERVICE: "SMS24h: serviço inválido",
  NO_ACTIVATION: "SMS24h: ativação não existe",
  NO_ATIVATION: "SMS24h: ativação não existe",
  EARLY_CANCEL_DENIED: "SMS24h: ainda não deixa cancelar (espere uns minutos depois da compra)",
  BAD_STATUS: "SMS24h: não dá para mudar o status agora",
  ERROR_SQL: "SMS24h: erro no servidor deles",
  BAD_ACTION: "SMS24h: comando inválido",
};

async function s24(key: string, params: Record<string, string>): Promise<string> {
  const url = new URL(s24Url());
  url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const text = (await res.text()).trim();
  const head = text.split(":")[0];
  if (S24_ERRORS[head]) throw new SmsProviderError(S24_ERRORS[head]);
  if (!res.ok) throw new SmsProviderError(`SMS24h: erro ${res.status}`);
  return text;
}

/** "540" ou "540.50" (reais) → centavos. */
const reaisToCents = (v: string | number) => Math.round(Number(String(v).replace(",", ".")) * 100) || 0;

async function s24Price(key: string) {
  const text = await s24(key, { action: "getPrices", service: "wa", country: "73" });
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const wa = json?.["73"]?.wa ?? json?.wa;
  if (!wa || typeof wa !== "object") return null;
  // {Preço: Quantidade} (formato da documentação) ou {cost, count} (padrão SMS-Activate)
  if ("cost" in wa) return { costCents: reaisToCents(wa.cost), stock: Number(wa.count ?? wa.stock ?? 0) };
  const [price, qty] = Object.entries(wa)[0] ?? [];
  return price === undefined ? null : { costCents: reaisToCents(price), stock: Number(qty) || 0 };
}

const sms24h: SmsProvider = {
  label: "SMS24h",
  balance: (k) => s24(k, { action: "getBalance" }).then((t) => reaisToCents(t.split(":")[1] ?? "0")),
  price: s24Price,
  async buy(k) {
    const text = await s24(k, { action: "getNumber", service: "wa", country: "73", operator: "any" });
    const [tag, id, number] = text.split(":");
    if (tag !== "ACCESS_NUMBER" || !id || !number) throw new SmsProviderError(`SMS24h: ${text}`);
    const price = await s24Price(k).catch(() => null);
    return { id, number: number.startsWith("55") ? number : `55${number}`, costCents: price?.costCents ?? 0 };
  },
  async order(k, id) {
    const text = await s24(k, { action: "getStatus", id });
    if (text.startsWith("STATUS_OK:") || text.startsWith("STATUS_WAIT_RETRY:")) return { status: "received", sms: [{ code: text.split(":").slice(1).join(":") }] };
    if (text.startsWith("STATUS_CANCEL")) return { status: "cancelled", sms: [] };
    return { status: "pending", sms: [] };
  },
  async cancel(k, id) {
    const text = await s24(k, { action: "setStatus", status: "8", id });
    if (!/ACCESS_CANCEL/.test(text)) throw new SmsProviderError(`SMS24h: ${text}`);
  },
  finish: (k, id) => s24(k, { action: "setStatus", status: "6", id }).then(() => undefined),
};

export const SMS_PROVIDERS: Record<SmsProviderKey, SmsProvider> = { smsbear, sms24h };
export const providerOf = (key: string | null | undefined): SmsProvider => SMS_PROVIDERS[(key as SmsProviderKey) in SMS_PROVIDERS ? (key as SmsProviderKey) : "smsbear"];

/** Chave/token do serviço guardado nesta conta do Fuzil (criptografado). */
export async function providerToken(workspaceId: string, key: SmsProviderKey | string) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { smsbearTokenEnc: true, sms24hKeyEnc: true } });
  const enc = key === "sms24h" ? ws?.sms24hKeyEnc : ws?.smsbearTokenEnc;
  return enc ? decrypt(enc) : null;
}

/** Código de 6 números do SMS do WhatsApp ("123-456", "123456"...). */
export function codeFromSms(sms: SmsOrderState["sms"] | undefined): string | null {
  for (const s of sms ?? []) {
    const fromCode = String(s.code ?? "").replace(/\D/g, "");
    if (fromCode.length === 6) return fromCode;
    const m = String(s.text ?? "").match(/(\d{3})[-\s]?(\d{3})/);
    if (m) return m[1] + m[2];
    if (fromCode.length >= 4) return fromCode;
  }
  return null;
}
