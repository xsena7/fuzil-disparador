/**
 * Simulador da API do SMS24h (padrão SMS-Activate, respostas em texto) para testar sem gastar.
 *   npx tsx scripts/mock-sms24h.ts   (porta 4040)   SMS24H_API_URL=http://localhost:4040/stubs/handler_api
 * Chave válida: "s24-ok-key-123". O 1º número nunca recebe SMS; os seguintes recebem o código 123456 depois de 8s.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 4040);
let balance = 52.4;
let seq = 0;
const acts = new Map<string, { at: number; status: "WAIT" | "OK" | "CANCEL"; silent: boolean; number: string }>();
const text = (res: any, body: string) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(body);
};

createServer((req, res) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);
  const q = url.searchParams;
  if (q.get("api_key") !== "s24-ok-key-123") return text(res, "BAD_KEY");
  const id = q.get("id") ?? "";
  switch (q.get("action")) {
    case "getBalance":
      return text(res, `ACCESS_BALANCE:${balance.toFixed(2)}`);
    case "getPrices":
      return text(res, JSON.stringify({ "73": { wa: { "3.50": 120 } } }));
    case "getNumber": {
      if (q.get("service") !== "wa" || q.get("country") !== "73") return text(res, "WRONG_SERVICE");
      if (balance < 3.5) return text(res, "NO_BALANCE");
      balance -= 3.5;
      const n = ++seq;
      const aid = String(900000 + n);
      const number = `55119880${String(10000 + n)}`;
      acts.set(aid, { at: Date.now(), status: "WAIT", silent: n === 1, number });
      return text(res, `ACCESS_NUMBER:${aid}:${number}`);
    }
    case "getStatus": {
      const a = acts.get(id);
      if (!a) return text(res, "NO_ACTIVATION");
      if (a.status === "WAIT" && !a.silent && Date.now() - a.at > 8000) a.status = "OK";
      return text(res, a.status === "OK" ? "STATUS_OK:123456" : a.status === "CANCEL" ? "STATUS_CANCEL" : "STATUS_WAIT_CODE");
    }
    case "setStatus": {
      const a = acts.get(id);
      if (!a) return text(res, "NO_ACTIVATION");
      if (q.get("status") === "8") {
        if (a.status !== "WAIT") return text(res, "BAD_STATUS");
        if (Date.now() - a.at < 10_000) return text(res, "EARLY_CANCEL_DENIED");
        a.status = "CANCEL";
        balance += 3.5;
        return text(res, "ACCESS_CANCEL");
      }
      if (q.get("status") === "6") return text(res, "ACCESS_ACTIVATION");
      return text(res, "BAD_STATUS");
    }
  }
  text(res, "BAD_ACTION");
}).listen(PORT, () => console.log(`[mock-sms24h] ouvindo em http://localhost:${PORT}`));
