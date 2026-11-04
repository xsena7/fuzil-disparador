// Teste da SyncPay com o simulador (precisa do Postgres local): npx tsx scripts/test-syncpay.ts
import assert from "node:assert/strict";
process.env.SYNCPAY_API_URL = "http://localhost:4031";
process.env.SYNCPAY_CLIENT_ID = "pub-teste";
process.env.SYNCPAY_CLIENT_SECRET = "priv-teste";
process.env.PAYMENT_PROVIDER = "";

(async () => {
  const { startMockSyncPay, txs } = await import("./mock-syncpay");
  const server = startMockSyncPay(4031);
  const { prisma } = await import("../src/lib/db");
  const { env } = await import("../src/lib/env");
  const { createCreditPurchase, creditTick } = await import("../src/lib/credit-purchase");
  const { handleSyncPayNotice } = await import("../src/lib/payments");
  const { validDocument } = await import("../src/lib/pix");
  const { syncpayTest } = await import("../src/lib/syncpay");

  assert.equal(env.paymentProvider(), "syncpay", "com as chaves preenchidas usa a SyncPay");
  assert.ok(validDocument("529.982.247-25") && validDocument("11.222.333/0001-81"));
  assert.ok(!validDocument("111.111.111-11") && !validDocument("529.982.247-24"));
  assert.ok("ok" in (await syncpayTest()));

  const ws = await prisma.workspace.create({ data: { name: "Teste SyncPay", creditBalance: 0 } });
  const user = await prisma.user.create({ data: { email: `sp-${Date.now()}@teste.dev`, name: "Roberto Teste", passwordHash: "x" } });
  const bal = async () => (await prisma.workspace.findUniqueOrThrow({ where: { id: ws.id } })).creditBalance;
  try {
    const r = await createCreditPurchase({ workspaceId: ws.id, userId: user.id, email: user.email, name: user.name, credits: 6000, document: "52998224725", phone: "5511999998888" });
    assert.ok("token" in r, JSON.stringify(r));
    const p = await prisma.creditPurchase.findUniqueOrThrow({ where: { token: r.token } });
    assert.ok(p.mpPaymentId?.startsWith("sp:") && p.pixCode && p.pixQr, "Pix com QR gerado");
    const id = p.mpPaymentId!.slice(3);
    assert.equal(txs.get(id)?.amount, 60);
    assert.equal(txs.get(id)?.client.phone, "11999998888", "telefone sem o 55");
    // aviso antes de pagar: nada entra
    await handleSyncPayNotice(id);
    assert.equal(await bal(), 0);
    // aviso falso (id que não é nosso): nada entra
    await handleSyncPayNotice("00000000-0000-0000-0000-000000000000");
    assert.equal(await bal(), 0);
    // pagou: o aviso confere na API e credita uma vez só
    await fetch(`http://localhost:4031/__pay/${id}`, { method: "POST" });
    await Promise.all([handleSyncPayNotice(id), handleSyncPayNotice(id), creditTick()]);
    assert.equal(await bal(), 6000);
    await handleSyncPayNotice(id);
    assert.equal(await bal(), 6000, "creditou em dobro");
    assert.equal((await prisma.creditPurchase.findUniqueOrThrow({ where: { id: p.id } })).status, "PAID");
    // pagou depois de vencer: entra do mesmo jeito
    const r2 = await createCreditPurchase({ workspaceId: ws.id, userId: user.id, email: user.email, name: user.name, credits: 7000, document: "52998224725", phone: "11999998888" });
    assert.ok("token" in r2);
    const p2 = await prisma.creditPurchase.update({ where: { token: r2.token }, data: { status: "EXPIRED" } });
    await fetch(`http://localhost:4031/__pay/${p2.mpPaymentId!.slice(3)}`, { method: "POST" });
    await handleSyncPayNotice(p2.mpPaymentId!.slice(3));
    assert.equal(await bal(), 13000);
    console.log("OK: SyncPay passou em todos os casos");
  } finally {
    await prisma.workspace.delete({ where: { id: ws.id } });
    await prisma.user.delete({ where: { id: user.id } });
    server.close();
  }
  process.exit(0);
})().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
