import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeAlert } from "./alert-summary";

test("resumo curto dos alertas", () => {
  assert.deepEqual(summarizeAlert({ title: 'Refrigeracao 3 Irmaos foi para "📱 Sem número"', severity: "WARNING" }), { head: "Sem número", who: "Refrigeracao 3 Irmaos", tone: "amber", key: "Sem número" });
  assert.equal(summarizeAlert({ title: 'Campanha "Black" concluída', severity: "INFO" }).head, "Campanha concluída");
  assert.equal(summarizeAlert({ title: "Número +55 11 90000-0000 banido (BM Norte)", severity: "CRITICAL" }).who, "+55 11 90000-0000 · BM Norte");
  assert.equal(summarizeAlert({ title: "Algo novo aconteceu", severity: "INFO" }).head, "Algo novo aconteceu");
  assert.deepEqual(summarizeAlert({ title: "Atualização na WABA Br Farma - Fuzil (Br Farma): PARTNER_ADDED", severity: "INFO" }), { head: "Parceiro adicionado", who: "Br Farma", tone: "blue", key: "Parceiro adicionado" });
  assert.equal(summarizeAlert({ title: "Atualização na WABA V L Sousa Assessoria: ACCOUNT_VIOLATION", severity: "CRITICAL" }).head, "Violação na conta");
});
