"use client";

import { useActionState, useState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { WhatsAppPreview } from "@/components/whatsapp-preview";
import { renderText, templateShape, type TComponent, type VarSource, type VariableMapping } from "@/lib/template-utils";
import type { FormState } from "@/app/actions/auth";

const BASE_FIELDS = [
  { value: "firstName", label: "Primeiro nome" },
  { value: "name", label: "Nome completo" },
  { value: "phone", label: "Telefone" },
  { value: "email", label: "E-mail" },
];

function SourceEditor({ label, value, onChange, fields, disabled }: { label: string; value: VarSource | undefined; onChange: (v: VarSource) => void; fields: Array<{ value: string; label: string }>; disabled: boolean }) {
  const src = value ?? { type: "field", field: "firstName" };
  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 font-mono text-xs text-emerald-700">{label}</span>
        <div className="ml-auto flex gap-1">
          <Button type="button" variant={src.type === "field" ? "primary" : "secondary"} className="px-2 py-1 text-xs" disabled={disabled} onClick={() => onChange({ type: "field", field: "firstName" })}>Dado do cliente</Button>
          <Button type="button" variant={src.type === "fixed" ? "primary" : "secondary"} className="px-2 py-1 text-xs" disabled={disabled} onClick={() => onChange({ type: "fixed", value: "" })}>Texto fixo</Button>
        </div>
      </div>
      {src.type === "field" ? (
        <Select value={src.field} disabled={disabled} onChange={(e) => onChange({ type: "field", field: e.target.value })}>
          {fields.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </Select>
      ) : (
        <Input value={src.value} disabled={disabled} onChange={(e) => onChange({ type: "fixed", value: e.target.value })} placeholder="Texto que todos vão receber" />
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
  const shape = templateShape(components, redirectDomain);
  const [mapping, setMapping] = useState<VariableMapping>({
    header: shape.headerVars.map((_, i) => initial.header?.[i] ?? { type: "field", field: "firstName" }),
    body: shape.bodyVars.map((_, i) => initial.body?.[i] ?? (i === 0 ? { type: "field", field: "firstName" } : { type: "fixed", value: "" })),
    buttons: initial.buttons ?? {},
  });
  const [url, setUrl] = useState(buttonUrl);
  const [preview, setPreview] = useState<string | null>(mediaUrl);
  const fields = [...BASE_FIELDS, ...columns.map((c) => ({ value: `col:${c}`, label: `Planilha: ${c}` }))];
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
              <SourceEditor key={`h${v}`} label={`Cabeçalho {{${v}}}`} value={mapping.header?.[i]} fields={fields} disabled={locked}
                onChange={(src) => setMapping({ ...mapping, header: mapping.header!.map((x, j) => (j === i ? src : x)) })} />
            ))}
            {shape.bodyVars.map((v, i) => (
              <SourceEditor key={`b${v}`} label={`{{${v}}}`} value={mapping.body?.[i]} fields={fields} disabled={locked}
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
            </Card>
          ) : b.dynamic ? (
            <SourceEditor key={b.index} label={`Botão "${b.text}" (sufixo da URL)`} value={mapping.buttons?.[String(b.index)]} fields={fields} disabled={locked}
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
