"use client";

import { Fragment, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Hourglass, Loader2, Plus, Send, Trash2, Zap } from "lucide-react";
import { saveStepsAction } from "@/app/actions/funnels";
import { LEAD_FIELDS, type FunnelStep, type SendStep } from "@/lib/funnel-types";
import type { VarSource } from "@/lib/template-utils";
import { Button } from "@/components/ui";
import { toast } from "@/components/toast";

export type BlueprintOption = { id: string; name: string; text: string; vars: string[]; ready: string };

const sel = "w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm";
const newId = () => Math.random().toString(16).slice(2, 12);

/** Bloco colorido do fluxo (igual a um nó do n8n). */
function Node({ tone, icon, title, subtitle, children, actions }: { tone: "orange" | "pink" | "green"; icon: React.ReactNode; title: string; subtitle?: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  const head = { orange: "from-amber-500 to-orange-600", pink: "from-pink-500 to-rose-600", green: "from-emerald-500 to-teal-600" }[tone];
  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className={clsx("flex items-center gap-2.5 bg-gradient-to-r px-3.5 py-2.5 text-white", head)}>
        <span className="flex size-7 items-center justify-center rounded-lg bg-white/20">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          {subtitle && <span className="block truncate text-[11px] opacity-90">{subtitle}</span>}
        </span>
        {actions}
      </div>
      {children && <div className="space-y-2.5 p-3.5 text-sm">{children}</div>}
    </div>
  );
}

function Link({ onAdd }: { onAdd?: (type: "wait" | "send") => void }) {
  return (
    <div className="flex flex-col items-center">
      <div className="h-4 w-px bg-zinc-300" />
      {onAdd ? (
        <div className="flex gap-1">
          <button type="button" onClick={() => onAdd("wait")} className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500 hover:border-pink-300 hover:text-pink-600">
            <Plus className="size-3" /> Timer
          </button>
          <button type="button" onClick={() => onAdd("send")} className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500 hover:border-emerald-300 hover:text-emerald-600">
            <Plus className="size-3" /> Mensagem
          </button>
        </div>
      ) : (
        <ArrowDown className="size-3.5 text-zinc-300" />
      )}
      <div className="h-4 w-px bg-zinc-300" />
    </div>
  );
}

function preview(bp: BlueprintOption | undefined, mapping: SendStep["mapping"]) {
  if (!bp) return "";
  return bp.text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, v) => {
    const src = mapping?.body?.[bp.vars.indexOf(v)];
    if (!src) return `{{${v}}}`;
    if (src.type === "fixed") return src.value || "…";
    return `[${LEAD_FIELDS.find((f) => f.value === src.field)?.label ?? src.field}]`;
  });
}

