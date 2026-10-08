"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createTemplateAction } from "@/app/actions/templates";
import { extractVars } from "@/lib/template-utils";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { WhatsAppPreview } from "@/components/whatsapp-preview";

type Btn = { type: "URL_TRACKED" | "URL" | "QUICK_REPLY" | "PHONE_NUMBER"; text: string; url?: string; phone?: string };

export function TemplateBuilder({
  groups,
  wabas,
  redirectDomain,
  defaultBlueprint = false,
}: {
  groups: Array<{ id: string; name: string }>;
  wabas: Array<{ id: string; label: string }>;
  redirectDomain: string;
  defaultBlueprint?: boolean;
}) {
  const [state, action, pending] = useActionState(createTemplateAction, undefined);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("pt_BR");
  const [headerType, setHeaderType] = useState("NONE");
  const [headerText, setHeaderText] = useState("");
  const [headerExample, setHeaderExample] = useState("");
  const [body, setBody] = useState("");
  const [bodyExamples, setBodyExamples] = useState<string[]>([]);
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState<Btn[]>([]);
  const [target, setTarget] = useState<"GROUP" | "ALL" | "WABAS">(groups.length ? "GROUP" : "ALL");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [wabaIds, setWabaIds] = useState<string[]>([]);
  const [asBlueprint, setAsBlueprint] = useState(defaultBlueprint);
  const [samplePreview, setSamplePreview] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const vars = useMemo(() => extractVars(body), [body]);
  const payload = JSON.stringify({ name, language, headerType, headerText, headerExample, body, bodyExamples, footer, buttons, target, groupId, wabaIds, asBlueprint });

  function addVar() {
    const next = `{{${vars.filter((v) => /^\d+$/.test(v)).length + 1}}}`;
    const el = bodyRef.current;
    const pos = el?.selectionStart ?? body.length;
    setBody(body.slice(0, pos) + next + body.slice(pos));
  }

  function wrap(mark: string) {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    setBody(body.slice(0, s) + mark + body.slice(s, e) + mark + body.slice(e));
  }

  const setBtn = (i: number, patch: Partial<Btn>) => setButtons(buttons.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <input type="hidden" name="payload" value={payload} />
      <div className="space-y-5">
        <Card className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Nome do template" hint="Minúsculas, números e _">
              <Input value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} required />
            </Field>
            <Field label="Categoria" hint="Só criamos templates de utilidade">
              <Input value="Utilidade" disabled />
            </Field>
            <Field label="Idioma">
              <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="pt_BR">Português (BR)</option>
                <option value="en_US">Inglês (EUA)</option>
                <option value="es">Espanhol</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <div className="font-semibold">Cabeçalho</div>
          <Select value={headerType} onChange={(e) => setHeaderType(e.target.value)}>
            <option value="NONE">Sem cabeçalho</option>
            <option value="TEXT">Texto</option>
            <option value="IMAGE">Imagem</option>
            <option value="VIDEO">Vídeo</option>
            <option value="DOCUMENT">Documento</option>
          </Select>
          {headerType === "TEXT" && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Texto do cabeçalho"><Input value={headerText} maxLength={60} onChange={(e) => setHeaderText(e.target.value)} /></Field>
              {extractVars(headerText).length > 0 && <Field label="Exemplo da variável"><Input value={headerExample} onChange={(e) => setHeaderExample(e.target.value)} /></Field>}
            </div>
          )}
          {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) && (
            <Field label="Arquivo de exemplo" hint="A Meta exige um exemplo para análise. Na campanha você escolhe a mídia real.">
              <Input
                type="file"
                name="sample"
                accept={headerType === "IMAGE" ? "image/jpeg,image/png" : headerType === "VIDEO" ? "video/mp4" : "application/pdf"}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setSamplePreview(f && headerType === "IMAGE" ? URL.createObjectURL(f) : null);
                }}
              />
            </Field>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <div className="flex-1 font-semibold">Corpo da mensagem</div>
            <Button type="button" variant="secondary" className="px-2.5 py-1" onClick={() => wrap("*")}><b>B</b></Button>
            <Button type="button" variant="secondary" className="px-2.5 py-1" onClick={() => wrap("_")}><i>I</i></Button>
            <Button type="button" variant="secondary" className="py-1" onClick={addVar}><Plus className="size-4" /> Variável</Button>
          </div>
          <Textarea ref={bodyRef} rows={8} value={body} maxLength={1024} onChange={(e) => setBody(e.target.value)} placeholder={"Olá {{1}}, informamos uma atualização no seu pedido {{2}}."} />
          {vars.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {vars.map((v, i) => (
                <Field key={v} label={`Exemplo para {{${v}}}`}>
                  <Input value={bodyExamples[i] ?? ""} onChange={(e) => { const n = [...bodyExamples]; n[i] = e.target.value; setBodyExamples(n); }} placeholder="Ex.: Maria" />
                </Field>
              ))}
            </div>
          )}
          <Field label="Rodapé (opcional)"><Input value={footer} maxLength={60} onChange={(e) => setFooter(e.target.value)} /></Field>
        </Card>

        <Card className="space-y-3 p-5">
          <div className="flex items-center">
            <div className="flex-1 font-semibold">Botões</div>
            <Button type="button" variant="secondary" className="py-1" onClick={() => setButtons([...buttons, { type: "URL_TRACKED", text: "Detalhes" }])} disabled={buttons.length >= 10}>
              <Plus className="size-4" /> Botão
            </Button>
          </div>
          {buttons.map((b, i) => (
            <div key={i} className="grid items-end gap-3 rounded-lg border border-zinc-200 p-3 md:grid-cols-[180px_1fr_1fr_auto]">
              <Field label="Tipo">
                <Select value={b.type} onChange={(e) => setBtn(i, { type: e.target.value as Btn["type"] })}>
                  <option value="URL_TRACKED">Link rastreado</option>
                  <option value="URL">Link fixo</option>
                  <option value="QUICK_REPLY">Resposta rápida</option>
                  <option value="PHONE_NUMBER">Ligar</option>
                </Select>
              </Field>
              <Field label="Texto do botão"><Input value={b.text} maxLength={25} onChange={(e) => setBtn(i, { text: e.target.value })} /></Field>
              {b.type === "URL_TRACKED" && <Field label="URL aprovada na Meta"><Input value={`https://${redirectDomain}/{{1}}`} disabled /></Field>}
              {b.type === "URL" && <Field label="URL"><Input value={b.url ?? ""} onChange={(e) => setBtn(i, { url: e.target.value })} placeholder="https://..." /></Field>}
              {b.type === "PHONE_NUMBER" && <Field label="Telefone"><Input value={b.phone ?? ""} onChange={(e) => setBtn(i, { phone: e.target.value })} placeholder="+5511999999999" /></Field>}
              {b.type === "QUICK_REPLY" && <div />}
              <Button type="button" variant="ghost" className="text-red-600" onClick={() => setButtons(buttons.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
            </div>
          ))}
          {buttons.some((b) => b.type === "URL_TRACKED") && (
            <p className="text-xs text-zinc-500">Link rastreado: na campanha você cola o link de destino; cada pessoa recebe um link único, e o painel conta quem clicou.</p>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <div className="font-semibold">Onde subir</div>
          <div className="flex flex-wrap gap-4">
            {groups.length > 0 && <label className="flex items-center gap-2"><input type="radio" checked={target === "GROUP"} onChange={() => setTarget("GROUP")} /> Um grupo de BM</label>}
            <label className="flex items-center gap-2"><input type="radio" checked={target === "ALL"} onChange={() => setTarget("ALL")} /> Todas as BMs da conta</label>
            {!asBlueprint && <label className="flex items-center gap-2"><input type="radio" checked={target === "WABAS"} onChange={() => setTarget("WABAS")} /> WABAs específicas</label>}
          </div>
          {target === "GROUP" && (
            <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          )}
          {target === "WABAS" && !asBlueprint && (
            <div className="grid gap-2 md:grid-cols-2">
              {wabas.map((w) => (
                <label key={w.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
                  <input type="checkbox" checked={wabaIds.includes(w.id)} onChange={(e) => setWabaIds(e.target.checked ? [...wabaIds, w.id] : wabaIds.filter((x) => x !== w.id))} />
                  {w.label}
                </label>
              ))}
            </div>
          )}
          <label className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 p-3">
            <input type="checkbox" className="mt-0.5" checked={asBlueprint} onChange={(e) => { setAsBlueprint(e.target.checked); if (e.target.checked && target === "WABAS") setTarget("ALL"); }} />
            <span>
              <b>Salvar como template padrão</b>
              <span className="block text-zinc-600">Sobe automaticamente em toda BM do escopo, inclusive nas que forem conectadas depois. Se a Meta recategorizar para marketing, a cópia é excluída e você é avisado.</span>
            </span>
          </label>
        </Card>

        <div className="flex items-center gap-3">
          <Button disabled={pending}>{pending ? "Enviando para a Meta..." : asBlueprint ? "Criar template padrão" : "Enviar para análise"}</Button>
          {state?.error && <span className="text-red-600">{state.error}</span>}
          {state?.ok && <span className="text-emerald-700">{state.ok}</span>}
        </div>
      </div>
      <div className="lg:sticky lg:top-8 lg:self-start">
        <div className="mb-2 font-medium">Pré-visualização</div>
        <WhatsAppPreview data={{ headerType, headerText, headerMediaUrl: samplePreview, body: body.replace(/\{\{(\w+)\}\}/g, (m, v) => bodyExamples[vars.indexOf(v)] || m), footer, buttons }} />
      </div>
    </form>
  );
}
