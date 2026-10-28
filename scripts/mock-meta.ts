/**
 * Simulador da Graph API da Meta para testar o painel sem credenciais reais.
 *
 *   npx tsx scripts/mock-meta.ts          (porta 4010)
 *   META_GRAPH_URL=http://localhost:4010 no .env
 *
 * Duas BMs (cada uma com 1 WABA e 2 números), templates de utilidade e um de marketing.
 * Templates criados com "promo" no nome voltam como MARKETING (simula a recategorização).
 * Números terminados em "00" falham com erro 131026 no envio.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const IMAGE_TRACKED = [
  { type: "HEADER", format: "IMAGE" },
  { type: "BODY", text: "Olá {{1}}\n\nInformamos uma atualização em seu pedido {{2}}.\n\n{{3}}\n\nToque no botão abaixo para ver mais informações.", example: { body_text: [["Maria", "123", "texto"]] } },
  { type: "BUTTONS", buttons: [{ type: "URL", text: "Detalhes", url: "https://localhost:3000/r/{{1}}", example: ["https://localhost:3000/r/abc"] }] },
];

type Tpl = { id: string; name: string; language: string; category: string; status: string; components: unknown[] };
const wabas: Record<string, { name: string; business: { id: string; name: string }; phones: any[]; templates: Tpl[] }> = {
  "1001": {
    name: "WABA Felipe",
    business: { id: "9001", name: "BM Felipe" },
    phones: [
      { id: "5001", display_phone_number: "+55 14 92007-1450", verified_name: "Loja Felipe", quality_rating: "GREEN", whatsapp_business_manager_messaging_limit: "TIER_10K", status: "CONNECTED", name_status: "APPROVED", throughput: { level: "STANDARD" } },
      { id: "5002", display_phone_number: "+55 14 92007-1102", verified_name: "Loja Felipe 2", quality_rating: "YELLOW", whatsapp_business_manager_messaging_limit: "TIER_10K", status: "CONNECTED", name_status: "APPROVED", throughput: { level: "STANDARD" } },
    ],
    templates: [
      { id: "t1", name: "atualizacao_pedido", language: "pt_BR", category: "UTILITY", status: "APPROVED", components: IMAGE_TRACKED },
      { id: "t2", name: "oferta_relampago", language: "pt_BR", category: "MARKETING", status: "APPROVED", components: [{ type: "BODY", text: "Oferta!" }] },
    ],
  },
  "1002": {
    name: "WABA Erick",
    business: { id: "9002", name: "BM Erick" },
    phones: [
      { id: "5003", display_phone_number: "+1 555-431-9542", verified_name: "Erick Store", quality_rating: "GREEN", whatsapp_business_manager_messaging_limit: "TIER_2K", status: "CONNECTED", name_status: "APPROVED", throughput: { level: "STANDARD" } },
      { id: "5004", display_phone_number: "+55 11 90000-0000", verified_name: "Erick Red", quality_rating: "RED", whatsapp_business_manager_messaging_limit: "TIER_2K", status: "CONNECTED", name_status: "APPROVED", throughput: { level: "STANDARD" } },
    ],
    templates: [{ id: "t3", name: "atualizacao_pedido", language: "pt_BR", category: "UTILITY", status: "APPROVED", components: IMAGE_TRACKED }],
  },
  // Conta livre para testar conexão só pelo token (token "mock-waba-1003")
  "1003": {
    name: "WABA Nova",
    business: { id: "9003", name: "BM Nova" },
    phones: [{ id: "5005", display_phone_number: "+55 21 93000-1234", verified_name: "Nova", quality_rating: "GREEN", whatsapp_business_manager_messaging_limit: "TIER_250", status: "CONNECTED", name_status: "APPROVED", throughput: { level: "STANDARD" } }],
    templates: [],
  },
};

let msgSeq = 0;
export const sent: Array<{ phone: string; to: string; body: any }> = [];

function json(res: any, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);
  const parts = url.pathname.split("/").filter(Boolean).slice(1); // remove versão
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw && req.headers["content-type"]?.includes("json") ? JSON.parse(raw) : {};
  const [id, edge] = parts;

  if (id === "__sent") return json(res, 200, sent);
  // Mídia recebida: GET /{media-id} devolve a URL; GET /download/{media-id} devolve os bytes (um PNG 1x1)
  if (id?.startsWith("media") && !edge) return json(res, 200, { url: `http://localhost:${PORT}/v23.0/download/${id}`, mime_type: id.includes("audio") ? "audio/ogg" : "image/png", id });
  if (id === "download") {
    res.writeHead(200, { "Content-Type": edge?.includes("audio") ? "audio/ogg" : "image/png" });
    return res.end(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
  }
  if (id === "oauth") return json(res, 200, { access_token: "mock-business-token" });
  // Upload resumável (foto do perfil / exemplo de mídia): GET /app → POST /{app}/uploads → POST /upload:... devolve o handle
  if (id === "app" && !edge) return json(res, 200, { id: "1810134293359501" });
  if (edge === "uploads" && req.method === "POST") return json(res, 200, { id: `upload:${Date.now()}` });
  if (id?.startsWith("upload:") && req.method === "POST") return json(res, 200, { h: `handle-${raw.length}` });
  // Token de usuário do sistema: "mock-waba-1002" enxerga só a WABA 1002; os outros enxergam todas
  if (id === "debug_token") {
    const t = url.searchParams.get("input_token") ?? "";
    const target_ids = t.startsWith("mock-waba-") ? [t.slice(10)] : Object.keys(wabas);
    return json(res, 200, { data: { app_id: "1810134293359501", is_valid: true, granular_scopes: [{ scope: "whatsapp_business_management", target_ids }, { scope: "whatsapp_business_messaging", target_ids }] } });
  }
  // Higienização: POST /{phone-id}/contacts (números com final par têm WhatsApp)
  if (edge === "contacts" && req.method === "POST") {
    const contacts = (body.contacts ?? []).map((c: string) => ({ input: c, status: Number(c.slice(-1)) % 2 === 0 ? "valid" : "invalid", wa_id: c }));
    return json(res, 200, { contacts });
  }
  // API de Conversões: POST /{pixel}/events
  if (edge === "events" && req.method === "POST") {
    if (body.access_token !== "capi-ok") return json(res, 400, { error: { message: "Invalid OAuth access token", code: 190 } });
    sent.push({ capi: body.data?.[0]?.event_name, event_id: body.data?.[0]?.event_id, test: body.test_event_code, ud: Object.keys(body.data?.[0]?.user_data ?? {}) } as never);
    return json(res, 200, { events_received: body.data?.length ?? 0 });
  }

  // BM do Fuzil (parceira): o usuário do sistema e as contas que clientes compartilharam (a 1003 chega por parceria)
  if (id === "me" && !edge) return json(res, 200, { id: "77001", name: "fuzil-api" });
  if (id === "me" && edge === "businesses") return json(res, 200, { data: [{ id: "9999", name: "BM do Fuzil" }] });
  if (id === "9999" && edge === "client_whatsapp_business_accounts") return json(res, 200, { data: [{ id: "1003", name: wabas["1003"].name, owner_business_info: wabas["1003"].business }] });
  if (wabas[id] && edge === "assigned_users" && req.method === "POST") return json(res, 200, { success: true });

  const waba = wabas[id];
  if (waba && !edge && req.method === "GET") {
    return json(res, 200, { id, name: waba.name, currency: "USD", timezone_id: "1", account_review_status: "APPROVED", primary_funding_id: "mock-cartao", owner_business_info: waba.business, health_status: { can_send_message: "AVAILABLE" } });
  }
  // Adicionar número na WABA (fica pendente até confirmar o código e registrar). Código certo no simulador: 123456
  if (waba && edge === "phone_numbers" && req.method === "POST") {
    const pid = `56${Date.now().toString().slice(-6)}`;
    const digits = `${body.cc}${body.phone_number}`;
    waba.phones.push({ id: pid, display_phone_number: `+${digits}`, verified_name: body.verified_name, quality_rating: "UNKNOWN", status: "PENDING", name_status: "PENDING_REVIEW", platform_type: "NOT_APPLICABLE", code_verification_status: "NOT_VERIFIED" });
    return json(res, 200, { id: pid });
  }
  if (waba && edge === "phone_numbers") return json(res, 200, { data: waba.phones });
  if (waba && edge === "subscribed_apps") return json(res, 200, { success: true });
  if (waba && edge === "message_templates") {
    if (req.method === "GET") return json(res, 200, { data: waba.templates });
    if (req.method === "DELETE") {
      waba.templates = waba.templates.filter((t) => t.name !== url.searchParams.get("name"));
      return json(res, 200, { success: true });
    }
    const category = body.category === "AUTHENTICATION" ? "AUTHENTICATION" : body.name.includes("promo") ? "MARKETING" : "UTILITY";
    const tpl = { id: `t${Date.now()}`, name: body.name, language: body.language, category, status: "APPROVED", components: body.components };
    waba.templates.push(tpl);
    return json(res, 200, { id: tpl.id, status: "APPROVED", category });
  }

  const phone = Object.values(wabas).flatMap((w) => w.phones).find((p) => p.id === id);
  if (phone && edge === "messages" && id === "5002" && process.env.MOCK_PAYDUE === "1") {
    return json(res, 400, { error: { message: "Payment method issue", code: 131042, error_data: { details: "Problema de pagamento" } } });
  }
  if (phone && edge === "messages") {
    if (String(body.to).endsWith("00")) {
      return json(res, 400, { error: { message: "Message undeliverable", code: 131026, error_data: { details: "Número não está no WhatsApp" } } });
    }
    sent.push({ phone: id, to: body.to, body });
    return json(res, 200, { messaging_product: "whatsapp", contacts: [{ input: body.to, wa_id: body.to }], messages: [{ id: `wamid.MOCK${Date.now().toString(36)}${++msgSeq}` }] });
  }
  // Troca de nome: POST /{phone}?new_display_name=... fica em análise; nomes com "aprova" são aprovados na próxima leitura
  if (phone && !edge && req.method === "POST" && url.searchParams.get("new_display_name")) {
    phone.new_display_name = url.searchParams.get("new_display_name");
    phone.new_name_status = "PENDING_REVIEW";
    return json(res, 200, { success: true });
  }
  if (phone && !edge && req.method === "GET" && url.searchParams.get("fields")?.includes("new_name_status")) {
    if (phone.new_name_status === "PENDING_REVIEW" && /aprova/i.test(phone.new_display_name)) {
      Object.assign(phone, { verified_name: phone.new_display_name, name_status: "APPROVED", new_name_status: "APPROVED" });
    }
    return json(res, 200, { id: phone.id, verified_name: phone.verified_name, name_status: phone.name_status, new_display_name: phone.new_display_name, new_name_status: phone.new_name_status });
  }
  // Perfil do WhatsApp do número (foto, recado, descrição...)
  if (phone && edge === "whatsapp_business_profile") {
    if (req.method === "GET") return json(res, 200, { data: [{ messaging_product: "whatsapp", vertical: "OTHER", ...(phone.profile ?? {}) }] });
    const { messaging_product, profile_picture_handle, ...rest } = body;
    phone.profile = { ...(phone.profile ?? {}), ...rest, ...(profile_picture_handle ? { profile_picture_url: `http://localhost:${PORT}/v23.0/download/media-${profile_picture_handle}` } : {}) };
    return json(res, 200, { success: true });
  }
  if (phone && edge === "request_code") return json(res, 200, { success: true });
  if (phone && edge === "verify_code") {
    if (body.code !== "123456") return json(res, 400, { error: { message: "Code Mismatch", code: 136025 } });
    phone.code_verification_status = "VERIFIED";
    return json(res, 200, { success: true });
  }
  if (phone && edge === "register") {
    if (phone.code_verification_status === "NOT_VERIFIED") return json(res, 400, { error: { message: "Phone number not verified", code: 133010 } });
    Object.assign(phone, { status: "CONNECTED", platform_type: "CLOUD_API", whatsapp_business_manager_messaging_limit: "TIER_250", throughput: { level: "STANDARD" } });
    return json(res, 200, { success: true });
  }

  json(res, 404, { error: { message: `Mock: rota não encontrada ${req.method} ${url.pathname}`, code: 100 } });
}).listen(PORT, () => console.log(`[mock-meta] ouvindo em http://localhost:${PORT}`));
