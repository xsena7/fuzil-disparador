import { test } from "node:test";
import assert from "node:assert/strict";
import { matchOption, nodePorts, validateGraph, emptyGraph, type FlowGraph } from "./flow-types";

test("resposta escolhe a opção (sem acento, maiúscula, contém palavra)", () => {
  const opts = [
    { id: "a", label: "Quero saber mais" },
    { id: "b", label: "não, nao quero" },
  ];
  assert.equal(matchOption(opts, "QUERO SABER MAIS")?.id, "a");
  assert.equal(matchOption(opts, "Não")?.id, "b");
  assert.equal(matchOption(opts, "nao quero agora")?.id, "b");
  assert.equal(matchOption(opts, "talvez"), null);
  assert.equal(matchOption(opts, "   "), null);
});

test("saídas dos blocos", () => {
  assert.deepEqual(nodePorts(emptyGraph().nodes[0]).map((p) => p.id), ["else"]);
  const b = { id: "x", type: "buttons" as const, x: 0, y: 0, data: { text: "?", buttons: [{ id: "1", label: "Sim" }], timeoutAmount: 2, timeoutUnit: "hours" as const } };
  assert.deepEqual(nodePorts(b).map((p) => p.id), ["btn:1", "else", "timeout"]);
});

test("confere o fluxo antes de salvar", () => {
  assert.equal(validateGraph(emptyGraph()), null);
  const g: FlowGraph = { nodes: [...emptyGraph().nodes, { id: "m", type: "message", x: 0, y: 0, data: { text: "" } }], edges: [] };
  assert.match(validateGraph(g)!, /Mensagem está vazio/);
  const b: FlowGraph = { nodes: [...emptyGraph().nodes, { id: "b", type: "buttons", x: 0, y: 0, data: { text: "Oi", buttons: [{ id: "1", label: "Sim" }, { id: "2", label: "sim" }] } }], edges: [] };
  assert.match(validateGraph(b)!, /nomes diferentes/);
  assert.match(validateGraph({ nodes: [], edges: [] })!, /Início/);
});
