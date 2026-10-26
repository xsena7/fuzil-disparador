// Teste da conta dos créditos no banco (precisa do Postgres local): npx tsx scripts/test-credits.ts
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { addCredits, chargeRecipients, settleLeftoverCredits, settleRecipients } from "../src/lib/credits";

(async () => {
  const ws = await prisma.workspace.create({ data: { name: "Teste créditos", creditBalance: 0 } });
  await addCredits(ws.id, 100, "TOPUP", "Recarga teste");
  const camp = await prisma.campaign.create({ data: { workspaceId: ws.id, name: "Camp teste" } });
  const mk = (i: number) => prisma.campaignRecipient.create({ data: { campaignId: camp.id, phone: `55119999900${String(i).padStart(2, "0")}`, data: {}, status: "SENDING", clickToken: `tk${camp.id.slice(-6)}${i}` } });
  const rs = await Promise.all(Array.from({ length: 10 }, (_, i) => mk(i)));
  const ids = rs.map((r) => r.id);
  const bal = async () => (await prisma.workspace.findUniqueOrThrow({ where: { id: ws.id } })).creditBalance;

  // 1) cobra 10 a 1 crédito: saldo 90 e cada um anotado
  assert.equal(await chargeRecipients(ws.id, ids, 1, "Campanha teste", camp.id), true);
  assert.equal(await bal(), 90);
  // 2) 6 saíram, 2 falharam, 2 voltaram para a fila
  await prisma.campaignRecipient.updateMany({ where: { id: { in: ids.slice(0, 6) } }, data: { status: "SENT" } });
  await prisma.campaignRecipient.updateMany({ where: { id: { in: ids.slice(6, 8) } }, data: { status: "FAILED" } });
  await prisma.campaignRecipient.updateMany({ where: { id: { in: ids.slice(8) } }, data: { status: "PENDING" } });
  // 3) estorna 3 vezes ao mesmo tempo: só 4 voltam
  const got = await Promise.all([settleRecipients(camp.id, "Estorno", ids), settleRecipients(camp.id, "Estorno", ids), settleRecipients(camp.id, "Estorno")]);
  assert.equal(got.reduce((a, b) => a + b, 0), 4, `estornou ${got}`);
  assert.equal(await bal(), 94);
  // 4) de novo: nada
  assert.equal(await settleRecipients(camp.id, "Estorno", ids), 0);
  // 5) os enviados continuam cobrados
  assert.equal((await prisma.campaignRecipient.aggregate({ where: { id: { in: ids.slice(0, 6) } }, _sum: { creditsCharged: true } }))._sum.creditsCharged, 6);

  // 6) worker cai no meio: cobrou 2 da fila e marcou um como falha sem estornar
  await prisma.campaignRecipient.updateMany({ where: { id: { in: ids.slice(8) } }, data: { status: "SENDING" } });
  assert.equal(await chargeRecipients(ws.id, ids.slice(8), 1, "Campanha teste", camp.id), true);
  assert.equal(await bal(), 92);
  await prisma.campaignRecipient.update({ where: { id: ids[8] }, data: { status: "FAILED" } });
  await prisma.campaignRecipient.update({ where: { id: ids[9] }, data: { status: "PENDING" } }); // "caiu": ficou com crédito anotado
  // 7) próxima cobrança do que tinha sobra: não paga de novo
  await prisma.campaignRecipient.update({ where: { id: ids[9] }, data: { status: "SENDING" } });
  assert.equal(await chargeRecipients(ws.id, [ids[9]], 1, "Campanha teste", camp.id), true);
  assert.equal(await bal(), 92, "cobrou em dobro quem tinha sobra");
  // 8) limpeza do worker devolve a falha que ficou com crédito
  await prisma.campaignRecipient.update({ where: { id: ids[9] }, data: { status: "SENT" } });
  const back = await settleLeftoverCredits();
  assert.ok(back >= 1);
  assert.equal(await bal(), 93);
  // 9) sem saldo: não cobra nada e não anota
  await prisma.workspace.update({ where: { id: ws.id }, data: { creditBalance: 0 } });
  const extra = await mk(50);
  assert.equal(await chargeRecipients(ws.id, [extra.id], 1, "Campanha teste", camp.id), false);
  assert.equal((await prisma.campaignRecipient.findUniqueOrThrow({ where: { id: extra.id } })).creditsCharged, 0);
  // 10) o extrato fecha com o saldo
  await prisma.workspace.update({ where: { id: ws.id }, data: { creditBalance: 93 } });
  const sum = (await prisma.creditTransaction.aggregate({ where: { workspaceId: ws.id }, _sum: { amount: true } }))._sum.amount;
  assert.equal(sum, 93, "extrato não fecha com o saldo");

  await prisma.workspace.delete({ where: { id: ws.id } });
  console.log("OK: todos os casos de crédito passaram");
  process.exit(0);
})().catch(async (e) => {
  console.error("FALHOU:", e.message);
  await prisma.workspace.deleteMany({ where: { name: "Teste créditos" } });
  process.exit(1);
});
