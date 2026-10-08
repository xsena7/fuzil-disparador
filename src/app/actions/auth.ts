"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: true } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "E-mail ou senha inválidos" };
  const membership = user.memberships[0];
  if (!membership) return { error: "Usuário sem conta vinculada" };
  await createSession(user.id, membership.workspaceId);
  redirect("/");
}

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  company: z.string().trim().min(2, "Informe o nome da conta"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, company, email, password } = parsed.data;

  const userCount = await prisma.user.count();
  // O primeiro usuário vira super admin. Depois disso, cadastro só se ALLOW_SIGNUP=true.
  if (userCount > 0 && process.env.ALLOW_SIGNUP !== "true") return { error: "Cadastro fechado. Peça um convite ao administrador." };
  // Protege o primeiro cadastro (que vira admin) logo depois de subir o servidor
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (userCount === 0 && adminEmail && email !== adminEmail) return { error: "O primeiro cadastro é reservado ao e-mail do administrador." };
  if (await prisma.user.findUnique({ where: { email } })) return { error: "Já existe uma conta com esse e-mail" };

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      isSuperAdmin: userCount === 0,
      memberships: { create: { role: "OWNER", workspace: { create: { name: company } } } },
    },
    include: { memberships: true },
  });
  await createSession(user.id, user.memberships[0].workspaceId);
  const { sendWelcomeEmail } = await import("@/lib/email-templates");
  sendWelcomeEmail(user.email, user.name).catch(() => undefined);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/** "Esqueci minha senha": sempre responde igual, para não revelar quais e-mails existem. */
export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (user) {
    const { createPasswordLink } = await import("@/lib/password-tokens");
    const { sendResetEmail } = await import("@/lib/email-templates");
    const link = await createPasswordLink(user.id, "RESET");
    await sendResetEmail(user.email, user.name, link);
  }
  return { ok: "Se esse e-mail tiver conta, enviamos um link para redefinir a senha. Confira a caixa de entrada e o spam." };
}

/** Define a senha a partir do link do e-mail (convite ou redefinição) e já entra no painel. */
export async function setPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const { findValidToken } = await import("@/lib/password-tokens");
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres" };
  if (password !== confirm) return { error: "As senhas não conferem" };
  const t = await findValidToken(token);
  if (!t) return { error: "Link inválido ou expirado. Peça um novo." };
  await prisma.$transaction([
    prisma.user.update({ where: { id: t.userId }, data: { passwordHash: await hashPassword(password) } }),
    prisma.passwordToken.updateMany({ where: { userId: t.userId, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: t.userId } }),
  ]);
  const membership = await prisma.membership.findFirst({ where: { userId: t.userId } });
  if (!membership) redirect("/login");
  await createSession(t.userId, membership.workspaceId);
  redirect("/");
}
