import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalWaId, normalizePhone } from "./phone";

test("adiciona DDI 55 em números brasileiros", () => {
  assert.equal(normalizePhone("21983557616"), "5521983557616");
  assert.equal(normalizePhone("(11) 98788-8187"), "5511987888187");
  assert.equal(normalizePhone("9985182459"), "5599985182459"); // celular sem o 9 ganha o 9
  assert.equal(normalizePhone("(62) 9479-0340"), "5562994790340");
  assert.equal(normalizePhone("1133334444"), "551133334444"); // fixo continua igual
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

test("coloca o 9 nos celulares que a Meta manda sem ele", () => {
  assert.equal(canonicalWaId("551188887777"), "5511988887777");
  assert.equal(canonicalWaId("5511988887777"), "5511988887777");
  assert.equal(canonicalWaId("551133334444"), "551133334444"); // fixo continua igual
  assert.equal(canonicalWaId("14155550000"), "14155550000");
});

test("números internacionais sem + e sem coluna de DDI", () => {
  assert.equal(normalizePhone("33744635335"), "33744635335"); // França
  assert.equal(normalizePhone("32467815993"), "32467815993"); // Bélgica
  assert.equal(normalizePhone("41767374507"), "41767374507"); // Suíça
  assert.equal(normalizePhone("15069625913"), "15069625913"); // Canadá/EUA
  assert.equal(normalizePhone("+351 912 345 678"), "351912345678"); // Portugal
  assert.equal(normalizePhone("11987888187"), "5511987888187"); // Brasil continua Brasil
  assert.equal(normalizePhone("3399887766"), "5533999887766"); // celular BR antigo, sem o 9
});
