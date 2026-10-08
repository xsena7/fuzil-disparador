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
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
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
  workspace: { id: string; name: string; creditBalance: number; creditsPerMessage: number; blocked: boolean };
  role: "OWNER" | "ADMIN" | "MEMBER";
  /** Admin da plataforma vendo a conta de um cliente (sem ser membro dela). */
  inspecting: boolean;
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
  const { user } = session;
  // Admin da plataforma pode abrir a conta de qualquer cliente
  const ws = membership?.workspace ?? (user.isSuperAdmin ? await prisma.workspace.findUnique({ where: { id: session.workspaceId } }) : null);
  if (!ws) return null;
  return {
    user: { id: user.id, name: user.name, email: user.email, isSuperAdmin: user.isSuperAdmin },
    workspace: { id: ws.id, name: ws.name, creditBalance: ws.creditBalance, creditsPerMessage: ws.creditsPerMessage, blocked: Boolean(ws.blockedAt) },
    role: membership?.role ?? "OWNER",
    inspecting: !membership,
  };
}

/** Para rotas de API: igual ao getAuth, mas recusa contas bloqueadas (exceto o admin da plataforma). */
export async function getActiveAuth(): Promise<AuthContext | null> {
  const auth = await getAuth();
  return auth && (!auth.workspace.blocked || auth.user.isSuperAdmin) ? auth : null;
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  // Conta bloqueada: só o admin da plataforma continua entrando (para inspecionar/desbloquear)
  if (auth.workspace.blocked && !auth.user.isSuperAdmin) redirect("/bloqueado");
  return auth;
}

export async function requireSuperAdmin(): Promise<AuthContext> {
  const auth = await requireAuth();
  if (!auth.user.isSuperAdmin) redirect("/");
  return auth;
}

/** Troca a conta aberta na sessão atual (admin entrando na conta de um cliente, ou voltando). */
export async function switchSessionWorkspace(workspaceId: string) {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return;
  await prisma.session.update({ where: { id: sha256(token) }, data: { workspaceId } });
}
