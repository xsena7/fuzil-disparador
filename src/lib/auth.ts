import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { randomToken, sha256 } from "./crypto";

const COOKIE = "fuzil_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, workspaceId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await prisma.session.create({ data: { id: sha256(token), userId, workspaceId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_URL?.startsWith("https://") ?? false,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(COOKIE);
}

export type AuthContext = {
  user: { id: string; name: string; email: string; isSuperAdmin: boolean };
  workspace: { id: string; name: string; creditBalance: number; creditsPerMessage: number };
  role: "OWNER" | "ADMIN" | "MEMBER";
};

export async function getAuth(): Promise<AuthContext | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: session.userId, workspaceId: session.workspaceId } },
    include: { workspace: true },
  });
  if (!membership) return null;
  const { user } = session;
  const ws = membership.workspace;
  return {
    user: { id: user.id, name: user.name, email: user.email, isSuperAdmin: user.isSuperAdmin },
    workspace: { id: ws.id, name: ws.name, creditBalance: ws.creditBalance, creditsPerMessage: ws.creditsPerMessage },
    role: membership.role,
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  return auth;
}

export async function requireSuperAdmin(): Promise<AuthContext> {
  const auth = await requireAuth();
  if (!auth.user.isSuperAdmin) redirect("/");
  return auth;
}
