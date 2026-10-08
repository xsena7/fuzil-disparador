import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "./phone";

test("adiciona DDI 55 em números brasileiros", () => {
  assert.equal(normalizePhone("21983557616"), "5521983557616");
  assert.equal(normalizePhone("(11) 98788-8187"), "5511987888187");
  assert.equal(normalizePhone("9985182459"), "559985182459");
});

test("respeita DDI informado em coluna separada", () => {
  assert.equal(normalizePhone("21983557616", "55", "+55"), "5521983557616");
  assert.equal(normalizePhone("5521983557616", "55", "55"), "5521983557616");
  assert.equal(normalizePhone("4314319542", "55", "1"), "14314319542");
});

test("rejeita inválidos", () => {
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone("123"), null);
  assert.equal(normalizePhone("5501987654321"), null);
  assert.equal(normalizePhone("5521883557616"), null);
});
