import { prisma } from "./db";
import { decrypt, encrypt } from "./crypto";
import { replaceSettings } from "./settings-cache";

/** Chaves que podem ser configuradas pelo painel (sobrepõem o .env). */
export const PLATFORM_KEYS = [
  { key: "META_APP_ID", label: "App ID", secret: false },
  { key: "META_APP_SECRET", label: "App Secret", secret: true },
  { key: "META_CONFIG_ID", label: "Config ID do Embedded Signup", secret: false },
  { key: "META_SYSTEM_USER_TOKEN", label: "Token do System User", secret: true },
  { key: "META_GRAPH_VERSION", label: "Versão da Graph API", secret: false },
  { key: "RESEND_API_KEY", label: "Chave do Resend (e-mails)", secret: true },
  { key: "EMAIL_FROM", label: "Remetente dos e-mails", secret: false },
  { key: "DISCORD_ERRORS_WEBHOOK", label: "Webhook do Discord para erros do sistema", secret: true },
] as const;

export type PlatformKey = (typeof PLATFORM_KEYS)[number]["key"];

/** Dados da empresa dona do Fuzil: aparecem no site público (exigido pela Meta para verificar a empresa e aprovar o app). */
export const COMPANY_KEYS = [
  { key: "COMPANY_LEGAL_NAME", label: "Razão social (igual ao cartão CNPJ)", placeholder: "EX.: FULANO SERVICOS DIGITAIS LTDA" },
  { key: "COMPANY_CNPJ", label: "CNPJ", placeholder: "00.000.000/0000-00" },
  { key: "COMPANY_ADDRESS", label: "Endereço (igual ao cartão CNPJ)", placeholder: "Rua X, 123, Sala 4 - Bairro, Cidade - UF, CEP 00000-000" },
  { key: "COMPANY_EMAIL", label: "E-mail de contato (que recebe e-mails)", placeholder: "contato@fuzildisparador.com.br" },
  { key: "COMPANY_PHONE", label: "Telefone / WhatsApp de contato", placeholder: "+55 11 99999-9999" },
  { key: "META_DOMAIN_VERIFICATION", label: "Código de verificação do domínio (Meta)", placeholder: "abc123xyz..." },
] as const;

export type CompanyKey = (typeof COMPANY_KEYS)[number]["key"];

export async function refreshPlatformSettings() {
  const rows = await prisma.platformSetting.findMany();
  const entries: Array<[string, string]> = [];
  for (const r of rows) {
    try {
      entries.push([r.key, decrypt(r.value)]);
    } catch {
      console.error(`[settings] não foi possível ler ${r.key}`);
    }
  }
  replaceSettings(entries);
}

export async function savePlatformSetting(key: PlatformKey | CompanyKey | "DISCORD_CHANNELS", value: string) {
  if (!value) {
    await prisma.platformSetting.deleteMany({ where: { key } });
  } else {
    const enc = encrypt(value);
    await prisma.platformSetting.upsert({ where: { key }, create: { key, value: enc }, update: { value: enc } });
  }
}

let timer: NodeJS.Timeout | null = null;

/** Carrega as configurações agora e mantém atualizado a cada 30s (painel e worker). */
export async function startSettingsRefresh() {
  await refreshPlatformSettings().catch((e) => console.error("[settings]", e));
  if (!timer) timer = setInterval(() => refreshPlatformSettings().catch(() => undefined), 30_000);
}
