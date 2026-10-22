import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePixKey, pixPayload } from "./pix";

test("pix copia e cola com valor e CRC", () => {
  // Exemplo do manual do BR Code (chave aleatória, sem valor)
  const p = pixPayload({ key: "123e4567-e12b-12d1-a456-426655440000", name: "Fulano de Tal", city: "BRASILIA" });
  assert.equal(p, "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D");
  const v = pixPayload({ key: "fulano@email.com", name: "Joao", city: "São Paulo", amount: 9.75 });
  assert.match(v, /540\d9\.75/);
  assert.match(v, /6009Sao Paulo/);
});

test("formato da chave", () => {
  assert.equal(normalizePixKey("(11) 99999-8888"), "+5511999998888");
  assert.equal(normalizePixKey("123.456.789-09"), "12345678909");
  assert.equal(normalizePixKey("Fulano@Email.com"), "fulano@email.com");
});
