"use client";

import { toast } from "@/components/toast";
import { useActionState, useState, useEffect } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { WhatsAppPreview } from "@/components/whatsapp-preview";
import { fillUrlVars, renderText, resolveSource, templateShape, type TComponent, type VarSource, type VariableMapping } from "@/lib/template-utils";
import type { FormState } from "@/app/actions/auth";

const BASE_FIELDS = [
  { value: "firstName", label: "Primeiro nome" },
  { value: "name", label: "Nome completo" },
  { value: "phone", label: "Telefone" },
  { value: "email", label: "E-mail" },
];

type SheetCol = { key: string; example: string };

function SourceEditor({
  label,
  value,
  onChange,
  fields,
  disabled,
  cols = [],
  sample,
}: {
  label: string;
  value: VarSource | undefined;
  onChange: (v: VarSource) => void;
  fields: Array<{ value: string; label: string }>;
  disabled: boolean;
  cols?: SheetCol[];
  sample?: { phone: string; name: string | null; data: Record<string, unknown> };
}) {
  const src = value ?? { type: "field", field: "firstName" };
  const fromSheet = src.type === "field" && (src.field.startsWith("col:") || src.field.startsWith("first:"));
  const mode = src.type === "fixed" ? "fixed" : fromSheet ? "sheet" : "client";
  const tab = (m: string, text: string, next: VarSource) => (
    <Button type="button" variant={mode === m ? "primary" : "secondary"} className="px-2 py-1 text-xs" disabled={disabled} onClick={() => onChange(next)}>
      {text}
    </Button>
  );
  const example = sample ? resolveSource(src, sample) : "";
  return (
    <Card className="p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 font-mono text-xs text-emerald-700">{label}</span>
        <div className="ml-auto flex flex-wrap gap-1">
          {tab("sheet", "Da planilha", { type: "field", field: cols[0] ? `col:${cols[0].key}` : "col:" })}
          {tab("client", "Dado do cliente", { type: "field", field: "firstName" })}
          {tab("fixed", "Texto fixo", { type: "fixed", value: "" })}
        </div>
      </div>
      {mode === "sheet" ? (
        cols.length ? (
          <Select value={src.type === "field" ? src.field : ""} disabled={disabled} onChange={(e) => onChange({ type: "field", field: e.target.value })}>
            <optgroup label="Coluna da planilha (como está)">
              {cols.map((c) => (
                <option key={`col:${c.key}`} value={`col:${c.key}`}>
                  {c.key.trim()}{c.example ? `  ·  ex.: ${c.example.slice(0, 40)}` : ""}
                </option>
              ))}
            </optgroup>
            <optgroup label="Só o primeiro nome da coluna">
              {cols.map((c) => (
                <option key={`first:${c.key}`} value={`first:${c.key}`}>
                  Primeiro nome de {c.key.trim()}{c.example ? `  ·  ex.: ${resolveSource({ type: "field", field: `first:${c.key}` }, { phone: "", data: { [c.key]: c.example } })}` : ""}
                </option>
              ))}
            </optgroup>
          </Select>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Suba a planilha na etapa <b>2. Audiência</b> e as colunas dela aparecem aqui.</p>
        )
      ) : mode === "client" ? (
        <Select value={src.type === "field" ? src.field : "firstName"} disabled={disabled} onChange={(e) => onChange({ type: "field", field: e.target.value })}>
          {fields.filter((f) => !f.value.startsWith("col:") && !f.value.startsWith("first:")).map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </Select>
      ) : (
        <>
          <Input value={src.type === "fixed" ? src.value : ""} disabled={disabled} onChange={(e) => onChange({ type: "fixed", value: e.target.value })} placeholder="Texto que todos vão receber" />
          {cols.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-zinc-500">Misturar com a planilha (clique para colocar no texto):</span>
              {cols.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const cur = src.type === "fixed" ? src.value : "";
                    onChange({ type: "fixed", value: `${cur}${cur && !cur.endsWith(" ") ? " " : ""}{{${c.key.trim()}}}` });
                  }}
                  className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {`{{${c.key.trim()}}}`}
                </button>
              ))}
            </div>
          )}
          <p className="mt-1 text-[11px] text-zinc-500">Ex.: <code>Olá {"{{nome}}"}, seu banco {"{{banco}}"}</code> — cada pessoa recebe com os dados da linha dela. A Meta não deixa pular linha dentro de variável: sai tudo numa linha só. Para cada item numa linha, ponha o texto no próprio template.</p>
        </>
      )}
      {sample && Object.keys(sample.data).length > 0 && (
        <p className="mt-2 truncate text-[11px] text-zinc-500">
          Vai sair assim (1ª linha da planilha): <b className="font-medium text-zinc-800">{example || "(vazio)"}</b>
        </p>
      )}
    </Card>
  );
}

