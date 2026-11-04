// Simulador da SyncPay (token, cash-in, consulta). Uso: npx tsx scripts/mock-syncpay.ts (porta 4030)
// SYNCPAY_API_URL=http://localhost:4030 no app. POST /__pay/<identifier> marca como pago.
import http from "node:http";
import { randomUUID } from "node:crypto";

export const txs = new Map<string, { amount: number; status: string; description: string; client: Record<string, string> }>();
const tokens = new Set<string>();

export function startMockSyncPay(port = Number(process.env.PORT ?? 4030)) {
  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : {};
    const send = (code: number, json: unknown) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(json));
    };
    const url = req.url ?? "";
    if (url === "/api/partner/v1/auth-token" && req.method === "POST") {
      if (body.client_id !== "pub-teste" || body.client_secret !== "priv-teste") return send(401, { message: "Unauthenticated." });
      const t = randomUUID();
      tokens.add(t);
      return send(200, { access_token: t, token_type: "Bearer", expires_in: 3600, expires_at: new Date(Date.now() + 3600_000).toISOString() });
    }
    const m = url.match(/^\/__pay\/(.+)$/);
    if (m) {
      const tx = txs.get(m[1]);
      if (tx) tx.status = "completed";
      return send(tx ? 200 : 404, { ok: Boolean(tx) });
    }
    if (!tokens.has(String(req.headers.authorization ?? "").replace("Bearer ", ""))) return send(401, { message: "Unauthenticated." });
    if (url === "/api/partner/v1/balance") return send(200, { balance: "90.00" });
    if (url === "/api/partner/v1/cash-in" && req.method === "POST") {
      if (!body.client?.document || !body.client?.phone || !body.client?.email) return send(422, { message: "Dados inválidos", errors: { "client.document": ["O documento é obrigatório."] } });
      const id = randomUUID();
      txs.set(id, { amount: body.amount, status: "pending", description: body.description, client: body.client });
      return send(200, { message: "Cashin request successfully submitted", pix_code: `00020126820014br.gov.bcb.pix-${id}`, identifier: id });
    }
    const t = url.match(/^\/api\/partner\/v1\/transaction\/(.+)$/);
    if (t) {
      const tx = txs.get(decodeURIComponent(t[1]));
      if (!tx) return send(404, { message: "Transação não encontrada" });
      return send(200, { data: { reference_id: randomUUID(), currency: "BRL", amount: tx.amount, transaction_date: new Date().toISOString(), status: tx.status, description: tx.description, pix_code: null } });
    }
    send(404, { message: "not found" });
  });
  server.listen(port);
  return server;
}

if (process.argv[1]?.endsWith("mock-syncpay.ts")) {
  startMockSyncPay();
  console.log("SyncPay simulada na porta", process.env.PORT ?? 4030);
}
