import { prisma } from "./db";
import { formatPhone } from "./phone";
import type { Reply } from "@/app/relatorio/replies";

// Resposta sem texto (áudio, foto...): mostra o tipo
const TYPE_PT: Record<string, string> = { audio: "🎤 Áudio", image: "📷 Foto", video: "🎬 Vídeo", document: "📄 Documento", sticker: "Figurinha", location: "📍 Localização", contacts: "👤 Contato" };
const when = (d: Date) => d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

/** Quem respondeu o disparo: nome, número, resposta e horário (mais novas primeiro, até 1.000). */
export async function campaignReplies(campaignId: string): Promise<Reply[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string; text: string | null; type: string; at: Date; phone: string; name: string | null }>>`
    SELECT i.id, i.text, i.type, i."receivedAt" AS at, r.phone, r.name
    FROM "InboundMessage" i JOIN "CampaignRecipient" r ON r.id = i."recipientId"
    WHERE r."campaignId" = ${campaignId} AND i.type <> 'reaction'
    ORDER BY i."receivedAt" DESC
    LIMIT 1000`;
  return rows.map((x) => ({ id: x.id, name: x.name, phone: x.phone, phoneFmt: formatPhone(x.phone), text: x.text || TYPE_PT[x.type] || "Mensagem", at: when(x.at) }));
}
