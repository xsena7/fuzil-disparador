import { env } from "./env";

/** Erro retornado pela Graph API, com o código da Meta preservado. */
export class MetaError extends Error {
  constructor(
    message: string,
    public code: number | null,
    public subcode: number | null,
    public httpStatus: number,
    public details?: string,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | undefined>;

async function graph<T>(
  token: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  opts: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const url = new URL(`${env.metaGraphUrl()}/${env.metaGraphVersion()}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new MetaError(`Resposta inválida da Meta (${res.status})`, null, null, res.status, text.slice(0, 500));
  }
  if (!res.ok || json.error) {
    const e = json.error ?? {};
    throw new MetaError(
      e.error_user_msg || e.message || `Erro ${res.status} da Meta`,
      e.code ?? null,
      e.error_subcode ?? null,
      res.status,
      e.error_data?.details ?? e.error_user_title,
    );
  }
  return json as T;
}

async function paginate<T>(token: string, path: string, query: Query): Promise<T[]> {
  const out: T[] = [];
  let after: string | undefined;
  for (let page = 0; page < 50; page++) {
    const res = await graph<{ data: T[]; paging?: { cursors?: { after?: string }; next?: string } }>(token, "GET", path, {
      query: { ...query, after },
    });
    out.push(...res.data);
    after = res.paging?.cursors?.after;
    if (!res.paging?.next || !after) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type MetaWaba = {
  id: string;
  name: string;
  currency?: string;
  timezone_id?: string;
  account_review_status?: string;
  owner_business_info?: { id: string; name: string };
  health_status?: { can_send_message?: string };
};

export type MetaPhone = {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  messaging_limit_tier?: string;
  whatsapp_business_manager_messaging_limit?: string;
  status?: string;
  name_status?: string;
  throughput?: { level?: string };
  platform_type?: string;
  is_on_biz_app?: boolean;
};

export type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  category: string;
  previous_category?: string;
  status: string;
  rejected_reason?: string;
  quality_score?: { score?: string };
  components: TemplateComponent[];
};

export type TemplateComponent = {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION";
  text?: string;
  example?: Record<string, unknown>;
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string; example?: string[] }>;
};

// ---------------------------------------------------------------------------
// WABA / números / BM
// ---------------------------------------------------------------------------

export const meta = {
  getWaba(token: string, wabaId: string) {
    return graph<MetaWaba>(token, "GET", wabaId, {
      query: { fields: "id,name,currency,timezone_id,account_review_status,owner_business_info,health_status" },
    });
  },

  getBusiness(token: string, businessId: string) {
    return graph<{ id: string; name: string; verification_status?: string }>(token, "GET", businessId, {
      query: { fields: "id,name,verification_status" },
    });
  },

  listPhones(token: string, wabaId: string) {
    return paginate<MetaPhone>(token, `${wabaId}/phone_numbers`, {
      fields:
        "id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,whatsapp_business_manager_messaging_limit,status,name_status,throughput,platform_type,is_on_biz_app",
      limit: 100,
    });
  },

  /**
   * Inscreve o app na WABA. Com `override`, os eventos DESSA WABA vão para a nossa URL,
   * sem mexer no webhook padrão do app (que pode estar sendo usado por outro sistema).
   */
  subscribeApp(token: string, wabaId: string, override?: { callbackUrl: string; verifyToken: string }) {
    return graph<{ success: boolean }>(token, "POST", `${wabaId}/subscribed_apps`, {
      body: override ? { override_callback_uri: override.callbackUrl, verify_token: override.verifyToken } : undefined,
    });
  },

  registerPhone(token: string, phoneNumberId: string, pin: string) {
    return graph<{ success: boolean }>(token, "POST", `${phoneNumberId}/register`, {
      body: { messaging_product: "whatsapp", pin },
    });
  },

  // -------------------------------------------------------------------------
  // Templates
  // -------------------------------------------------------------------------

  listTemplates(token: string, wabaId: string) {
    return paginate<MetaTemplate>(token, `${wabaId}/message_templates`, {
      fields: "id,name,language,category,previous_category,status,rejected_reason,quality_score,components",
      limit: 100,
    });
  },

  createTemplate(
    token: string,
    wabaId: string,
    body: { name: string; language: string; category: "UTILITY"; components: TemplateComponent[] },
  ) {
    return graph<{ id: string; status: string; category: string }>(token, "POST", `${wabaId}/message_templates`, { body });
  },

  deleteTemplate(token: string, wabaId: string, name: string) {
    return graph<{ success: boolean }>(token, "DELETE", `${wabaId}/message_templates`, { query: { name } });
  },

  /** Upload resumável: retorna o "handle" usado como exemplo de mídia no template. */
  async uploadSampleMedia(token: string, file: Buffer, fileName: string, mimeType: string): Promise<string> {
    const appId = env.metaAppId();
    if (!appId) throw new MetaError("META_APP_ID não configurado", null, null, 0);
    const session = await graph<{ id: string }>(token, "POST", `${appId}/uploads`, {
      query: { file_name: fileName, file_length: file.length, file_type: mimeType },
    });
    const res = await fetch(`${env.metaGraphUrl()}/${env.metaGraphVersion()}/${session.id}`, {
      method: "POST",
      headers: { Authorization: `OAuth ${token}`, file_offset: "0" },
      body: new Uint8Array(file),
    });
    const json: any = await res.json();
    if (!res.ok || !json.h) throw new MetaError(json.error?.message ?? "Falha no upload da mídia", json.error?.code ?? null, null, res.status);
    return json.h as string;
  },

  // -------------------------------------------------------------------------
  // Mensagens
  // -------------------------------------------------------------------------

  sendTemplate(
    token: string,
    phoneNumberId: string,
    to: string,
    template: { name: string; language: string; components: unknown[] },
  ) {
    return graph<{ messages: Array<{ id: string; message_status?: string }> }>(token, "POST", `${phoneNumberId}/messages`, {
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: { name: template.name, language: { code: template.language }, components: template.components },
      },
    });
  },

  // -------------------------------------------------------------------------
  // Embedded Signup
  // -------------------------------------------------------------------------

  async exchangeCode(code: string): Promise<string> {
    const url = new URL(`${env.metaGraphUrl()}/${env.metaGraphVersion()}/oauth/access_token`);
    url.searchParams.set("client_id", env.metaAppId());
    url.searchParams.set("client_secret", env.metaAppSecret());
    url.searchParams.set("code", code);
    const res = await fetch(url);
    const json: any = await res.json();
    if (!res.ok || !json.access_token) throw new MetaError(json.error?.message ?? "Falha ao trocar o código", json.error?.code ?? null, null, res.status);
    return json.access_token as string;
  },
};
