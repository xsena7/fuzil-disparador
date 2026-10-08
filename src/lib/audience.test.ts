import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAudienceCsv } from "./audience";

test("detecta colunas, normaliza e remove duplicados", () => {
  const csv = "Nome;Código do País;Número de telefone;Email\nRosana;+55;21983557616;\nJoao;55;15998244981;j@x.com\nRepetido;55;21983557616;\nRuim;55;123;\n";
  const r = parseAudienceCsv(csv);
  assert.equal(r.columns.phone, "Número de telefone");
  assert.equal(r.stats.valid, 2);
  assert.equal(r.stats.duplicates, 1);
  assert.equal(r.stats.invalid, 1);
  assert.equal(r.rows[0].phone, "5521983557616");
  assert.equal(r.rows[1].data.email, "j@x.com");
});

test("planilha sem cabeçalho", () => {
  const r = parseAudienceCsv("21983557616,Maria\n15998244981,Jose\n");
  assert.equal(r.stats.valid, 2);
});
