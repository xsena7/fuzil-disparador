import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLogic } from "./report-numbers";

test("lógica dos números do relatório", () => {
  assert.equal(checkLogic({ total: 1000, sent: 900, read: 600, clicked: 100, replied: 50 }), null);
  assert.match(checkLogic({ total: 1000, sent: 1001, read: 600, clicked: 100, replied: 50 }) ?? "", /Enviadas/);
  assert.match(checkLogic({ total: 1000, sent: 900, read: 600, clicked: 601, replied: 50 }) ?? "", /Clicaram/);
  assert.match(checkLogic({ total: 1000, sent: 900, read: 600, clicked: 100, replied: 700 }) ?? "", /Responderam/);
});
