"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { Lock, Paperclip, Send, Settings2, Trash2, X, Zap } from "lucide-react";
import { deleteQuickReplyAction, saveQuickReplyAction, sendChatAction, sendChatTemplateAction } from "@/app/actions/chat";
import { WaText } from "./bubble";

export type QuickReply = { id: string; shortcut: string; text: string };
export type ChatTemplateLite = {
  id: string;
  wabaId: string;
  name: string;
  language: string;
  body: string;
  vars: number;
  headerMedia: "IMAGE" | "VIDEO" | "DOCUMENT" | null;
  urlButtons: Array<{ index: number; text: string; prefix: string }>;
};
export type TemplateChoice = { templateId: string; params: string[]; buttonParams: Record<string, string>; headerFile: File | null };

/** Monta o formulário de envio de template para as ações do servidor. */
export function templateForm(choice: TemplateChoice, extra: Record<string, string>) {
  const f = new FormData();
  f.set("templateId", choice.templateId);
  f.set("params", JSON.stringify(choice.params));
  f.set("buttonParams", JSON.stringify(choice.buttonParams));
  if (choice.headerFile) f.set("headerFile", choice.headerFile);
  for (const [k, v] of Object.entries(extra)) f.set(k, v);
  return f;
}

const fill = (body: string, params: string[]) => {
  let i = 0;
  return body.replace(/\{\{\s*[\w.]+\s*\}\}/g, () => params[i++] || `{{${i}}}`);
};

/** Escolher template + preencher variáveis (usado fora da janela e em "Nova conversa"). */
export function TemplatePicker({
  templates,
  onSend,
  pending,
  submitLabel = "Enviar template",
}: {
  templates: ChatTemplateLite[];
  onSend: (choice: TemplateChoice) => void;
  pending: boolean;
  submitLabel?: string;
}) {
  const [tplId, setTplId] = useState("");
  const [params, setParams] = useState<string[]>([]);
  const [buttons, setButtons] = useState<Record<string, string>>({});
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const tpl = templates.find((t) => t.id === tplId);
  const ready = tpl && params.filter((p) => p?.trim()).length >= tpl.vars && (!tpl.headerMedia || headerFile) && tpl.urlButtons.every((b) => buttons[b.index]?.trim());
  if (!templates.length)
    return <p className="text-sm text-zinc-500">Nenhum template de utilidade aprovado (sem mídia) nesta conta. Crie um em Templates.</p>;
  return (
    <div className="space-y-2.5">
      <select
        value={tplId}
        onChange={(e) => { setTplId(e.target.value); setParams([]); setButtons({}); setHeaderFile(null); }}
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
      >
        <option value="">Escolha o template…</option>
        {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.language})</option>)}
      </select>
      {tpl && (
        <>
          {tpl.vars > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: tpl.vars }, (_, i) => (
                <input
                  key={i}
                  value={params[i] ?? ""}
                  onChange={(e) => setParams((p) => { const n = [...p]; n[i] = e.target.value; return n; })}
                  placeholder={`Variável {{${i + 1}}}`}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                />
              ))}
            </div>
          )}
          {tpl.headerMedia && (
            <label className="block rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-600">
              {tpl.headerMedia === "IMAGE" ? "Imagem do cabeçalho (JPG/PNG)" : tpl.headerMedia === "VIDEO" ? "Vídeo do cabeçalho (MP4)" : "Documento do cabeçalho (PDF)"}
              <input
                type="file"
                accept={tpl.headerMedia === "IMAGE" ? "image/jpeg,image/png" : tpl.headerMedia === "VIDEO" ? "video/mp4" : "application/pdf"}
                onChange={(e) => setHeaderFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-xs"
              />
            </label>
          )}
          {tpl.urlButtons.map((b) => (
            <div key={b.index}>
              <div className="mb-1 text-xs text-zinc-500">Link do botão &quot;{b.text}&quot;: <span className="font-mono">{b.prefix}</span>…</div>
              <input
                value={buttons[b.index] ?? ""}
                onChange={(e) => setButtons((x) => ({ ...x, [b.index]: e.target.value }))}
                placeholder="Complemento do link"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              />
            </div>
          ))}
          <div className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-200/70"><WaText text={fill(tpl.body, params)} /></div>
          <button
            disabled={pending || !ready}
            onClick={() => onSend({ templateId: tpl.id, params, buttonParams: buttons, headerFile })}
            className="w-full rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Enviando..." : submitLabel}
          </button>
        </>
      )}
    </div>
  );
}

