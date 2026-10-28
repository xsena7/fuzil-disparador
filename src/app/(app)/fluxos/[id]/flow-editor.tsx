"use client";

import clsx from "clsx";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { ArrowLeft, Clock, FileText, GitBranch, GripVertical, Loader2, Maximize2, Megaphone, MessageSquare, Minus, MousePointerClick, Paperclip, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { flowCampaignPreviewAction, saveFlowAction, uploadFlowMediaAction } from "@/app/actions/flows";
import { WhatsAppPreview, type PreviewData } from "@/components/whatsapp-preview";
import { toast } from "@/components/toast";
import { NODE_INFO, nodePorts, UNIT_LABEL, validateGraph, type FlowEdge, type FlowGraph, type FlowNode, type FlowNodeType, type FlowOption, type FlowUnit } from "@/lib/flow-types";

const NODE_W = 264;
const uid = () => Math.random().toString(36).slice(2, 10);

const STYLE: Record<FlowNodeType, { head: string; ring: string; icon: ReactNode }> = {
  start: { head: "bg-emerald-500", ring: "ring-emerald-400", icon: <Megaphone className="size-4" /> },
  message: { head: "bg-brand-gradient", ring: "ring-brand-400", icon: <MessageSquare className="size-4" /> },
  buttons: { head: "bg-violet-500", ring: "ring-violet-400", icon: <MousePointerClick className="size-4" /> },
  wait: { head: "bg-amber-500", ring: "ring-amber-400", icon: <Clock className="size-4" /> },
  condition: { head: "bg-sky-500", ring: "ring-sky-400", icon: <GitBranch className="size-4" /> },
};

const NEW_DATA: Record<Exclude<FlowNodeType, "start">, () => FlowNode["data"]> = {
  message: () => ({ text: "" }),
  buttons: () => ({ text: "", buttons: [{ id: uid(), label: "" }] }),
  wait: () => ({ amount: 5, unit: "minutes" }),
  condition: () => ({ options: [{ id: uid(), label: "" }] }),
};

// Explicação de cada bloco na paleta da direita
const PALETTE: Array<{ type: Exclude<FlowNodeType, "start">; text: string; example: string }> = [
  { type: "message", text: "Manda uma mensagem: texto, foto, áudio, vídeo ou PDF. Depois segue para o próximo bloco.", example: "Ex.: \"Oi Maria! Segue o catálogo 👇\" + foto" },
  { type: "buttons", text: "Faz uma pergunta com até 3 botões. Cada botão leva para um caminho diferente.", example: "Ex.: \"Quer participar?\" [Sim] [Não]" },
  { type: "wait", text: "Espera um tempo antes de seguir (segundos, minutos, horas ou dias).", example: "Ex.: esperar 2 minutos e mandar a próxima" },
  { type: "condition", text: "Espera a pessoa escrever e escolhe o caminho pelas palavras da resposta.", example: "Ex.: se contém \"pix\" → manda a chave" },
];

export type FlowCampaign = { id: string; name: string; status: string; buttons: string[]; other: boolean };

type Pt = { x: number; y: number };
type Drag = { kind: "node"; id: string; start: Pt; orig: Pt; moved: boolean } | { kind: "pan"; start: Pt; orig: Pt } | { kind: "link"; from: string; port: string };

function summary(n: FlowNode, campaigns: FlowCampaign[]): string {
  const d = n.data;
  if (n.type === "message") return [d.media?.url ? `📎 ${d.media.name || "anexo"}` : "", d.text?.trim() ?? ""].filter(Boolean).join("\n") || "Clique para escrever a mensagem";
  if (n.type === "buttons") return d.text?.trim() || "Clique para escrever a pergunta";
  if (n.type === "wait") return `Espera ${d.amount ?? 1} ${UNIT_LABEL[d.unit ?? "minutes"]}`;
  if (n.type === "condition") return "Espera a próxima resposta e segue pelo caminho que ela combinar";
  const names = (d.campaignIds ?? []).map((id) => campaigns.find((c) => c.id === id)?.name).filter(Boolean);
  return names.length ? `Começa quando responderem: ${names.join(", ")}` : "Clique e escolha o disparo que começa este fluxo";
}

type Previews = Record<string, PreviewData | null>;

export function FlowEditor({ id, initialName, initialGraph, campaigns, initialPreviews, waiting }: { id: string; initialName: string; initialGraph: FlowGraph; campaigns: FlowCampaign[]; initialPreviews: Previews; waiting: Record<string, number> }) {
  const [previews, setPreviews] = useState<Previews>(initialPreviews);
  const [name, setName] = useState(initialName);
  const [graph, setGraph] = useState<FlowGraph>(initialGraph);
  const [selected, setSelected] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<string | null>(null);
  const [pan, setPan] = useState<Pt>({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [ports, setPorts] = useState<Record<string, Pt>>({});
  const [linkTo, setLinkTo] = useState<Pt | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  // Campanha nova no bloco Disparo: busca a prévia do template dela
  const chosenIds = graph.nodes.find((n) => n.type === "start")?.data.campaignIds ?? [];
  useEffect(() => {
    for (const cid of chosenIds) {
      if (cid in previews) continue;
      setPreviews((p) => ({ ...p, [cid]: null }));
      flowCampaignPreviewAction(cid).then((pv) => setPreviews((p) => ({ ...p, [cid]: pv })));
    }
  }, [chosenIds.join(","), previews]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = useCallback((fn: (g: FlowGraph) => FlowGraph) => {
    setGraph(fn);
    setDirty(true);
  }, []);
  const updateNode = (nid: string, data: Partial<FlowNode["data"]>) => change((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === nid ? { ...n, data: { ...n.data, ...data } } : n)) }));

  // Posição de cada bolinha (entrada e saídas), medida na tela depois de desenhar
  useLayoutEffect(() => {
    const root = innerRef.current;
    if (!root) return;
    const base = root.getBoundingClientRect();
    const next: Record<string, Pt> = {};
    root.querySelectorAll<HTMLElement>("[data-port]").forEach((el) => {
      const r = el.getBoundingClientRect();
      next[el.dataset.port!] = { x: (r.left + r.width / 2 - base.left) / zoom, y: (r.top + r.height / 2 - base.top) / zoom };
    });
    setPorts((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  });

  // Aviso ao sair sem salvar
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const toCanvas = useCallback(
    (cx: number, cy: number): Pt => {
      const r = boxRef.current!.getBoundingClientRect();
      return { x: (cx - r.left - pan.x) / zoom, y: (cy - r.top - pan.y) / zoom };
    },
    [pan, zoom],
  );

  const deleteNode = useCallback(
    (nid: string) => {
      change((g) => ({ nodes: g.nodes.filter((n) => n.id !== nid || n.type === "start"), edges: g.edges.filter((e) => e.from !== nid && e.to !== nid) }));
      setSelected(null);
    },
    [change],
  );

  // Delete / Backspace apaga o bloco ou a seta escolhida (fora dos campos de texto)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (selEdge) {
        change((g) => ({ ...g, edges: g.edges.filter((x) => x.id !== selEdge) }));
        setSelEdge(null);
      } else if (selected) deleteNode(selected);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selected, selEdge, change, deleteNode]);

  function onMove(e: RPointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "pan") setPan({ x: d.orig.x + e.clientX - d.start.x, y: d.orig.y + e.clientY - d.start.y });
    if (d.kind === "node") {
      const dx = (e.clientX - d.start.x) / zoom;
      const dy = (e.clientY - d.start.y) / zoom;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      d.moved = true;
      change((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === d.id ? { ...n, x: Math.max(0, Math.round(d.orig.x + dx)), y: Math.max(0, Math.round(d.orig.y + dy)) } : n)) }));
    }
    if (d.kind === "link") setLinkTo(toCanvas(e.clientX, e.clientY));
  }

  function onUp(e: RPointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === "link") {
      setLinkTo(null);
      const target = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-node]")?.dataset.node;
      const node = graph.nodes.find((n) => n.id === target);
      if (node && node.id !== d.from && node.type !== "start") {
        change((g) => ({ ...g, edges: [...g.edges.filter((x) => !(x.from === d.from && x.port === d.port)), { id: uid(), from: d.from, port: d.port, to: node.id }] }));
      }
    }
  }

  function addNode(type: Exclude<FlowNodeType, "start">, at?: Pt) {
    const src = graph.nodes.find((n) => n.id === selected);
    const freePort = src ? nodePorts(src).find((p) => !graph.edges.some((e) => e.from === src.id && e.port === p.id)) : undefined;
    const r = boxRef.current!.getBoundingClientRect();
    const center = toCanvas(r.left + r.width / 2 - NODE_W / 2, r.top + r.height / 3);
    const pos = at ? { x: at.x - NODE_W / 2, y: at.y - 20 } : src ? { x: src.x + NODE_W + 90, y: src.y + (freePort ? nodePorts(src).indexOf(freePort) * 40 : 0) } : center;
    const node: FlowNode = { id: uid(), type, x: Math.max(0, Math.round(pos.x)), y: Math.max(0, Math.round(pos.y)), data: NEW_DATA[type]() };
    change((g) => ({ nodes: [...g.nodes, node], edges: src && freePort ? [...g.edges, { id: uid(), from: src.id, port: freePort.id, to: node.id }] : g.edges }));
    setSelected(node.id);
    setSelEdge(null);
  }

  function fit() {
    const r = boxRef.current!.getBoundingClientRect();
    const xs = graph.nodes.map((n) => n.x);
    const ys = graph.nodes.map((n) => n.y);
    const w = Math.max(...xs) + NODE_W - Math.min(...xs);
    const h = Math.max(...ys) + 220 - Math.min(...ys);
    const z = Math.min(1.2, Math.max(0.3, Math.min((r.width - 80) / w, (r.height - 80) / h)));
    setZoom(z);
    setPan({ x: 40 - Math.min(...xs) * z, y: 40 - Math.min(...ys) * z });
  }

  function save() {
    const err = validateGraph(graph);
    if (err) return toast("error", err);
    startSave(async () => {
      const r = await saveFlowAction(id, name, graph);
      if (r?.error) toast("error", r.error);
      else {
        setDirty(false);
        toast("success", r?.ok ?? "Salvo");
      }
    });
  }

  const sel = graph.nodes.find((n) => n.id === selected) ?? null;
  const edgePath = (e: FlowEdge) => {
    const a = ports[`${e.from}|${e.port}`];
    const b = ports[`${e.to}|in`];
    return a && b ? curve(a, b) : null;
  };
  const linking = drag.current?.kind === "link" ? drag.current : null;

  return (
    <div className="-mx-4 -mb-8 -mt-6 flex h-[calc(100dvh-5rem)] flex-col md:-mx-10 md:-my-9 md:h-[100dvh]">
      {/* Barra de cima */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-4 py-2.5 md:px-6">
        <Link href="/fluxos" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100" title="Voltar">
          <ArrowLeft className="size-5" />
        </Link>
        <input
          value={name}
          onChange={(e) => (setName(e.target.value), setDirty(true))}
          className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-lg font-semibold outline-none hover:border-zinc-200 focus:border-brand-400 md:max-w-xs"
          aria-label="Nome do fluxo"
        />
        <div className="flex flex-wrap items-center gap-1.5 md:hidden">
          {(["message", "buttons", "wait", "condition"] as const).map((t) => (
            <button key={t} onClick={() => addNode(t)} className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50" title={NODE_INFO[t].hint}>
              <span className={clsx("grid size-5 place-items-center rounded-md text-white", STYLE[t].head)}>{STYLE[t].icon}</span>
              {NODE_INFO[t].label}
            </button>
          ))}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className={clsx("ml-auto flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm", dirty ? "bg-brand-gradient" : "bg-zinc-400")}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {dirty ? "Salvar" : "Salvo"}
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* Área dos blocos */}
        <div
          ref={boxRef}
          className="absolute inset-0 touch-none select-none overflow-hidden md:right-80 bg-[#f6f6f9] [background-image:radial-gradient(#d4d4d8_1px,transparent_1px)]"
          style={{ backgroundSize: `${20 * zoom}px ${20 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px`, cursor: drag.current?.kind === "pan" ? "grabbing" : "grab" }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("[data-node], [data-edge]")) return;
            drag.current = { kind: "pan", start: { x: e.clientX, y: e.clientY }, orig: pan };
            setSelected(null);
            setSelEdge(null);
          }}
          onDragOver={(e) => e.dataTransfer.types.includes("fz/block") && e.preventDefault()}
          onDrop={(e) => {
            const t = e.dataTransfer.getData("fz/block") as Exclude<FlowNodeType, "start">;
            if (!PALETTE.some((x) => x.type === t)) return;
            e.preventDefault();
            addNode(t, toCanvas(e.clientX, e.clientY));
          }}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              const r = boxRef.current!.getBoundingClientRect();
              const z = Math.min(1.6, Math.max(0.3, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
              const cx = e.clientX - r.left;
              const cy = e.clientY - r.top;
              setPan({ x: cx - ((cx - pan.x) / zoom) * z, y: cy - ((cy - pan.y) / zoom) * z });
              setZoom(z);
            } else setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
          }}
        >
          <div ref={innerRef} className="absolute left-0 top-0 h-0 w-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
            {/* Setas */}
            <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
              {graph.edges.map((e) => {
                const p = edgePath(e);
                if (!p) return null;
                const on = selEdge === e.id;
                return (
                  <g key={e.id}>
                    <path d={p.d} fill="none" stroke="transparent" strokeWidth={16} className="pointer-events-auto cursor-pointer" data-edge onPointerDown={(ev) => (ev.stopPropagation(), setSelEdge(e.id), setSelected(null))} />
                    <path d={p.d} fill="none" stroke={on ? "#f97316" : "#a1a1aa"} strokeWidth={on ? 3 : 2} markerEnd="url(#arrow)" />
                    {on && (
                      <g
                        className="pointer-events-auto cursor-pointer"
                        data-edge
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          change((g) => ({ ...g, edges: g.edges.filter((x) => x.id !== e.id) }));
                          setSelEdge(null);
                        }}
                      >
                        <circle cx={p.mid.x} cy={p.mid.y} r={11} fill="#ef4444" />
                        <path d={`M${p.mid.x - 4} ${p.mid.y - 4}L${p.mid.x + 4} ${p.mid.y + 4}M${p.mid.x + 4} ${p.mid.y - 4}L${p.mid.x - 4} ${p.mid.y + 4}`} stroke="white" strokeWidth={2} />
                      </g>
                    )}
                  </g>
                );
              })}
              {linking && linkTo && ports[`${linking.from}|${linking.port}`] && (
                <path d={curve(ports[`${linking.from}|${linking.port}`], linkTo).d} fill="none" stroke="#f97316" strokeWidth={2.5} strokeDasharray="6 4" />
              )}
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0L10 5L0 10z" fill="#a1a1aa" />
                </marker>
              </defs>
            </svg>

            {graph.nodes.map((n) => (
              <NodeCard
                key={n.id}
                node={n}
                selected={selected === n.id}
                waiting={waiting[n.id] ?? 0}
                campaigns={campaigns}
                previews={previews}
                linked={(port) => graph.edges.some((e) => e.from === n.id && e.port === port)}
                onGrab={(e) => {
                  e.stopPropagation();
                  drag.current = { kind: "node", id: n.id, start: { x: e.clientX, y: e.clientY }, orig: { x: n.x, y: n.y }, moved: false };
                  setSelected(n.id);
                  setSelEdge(null);
                }}
                onPort={(port, e) => {
                  e.stopPropagation();
                  drag.current = { kind: "link", from: n.id, port };
                  setLinkTo(toCanvas(e.clientX, e.clientY));
                }}
                onDelete={() => deleteNode(n.id)}
              />
            ))}
          </div>
        </div>

        {/* Zoom */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
          <button className="rounded-lg p-1.5 hover:bg-zinc-100" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} title="Diminuir"><Minus className="size-4" /></button>
          <span className="w-10 text-center text-xs tabular-nums text-zinc-500">{Math.round(zoom * 100)}%</span>
          <button className="rounded-lg p-1.5 hover:bg-zinc-100" onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))} title="Aumentar"><Plus className="size-4" /></button>
          <button className="rounded-lg p-1.5 hover:bg-zinc-100" onClick={fit} title="Ver tudo"><Maximize2 className="size-4" /></button>
        </div>

        {/* Blocos (paleta da direita): clique ou arraste para o quadro */}
        <aside className="absolute inset-y-0 right-0 hidden w-80 flex-col overflow-y-auto border-l border-zinc-200 bg-white md:flex">
          <div className="border-b border-zinc-100 px-4 py-3">
            <div className="font-semibold">Blocos</div>
            <div className="text-xs text-zinc-500">Arraste para o quadro ou clique para adicionar</div>
          </div>
          <div className="space-y-2.5 p-3">
            {PALETTE.map((b) => (
              <button
                key={b.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("fz/block", b.type);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => addNode(b.type)}
                className="group flex w-full cursor-grab gap-3 rounded-2xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md active:cursor-grabbing"
              >
                <span className={clsx("grid size-9 shrink-0 place-items-center rounded-xl text-white", STYLE[b.type].head)}>{STYLE[b.type].icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 font-semibold text-zinc-900">
                    {NODE_INFO[b.type].label}
                    <GripVertical className="ml-auto size-4 text-zinc-300 group-hover:text-zinc-400" />
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-zinc-600">{b.text}</span>
                  <span className="mt-1 block text-xs italic text-zinc-400">{b.example}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-auto space-y-2 border-t border-zinc-100 p-4 text-xs leading-relaxed text-zinc-500">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-700"><Sparkles className="size-3.5 text-brand-500" /> Como ligar</div>
            <p>Arraste da <b className="text-zinc-700">bolinha</b> de uma saída até outro bloco. Clique numa seta para apagar. Com um bloco escolhido, o próximo que você adicionar já nasce ligado nele.</p>
            <p>Arraste o fundo para andar; Ctrl + rolar para zoom.</p>
          </div>
        </aside>

        {/* Painel do bloco escolhido */}
        {sel && (
          <aside className="absolute inset-x-0 bottom-0 z-10 max-h-[60%] overflow-y-auto border-t border-zinc-200 bg-white p-4 shadow-xl md:inset-x-auto md:bottom-auto md:right-80 md:top-0 md:h-full md:max-h-none md:w-[22rem] md:border-l md:border-t-0">
            <div className="mb-3 flex items-center gap-2">
              <span className={clsx("grid size-7 place-items-center rounded-lg text-white", STYLE[sel.type].head)}>{STYLE[sel.type].icon}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{NODE_INFO[sel.type].label}</div>
                <div className="text-xs text-zinc-500">{NODE_INFO[sel.type].hint}</div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"><X className="size-4" /></button>
            </div>
            <NodeForm node={sel} campaigns={campaigns} previews={previews} update={(d) => updateNode(sel.id, d)} />
            {sel.type !== "start" && (
              <button onClick={() => deleteNode(sel.id)} className="mt-5 flex items-center gap-1.5 text-sm text-red-600 hover:underline">
                <Trash2 className="size-4" /> Apagar bloco
              </button>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function curve(a: Pt, b: Pt) {
  const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
  const d = `M${a.x} ${a.y} C${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x - 4} ${b.y}`;
  // Meio da curva (t = 0,5)
  const mid = { x: (a.x + 3 * (a.x + dx) + 3 * (b.x - dx) + b.x) / 8, y: (a.y + b.y) / 2 };
  return { d, mid };
}

function NodeCard({
  node,
  selected,
  waiting,
  campaigns,
  previews,
  linked,
  onGrab,
  onPort,
  onDelete,
}: {
  node: FlowNode;
  selected: boolean;
  waiting: number;
  campaigns: FlowCampaign[];
  previews: Previews;
  linked: (port: string) => boolean;
  onGrab: (e: RPointerEvent) => void;
  onPort: (port: string, e: RPointerEvent) => void;
  onDelete: () => void;
}) {
  const st = STYLE[node.type];
  const ports = nodePorts(node);
  const text = summary(node, campaigns);
  return (
    <div
      data-node={node.id}
      className={clsx("absolute rounded-2xl bg-white shadow-md ring-1 ring-zinc-200 transition-shadow", selected && ["ring-2", st.ring, "shadow-lg"])}
      style={{ left: node.x, top: node.y, width: NODE_W }}
    >
      {/* Entrada */}
      {node.type !== "start" && <span data-port={`${node.id}|in`} className="absolute -left-2 top-[18px] size-4 rounded-full border-2 border-white bg-zinc-400 shadow" />}
      <div onPointerDown={onGrab} className={clsx("flex cursor-move items-center gap-2 rounded-t-2xl px-3 py-2 text-sm font-semibold text-white", st.head)}>
        {st.icon}
        <span className="flex-1">{NODE_INFO[node.type].label}</span>
        {waiting > 0 && <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px]" title="Pessoas paradas neste bloco agora">{waiting} aqui</span>}
        {node.type !== "start" && (
          <button onPointerDown={(e) => e.stopPropagation()} onClick={onDelete} className="rounded p-0.5 opacity-70 hover:bg-white/20 hover:opacity-100" title="Apagar bloco">
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div onPointerDown={onGrab} className="cursor-pointer px-3 py-2.5">
        {node.type === "message" && node.data.media?.url && node.data.media.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.data.media.url} alt="" className="mb-2 max-h-28 w-full rounded-lg object-cover" />
        )}
        <p className="line-clamp-4 whitespace-pre-line text-[13px] leading-snug text-zinc-600">{text}</p>
        {node.type === "start" &&
          (node.data.campaignIds ?? []).map((cid) => {
            const pv = previews[cid];
            return pv ? <MiniTemplate key={cid} pv={pv} /> : null;
          })}
      </div>
      <div className="border-t border-zinc-100 py-1">
        {ports.map((p) => (
          <div key={p.id} className="relative flex items-center justify-end gap-2 py-1 pl-3 pr-5 text-xs text-zinc-600">
            <span className="truncate" title={p.label}>{p.label}</span>
            <span
              data-port={`${node.id}|${p.id}`}
              onPointerDown={(e) => onPort(p.id, e)}
              className={clsx("absolute -right-2 size-4 cursor-crosshair rounded-full border-2 border-white shadow transition hover:scale-125", linked(p.id) ? "bg-brand-500" : "bg-zinc-300 hover:bg-brand-400")}
              title="Arraste até outro bloco"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const input = "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100";

function OptionsEditor({ items, onChange, placeholder, max, maxLength, addLabel }: { items: FlowOption[]; onChange: (v: FlowOption[]) => void; placeholder: string; max: number; maxLength?: number; addLabel: string }) {
  return (
    <div className="space-y-2">
      {items.map((o, i) => (
        <div key={o.id} className="flex items-center gap-2">
          <input
            value={o.label}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            className={input}
          />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600" title="Tirar">
            <X className="size-4" />
          </button>
        </div>
      ))}
      {items.length < max && (
        <button onClick={() => onChange([...items, { id: uid(), label: "" }])} className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
          <Plus className="size-4" /> {addLabel}
        </button>
      )}
    </div>
  );
}

function TimeoutField({ node, update }: { node: FlowNode; update: (d: Partial<FlowNode["data"]>) => void }) {
  const on = Boolean(node.data.timeoutAmount);
  return (
    <div className="mt-4 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200/70">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={on} onChange={(e) => update({ timeoutAmount: e.target.checked ? 1 : undefined, timeoutUnit: node.data.timeoutUnit ?? "hours" })} />
        Caminho para quem não responder
      </label>
      {on && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="text-zinc-500">depois de</span>
          <input type="number" min={1} value={node.data.timeoutAmount ?? 1} onChange={(e) => update({ timeoutAmount: Math.max(1, Number(e.target.value) || 1) })} className={clsx(input, "w-20")} />
          <UnitSelect value={node.data.timeoutUnit ?? "hours"} onChange={(u) => update({ timeoutUnit: u })} />
        </div>
      )}
    </div>
  );
}

function UnitSelect({ value, onChange }: { value: FlowUnit; onChange: (u: FlowUnit) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as FlowUnit)} className={clsx(input, "w-auto")}>
      {(Object.keys(UNIT_LABEL) as FlowUnit[]).map((u) => (
        <option key={u} value={u}>{UNIT_LABEL[u]}</option>
      ))}
    </select>
  );
}

const VARS_HINT = (
  <p className="mt-1.5 text-xs text-zinc-500">
    Use <code className="rounded bg-zinc-100 px-1">{"{{primeiro_nome}}"}</code> ou <code className="rounded bg-zinc-100 px-1">{"{{nome}}"}</code> para personalizar.
  </p>
);

function NodeForm({ node, campaigns, previews, update }: { node: FlowNode; campaigns: FlowCampaign[]; previews: Previews; update: (d: Partial<FlowNode["data"]>) => void }) {
  const [uploading, startUpload] = useTransition();
  const d = node.data;

  if (node.type === "start") return <StartForm node={node} campaigns={campaigns} previews={previews} update={update} />;

  if (node.type === "message")
    return (
      <div className="text-sm">
        <textarea value={d.text ?? ""} onChange={(e) => update({ text: e.target.value })} rows={6} maxLength={4096} placeholder="Escreva a mensagem..." className={input} />
        {VARS_HINT}
        <div className="mt-4">
          {d.media?.url ? (
            <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 ring-1 ring-zinc-200/70">
              <FileText className="size-4 text-zinc-500" />
              <a href={d.media.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-brand-600 hover:underline">{d.media.name || "anexo"}</a>
              <button onClick={() => update({ media: null })} className="text-xs text-red-600 hover:underline">tirar</button>
            </div>
          ) : (
            <label className={clsx("flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 px-3 py-3 text-zinc-500 hover:border-brand-300 hover:text-brand-600", uploading && "opacity-60")}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
              {uploading ? "Enviando..." : "Anexar foto, áudio, vídeo ou PDF"}
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,video/mp4,audio/mpeg,audio/ogg,audio/aac,audio/mp4,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.set("file", file);
                  startUpload(async () => {
                    const r = await uploadFlowMediaAction(fd);
                    if (r.error || !r.url || !r.kind) toast("error", r.error ?? "Não deu para enviar o arquivo");
                    else update({ media: { url: r.url, kind: r.kind, name: r.name } });
                  });
                }}
              />
            </label>
          )}
          <p className="mt-1.5 text-xs text-zinc-500">Com foto, vídeo ou PDF o texto vai como legenda. Áudio vai separado.</p>
        </div>
      </div>
    );

  if (node.type === "buttons")
    return (
      <div className="text-sm">
        <textarea value={d.text ?? ""} onChange={(e) => update({ text: e.target.value })} rows={4} maxLength={1024} placeholder="Ex.: Qual opção você prefere?" className={input} />
        {VARS_HINT}
        <div className="mb-2 mt-4 font-medium">Botões (até 3, com até 20 letras)</div>
        <OptionsEditor items={d.buttons ?? []} onChange={(buttons) => update({ buttons })} placeholder="Ex.: Quero" max={3} maxLength={20} addLabel="Adicionar botão" />
        <p className="mt-3 text-xs text-zinc-500">Cada botão tem a sua saída. Se a pessoa escrever em vez de clicar, vai por &quot;Escreveu outra coisa&quot;.</p>
        <TimeoutField node={node} update={update} />
      </div>
    );

  if (node.type === "wait")
    return (
      <div className="text-sm">
        <div className="flex items-center gap-2">
        <span className="text-zinc-500">Esperar</span>
        <input type="number" min={1} value={d.amount ?? 1} onChange={(e) => update({ amount: Math.max(1, Number(e.target.value) || 1) })} className={clsx(input, "w-24")} />
        <UnitSelect value={d.unit ?? "minutes"} onChange={(unit) => update({ unit })} />
        </div>
        <p className="mt-3 text-xs text-zinc-500">Regra do WhatsApp: mensagem sem template só vai até 24h depois da última resposta da pessoa. Esperas maiores que isso só funcionam se ela responder de novo.</p>
      </div>
    );

  return (
    <div className="text-sm">
      <p className="mb-3 text-zinc-600">Espera a pessoa responder e segue pelo caminho da primeira regra que combinar. Separe várias palavras por vírgula.</p>
      <OptionsEditor items={d.options ?? []} onChange={(options) => update({ options })} placeholder="Ex.: sim, quero, pode" max={20} addLabel="Adicionar regra" />
      <TimeoutField node={node} update={update} />
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = { DRAFT: "rascunho", SCHEDULED: "agendada", RUNNING: "disparando", PAUSED: "pausada", COMPLETED: "concluída" };

/** Bloco Disparo: escolhe as campanhas que começam o fluxo e separa os caminhos pela resposta. */
function StartForm({ node, campaigns, previews, update }: { node: FlowNode; campaigns: FlowCampaign[]; previews: Previews; update: (d: Partial<FlowNode["data"]>) => void }) {
  const d = node.data;
  const chosen = (d.campaignIds ?? []).map((cid) => campaigns.find((c) => c.id === cid)).filter((c): c is FlowCampaign => Boolean(c));
  const free = campaigns.filter((c) => !(d.campaignIds ?? []).includes(c.id));
  const buttons = [...new Set(chosen.flatMap((c) => c.buttons))];
  const missing = buttons.filter((b) => !(d.options ?? []).some((o) => o.label.trim().toLowerCase() === b.trim().toLowerCase()));
  return (
    <div className="text-sm">
      <div className="mb-2 font-medium">Qual disparo começa este fluxo?</div>
      {chosen.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {chosen.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200">
              <Megaphone className="size-4 shrink-0 text-emerald-600" />
              <span className="min-w-0 flex-1 truncate font-medium text-zinc-800" title={c.name}>{c.name}</span>
              <span className="text-xs text-zinc-500">{STATUS_LABEL[c.status] ?? ""}</span>
              <button onClick={() => update({ campaignIds: (d.campaignIds ?? []).filter((x) => x !== c.id) })} className="rounded p-0.5 text-zinc-400 hover:text-red-600" title="Tirar">
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <select
        value=""
        onChange={(e) => e.target.value && update({ campaignIds: [...(d.campaignIds ?? []), e.target.value] })}
        className={input}
      >
        <option value="">{chosen.length ? "+ Adicionar outro disparo" : "Escolha a campanha"}</option>
        {free.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}{STATUS_LABEL[c.status] ? ` (${STATUS_LABEL[c.status]})` : ""}{c.other ? " · usa outro fluxo" : ""}
          </option>
        ))}
      </select>
      {chosen.map((c) =>
        c.id in previews ? (
          <div key={c.id} className="my-4">
            <div className="mb-2 text-xs font-medium text-zinc-500">Template de &quot;{c.name}&quot;, como a campanha manda</div>
            {previews[c.id] ? (
              <div className="origin-top scale-90"><WhatsAppPreview data={previews[c.id]!} /></div>
            ) : (
              <p className="text-xs text-zinc-400">Carregando... (se não aparecer, a campanha ainda não tem template escolhido)</p>
            )}
          </div>
        ) : null,
      )}
      <p className="mt-1.5 text-xs text-zinc-500">Quem responder esse disparo (ou clicar num botão de resposta do template) entra no fluxo. Vale ao salvar.</p>

      <div className="mb-2 mt-5 font-medium">Caminhos pela resposta</div>
      {missing.length > 0 && (
        <button
          onClick={() => update({ options: [...(d.options ?? []), ...missing.map((label) => ({ id: uid(), label }))] })}
          className="mb-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50 px-3 py-2 text-left text-violet-700 hover:bg-violet-100"
        >
          <MousePointerClick className="size-4 shrink-0" />
          <span>Usar os botões do template: <b>{missing.join(", ")}</b></span>
        </button>
      )}
      <OptionsEditor items={d.options ?? []} onChange={(options) => update({ options })} placeholder="Ex.: Quero saber mais" max={20} addLabel="Adicionar resposta" />
      <p className="mt-3 text-xs text-zinc-500">Coloque o texto de cada botão do template ou palavras separadas por vírgula (ex.: <i>sim, quero, pode</i>). O que não combinar vai por &quot;Qualquer outra resposta&quot;.</p>
    </div>
  );
}

/** Template da campanha em miniatura, dentro do bloco Disparo (com as variáveis já preenchidas). */
function MiniTemplate({ pv }: { pv: PreviewData }) {
  const media = pv.headerType && ["IMAGE", "VIDEO", "DOCUMENT"].includes(pv.headerType);
  return (
    <div className="mt-2.5 rounded-xl bg-[#efeae2] p-2">
      <div className="rounded-lg rounded-tl-none bg-white p-1.5 text-[12px] leading-snug text-zinc-800 shadow-sm">
        {media &&
          (pv.headerMediaUrl && pv.headerType === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pv.headerMediaUrl} alt="" className="mb-1 max-h-24 w-full rounded object-cover" />
          ) : (
            <div className="mb-1 grid h-12 place-items-center rounded bg-zinc-100 text-[10px] text-zinc-400">{pv.headerType === "VIDEO" ? "vídeo" : pv.headerType === "DOCUMENT" ? "PDF" : "imagem"}</div>
          ))}
        {pv.headerText && <div className="mb-0.5 font-semibold">{pv.headerText}</div>}
        <p className="line-clamp-6 whitespace-pre-line px-0.5">{pv.body}</p>
        {pv.footer && <div className="mt-0.5 px-0.5 text-[10px] text-zinc-400">{pv.footer}</div>}
      </div>
      {pv.buttons.map((b, i) => (
        <div key={i} className="mt-1 rounded-lg bg-white py-1 text-center text-[12px] font-medium text-sky-600 shadow-sm">{b.text}</div>
      ))}
    </div>
  );
}
