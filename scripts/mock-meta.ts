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
  if (id === "oauth") return json(res, 200, { access_token: "mock-business-token" });

  const waba = wabas[id];
  if (waba && !edge && req.method === "GET") {
    return json(res, 200, { id, name: waba.name, currency: "USD", timezone_id: "1", account_review_status: "APPROVED", owner_business_info: waba.business, health_status: { can_send_message: "AVAILABLE" } });
  }
  if (waba && edge === "phone_numbers") return json(res, 200, { data: waba.phones });
  if (waba && edge === "subscribed_apps") return json(res, 200, { success: true });
  if (waba && edge === "message_templates") {
    if (req.method === "GET") return json(res, 200, { data: waba.templates });
    if (req.method === "DELETE") {
      waba.templates = waba.templates.filter((t) => t.name !== url.searchParams.get("name"));
      return json(res, 200, { success: true });
    }
    const category = body.name.includes("promo") ? "MARKETING" : "UTILITY";
    const tpl = { id: `t${Date.now()}`, name: body.name, language: body.language, category, status: "APPROVED", components: body.components };
    waba.templates.push(tpl);
    return json(res, 200, { id: tpl.id, status: "APPROVED", category });
  }

  const phone = Object.values(wabas).flatMap((w) => w.phones).find((p) => p.id === id);
  if (phone && edge === "messages") {
    if (String(body.to).endsWith("00")) {
      return json(res, 400, { error: { message: "Message undeliverable", code: 131026, error_data: { details: "Número não está no WhatsApp" } } });
    }
    sent.push({ phone: id, to: body.to, body });
    return json(res, 200, { messaging_product: "whatsapp", contacts: [{ input: body.to, wa_id: body.to }], messages: [{ id: `wamid.MOCK${++msgSeq}` }] });
  }
  if (phone && edge === "register") return json(res, 200, { success: true });

  json(res, 404, { error: { message: `Mock: rota não encontrada ${req.method} ${url.pathname}`, code: 100 } });
}).listen(PORT, () => console.log(`[mock-meta] ouvindo em http://localhost:${PORT}`));
