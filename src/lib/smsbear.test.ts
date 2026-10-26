import { test } from "node:test";
import assert from "node:assert/strict";
import { codeFromSms } from "./sms-providers";

test("código do SMS do WhatsApp", () => {
  assert.equal(codeFromSms([{ code: "123456", text: "x" }]), "123456");
  assert.equal(codeFromSms([{ code: "123-456" }]), "123456");
  assert.equal(codeFromSms([{ text: "Seu código do WhatsApp Business: 482-913. Não compartilhe." }]), "482913");
  assert.equal(codeFromSms([]), null);
  assert.equal(codeFromSms(undefined), null);
});

test("SMS24h: compra, código e cancelamento no padrão SMS-Activate", async () => {
  const { SMS_PROVIDERS } = await import("./sms-providers");
  const answers: Record<string, string> = {
    getBalance: "ACCESS_BALANCE:540.50",
    getPrices: JSON.stringify({ "73": { wa: { "3.20": 77 } } }),
    getNumber: "ACCESS_NUMBER:234242:5511987654321",
    getStatus: "STATUS_OK:482913",
    setStatus: "ACCESS_CANCEL",
  };
  const real = globalThis.fetch;
  globalThis.fetch = (async (u: string | URL) => new Response(answers[new URL(String(u)).searchParams.get("action") ?? ""] ?? "BAD_ACTION")) as typeof fetch;
  try {
    const p = SMS_PROVIDERS.sms24h;
    assert.equal(await p.balance("k"), 54050);
    assert.deepEqual(await p.price("k"), { costCents: 320, stock: 77 });
    assert.deepEqual(await p.buy("k", "x"), { id: "234242", number: "5511987654321", costCents: 320 });
    assert.deepEqual(await p.order("k", "234242"), { status: "received", sms: [{ code: "482913" }] });
    await p.cancel("k", "234242");
    answers.getNumber = "NO_BALANCE";
    await assert.rejects(p.buy("k", "x"), /Saldo insuficiente/);
  } finally {
    globalThis.fetch = real;
  }
});
