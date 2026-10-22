import { test } from "node:test";
import assert from "node:assert/strict";
import { fillUrlVars } from "./template-utils";

test("link do botão com dado da planilha", () => {
  const r = { phone: "5511999998888", name: "Maria Silva", data: { numero: "5511999998888", var1: "12.345.678/0001-90", " var3 ": "R$ 10,00" } };
  assert.equal(fillUrlVars("https://site.com/?cnpj={{var1}}", r), "https://site.com/?cnpj=12.345.678%2F0001-90");
  assert.equal(fillUrlVars("https://site.com/?v={{ VAR3 }}&n={{primeiro_nome}}", r), "https://site.com/?v=R%24%2010%2C00&n=Maria");
  assert.equal(fillUrlVars("https://site.com/sem-variavel", r), "https://site.com/sem-variavel");
  assert.equal(fillUrlVars("https://site.com/?x={{nao_existe}}", r), "https://site.com/?x=");
});
