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
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
