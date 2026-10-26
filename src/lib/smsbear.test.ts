import { test } from "node:test";
import assert from "node:assert/strict";
import { codeFromSms } from "./smsbear";

test("código do SMS do WhatsApp", () => {
  assert.equal(codeFromSms([{ code: "123456", text: "x" }]), "123456");
  assert.equal(codeFromSms([{ code: "123-456" }]), "123456");
  assert.equal(codeFromSms([{ text: "Seu código do WhatsApp Business: 482-913. Não compartilhe." }]), "482913");
  assert.equal(codeFromSms([]), null);
  assert.equal(codeFromSms(undefined), null);
});
