import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTiers, unitPrice } from "./market-price";

const semTemplate = parseTiers([{ min: 15, priceCents: 3000 }, { min: 10, priceCents: 3500 }]);

test("BM 250 sem template: 40 até 9, 35 a partir de 10, 30 a partir de 15", () => {
  assert.equal(unitPrice(4000, semTemplate, 1), 4000);
  assert.equal(unitPrice(4000, semTemplate, 9), 4000);
  assert.equal(unitPrice(4000, semTemplate, 10), 3500);
  assert.equal(unitPrice(4000, semTemplate, 14), 3500);
  assert.equal(unitPrice(4000, semTemplate, 15), 3000);
  assert.equal(unitPrice(4000, semTemplate, 20) * 20, 60000);
});

test("faixa inválida é ignorada", () => {
  assert.deepEqual(parseTiers([{ min: 1, priceCents: 100 }, { min: 5, priceCents: 0 }, null]), []);
  assert.deepEqual(parseTiers("lixo"), []);
});
