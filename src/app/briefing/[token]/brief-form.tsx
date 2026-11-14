"use client";

// Formulário do cliente: aba Campanha (nome, variáveis, imagem, link do botão, planilha) e aba Foto de perfil.
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, FileSpreadsheet, ImageIcon, Loader2, Send, UserCircle2 } from "lucide-react";
import { submitBriefAction } from "@/app/actions/briefs";
import type { TComponent, TemplateShape, VarSource } from "@/lib/template-utils";
import type { BriefInitial } from "./page";

type Kind = "fixed" | "firstName" | "name" | "col";
type VarState = { kind: Kind; value: string };

const fromSource = (s: VarSource | undefined, fallback: Kind): VarState => {
  if (!s) return { kind: fallback, value: "" };
  if (s.type === "fixed") return { kind: "fixed", value: s.value };
  if (s.field === "firstName" || s.field === "name") return { kind: s.field, value: "" };
  if (s.field.startsWith("col:")) return { kind: "col", value: s.field.slice(4) };
  return { kind: fallback, value: "" };
};

const EXAMPLE: Record<Exclude<Kind, "fixed" | "col">, string> = { firstName: "Maria", name: "Maria Silva" };

function VarField({ prefix, i, label, v, onChange }: { prefix: string; i: number; label: string; v: VarState; onChange: (v: VarState) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</div>
      <input type="hidden" name={`${prefix}${i}_kind`} value={v.kind} />
      <div className="mb-2 flex flex-wrap gap-1.5">
        {([
          ["fixed", "Texto"],
          ["firstName", "Primeiro nome"],
          ["name", "Nome completo"],
          ["col", "Coluna da planilha"],
        ] as Array<[Kind, string]>).map(([k, l]) => (
          <button key={k} type="button" onClick={() => onChange({ kind: k, value: k === v.kind ? v.value : "" })} className={clsx("rounded-full border px-3 py-1 text-xs font-medium transition", v.kind === k ? "border-orange-400 bg-orange-500/10 text-orange-300" : "border-white/10 text-zinc-400 hover:text-white")}>
            {l}
          </button>
        ))}
      </div>
      {(v.kind === "fixed" || v.kind === "col") && (
        <input
          name={`${prefix}${i}_value`}
          value={v.value}
          onChange={(e) => onChange({ ...v, value: e.target.value })}
          placeholder={v.kind === "fixed" ? "Escreva o texto que vai aqui" : "Nome da coluna, igual está na planilha (ex.: cidade)"}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-400"
        />
      )}
      {(v.kind === "firstName" || v.kind === "name") && <p className="text-xs text-zinc-500">Usa a coluna de nome da sua planilha (cada pessoa recebe o próprio nome).</p>}
    </div>
  );
}

