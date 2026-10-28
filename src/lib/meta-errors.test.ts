import { test } from "node:test";
import assert from "node:assert/strict";
import { metaErrorLabel, metaErrorText, templateRejectReason, translateMetaText } from "./meta-errors";

test("códigos viram português simples", () => {
  assert.equal(metaErrorLabel(131026), "Não entregue");
  assert.match(metaErrorText(131042, "Business eligibility payment issue"), /^Problema de pagamento: /);
  assert.match(metaErrorLabel(999999), /código 999999/);
});

test("código vago usa o detalhe traduzido", () => {
  assert.match(metaErrorText(100, "(#100) The parameter phone_number is required."), /^Dado inválido: Faltou preencher/);
  assert.match(metaErrorText(131000, "Something went wrong"), /passageiro/);
});

test("textos em inglês são traduzidos", () => {
  assert.match(translateMetaText("Message failed to send because more than 24 hours have passed since the customer last replied")!, /24h/);
  assert.match(translateMetaText("Error validating access token: Session has expired")!, /Reconecte/);
  assert.match(translateMetaText("Recipient phone number not in allowed list")!, /teste/);
  assert.match(translateMetaText("The operation could not be completed")!, /sem um motivo conhecido/);
  assert.equal(translateMetaText("Já está em português, não mexe"), "Já está em português, não mexe");
  assert.equal(translateMetaText(""), null);
  assert.match(translateMetaText("Spam rate limit hit")!, /denunciou/);
  assert.match(translateMetaText("fetch failed")!, /conexão/);
  assert.equal(translateMetaText("Arquivo muito grande (máx. 5 MB)"), "Arquivo muito grande (máx. 5 MB)");
});

test("motivo de reprovação de template", () => {
  assert.match(templateRejectReason("PROMOTIONAL")!, /promocional/);
  assert.equal(templateRejectReason(null), null);
});
