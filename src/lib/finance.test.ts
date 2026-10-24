import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMoney, settle } from "./finance";

test("Eduardo gastou 300 e Guilherme recebeu 800: Guilherme passa 550", () => {
  const r = settle(
    [
      { kind: "EXPENSE", amountCents: 30000, userId: "edu", toUserId: null },
      { kind: "INCOME", amountCents: 80000, userId: "gui", toUserId: null },
    ],
    ["gui", "edu"],
  );
  assert.equal(r.profit, 50000);
  assert.equal(r.share, 25000);
  assert.deepEqual(r.transfers, [{ from: "gui", to: "edu", amountCents: 55000 }]);
});

test("depois do Pix do acerto, ninguém deve nada", () => {
  const r = settle(
    [
      { kind: "EXPENSE", amountCents: 30000, userId: "edu", toUserId: null },
      { kind: "INCOME", amountCents: 80000, userId: "gui", toUserId: null },
      { kind: "SETTLEMENT", amountCents: 55000, userId: "gui", toUserId: "edu" },
    ],
    ["gui", "edu"],
  );
  assert.deepEqual(r.transfers, []);
});

test("despesa sem entrada: cada um paga metade", () => {
  const r = settle([{ kind: "EXPENSE", amountCents: 10000, userId: "gui", toUserId: null }], ["gui", "edu"]);
  assert.deepEqual(r.transfers, [{ from: "edu", to: "gui", amountCents: 5000 }]);
});

test("lê valores em reais do jeito que a pessoa digitar", () => {
  assert.equal(parseMoney("1.234,56"), 123456);
  assert.equal(parseMoney("1.234"), 123400); // ponto de milhar, não R$ 1,23
  assert.equal(parseMoney("12.345.678"), 1234567800);
  assert.equal(parseMoney("300"), 30000);
  assert.equal(parseMoney("300,00"), 30000);
  assert.equal(parseMoney("R$ 12,5"), 1250);
  assert.equal(parseMoney("R$ 1.250,90"), 125090);
  assert.equal(parseMoney("0,99"), 99);
  assert.equal(parseMoney("1234.56"), 123456);
  assert.equal(parseMoney("49.9"), 4990);
});

test("recusa valores estranhos (nunca adivinha)", () => {
  for (const v of ["", "0", "0,00", "abc", "12,345", "1,2,3", "1.23.4", "12.3456", "-50", "1e5", "1.2345,00"]) assert.equal(parseMoney(v), null, v);
});

test("lucro com centavo ímpar: ninguém paga a mais", () => {
  const r = settle([{ kind: "INCOME", amountCents: 1001, userId: "gui", toUserId: null }], ["gui", "edu"]);
  assert.deepEqual(r.transfers, [{ from: "gui", to: "edu", amountCents: 500 }]);
  const after = settle(
    [
      { kind: "INCOME", amountCents: 1001, userId: "gui", toUserId: null },
      { kind: "SETTLEMENT", amountCents: 500, userId: "gui", toUserId: "edu" },
    ],
    ["gui", "edu"],
  );
  assert.deepEqual(after.transfers, []);
});

test("vários lançamentos dos dois lados fecham certinho", () => {
  // Gui: recebeu 2.000, pagou 150. Edu: recebeu 500, pagou 900 e 250. Lucro = 2.500 − 1.300 = 1.200 → 600 cada
  const lines = [
    { kind: "INCOME" as const, amountCents: 200000, userId: "gui", toUserId: null },
    { kind: "EXPENSE" as const, amountCents: 15000, userId: "gui", toUserId: null },
    { kind: "INCOME" as const, amountCents: 50000, userId: "edu", toUserId: null },
    { kind: "EXPENSE" as const, amountCents: 90000, userId: "edu", toUserId: null },
    { kind: "EXPENSE" as const, amountCents: 25000, userId: "edu", toUserId: null },
  ];
  const r = settle(lines, ["gui", "edu"]);
  assert.equal(r.profit, 120000);
  // Gui ficou com 1.850, tem direito a 600 → passa 1.250. Edu ficou com −650 → recebe 1.250 e fica com 600
  assert.deepEqual(r.transfers, [{ from: "gui", to: "edu", amountCents: 125000 }]);
});

test("prejuízo: quem não pagou cobre a metade do outro", () => {
  const r = settle(
    [
      { kind: "EXPENSE", amountCents: 40000, userId: "edu", toUserId: null },
      { kind: "INCOME", amountCents: 10000, userId: "edu", toUserId: null },
    ],
    ["gui", "edu"],
  );
  // Prejuízo de 300 → 150 cada. Edu está com −300, Gui com 0 → Gui passa 150
  assert.deepEqual(r.transfers, [{ from: "gui", to: "edu", amountCents: 15000 }]);
});

test("acerto parcial deixa só o resto", () => {
  const r = settle(
    [
      { kind: "EXPENSE", amountCents: 30000, userId: "edu", toUserId: null },
      { kind: "INCOME", amountCents: 80000, userId: "gui", toUserId: null },
      { kind: "SETTLEMENT", amountCents: 20000, userId: "gui", toUserId: "edu" },
    ],
    ["gui", "edu"],
  );
  assert.deepEqual(r.transfers, [{ from: "gui", to: "edu", amountCents: 35000 }]);
});
