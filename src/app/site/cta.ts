import { company } from "@/lib/company";
import { SUPPORT_WHATSAPP, waNumber } from "@/lib/onboarding";

/** Link do WhatsApp comercial do Fuzil com a mensagem já escrita (mesmo número do botão "Quero começar"). */
export function siteWhatsApp(msg: string) {
  const n = waNumber(company().phone) || SUPPORT_WHATSAPP;
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
}