export function BriefForm({ token, components, shape, initial }: { token: string; components: TComponent[]; shape: TemplateShape; initial: BriefInitial }) {
  const [state, formAction, pending] = useActionState(submitBriefAction.bind(null, token), undefined);
  const [tab, setTab] = useState<"camp" | "photo">("camp");
  const [name, setName] = useState(initial.campaignName);
  const [header, setHeader] = useState<VarState[]>(shape.headerVars.map((_, i) => fromSource(initial.mapping.header?.[i], "fixed")));
  const [body, setBody] = useState<VarState[]>(shape.bodyVars.map((_, i) => fromSource(initial.mapping.body?.[i], i === 0 ? "firstName" : "fixed")));
  const [url, setUrl] = useState(initial.buttonUrl);
  const [media, setMedia] = useState<string | null>(initial.mediaUrl);
  const [photo, setPhoto] = useState<string | null>(null);
  const [sheet, setSheet] = useState<string | null>(initial.audienceFileName);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (state?.ok) setDone(true);
    // Erro da aba Campanha: volta para ela (a mensagem aparece embaixo do botão Enviar)
    else if (state?.error && !/foto de perfil/i.test(state.error)) setTab("camp");
  }, [state]);

  const headerC = components.find((c) => c.type === "HEADER");
  const bodyText = components.find((c) => c.type === "BODY")?.text ?? "";
  const footer = components.find((c) => c.type === "FOOTER")?.text;
  const buttons = components.find((c) => c.type === "BUTTONS")?.buttons ?? [];
  const needsMedia = Boolean(shape.headerFormat && ["IMAGE", "VIDEO", "DOCUMENT"].includes(shape.headerFormat));
  // Botão com link variável é sempre o link do Fuzil (conta os cliques): o cliente diz para onde vai
  const tracked = shape.urlButtons.some((b) => b.tracked || (b.dynamic && b.url.includes("{{")));

  // Prévia da mensagem com o que o cliente está preenchendo
  const show = (v: VarState) => (v.kind === "fixed" ? v.value || "…" : v.kind === "col" ? `[${v.value || "coluna"}]` : EXAMPLE[v.kind]);
  const render = (text: string, vars: string[], vals: VarState[]) => text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const i = vars.indexOf(k);
    return i >= 0 && vals[i] ? show(vals[i]) : `{{${k}}}`;
  });
  const preview = useMemo(() => render(bodyText, shape.bodyVars, body), [bodyText, shape.bodyVars, body]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done)
    return (
      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.05] p-10 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-400" />
        <h1 className="mt-4 text-2xl font-semibold">{state?.ok}</h1>
        <p className="mt-2 text-zinc-400">Pode fechar esta página. Se precisar mudar algo, abra o mesmo link de novo.</p>
        <button type="button" onClick={() => setDone(false)} className="mt-6 rounded-full border border-white/15 px-5 py-2 text-sm hover:bg-white/5">Mudar alguma coisa</button>
      </div>
    );

  return (
    // Envia sem limpar o formulário: se der erro, o cliente não precisa escolher os arquivos de novo
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="grid gap-6 lg:grid-cols-[1fr_340px]"
    >
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Monte sua campanha</h1>
        <p className="mt-2 text-zinc-400">Preencha as duas abas e clique em Enviar. A nossa equipe recebe tudo pronto para disparar.</p>
        {initial.submitted && <p className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-2 text-sm text-emerald-200">Você já enviou esta campanha. Se mudar algo e enviar de novo, a gente recebe a versão nova.</p>}

        <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-sm">
          {([["camp", "1. Campanha"], ["photo", "2. Foto de perfil"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={clsx("rounded-full px-4 py-2 font-medium transition", tab === k ? "bg-white text-black" : "text-zinc-400 hover:text-white")}>{l}</button>
          ))}
        </div>

        {/* Aba 1: campanha (fica montada escondida para os arquivos não se perderem ao trocar de aba) */}
        <div className={clsx("mt-6 space-y-5", tab !== "camp" && "hidden")}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Nome da campanha</span>
            <input name="campaignName" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder="Ex.: Black Friday clientes antigos" className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-orange-400" />
          </label>

          {needsMedia && (
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><ImageIcon className="size-4 text-orange-400" /> {shape.headerFormat === "VIDEO" ? "Vídeo da mensagem" : shape.headerFormat === "DOCUMENT" ? "PDF da mensagem" : "Imagem da mensagem"}</span>
              <input type="file" name="media" accept={shape.headerFormat === "VIDEO" ? "video/mp4" : shape.headerFormat === "DOCUMENT" ? "application/pdf" : "image/jpeg,image/png"} onChange={(e) => { const f = e.target.files?.[0]; if (f && f.type.startsWith("image/")) setMedia(URL.createObjectURL(f)); }} className="block w-full cursor-pointer rounded-xl border border-dashed border-white/15 p-3 text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
              {initial.mediaUrl && <span className="mt-1 block text-xs text-zinc-500">Já enviada. Escolha outra só se quiser trocar.</span>}
            </label>
          )}

          {header.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold">Título da mensagem</div>
              {header.map((v, i) => <VarField key={i} prefix="h" i={i} label={`Variável {{${shape.headerVars[i]}}} do título`} v={v} onChange={(nv) => setHeader(header.map((x, j) => (j === i ? nv : x)))} />)}
            </div>
          )}
          {body.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold">O que vai em cada parte da mensagem</div>
              {body.map((v, i) => <VarField key={i} prefix="b" i={i} label={`Variável {{${shape.bodyVars[i]}}}`} v={v} onChange={(nv) => setBody(body.map((x, j) => (j === i ? nv : x)))} />)}
            </div>
          )}

          {tracked && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Link do botão</span>
              <input name="buttonUrl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://seusite.com.br/oferta" className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-orange-400" />
              <span className="mt-1 block text-xs text-zinc-500">Para onde a pessoa vai quando tocar no botão. A gente conta os cliques para o seu relatório.</span>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><FileSpreadsheet className="size-4 text-orange-400" /> Planilha com os contatos</span>
            <input type="file" name="audience" accept=".xlsx,.xls,.csv" onChange={(e) => setSheet(e.target.files?.[0]?.name ?? initial.audienceFileName)} className="block w-full cursor-pointer rounded-xl border border-dashed border-white/15 p-3 text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
            <span className="mt-1 block text-xs text-zinc-500">
              Excel ou CSV, com uma coluna de telefone (com DDD) e, se quiser, uma de nome.
              {initial.audienceFileName && ` Já enviada: ${initial.audienceFileName}${initial.audienceRows ? ` (${initial.audienceRows.toLocaleString("pt-BR")} contatos)` : ""}. Escolha outra só se quiser trocar.`}
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Observações (opcional)</span>
            <textarea name="notes" defaultValue={initial.notes} rows={3} placeholder="Horário que prefere, algum cuidado com a lista..." className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-orange-400" />
          </label>
          <button type="button" onClick={() => setTab("photo")} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium hover:bg-white/5">Próximo: foto de perfil →</button>
        </div>

        {/* Aba 2: foto de perfil */}
        <div className={clsx("mt-6 space-y-4", tab !== "photo" && "hidden")}>
          <p className="text-sm text-zinc-400">A foto que aparece no WhatsApp dos números que vão disparar a sua campanha. Quadrada fica melhor.</p>
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-3xl border border-dashed border-white/15 p-8 text-center hover:border-orange-400/60">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="size-32 rounded-full object-cover ring-2 ring-orange-400" />
            ) : (
              <UserCircle2 className="size-20 text-zinc-600" />
            )}
            <span className="text-sm font-medium">{photo ? "Trocar foto" : initial.hasPhoto ? "Já enviada · clique para trocar" : "Escolher a foto de perfil"}</span>
            <input type="file" name="profilePhoto" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; setPhoto(f ? URL.createObjectURL(f) : null); }} />
          </label>
          <p className="text-xs text-zinc-500">Opcional. Sem foto, a gente usa a foto padrão.</p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
          <button disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff7a00] to-[#ff303d] px-6 py-3 font-semibold text-white shadow-lg shadow-orange-500/30 disabled:opacity-60">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {pending ? "Enviando..." : initial.submitted ? "Enviar de novo" : "Enviar para a equipe"}
          </button>
          {state?.error && <span className="text-sm text-red-400">{state.error}</span>}
          {sheet && <span className="text-xs text-zinc-500">Planilha: {sheet}</span>}
        </div>
      </div>

      {/* Prévia */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Prévia da mensagem</div>
        <div className="rounded-3xl border border-white/10 bg-[#0b141a] p-4">
          <div className="max-w-[92%] overflow-hidden rounded-2xl rounded-tl-sm bg-[#1f2c33] text-[13px] leading-snug text-zinc-100">
            {needsMedia && (media && shape.headerFormat === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media} alt="" className="aspect-video w-full object-cover" />
            ) : (
              <div className="grid aspect-video w-full place-items-center bg-black/30 text-xs text-zinc-500">{shape.headerFormat === "IMAGE" ? "imagem" : shape.headerFormat === "VIDEO" ? "vídeo" : "PDF"}</div>
            ))}
            <div className="space-y-1 p-3">
              {headerC?.format === "TEXT" && headerC.text && <div className="font-semibold">{render(headerC.text, shape.headerVars, header)}</div>}
              <div className="whitespace-pre-wrap">{preview}</div>
              {footer && <div className="text-[11px] text-zinc-400">{footer}</div>}
            </div>
            {buttons.map((b, i) => <div key={i} className="border-t border-white/10 py-2 text-center text-[13px] font-medium text-sky-300">{b.text}</div>)}
          </div>
          {name && <div className="mt-3 text-xs text-zinc-500">Campanha: <b className="text-zinc-300">{name}</b></div>}
        </div>
      </aside>
    </form>
  );
}
