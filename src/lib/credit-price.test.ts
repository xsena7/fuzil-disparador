import { test } from "node:test";
import assert from "node:assert/strict";
import { creditPackages, creditsPriceCents, minCredits, MIN_AMOUNT_CENTS } from "./credit-purchase";

test("recarga mínima de R$ 60: 6.000 créditos a R$ 0,01", () => {
  assert.equal(MIN_AMOUNT_CENTS, 6_000);
  assert.equal(minCredits(0.01), 6_000);
  assert.equal(creditsPriceCents(6_000, 0.01), 6_000);
  assert.ok(creditsPriceCents(5_999, 0.01) < MIN_AMOUNT_CENTS);
});

test("pacotes começam no mínimo e nunca ficam abaixo dele", () => {
  assert.deepEqual(creditPackages(0.01), [6_000, 10_000, 25_000, 50_000, 100_000]);
  // preço mais alto: o mínimo em créditos cai, mas o valor continua R$ 60
  assert.equal(minCredits(0.02), 3_000);
  for (const p of creditPackages(0.02)) assert.ok(creditsPriceCents(p, 0.02) >= MIN_AMOUNT_CENTS);
  // preço quebrado não deixa passar abaixo de R$ 60 por arredondamento
  assert.ok(creditsPriceCents(minCredits(0.007), 0.007) >= MIN_AMOUNT_CENTS);
});
