import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

// App do Fuzil que os clientes pedem acesso na BM deles (o ID de app é público)
export const FUZIL_APP_ID = "1810134293359501";
// WhatsApp do Fuzil para o cliente pedir a aprovação do acesso ao app
export const SUPPORT_WHATSAPP = "5562994790340";

export function supportWhatsAppLink(text: string) {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

/**
 * Chave secreta usada sozinha numa conexão manual: a da própria conta ou, se não tiver,
 * a chave padrão cadastrada por um administrador do Fuzil (app do Fuzil que o cliente pediu acesso).
 */
export async function defaultAppSecret(workspaceId: string): Promise<string | null> {
  const own = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { defaultAppSecretEnc: true } });
  if (own?.defaultAppSecretEnc) return decrypt(own.defaultAppSecretEnc);
  const platform = await prisma.workspace.findFirst({
    where: { defaultAppSecretEnc: { not: null }, memberships: { some: { user: { isSuperAdmin: true } } } },
    select: { defaultAppSecretEnc: true },
    orderBy: { createdAt: "asc" },
  });
  return platform?.defaultAppSecretEnc ? decrypt(platform.defaultAppSecretEnc) : null;
}
