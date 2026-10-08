import type { TokenPurpose } from "@prisma/client";
import { prisma } from "./db";
import { randomToken, sha256 } from "./crypto";
import { env } from "./env";

const TTL_HOURS: Record<TokenPurpose, number> = { INVITE: 24 * 7, RESET: 2 };

/** Gera um link de "criar/redefinir senha" e retorna a URL completa. */
export async function createPasswordLink(userId: string, purpose: TokenPurpose): Promise<string> {
  const token = randomToken(24);
  await prisma.passwordToken.create({
    data: { id: sha256(token), userId, purpose, expiresAt: new Date(Date.now() + TTL_HOURS[purpose] * 3600_000) },
  });
  return `${env.appUrl()}/definir-senha?token=${token}`;
}

export async function findValidToken(token: string) {
  if (!token) return null;
  const t = await prisma.passwordToken.findUnique({ where: { id: sha256(token) }, include: { user: true } });
  if (!t || t.usedAt || t.expiresAt < new Date()) return null;
  return t;
}
