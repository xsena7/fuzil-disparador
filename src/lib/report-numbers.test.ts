import { test } from "node:test";
import assert from "node:assert/strict";
import { applyOverrides, checkLogic } from "./report-numbers";

test("lógica dos números do relatório", () => {
  assert.equal(checkLogic({ total: 1000, sent: 900, read: 600, clicked: 100, replied: 50 }), null);
  assert.match(checkLogic({ total: 1000, sent: 1001, read: 600, clicked: 100, replied: 50 }) ?? "", /Enviadas/);
  assert.match(checkLogic({ total: 1000, sent: 900, read: 600, clicked: 601, replied: 50 }) ?? "", /Clicaram/);
  assert.match(checkLogic({ total: 1000, sent: 900, read: 600, clicked: 100, replied: 700 }) ?? "", /Responderam/);
});

const realOf = (total: number, sent: number, read: number, clicked: number, replied = 0) => ({ total, sent, read, clicked, clicks: clicked, replied, failed: 0, noWa: 0, pending: 0, sentUnread: 0 });

test("ajuste do relatório sobe junto com os reais, cada número na sua proporção", () => {
  const base = { total: 1000, sent: 1000, read: 200, clicked: 200, replied: 0 };
  // Proporções diferentes em cada número: enviadas ×10, lidas ×15, cliques ×10
  const saved = { total: 10000, sent: 10000, read: 3000, clicked: 2000, replied: 0, base };
  const now = applyOverrides(realOf(1000, 1000, 200, 200), saved);
  // Cliques são sempre os reais (mesmo com ajuste salvo)
  assert.deepEqual([now.sent, now.read, now.clicked], [10000, 3000, 200]);
  const later = applyOverrides(realOf(1000, 1000, 240, 250), saved);
  assert.equal(later.clicked, 250);
  assert.equal(later.read, 3600); // real 200 → 240 (+20%): 3.000 → 3.600
  assert.equal(later.sent, 10000);
  assert.equal(later.adjusted, true);
});

test("cliques nunca são ajustados: o relatório mostra sempre os reais", () => {
  const saved = { total: 2000, sent: 2000, read: 400, clicked: 0, replied: 0, base: { total: 1000, sent: 1000, read: 200, clicked: 0, replied: 0 } };
  assert.equal(applyOverrides(realOf(1000, 1000, 200, 10), saved).clicked, 10);
  const old = { total: 2000, sent: 2000, read: 400, clicked: 100, replied: 0 };
  assert.equal(applyOverrides(realOf(1000, 1000, 300, 150), old).clicked, 150);
  // Lidas ajustadas abaixo dos cliques reais sobem até eles (quem clicou leu)
  const low = { total: 1000, sent: 1000, read: 50, clicked: 0, replied: 0 };
  const r = applyOverrides(realOf(1000, 1000, 300, 150), low);
  assert.equal(r.clicked, 150);
  assert.equal(r.read, 150);
});