export function StepContent({
  action,
  components,
  redirectDomain,
  mapping: initial,
  buttonUrl,
  mediaUrl,
  columns,
  sample,
  locked,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  components: TComponent[];
  redirectDomain: string;
  mapping: VariableMapping;
  buttonUrl: string;
  mediaUrl: string | null;
  columns: string[];
  sample: { phone: string; name: string | null; data: Record<string, unknown> };
  locked: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useEffect(() => { if (state?.error) toast("error", state.error); }, [state]);
  const shape = templateShape(components, redirectDomain);
  const [mapping, setMapping] = useState<VariableMapping>({
    header: shape.headerVars.map((_, i) => initial.header?.[i] ?? { type: "field", field: "firstName" }),
    body: shape.bodyVars.map((_, i) => initial.body?.[i] ?? (i === 0 ? { type: "field", field: "firstName" } : { type: "fixed", value: "" })),
    buttons: initial.buttons ?? {},
  });
  const [url, setUrl] = useState(buttonUrl);
  const [preview, setPreview] = useState<string | null>(mediaUrl);
  const cols: SheetCol[] = columns.map((c) => ({ key: c, example: String(sample.data?.[c] ?? "") }));
  const fields = [
    ...BASE_FIELDS,
    ...columns.map((c) => ({ value: `col:${c}`, label: `Planilha: ${c.trim()}` })),
    ...columns.map((c) => ({ value: `first:${c}`, label: `Planilha: primeiro nome de ${c.trim()}` })),
  ];
  const tracked = shape.urlButtons.find((b) => b.tracked);
  const needsMedia = Boolean(shape.headerFormat && ["IMAGE", "VIDEO", "DOCUMENT"].includes(shape.headerFormat));

  const header = components.find((c) => c.type === "HEADER");
  const bodyText = components.find((c) => c.type === "BODY")?.text;
  const footer = components.find((c) => c.type === "FOOTER")?.text;
  const buttons = components.find((c) => c.type === "BUTTONS")?.buttons ?? [];

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
      <input type="hidden" name="requiresButtonUrl" value={tracked ? "1" : "0"} />
      <input type="hidden" name="requiresMedia" value={needsMedia ? "1" : "0"} />
      <div className="lg:sticky lg:top-8 lg:self-start">
        <WhatsAppPreview
          data={{
            headerType: header?.format ?? null,
            headerText: header?.format === "TEXT" ? renderText(header.text, mapping.header, sample) : undefined,
            headerMediaUrl: preview,
            body: renderText(bodyText, mapping.body, sample),
            footer,
            buttons: buttons.map((b) => ({ type: b.type, text: b.text })),
          }}
        />
        <p className="mt-3 text-center text-xs text-zinc-500">Pré-visualização com {sample.name ? `o contato "${sample.name}"` : "um contato de exemplo"}.</p>
      </div>
      <div className="max-w-2xl space-y-5">
        <h2 className="text-lg font-semibold">Conteúdo</h2>
        {needsMedia && (
          <Card className="p-4">
            <div className="mb-1 font-medium">Mídia do cabeçalho ({shape.headerFormat === "IMAGE" ? "imagem JPEG/PNG até 5 MB" : shape.headerFormat === "VIDEO" ? "vídeo MP4 até 16 MB" : "PDF"})</div>
            <Input
              type="file"
              name="media"
              disabled={locked}
              accept={shape.headerFormat === "IMAGE" ? "image/jpeg,image/png" : shape.headerFormat === "VIDEO" ? "video/mp4" : "application/pdf"}
              onChange={(e) => { const f = e.target.files?.[0]; if (f && shape.headerFormat === "IMAGE") setPreview(URL.createObjectURL(f)); }}
            />
            {mediaUrl && <p className="mt-2 text-xs text-zinc-500">Já existe uma mídia salva. Envie outra só se quiser trocar.</p>}
          </Card>
        )}
        {(shape.headerVars.length > 0 || shape.bodyVars.length > 0) && (
          <div className="space-y-3">
            <div className="font-medium">Variáveis do template</div>
            {shape.headerVars.map((v, i) => (
              <SourceEditor key={`h${v}`} label={`Cabeçalho {{${v}}}`} value={mapping.header?.[i]} fields={fields} cols={cols} sample={sample} disabled={locked}
                onChange={(src) => setMapping({ ...mapping, header: mapping.header!.map((x, j) => (j === i ? src : x)) })} />
            ))}
            {shape.bodyVars.map((v, i) => (
              <SourceEditor key={`b${v}`} label={`{{${v}}}`} value={mapping.body?.[i]} fields={fields} cols={cols} sample={sample} disabled={locked}
                onChange={(src) => setMapping({ ...mapping, body: mapping.body!.map((x, j) => (j === i ? src : x)) })} />
            ))}
          </div>
        )}
        {shape.urlButtons.map((b) =>
          b.tracked ? (
            <Card key={b.index} className="p-4">
              <div className="mb-1 font-medium">Botão &quot;{b.text}&quot; — link rastreado</div>
              <div className="mb-2 font-mono text-xs text-zinc-500">{b.url}</div>
              <Field label="Cole a URL final completa" hint="Cada pessoa recebe um link único; o clique é contado e ela é redirecionada pra cá.">
                <Input name="buttonUrl" value={url} disabled={locked} onChange={(e) => setUrl(e.target.value)} placeholder="https://seusite.com.br/" />
              </Field>
              <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
                <b className="text-zinc-800">Quer mandar um dado da planilha junto no link?</b> Coloque o nome da coluna entre {"{{ }}"} (ou {"{ }"}). Ex.:{" "}
                <code className="rounded bg-white px-1">https://site.com/?cnpj={"{{var1}}"}</code>. Cada pessoa vai para o link com o dado dela.
                {columns.length > 0 && !locked && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="py-0.5">Colocar no fim do link:</span>
                    {columns.map((c) => (
                      <button key={c} type="button" onClick={() => setUrl(url + `{{${c.trim()}}}`)} className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 font-mono hover:border-brand-300 hover:bg-brand-50">
                        {`{{${c.trim()}}}`}
                      </button>
                    ))}
                  </div>
                )}
                {/\{/.test(url) && Object.keys(sample.data).length > 0 && <div className="mt-2">Exemplo com a 1ª linha da planilha: <span className="break-all font-mono text-zinc-800">{fillUrlVars(url, sample)}</span></div>}
              </div>
            </Card>
          ) : b.dynamic ? (
            <SourceEditor key={b.index} label={`Botão "${b.text}" (sufixo da URL)`} value={mapping.buttons?.[String(b.index)]} fields={fields} cols={cols} sample={sample} disabled={locked}
              onChange={(src) => setMapping({ ...mapping, buttons: { ...mapping.buttons, [String(b.index)]: src } })} />
          ) : null,
        )}
        {shape.urlButtons.some((b) => b.dynamic && !b.tracked) && (
          <p className="text-xs text-amber-700">Esse template tem botão de link que não usa o domínio de rastreio, então os cliques nele não são contados.</p>
        )}
        <div className="flex items-center gap-3">
          <Button disabled={pending || locked}>{pending ? "Salvando..." : "Continuar"}</Button>
          {state?.error && <span className="text-red-600">{state.error}</span>}
        </div>
      </div>
    </form>
  );
}
