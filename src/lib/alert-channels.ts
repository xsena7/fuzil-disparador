// Em qual canal do Discord cada tipo de alerta cai.

export const DISCORD_CHANNELS = [
  { key: "campaigns", label: "#campanhas", hint: "Campanha iniciada, concluída, pausada, número retirado, aguardando limite" },
  { key: "templates", label: "#templates", hint: "Aprovado, rejeitado, pausado, virou marketing, template padrão" },
  { key: "quality", label: "#qualidade", hint: "Qualidade dos números, número sinalizado/banido, problemas na WABA" },
  { key: "limits", label: "#limites", hint: "BM bateu o limite, limite liberado, mudança de tier" },
  { key: "general", label: "#geral", hint: "Todo o resto (e o que não tiver canal próprio configurado)" },
] as const;

export type ChannelKey = (typeof DISCORD_CHANNELS)[number]["key"];
export type DiscordWebhooks = Partial<Record<ChannelKey, string>>;

export function channelFor(type: string): ChannelKey {
  if (type.startsWith("CAMPAIGN_") || type === "SENDER_REMOVED" || type === "LIMIT_REACHED") return "campaigns";
  if (type.startsWith("TEMPLATE_") || type.startsWith("BLUEPRINT_")) return "templates";
  if (["QUALITY_CHANGE", "NUMBER_STATUS", "ACCOUNT_UPDATE", "SYNC_ERROR"].includes(type)) return "quality";
  if (type.startsWith("BM_LIMIT_") || type === "LIMIT_CHANGE") return "limits";
  return "general";
}

export function webhookFor(hooks: DiscordWebhooks | null | undefined, type: string): string | undefined {
  if (!hooks) return undefined;
  return hooks[channelFor(type)] || hooks.general || undefined;
}