export function Composer({
  conversationId,
  windowOpen,
  templates,
  quickReplies,
  onSent,
  onQuickRepliesChanged,
}: {
  conversationId: string;
  windowOpen: boolean;
  templates: ChatTemplateLite[];
  quickReplies: QuickReply[];
  onSent: () => void;
  onQuickRepliesChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [manage, setManage] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [pick, setPick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // "/atalho" no começo da mensagem abre as respostas rápidas
  const slash = text.startsWith("/") && !text.includes(" ") && !text.includes("\n") ? text.slice(1).toLowerCase() : null;
  const matches = useMemo(() => (slash === null ? [] : quickReplies.filter((q) => q.shortcut.includes(slash)).slice(0, 6)), [slash, quickReplies]);

  const send = () => {
    if (pending || (!text.trim() && !file)) return;
    const form = new FormData();
    form.set("conversationId", conversationId);
    form.set("text", text);
    if (file) form.set("file", file);
    setError(null);
    start(async () => {
      const r = await sendChatAction(form);
      if (r.error) setError(r.error);
      else {
        setText("");
        setFile(null);
        onSent();
        taRef.current?.focus();
      }
    });
  };

  if (!windowOpen && !showTemplate)
    return (
      <div className="flex items-center gap-3 border-t border-zinc-200 bg-white px-4 py-3">
        <Lock className="size-4 shrink-0 text-amber-600" />
        <span className="flex-1 text-sm text-zinc-600">
          <b className="text-zinc-800">Janela de 24h fechada.</b> O cliente não falou com esse número nas últimas 24h, então só dá para mandar template (regra da Meta).
        </span>
        <button onClick={() => setShowTemplate(true)} className="shrink-0 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-medium text-white shadow-sm">Enviar template</button>
      </div>
    );

  if (!windowOpen)
    return (
      <div className="scrollbar-thin max-h-[60%] overflow-y-auto border-t border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800"><Lock className="size-4 text-amber-600" /> Enviar template</div>
          <button onClick={() => setShowTemplate(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100" aria-label="Fechar"><X className="size-4" /></button>
        </div>
        <TemplatePicker
          templates={templates}
          pending={pending}
          onSend={(choice) => start(async () => {
            const r = await sendChatTemplateAction(templateForm(choice, { conversationId }));
            if (r.error) setError(r.error);
            else { setShowTemplate(false); onSent(); }
          })}
        />
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>
    );

  return (
    <div className="relative border-t border-zinc-200 bg-white px-4 pb-4 pt-3">
      {matches.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lift">
          {matches.map((q, i) => (
            <button
              key={q.id}
              onMouseDown={(e) => { e.preventDefault(); setText(q.text); setPick(0); taRef.current?.focus(); }}
              className={clsx("flex w-full items-start gap-3 px-3.5 py-2.5 text-left text-sm", i === pick ? "bg-brand-50" : "hover:bg-zinc-50")}
            >
              <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">/{q.shortcut}</span>
              <span className="line-clamp-2 text-zinc-600">{q.text}</span>
            </button>
          ))}
        </div>
      )}

      {file && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-sm ring-1 ring-zinc-200/70">
          <Paperclip className="size-4 text-brand-500" />
          <span className="flex-1 truncate">{file.name}</span>
          <button onClick={() => setFile(null)} className="text-zinc-400 hover:text-rose-600" aria-label="Remover anexo"><X className="size-4" /></button>
        </div>
      )}

      <div className="flex items-end gap-2 rounded-2xl bg-zinc-50 p-1.5 ring-1 ring-zinc-200 focus-within:bg-white focus-within:ring-brand-300">
        <input ref={fileRef} type="file" className="hidden" accept="image/jpeg,image/png,video/mp4,audio/mpeg,audio/ogg,audio/aac,audio/mp4,application/pdf,.docx,.xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button onClick={() => fileRef.current?.click()} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" title="Anexar arquivo" aria-label="Anexar arquivo">
          <Paperclip className="size-5" />
        </button>
        <textarea
          ref={taRef}
          value={text}
          rows={1}
          onChange={(e) => { setText(e.target.value); setPick(0); }}
          onKeyDown={(e) => {
            if (matches.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              e.preventDefault();
              setPick((p) => (p + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
              return;
            }
            if (matches.length && (e.key === "Tab" || e.key === "Enter")) {
              e.preventDefault();
              setText(matches[pick].text);
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          onPaste={(e) => {
            const f = [...e.clipboardData.files][0];
            if (f) { e.preventDefault(); setFile(f); }
          }}
          placeholder={file ? "Legenda (opcional)…" : "Mensagem…  ( / respostas rápidas )"}
          className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none [field-sizing:content]"
        />
        <button onClick={() => setManage(true)} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" title="Respostas rápidas" aria-label="Respostas rápidas">
          <Zap className="size-5" />
        </button>
        <button
          onClick={send}
          disabled={pending || (!text.trim() && !file)}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm transition disabled:opacity-40"
          aria-label="Enviar"
        >
          <Send className="size-4" />
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      {manage && <QuickRepliesManager items={quickReplies} onClose={() => setManage(false)} onChanged={onQuickRepliesChanged} onUse={(t) => { setText(t); setManage(false); taRef.current?.focus(); }} />}
    </div>
  );
}

function QuickRepliesManager({ items, onClose, onChanged, onUse }: { items: QuickReply[]; onClose: () => void; onChanged: () => void; onUse: (text: string) => void }) {
  const [shortcut, setShortcut] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4" onMouseDown={onClose}>
      <div className="animate-fade-up flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-lift" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold"><Settings2 className="size-5 text-brand-500" /> Respostas rápidas</div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100" aria-label="Fechar"><X className="size-4" /></button>
        </div>
        <p className="mb-4 text-sm text-zinc-500">Digite <b>/atalho</b> na conversa para usar. Valem para todos da conta.</p>
        <div className="-mx-1 mb-4 flex-1 space-y-1.5 overflow-y-auto px-1">
          {items.map((q) => (
            <div key={q.id} className="group flex items-start gap-3 rounded-xl px-3 py-2 ring-1 ring-zinc-200/70 hover:bg-zinc-50">
              <button onClick={() => onUse(q.text)} className="flex flex-1 items-start gap-3 text-left text-sm">
                <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">/{q.shortcut}</span>
                <span className="line-clamp-2 text-zinc-600">{q.text}</span>
              </button>
              <button
                onClick={() => start(async () => { await deleteQuickReplyAction(q.id); onChanged(); })}
                className="text-zinc-300 opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
                aria-label="Excluir"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-zinc-400">Nenhuma resposta rápida ainda.</p>}
        </div>
        <div className="space-y-2 border-t border-zinc-100 pt-4">
          <input value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="Atalho (ex.: pix)" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Texto da resposta" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            disabled={pending}
            onClick={() => start(async () => {
              const r = await saveQuickReplyAction(shortcut, text);
              if (r.error) return setError(r.error);
              setShortcut(""); setText(""); setError(null); onChanged();
            })}
            className="w-full rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Salvar resposta rápida
          </button>
        </div>
      </div>
    </div>
  );
}
