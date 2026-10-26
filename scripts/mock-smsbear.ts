/**
 * Simulador da API do SMSBear para testar o registro automático sem gastar.
 *   npx tsx scripts/mock-smsbear.ts   (porta 4030)   SMSBEAR_API_URL=http://localhost:4030
 * Token válido: "bear-ok-token-123". O 1º número comprado nunca recebe SMS; os seguintes recebem "Seu código do WhatsApp: 123-456" depois de 8s.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 4030);
let balance = 5201;
let seq = 0;
const orders = new Map<string, { id: string; number: string; status: string; cost: number; at: number; sms: Array<{ code: string; text: string }>; silent: boolean }>();
const json = (res: any, status: number, body: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);
  if (req.headers["x-api-token"] !== "bear-ok-token-123") return json(res, 401, { success: false, message: "Unauthorized" });
  let raw = "";
  for await (const c of req) raw += c;
  const p = url.pathname;
  if (p === "/v1/getBalance") return json(res, 200, { success: true, balance });
  if (p === "/v1/sms/prices") return json(res, 200, { prices: [{ service: "whatsapp", country: "brazil", cost: 250, stock: 150 }], total: 1 });
  if (p === "/v1/sms/buy" && req.method === "POST") {
    if (balance < 250) return json(res, 400, { success: false, message: "Saldo insuficiente" });
    balance -= 250;
    const n = ++seq;
    const o = { id: `ord${n}`, number: `55219790${String(51580 + n).padStart(5, "0")}`, status: "pending", cost: 250, at: Date.now(), sms: [], silent: n === 1 };
    orders.set(o.id, o);
    return json(res, 200, { success: true, id: o.id, number: o.number, status: "pending", cost: 250 });
  }
  const m = p.match(/^\/v1\/sms\/(orders|cancel)\/(.+)$/);
  if (m) {
    const o = orders.get(decodeURIComponent(m[2]));
    if (!o) return json(res, 404, { success: false, message: "Order not found" });
    if (m[1] === "orders") {
      if (!o.silent && o.status === "pending" && Date.now() - o.at > 8000) Object.assign(o, { status: "received", sms: [{ code: "123456", text: "Seu código do WhatsApp Business: 123-456" }] });
      return json(res, 200, { success: true, order: { ...o, service: "whatsapp", country: "brazil" } });
    }
    if (o.status !== "pending") return json(res, 400, { success: false, message: "Order is not pending" });
    if (Date.now() - o.at < 15_000) return json(res, 400, { success: false, message: "Wait a few minutes before cancelling" });
    o.status = "refund";
    balance += o.cost;
    return json(res, 200, { success: true });
  }
  json(res, 404, { success: false, message: `rota ${p}` });
}).listen(PORT, () => console.log(`[mock-smsbear] ouvindo em http://localhost:${PORT}`));
