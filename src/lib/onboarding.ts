import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";

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

/**
 * Dono da plataforma: o primeiro administrador do Fuzil (quem instalou). Fica gravado na primeira vez,
 * então dar administrador para outra pessoa nunca troca o dono. Só ele mexe na chave padrão e dá administrador.
 */
export async function platformOwnerId(): Promise<string | null> {
  // Guardado criptografado, igual aos outros ajustes da plataforma
  const saved = await prisma.platformSetting.findUnique({ where: { key: "PLATFORM_OWNER_ID" } });
  let id: string | null = null;
  try {
    id = saved ? decrypt(saved.value) : null;
  } catch {
    id = null;
  }
  if (id && (await prisma.user.count({ where: { id } }))) return id;
  const first = await prisma.user.findFirst({ where: { isSuperAdmin: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!first) return null;
  await prisma.platformSetting.upsert({ where: { key: "PLATFORM_OWNER_ID" }, create: { key: "PLATFORM_OWNER_ID", value: encrypt(first.id) }, update: { value: encrypt(first.id) } });
  return first.id;
}

export async function isPlatformOwner(userId: string): Promise<boolean> {
  return (await platformOwnerId()) === userId;
}
