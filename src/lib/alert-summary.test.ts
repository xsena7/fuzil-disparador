import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeAlert } from "./alert-summary";

test("resumo curto dos alertas", () => {
  assert.deepEqual(summarizeAlert({ title: 'Refrigeracao 3 Irmaos foi para "📱 Sem número"', severity: "WARNING" }), { head: "Sem número", who: "Refrigeracao 3 Irmaos", tone: "amber", key: "Sem número" });
  assert.equal(summarizeAlert({ title: 'Campanha "Black" concluída', severity: "INFO" }).head, "Campanha concluída");
  assert.equal(summarizeAlert({ title: "Número +55 11 90000-0000 banido (BM Norte)", severity: "CRITICAL" }).who, "+55 11 90000-0000 · BM Norte");
  assert.equal(summarizeAlert({ title: "Algo novo aconteceu", severity: "INFO" }).head, "Algo novo aconteceu");
});
