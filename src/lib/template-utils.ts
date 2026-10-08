// Funções puras (usadas no servidor e no navegador) para lidar com componentes de template.

export type TComponent = {
  type: string;
  format?: string;
  text?: string;
  example?: Record<string, unknown>;
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string; example?: string[] }>;
};

export type VarSource =
  | { type: "field"; field: string } // firstName | name | phone | email | col:<coluna>
  | { type: "fixed"; value: string };

export type VariableMapping = {
  header?: VarSource[];
  body?: VarSource[];
  /** Sufixo fixo para botões de URL que NÃO usam o redirecionador (índice do botão → valor). */
  buttons?: Record<string, VarSource>;
};

export type RecipientLike = { phone: string; name?: string | null; data?: Record<string, unknown> | null };

const VAR_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

export function extractVars(text?: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const m of text.matchAll(VAR_RE)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

export function getComponent(components: TComponent[], type: string) {
  return components.find((c) => c.type.toUpperCase() === type);
}

export type TemplateShape = {
  headerFormat: string | null;
  headerVars: string[];
  bodyVars: string[];
  urlButtons: Array<{ index: number; text: string; url: string; dynamic: boolean; tracked: boolean }>;
  namedParams: boolean;
};

export function isTrackedUrl(url: string, redirectDomain: string) {
  const base = url.replace(/^https?:\/\//, "").replace(/\{\{\s*1\s*\}\}$/, "").replace(/\/$/, "");
  const dom = redirectDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return url.includes("{{1}}") && (base === dom || base === `${dom}/r`);
}

export function templateShape(components: TComponent[], redirectDomain: string): TemplateShape {
  const header = getComponent(components, "HEADER");
  const body = getComponent(components, "BODY");
  const buttons = getComponent(components, "BUTTONS")?.buttons ?? [];
  const bodyVars = extractVars(body?.text);
  return {
    headerFormat: header?.format ?? null,
    headerVars: header?.format === "TEXT" ? extractVars(header.text) : [],
    bodyVars,
    urlButtons: buttons
      .map((b, index) => ({ b, index }))
      .filter(({ b }) => b.type === "URL")
      .map(({ b, index }) => ({
        index,
        text: b.text,
        url: b.url ?? "",
        dynamic: (b.url ?? "").includes("{{"),
        tracked: isTrackedUrl(b.url ?? "", redirectDomain),
      })),
    namedParams: bodyVars.some((v) => !/^\d+$/.test(v)),
  };
}

export function firstName(name?: string | null): string {
  const first = String(name ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function resolveSource(src: VarSource | undefined, r: RecipientLike): string {
  if (!src) return "";
  if (src.type === "fixed") return src.value;
  const data = (r.data ?? {}) as Record<string, unknown>;
  switch (src.field) {
    case "firstName":
      return firstName(r.name);
    case "name":
      return String(r.name ?? "");
    case "phone":
      return r.phone;
    case "email":
      return String(data.email ?? "");
    default:
      if (src.field.startsWith("col:")) return String(data[src.field.slice(4)] ?? "");
      return "";
  }
}

/** A Meta rejeita parâmetros vazios ou com quebras de linha/tabs/4+ espaços. */
export function sanitizeParam(value: string, fallback = "-"): string {
  const v = value.replace(/[\n\r\t]+/g, " ").replace(/ {4,}/g, "   ").trim();
  return v || fallback;
}

export function buildSendComponents(
  components: TComponent[],
  mapping: VariableMapping,
  r: RecipientLike,
  opts: { redirectDomain: string; clickToken: string; headerMediaUrl?: string | null; headerMediaName?: string | null },
): unknown[] {
  const shape = templateShape(components, opts.redirectDomain);
  const out: unknown[] = [];

  if (shape.headerFormat && ["IMAGE", "VIDEO", "DOCUMENT"].includes(shape.headerFormat) && opts.headerMediaUrl) {
    const kind = shape.headerFormat.toLowerCase();
    const media: Record<string, string> = { link: opts.headerMediaUrl };
    if (kind === "document" && opts.headerMediaName) media.filename = opts.headerMediaName;
    out.push({ type: "header", parameters: [{ type: kind, [kind]: media }] });
  } else if (shape.headerVars.length) {
    out.push({
      type: "header",
      parameters: shape.headerVars.map((name, i) => ({
        type: "text",
        text: sanitizeParam(resolveSource(mapping.header?.[i], r)),
        ...(shape.namedParams ? { parameter_name: name } : {}),
      })),
    });
  }

  if (shape.bodyVars.length) {
    out.push({
      type: "body",
      parameters: shape.bodyVars.map((name, i) => ({
        type: "text",
        text: sanitizeParam(resolveSource(mapping.body?.[i], r)),
        ...(shape.namedParams ? { parameter_name: name } : {}),
      })),
    });
  }

  for (const b of shape.urlButtons) {
    if (!b.dynamic) continue;
    const text = b.tracked ? opts.clickToken : sanitizeParam(resolveSource(mapping.buttons?.[String(b.index)], r));
    out.push({ type: "button", sub_type: "url", index: String(b.index), parameters: [{ type: "text", text }] });
  }

  return out;
}

/** Texto do corpo com as variáveis preenchidas (para pré-visualização). */
export function renderText(text: string | undefined, sources: VarSource[] | undefined, r: RecipientLike, placeholder = true) {
  if (!text) return "";
  const vars = extractVars(text);
  return text.replace(VAR_RE, (_m, name) => {
    const i = vars.indexOf(name);
    const value = resolveSource(sources?.[i], r);
    return value || (placeholder ? `{{${name}}}` : "");
  });
}
