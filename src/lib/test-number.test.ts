import { test } from "node:test";
import assert from "node:assert/strict";
import { phoneInvalidReason } from "./sync";

const base = { id: "1", quality_rating: "GREEN", status: "CONNECTED" } as const;
const reason = (over: Record<string, unknown>) => phoneInvalidReason({ ...base, display_phone_number: "+55 11 91234-5678", verified_name: "Loja", ...over } as never);

test("número de teste da Meta nunca conta como número de verdade", () => {
  assert.equal(reason({ display_phone_number: "+1 555-169-8337" }), "Número de teste da Meta");
  assert.equal(reason({ display_phone_number: "+1 (555) 025-3483", verified_name: "Test Number" }), "Número de teste da Meta");
  assert.equal(reason({ verified_name: "test number" }), "Número de teste da Meta");
  assert.equal(reason({ account_mode: "sandbox" }), "Número de teste da Meta");
  assert.equal(reason({}), null);
  // Número de teste novo da Meta, sem 555
  assert.equal(reason({ display_phone_number: "+1 711-670-0424" }), "Número de teste da Meta");
  assert.equal(reason({ display_phone_number: "+55 62 98257-0672" }), null);
});
