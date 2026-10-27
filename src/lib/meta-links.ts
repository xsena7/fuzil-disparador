// Links diretos para as páginas da Meta (o Fuzil não consegue mexer nelas pela API, então leva você até lá)

/** Cobrança e pagamentos da conta do WhatsApp (onde se adiciona/troca o cartão). Precisa estar logado com um perfil administrador. */
export function metaBillingUrl(wabaId: string, metaBusinessId?: string | null) {
  const q = new URLSearchParams({ asset_id: wabaId, payment_account_id: wabaId });
  if (metaBusinessId) q.set("business_id", metaBusinessId);
  return `https://business.facebook.com/billing_hub/accounts/details/?${q}`;
}
