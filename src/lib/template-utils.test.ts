import { test } from "node:test";
import assert from "node:assert/strict";
import { fillUrlVars, renderText } from "./template-utils";

test("link do botão com dado da planilha", () => {
  const r = { phone: "5511999998888", name: "Maria Silva", data: { numero: "5511999998888", var1: "12.345.678/0001-90", " var3 ": "R$ 10,00" } };
  assert.equal(fillUrlVars("https://site.com/?cnpj={{var1}}", r), "https://site.com/?cnpj=12.345.678%2F0001-90");
  assert.equal(fillUrlVars("https://site.com/?v={{ VAR3 }}&n={{primeiro_nome}}", r), "https://site.com/?v=R%24%2010%2C00&n=Maria");
  assert.equal(fillUrlVars("https://site.com/sem-variavel", r), "https://site.com/sem-variavel");
  assert.equal(fillUrlVars("https://site.com/?x={{nao_existe}}", r), "https://site.com/?x=");
});

test("texto fixo com coluna e primeiro nome de coluna", () => {
  const r = { phone: "5511999998888", name: null, data: { var2: "GUILHERME SOUZA LTDA", " var3 ": "R$ 33,00" } };
  const out = renderText("Olá {{1}}, {{2}}", [{ type: "field", field: "first:var2" }, { type: "fixed", value: "Saldo em aberto: {{var3}}" }], r, false);
  assert.equal(out, "Olá Guilherme, Saldo em aberto: R$ 33,00");
});

test("link com a coluna em chave simples ({coluna})", () => {
  const r = { phone: "5511999998888", name: null, data: { cnpj: "12.345.678/0001-90" } };
  assert.equal(fillUrlVars("https://x.dev/?cnpj={cnpj}", r), "https://x.dev/?cnpj=12.345.678%2F0001-90");
  assert.equal(fillUrlVars("https://x.dev/{nao_e_coluna}", r), "https://x.dev/{nao_e_coluna}");
});
