import { cachedSetting } from "./settings-cache";

function opt(name: string, fallback = ""): string {
  return process.env[name] || fallback;
}

/** Valor salvo pelo painel (Admin) tem prioridade sobre o .env. */
function platform(name: string, fallback = ""): string {
  return cachedSetting(name) || process.env[name] || fallback;
}

export const env = {
  appUrl: () => opt("APP_URL", "http://localhost:3000").replace(/\/$/, ""),
  redirectDomain: () => opt("REDIRECT_DOMAIN", "localhost:3000"),
  encryptionKey: () => opt("ENCRYPTION_KEY"),
  uploadDir: () => opt("UPLOAD_DIR", "./uploads"),
  metaAppId: () => platform("META_APP_ID"),
  metaAppSecret: () => platform("META_APP_SECRET"),
  metaConfigId: () => platform("META_CONFIG_ID"),
  metaSystemToken: () => platform("META_SYSTEM_USER_TOKEN"),
  metaGraphVersion: () => platform("META_GRAPH_VERSION", "v23.0"),
  metaGraphUrl: () => opt("META_GRAPH_URL", "https://graph.facebook.com").replace(/\/$/, ""),
  metaVerifyToken: () => opt("META_WEBHOOK_VERIFY_TOKEN"),
  resendKey: () => platform("RESEND_API_KEY"),
  discordErrorsWebhook: () => platform("DISCORD_ERRORS_WEBHOOK"),
  emailFrom: () => platform("EMAIL_FROM", "Fuzil Disparador <avisos@fuzildisparador.com.br>"),
  metaRegisterPin: () => opt("META_REGISTER_PIN", "123456"),
  // Vendas (marketplace)
  mpAccessToken: () => platform("MP_ACCESS_TOKEN"),
  mpApiUrl: () => opt("MP_API_URL", "https://api.mercadopago.com").replace(/\/$/, ""),
  marketWhatsapp: () => platform("MARKET_WHATSAPP").replace(/\D/g, ""),
  /** Preço de 1 crédito em reais (padrão R$ 0,01). Aceita "0,01" ou "0.01". */
  creditPrice: () => {
    const v = Number(platform("MARKET_CREDIT_PRICE", "0.01").replace(",", "."));
    return Number.isFinite(v) && v > 0 && v <= 10 ? v : 0.01;
  },
};

export function metaConfigured() {
  return Boolean(env.metaAppId() && env.metaAppSecret());
}

/**
 * Base da URL rastreada dos botões (sem https://).
 * Com domínio próprio para links: "fzl.ink" → https://fzl.ink/{{1}}
 * Usando o mesmo domínio do painel: "painel.com/r" → https://painel.com/r/{{1}}
 */
export function trackedUrlBase(): string {
  const dom = env.redirectDomain().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const appHost = env.appUrl().replace(/^https?:\/\//, "");
  return dom === appHost ? `${dom}/r` : dom;
}
