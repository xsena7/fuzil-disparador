// Regras dos serviços de número (SMSBear e SMS24h) usadas no painel e no servidor (sem banco: pode ir para o navegador)

export type SmsProviderKey = "smsbear" | "sms24h";

export const SMS_PROVIDER_INFO: Record<SmsProviderKey, { label: string; keyLabel: string; keyHelp: string; cancelAfterMs: number }> = {
  smsbear: { label: "SMSBear", keyLabel: "Token da API do SMSBear", keyHelp: "No painel do SMSBear, abra a parte de API e copie o token.", cancelAfterMs: 4 * 60_000 },
  sms24h: { label: "SMS24h", keyLabel: "Chave da API do SMS24h (api_key)", keyHelp: "No sms24h.org, abra a página da API e copie a sua chave (api_key).", cancelAfterMs: 2 * 60_000 },
};

export const isSmsProvider = (k: unknown): k is SmsProviderKey => k === "smsbear" || k === "sms24h";

/** O serviço só libera cancelar/trocar uns minutos depois da compra (SMSBear ~4 min, SMS24h ~2 min). */
export const cancelOpensIn = (boughtAt: string | Date, provider: string = "smsbear", now = Date.now()) =>
  Math.max(0, new Date(boughtAt).getTime() + SMS_PROVIDER_INFO[isSmsProvider(provider) ? provider : "smsbear"].cancelAfterMs - now);

// Compatibilidade
export const SMSBEAR_CANCEL_AFTER_MS = SMS_PROVIDER_INFO.smsbear.cancelAfterMs;
