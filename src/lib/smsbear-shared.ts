// Regras do SMSBear usadas no painel e no servidor (sem banco: pode ir para o navegador)

/** O SMSBear só libera cancelar/trocar uns 4 minutos depois da compra (o X fica cinza antes disso). */
export const SMSBEAR_CANCEL_AFTER_MS = 4 * 60_000;

export const cancelOpensIn = (boughtAt: string | Date, now = Date.now()) => Math.max(0, new Date(boughtAt).getTime() + SMSBEAR_CANCEL_AFTER_MS - now);
