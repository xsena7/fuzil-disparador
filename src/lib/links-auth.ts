// Gerador de links (site público): conta própria com e-mail e senha. Cada conta vê só os próprios links.
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { clientIp } from "./rate-limit";

export const LINKS_COOKIE = "fz_links";
export const SESSION_DAYS = 90;

export const sha = (v: string) => createHash("sha256").update(v).digest("hex");
export const normEmail = (v: string) => v.trim().toLowerCase().slice(0, 200);

/** Abre a sessão (cookie salvo no navegador por 90 dias). */
export async function startLinksSession(accountId: string, userAgent: string | null) {
  const token = randomBytes(24).toString("base64url");
  await prisma.linkSession.create({ data: { accountId, tokenHash: sha(token), ip: await clientIp(), userAgent: userAgent?.slice(0, 300) } });
  await prisma.linksAccount.update({ where: { id: accountId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(LINKS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

/** Quem está logado no gerador de links (ou null). */
export async function linksAuth() {
  const token = (await cookies()).get(LINKS_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.linkSession.findUnique({ where: { tokenHash: sha(token) }, include: { account: true } });
  if (!session?.account || session.revokedAt || session.account.blockedAt) return null;
  if (Date.now() - session.createdAt.getTime() > SESSION_DAYS * 86400_000) return null;
  // Atualiza o "visto por último" no máximo a cada 10 min
  if (Date.now() - session.lastSeenAt.getTime() > 10 * 60_000) await prisma.linkSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  return { session, account: session.account };
}

export async function endLinksSession() {
  const jar = await cookies();
  const token = jar.get(LINKS_COOKIE)?.value;
  if (token) await prisma.linkSession.updateMany({ where: { tokenHash: sha(token) }, data: { revokedAt: new Date() } });
  jar.delete(LINKS_COOKIE);
}
