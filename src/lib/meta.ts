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
  health_status?: {
    can_send_message?: string;
    entities?: Array<{ entity_type?: string; id?: string; can_send_message?: string; errors?: Array<{ error_code?: number; error_description?: string; possible_solution?: string }> }>;
  };
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
  account_mode?: string; // SANDBOX = número de teste da Meta
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
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string; example?: string[]; otp_type?: string }>;
  // Template de código (AUTHENTICATION)
  add_security_recommendation?: boolean;
  code_expiration_minutes?: number;
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

  /** Se a WABA tem forma de pagamento. null quando a Meta não informa. */
  async wabaHasPayment(token: string, wabaId: string): Promise<boolean | null> {
    return graph<{ primary_funding_id?: string }>(token, "GET", wabaId, { query: { fields: "primary_funding_id" } })
      .then((r) => Boolean(r.primary_funding_id))
      .catch(() => null);
  },

  getBusiness(token: string, businessId: string) {
    return graph<{ id: string; name: string; verification_status?: string }>(token, "GET", businessId, {
      query: { fields: "id,name,verification_status" },
    });
  },

  async listPhones(token: string, wabaId: string) {
    const base =
      "id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,whatsapp_business_manager_messaging_limit,status,name_status,throughput,platform_type,is_on_biz_app";
    // account_mode diz se é número de teste; se a Meta recusar o campo, busca sem ele
    return paginate<MetaPhone>(token, `${wabaId}/phone_numbers`, { fields: `${base},account_mode`, limit: 100 }).catch(() =>
      paginate<MetaPhone>(token, `${wabaId}/phone_numbers`, { fields: base, limit: 100 }),
    );
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

  /** Id do app dono do token (conexão manual usa o app da própria BM). */
  appIdOf(token: string) {
    return graph<{ id: string }>(token, "GET", "app", { query: { fields: "id" } }).then((a) => a.id);
  },

  /**
   * Liga o webhook do WhatsApp no app (o mesmo que preencher Callback URL, Verify token e assinar os campos no painel).
   * Usa o token do próprio app (app_id|app_secret).
   */
  setAppWebhook(appId: string, appSecret: string, callbackUrl: string, verifyToken: string, fields: string[]) {
    return graph<{ success: boolean }>(`${appId}|${appSecret}`, "POST", `${appId}/subscriptions`, {
      body: { object: "whatsapp_business_account", callback_url: callbackUrl, verify_token: verifyToken, fields: fields.join(",") },
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
    body: { name: string; language: string; category: "UTILITY" | "AUTHENTICATION"; components: TemplateComponent[] },
  ) {
    return graph<{ id: string; status: string; category: string }>(token, "POST", `${wabaId}/message_templates`, { body });
  },

  /** Com `hsmId` apaga só aquele idioma; sem ele, a Meta apaga todos os idiomas com esse nome. */
  deleteTemplate(token: string, wabaId: string, name: string, hsmId?: string) {
    return graph<{ success: boolean }>(token, "DELETE", `${wabaId}/message_templates`, { query: { name, hsm_id: hsmId } });
  },

  /** Upload resumável: retorna o "handle" usado como exemplo de mídia no template. */
  async uploadSampleMedia(token: string, file: Buffer, fileName: string, mimeType: string): Promise<string> {
    // O upload tem que ir para o app DONO do token (conexões manuais usam o app da própria BM)
    const appId = (await graph<{ id: string }>(token, "GET", "app", { query: { fields: "id" } }).then((a) => a.id).catch(() => null)) || env.metaAppId();
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

  /**
   * Checagem de números: diz se cada número tem WhatsApp (valid) ou não (invalid).
   * Até 100 números por chamada. Usa o número da própria conta como remetente da checagem.
   */
  checkContacts(token: string, phoneNumberId: string, phones: string[]) {
    return graph<{ contacts: Array<{ input: string; status: "valid" | "invalid"; wa_id?: string }> }>(token, "POST", `${phoneNumberId}/contacts`, {
      body: { blocking: "wait", contacts: phones, force_check: true },
    });
  },

  /** Diagnóstico: o token enxerga o template por esse nome? (lista da WABA filtrada pelo nome) */
  /** Saúde do número: a Meta devolve a WABA, a BM e o app ligados a ele, e se cada um pode enviar. */
  phoneHealth(token: string, phoneNumberId: string) {
    return graph<{ id: string; display_phone_number?: string; status?: string; platform_type?: string; health_status?: { can_send_message?: string; entities?: Array<{ entity_type: string; id: string; can_send_message?: string; errors?: unknown[] }> } }>(
      token,
      "GET",
      phoneNumberId,
      { query: { fields: "display_phone_number,status,platform_type,health_status" } },
    );
  },

  findTemplates(token: string, wabaId: string, name: string) {
    return graph<{ data: Array<{ id: string; name: string; language: string; status: string; category: string; waba_id?: string }> }>(token, "GET", `${wabaId}/message_templates`, {
      query: { name, fields: "id,name,language,status,category" },
    });
  },

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

  /** Mensagem livre (só dentro da janela de 24h depois que o contato falou com a gente). */
  sendText(token: string, phoneNumberId: string, to: string, body: string, replyTo?: string) {
    return graph<{ messages: Array<{ id: string }> }>(token, "POST", `${phoneNumberId}/messages`, {
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body, preview_url: true },
        ...(replyTo ? { context: { message_id: replyTo } } : {}),
      },
    });
  },

  /** Imagem, vídeo, áudio ou documento por link público. */
  sendMedia(token: string, phoneNumberId: string, to: string, kind: "image" | "video" | "audio" | "document", link: string, caption?: string, filename?: string) {
    const media: Record<string, string> = { link };
    if (caption && kind !== "audio") media.caption = caption;
    if (filename && kind === "document") media.filename = filename;
    return graph<{ messages: Array<{ id: string }> }>(token, "POST", `${phoneNumberId}/messages`, {
      body: { messaging_product: "whatsapp", recipient_type: "individual", to, type: kind, [kind]: media },
    });
  },

  /** Marca a mensagem recebida como lida (os tracinhos azuis para o cliente). */
  markRead(token: string, phoneNumberId: string, wamid: string) {
    return graph<{ success: boolean }>(token, "POST", `${phoneNumberId}/messages`, {
      body: { messaging_product: "whatsapp", status: "read", message_id: wamid },
    });
  },

  /** URL temporária de uma mídia recebida. */
  getMedia(token: string, mediaId: string) {
    return graph<{ url: string; mime_type: string; file_size?: number }>(token, "GET", mediaId);
  },

  async downloadMedia(token: string, url: string): Promise<Buffer> {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new MetaError(`Falha ao baixar mídia (${res.status})`, null, null, res.status);
    return Buffer.from(await res.arrayBuffer());
  },

  // -------------------------------------------------------------------------
  // Embedded Signup
  // -------------------------------------------------------------------------

  /**
   * Contas do WhatsApp (WABAs) que um token de usuário do sistema enxerga, para conectar sem digitar o ID.
   * 1) debug_token com o token do app do Fuzil (app_id|chave secreta): é o jeito que a Meta responde para token de outra BM;
   * 2) debug_token com o próprio token; 3) BMs do usuário → contas próprias e de clientes.
   * `why` = o motivo que a Meta deu, quando não achou nada.
   */
  async wabaIdsOfSystemToken(token: string, appSecrets: Record<string, string> = {}): Promise<{ ids: string[]; why?: string }> {
    const ids = new Set<string>();
    const errors: string[] = [];
    const scopes = (d: { data?: { granular_scopes?: Array<{ scope: string; target_ids?: string[] }>; error?: { message?: string } } }) => {
      for (const s of d.data?.granular_scopes ?? []) if (s.scope === "whatsapp_business_management") for (const t of s.target_ids ?? []) ids.add(t);
    };
    const debug = async (accessToken: string) => {
      const url = new URL(`${env.metaGraphUrl()}/${env.metaGraphVersion()}/debug_token`);
      url.searchParams.set("input_token", token);
      url.searchParams.set("access_token", accessToken);
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      const json = (await res.json().catch(() => ({}))) as { data?: { granular_scopes?: Array<{ scope: string; target_ids?: string[] }>; error?: { message?: string } }; error?: { message?: string } };
      if (json.error?.message) errors.push(json.error.message);
      if (json.data?.error?.message) errors.push(json.data.error.message);
      scopes(json);
    };
    // 1) Com o token do app que gerou o token do cliente (o app do Fuzil)
    const appId = await graph<{ id: string }>(token, "GET", "app", { query: { fields: "id" } })
      .then((a) => a.id)
      .catch((e) => {
        errors.push(e instanceof Error ? e.message : String(e));
        return null;
      });
    const secret = appId ? appSecrets[appId] ?? (appId === env.metaAppId() ? env.metaAppSecret() : "") : "";
    if (appId && secret) await debug(`${appId}|${secret}`).catch((e) => errors.push(String(e)));
    // 2) Com o próprio token
    if (!ids.size) await debug(token).catch((e) => errors.push(String(e)));
    // 3) Pelas BMs do usuário do sistema
    if (!ids.size) {
      try {
        const bms = await graph<{ data: Array<{ id: string }> }>(token, "GET", "me/businesses", { query: { fields: "id", limit: 50 } });
        for (const b of bms.data ?? []) {
          for (const edge of ["owned_whatsapp_business_accounts", "client_whatsapp_business_accounts"]) {
            const r = await graph<{ data: Array<{ id: string }> }>(token, "GET", `${b.id}/${edge}`, { query: { fields: "id", limit: 100 } }).catch((e) => {
              errors.push(e instanceof Error ? e.message : String(e));
              return { data: [] };
            });
            for (const w of r.data ?? []) ids.add(w.id);
          }
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    return { ids: [...ids], why: ids.size ? undefined : errors[0] };
  },

  /** WABAs liberadas para um token (usado quando o evento do cadastro não trouxe o waba_id). */
  async wabaIdsFromToken(token: string): Promise<string[]> {
    const url = new URL(`${env.metaGraphUrl()}/${env.metaGraphVersion()}/debug_token`);
    url.searchParams.set("input_token", token);
    url.searchParams.set("access_token", `${env.metaAppId()}|${env.metaAppSecret()}`);
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const json: any = await res.json().catch(() => ({}));
    const scopes: Array<{ scope: string; target_ids?: string[] }> = json?.data?.granular_scopes ?? [];
    return [...new Set(scopes.filter((s) => s.scope === "whatsapp_business_management").flatMap((s) => s.target_ids ?? []))];
  },

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
