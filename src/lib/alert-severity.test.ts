import { test } from "node:test";
import assert from "node:assert/strict";
import { alertSeverity } from "./alert-severity";

test("vermelho só para marketing, excluído e banimento", () => {
  assert.equal(alertSeverity('Template "fzl_disp1" recategorizado: UTILITY → MARKETING', "WARNING"), "CRITICAL");
  assert.equal(alertSeverity('Template padrão "fzl_disp1" virou MARKETING e foi EXCLUÍDO', "CRITICAL"), "CRITICAL");
  assert.equal(alertSeverity("Número +55 77 92002-1455 banido (Erica Araujo Carvalho)", "CRITICAL"), "CRITICAL");
  assert.equal(alertSeverity('Bella Fruta foi para "🚫 Banidas"', "WARNING"), "CRITICAL");
  assert.equal(alertSeverity("Atualização na WABA Erica (Erica): ACCOUNT_VIOLATION", "CRITICAL"), "CRITICAL");
});

test("o resto fica no máximo amarelo", () => {
  assert.equal(alertSeverity('Loja foi para "📝 Template em análise"', "CRITICAL"), "WARNING");
  assert.equal(alertSeverity('Número +55 11 9999-0000 (BM) retirado da campanha "X"', "CRITICAL"), "WARNING");
  assert.equal(alertSeverity("Campanha \"X\" concluída", "INFO"), "INFO");
  assert.equal(alertSeverity('Loja voltou para "🚫 Banidas"', "INFO"), "INFO");
});
