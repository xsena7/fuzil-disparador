function opt(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  appUrl: () => opt("APP_URL", "http://localhost:3000").replace(/\/$/, ""),
  redirectDomain: () => opt("REDIRECT_DOMAIN", "localhost:3000"),
  encryptionKey: () => opt("ENCRYPTION_KEY"),
  uploadDir: () => opt("UPLOAD_DIR", "./uploads"),
  metaAppId: () => opt("META_APP_ID"),
  metaAppSecret: () => opt("META_APP_SECRET"),
  metaConfigId: () => opt("META_CONFIG_ID"),
  metaSystemToken: () => opt("META_SYSTEM_USER_TOKEN"),
  metaGraphVersion: () => opt("META_GRAPH_VERSION", "v23.0"),
  metaGraphUrl: () => opt("META_GRAPH_URL", "https://graph.facebook.com").replace(/\/$/, ""),
  metaVerifyToken: () => opt("META_WEBHOOK_VERIFY_TOKEN"),
  metaRegisterPin: () => opt("META_REGISTER_PIN", "123456"),
  telegramBotToken: () => opt("TELEGRAM_BOT_TOKEN"),
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
