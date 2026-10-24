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

test("lê valores em reais", () => {
  assert.equal(parseMoney("1.234,56"), 123456);
  assert.equal(parseMoney("300"), 30000);
  assert.equal(parseMoney("R$ 12,5"), 1250);
  assert.equal(parseMoney("0"), null);
});
