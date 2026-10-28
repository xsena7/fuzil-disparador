// Formato de um fluxo (usado no editor e no motor). Sem imports de servidor: roda no navegador também.

export type FlowUnit = "seconds" | "minutes" | "hours" | "days";
export type FlowOption = { id: string; label: string };
export type FlowMedia = { url: string; kind: "image" | "video" | "audio" | "document"; name?: string };

export type FlowNodeData = {
  // start / condition: respostas que levam a caminhos diferentes (palavras separadas por vírgula)
  options?: FlowOption[];
  // message / buttons
  text?: string;
  media?: FlowMedia | null;
  // buttons: até 3 botões de resposta
  buttons?: FlowOption[];
  // wait
  amount?: number;
  unit?: FlowUnit;
  // buttons / condition: caminho "não respondeu em X"
  timeoutAmount?: number;
  timeoutUnit?: FlowUnit;
};

export type FlowNodeType = "start" | "message" | "buttons" | "wait" | "condition";
export type FlowNode = { id: string; type: FlowNodeType; x: number; y: number; data: FlowNodeData };
export type FlowEdge = { id: string; from: string; port: string; to: string };
export type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[] };

export const UNIT_MS: Record<FlowUnit, number> = { seconds: 1000, minutes: 60_000, hours: 3600_000, days: 86400_000 };
export const UNIT_LABEL: Record<FlowUnit, string> = { seconds: "segundos", minutes: "minutos", hours: "horas", days: "dias" };

export const NODE_INFO: Record<FlowNodeType, { label: string; hint: string }> = {
  start: { label: "Início", hint: "Quando o contato responde o disparo" },
  message: { label: "Mensagem", hint: "Texto, foto, áudio, vídeo ou PDF" },
  buttons: { label: "Botões", hint: "Pergunta com até 3 botões" },
  wait: { label: "Esperar", hint: "Um tempo antes de seguir" },
  condition: { label: "Condição", hint: "Espera a resposta e escolhe o caminho" },
};

export type FlowPort = { id: string; label: string };

/** Saídas de cada bloco (cada uma pode ter uma seta). */
export function nodePorts(n: FlowNode): FlowPort[] {
  const d = n.data;
  const timeout = d.timeoutAmount && d.timeoutAmount > 0 ? [{ id: "timeout", label: `Não respondeu em ${d.timeoutAmount} ${UNIT_LABEL[d.timeoutUnit ?? "hours"]}` }] : [];
  switch (n.type) {
    case "start":
      return [...(d.options ?? []).map((o) => ({ id: `opt:${o.id}`, label: o.label || "(vazio)" })), { id: "else", label: d.options?.length ? "Qualquer outra resposta" : "Qualquer resposta" }];
    case "condition":
      return [...(d.options ?? []).map((o) => ({ id: `opt:${o.id}`, label: `Contém: ${o.label || "(vazio)"}` })), { id: "else", label: "Outra resposta" }, ...timeout];
    case "buttons":
      return [...(d.buttons ?? []).map((b) => ({ id: `btn:${b.id}`, label: b.label || "(botão)" })), { id: "else", label: "Escreveu outra coisa" }, ...timeout];
    default:
      return [{ id: "next", label: "Depois" }];
  }
}

/** Texto sem acento, minúsculo e sem espaços sobrando (para comparar respostas). */
export const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Qual opção a resposta escolhe: igual ou contém alguma das palavras (separadas por vírgula). */
export function matchOption(options: FlowOption[] | undefined, reply: string): FlowOption | null {
  const r = norm(reply);
  if (!r) return null;
  for (const o of options ?? []) {
    const words = o.label.split(",").map(norm).filter(Boolean);
    if (words.some((w) => r === w || r.includes(w))) return o;
  }
  return null;
}

export const emptyGraph = (): FlowGraph => ({
  nodes: [{ id: "start", type: "start", x: 60, y: 160, data: { options: [] } }],
  edges: [],
});

/** Confere o fluxo antes de salvar. Devolve o erro (em português) ou null. */
export function validateGraph(g: FlowGraph): string | null {
  if (!Array.isArray(g?.nodes) || !Array.isArray(g?.edges)) return "Fluxo inválido";
  if (g.nodes.length > 200) return "Fluxo grande demais (máximo 200 blocos)";
  if (g.nodes.filter((n) => n.type === "start").length !== 1) return "O fluxo precisa de um bloco Início";
  for (const n of g.nodes) {
    const d = n.data ?? {};
    if (n.type === "message" && !d.text?.trim() && !d.media?.url) return "Um bloco Mensagem está vazio";
    if (n.type === "buttons") {
      if (!d.text?.trim()) return "Escreva a pergunta do bloco Botões";
      const b = d.buttons ?? [];
      if (!b.length || b.length > 3) return "O bloco Botões precisa de 1 a 3 botões";
      if (b.some((x) => !x.label.trim() || x.label.trim().length > 20)) return "Cada botão precisa de um nome com até 20 letras";
      if (new Set(b.map((x) => norm(x.label))).size !== b.length) return "Os botões precisam ter nomes diferentes";
    }
    if (n.type === "wait" && !(Number(d.amount) > 0)) return "Coloque o tempo do bloco Esperar";
    if (n.type === "condition" && !(d.options ?? []).some((o) => o.label.trim())) return "Coloque pelo menos uma palavra no bloco Condição";
  }
  return null;
}