export function FlowEditor({ funnelId, initial, blueprints, code, done }: { funnelId: string; initial: FunnelStep[]; blueprints: BlueprintOption[]; code: BlueprintOption | null; done: BlueprintOption | null }) {
  const [steps, setSteps] = useState<FunnelStep[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  useEffect(() => { if (msg) toast(msg.ok ? "success" : "error", msg.text); }, [msg]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const byId = new Map(blueprints.map((b) => [b.id, b]));

  const update = (next: FunnelStep[]) => {
    setSteps(next);
    setDirty(true);
    setMsg(null);
  };
  const patch = (i: number, p: Partial<FunnelStep>) => update(steps.map((s, j) => (j === i ? ({ ...s, ...p } as FunnelStep) : s)));
  const insert = (at: number, type: "wait" | "send") => {
    const bp = blueprints[0];
    const step: FunnelStep =
      type === "wait"
        ? { id: newId(), type: "wait", amount: 1, unit: "days" }
        : { id: newId(), type: "send", blueprintId: bp?.id ?? "", mapping: { body: (bp?.vars ?? []).map((_, k) => ({ type: "field", field: k === 0 ? "firstName" : "col:vaga" })) } };
    update([...steps.slice(0, at), step, ...steps.slice(at)]);
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };
  const remove = (i: number) => update(steps.filter((_, j) => j !== i));

  const tools = (i: number) => (
    <span className="flex gap-0.5">
      <button type="button" title="Subir" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-white/20">
        <ArrowUp className="size-3.5" />
      </button>
      <button type="button" title="Descer" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-white/20">
        <ArrowDown className="size-3.5" />
      </button>
      <button type="button" title="Remover" onClick={() => remove(i)} className="rounded p-1 hover:bg-white/20">
        <Trash2 className="size-3.5" />
      </button>
    </span>
  );

  return (
    <div>
      <div className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-[radial-gradient(circle,#e4e4e7_1px,transparent_1px)] bg-[length:16px_16px] px-3 py-6">
        <Node tone="orange" icon={<Zap className="size-4" />} title="Gatilho" subtitle="A pessoa se inscreve na página" />
        <Link />
        <Node tone="green" icon={<Send className="size-4" />} title="Ação: código no WhatsApp" subtitle={code ? `Template ${code.name}` : "Sem template"}>
          <p className="text-zinc-500">Código de 6 números disparado pelo rodízio do grupo. A pessoa digita no site para confirmar o número.</p>
          {code && <Ready text={code.ready} />}
        </Node>
        <Link />
        <Node tone="orange" icon={<Zap className="size-4" />} title="Gatilho" subtitle="Confirmou o código no site" />
        <Link onAdd={(t) => insert(0, t)} />
        {steps.map((s, i) => (
          <Fragment key={s.id}>
            {s.type === "wait" ? (
              <Node tone="pink" icon={<Hourglass className="size-4" />} title="Timer" subtitle="Espera antes do próximo passo" actions={tools(i)}>
                <div className="flex gap-2">
                  <input type="number" min={1} max={365} value={s.amount} onChange={(e) => patch(i, { amount: Number(e.target.value) })} className={clsx(sel, "w-24")} />
                  <select value={s.unit} onChange={(e) => patch(i, { unit: e.target.value as "minutes" })} className={sel}>
                    <option value="minutes">minutos</option>
                    <option value="hours">horas</option>
                    <option value="days">dias</option>
                  </select>
                </div>
              </Node>
            ) : (
              <SendNode step={s} bp={byId.get(s.blueprintId)} blueprints={blueprints} onChange={(p) => patch(i, p)} actions={tools(i)} />
            )}
            <Link onAdd={(t) => insert(i + 1, t)} />
          </Fragment>
        ))}
        <div className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-white">Fim do funil</div>

        <div className="my-6 h-px w-full max-w-md bg-zinc-200" />
        <Node tone="orange" icon={<Zap className="size-4" />} title="Gatilho" subtitle="Respondeu o cadastro final (link do WhatsApp)" />
        <Link />
        <Node tone="green" icon={<Send className="size-4" />} title="Ação: cadastro recebido" subtitle={done ? `Template ${done.name}` : "Sem template"}>
          {done && <p className="whitespace-pre-line text-zinc-600">{preview(done, { body: [{ type: "field", field: "firstName" }, { type: "field", field: "col:vaga" }] })}</p>}
          {done && <Ready text={done.ready} />}
        </Node>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              const res = await saveStepsAction(funnelId, steps);
              if (res.ok) {
                setDirty(false);
                setMsg({ ok: true, text: "Funil salvo! As mudanças já valem para os próximos leads." });
                router.refresh();
              } else setMsg({ text: res.error ?? "Erro ao salvar" });
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Salvar funil
        </Button>
        {dirty && <span className="text-amber-600">Alterações não salvas</span>}
        {msg && !msg.ok && <span className="text-red-600">{msg.text}</span>}
      </div>
    </div>
  );
}

function Ready({ text }: { text: string }) {
  const ok = !text.startsWith("0 ");
  return <p className={clsx("rounded-lg px-2.5 py-1.5 text-xs font-medium", ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{text}</p>;
}

function SendNode({ step, bp, blueprints, onChange, actions }: { step: SendStep; bp?: BlueprintOption; blueprints: BlueprintOption[]; onChange: (p: Partial<SendStep>) => void; actions: React.ReactNode }) {
  const setVar = (k: number, src: VarSource) => {
    const body = [...(step.mapping?.body ?? [])];
    body[k] = src;
    onChange({ mapping: { ...step.mapping, body } });
  };
  return (
    <Node tone="green" icon={<Send className="size-4" />} title="Ação: mensagem" subtitle={bp ? `Template ${bp.name}` : "Escolha o template"} actions={actions}>
      <select
        value={step.blueprintId}
        onChange={(e) => {
          const next = blueprints.find((b) => b.id === e.target.value);
          onChange({ blueprintId: e.target.value, mapping: { body: (next?.vars ?? []).map((_, k) => step.mapping?.body?.[k] ?? { type: "field", field: "firstName" }) } });
        }}
        className={sel}
      >
        {!bp && <option value="">Escolha o template padrão</option>}
        {blueprints.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      {bp?.vars.map((v, k) => {
        const src = step.mapping?.body?.[k];
        const value = src?.type === "fixed" ? "fixed" : src?.field ?? "";
        return (
          <div key={v} className="flex items-center gap-2">
            <span className="w-10 shrink-0 font-mono text-xs text-zinc-400">{`{{${v}}}`}</span>
            <select value={value} onChange={(e) => setVar(k, e.target.value === "fixed" ? { type: "fixed", value: "" } : { type: "field", field: e.target.value })} className={sel}>
              <option value="" disabled>
                Escolha
              </option>
              {LEAD_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
              <option value="fixed">Texto fixo</option>
            </select>
            {src?.type === "fixed" && <input value={src.value} onChange={(e) => setVar(k, { type: "fixed", value: e.target.value })} className={sel} placeholder="Texto" />}
          </div>
        );
      })}
      {bp && <p className="whitespace-pre-line rounded-lg bg-[#e7ffdb] px-3 py-2 text-[13px] text-zinc-700">{preview(bp, step.mapping)}</p>}
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input type="checkbox" checked={Boolean(step.onlyIfPending)} onChange={(e) => onChange({ onlyIfPending: e.target.checked })} />
        Condicional: só enviar se ainda não respondeu o cadastro
      </label>
      {bp && <Ready text={bp.ready} />}
    </Node>
  );
}
