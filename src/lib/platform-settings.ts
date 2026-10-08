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
] as const;

export type PlatformKey = (typeof PLATFORM_KEYS)[number]["key"];

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

export async function savePlatformSetting(key: PlatformKey, value: string) {
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
