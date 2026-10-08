"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireSuperAdmin, hashPassword } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { createPasswordLink } from "@/lib/password-tokens";
import { sendInviteEmail, sendTestEmail } from "@/lib/email-templates";
import { emailConfigured } from "@/lib/email";
import { prisma } from "@/lib/db";
import { addCredits } from "@/lib/credits";
import type { FormState } from "./auth";

export async function markAlertsReadAction() {
  const auth = await requireAuth();
  await prisma.alert.updateMany({ where: { workspaceId: auth.workspace.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function saveSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER") return { error: "Sem permissão" };
  const name = String(form.get("name") ?? "").trim();
  await prisma.workspace.update({
    where: { id: auth.workspace.id },
    data: { ...(name ? { name } : {}), emailAlerts: form.get("emailAlerts") === "on" },
  });
  revalidatePath("/", "layout");
  return { ok: "Configurações salvas" };
}

export async function addMemberAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER") return { error: "Sem permissão" };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  if (!email || !name) return { error: "Preencha nome e e-mail" };
  let user = await prisma.user.findUnique({ where: { email } });
  const isNew = !user;
  if (!user) user = await prisma.user.create({ data: { email, name, passwordHash: await hashPassword(randomToken()) } });
  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: auth.workspace.id } },
    create: { userId: user.id, workspaceId: auth.workspace.id, role: "MEMBER" },
    update: {},
  });
  revalidatePath("/configuracoes");
  if (!isNew) return { ok: "Usuário já tinha conta e foi adicionado. Ele entra com a senha que já usa." };
  const link = await createPasswordLink(user.id, "INVITE");
  const sent = await sendInviteEmail(email, name, auth.workspace.name, link, auth.user.name);
  return sent ? { ok: `Convite enviado para ${email}.` } : { ok: `E-mail não configurado. Envie este link para a pessoa: ${link}` };
}

// ---------------- Admin (dono da plataforma) ----------------

export async function adminCreditsAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireSuperAdmin();
  const workspaceId = String(form.get("workspaceId"));
  const amount = Math.trunc(Number(form.get("amount")));
  const note = String(form.get("note") ?? "").trim();
  if (!amount) return { error: "Informe a quantidade" };
  await addCredits(workspaceId, amount, amount > 0 ? "TOPUP" : "ADJUST", note || (amount > 0 ? "Recarga" : "Ajuste"), { createdById: auth.user.id });
  revalidatePath("/admin");
  return { ok: `${amount > 0 ? "Adicionados" : "Removidos"} ${Math.abs(amount).toLocaleString("pt-BR")} créditos` };
}

export async function adminPriceAction(_: FormState, form: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const workspaceId = String(form.get("workspaceId"));
  const price = Math.max(0, Math.trunc(Number(form.get("price"))));
  await prisma.workspace.update({ where: { id: workspaceId }, data: { creditsPerMessage: price } });
  revalidatePath("/admin");
  return { ok: "Preço atualizado" };
}

export async function adminCreateWorkspaceAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireSuperAdmin();
  const company = String(form.get("company") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const credits = Math.max(0, Math.trunc(Number(form.get("credits") ?? 0) || 0));
  if (!company || !name || !email) return { error: "Preencha nome da conta, nome do dono e e-mail" };
  if (await prisma.user.findUnique({ where: { email } })) return { error: "E-mail já cadastrado" };
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(randomToken()),
      memberships: { create: { role: "OWNER", workspace: { create: { name: company } } } },
    },
    include: { memberships: true },
  });
  if (credits > 0) await addCredits(user.memberships[0].workspaceId, credits, "TOPUP", "Crédito inicial", { createdById: auth.user.id });
  const link = await createPasswordLink(user.id, "INVITE");
  const sent = await sendInviteEmail(email, name, company, link);
  revalidatePath("/admin");
  return sent
    ? { ok: `Conta criada e convite enviado para ${email}.` }
    : { ok: `Conta criada. E-mail não configurado — envie este link para o cliente: ${link}` };
}

export async function adminTestEmailAction(): Promise<FormState> {
  const auth = await requireSuperAdmin();
  if (!emailConfigured()) return { error: "Cole a chave do Resend em Integração antes de testar." };
  const ok = await sendTestEmail(auth.user.email);
  return ok ? { ok: `E-mail de teste enviado para ${auth.user.email}.` } : { error: "O Resend recusou o envio. Confira a chave e se o domínio foi verificado." };
}

export async function adminSavePlatformAction(_: FormState, form: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const { PLATFORM_KEYS, savePlatformSetting, refreshPlatformSettings } = await import("@/lib/platform-settings");
  for (const { key, secret } of PLATFORM_KEYS) {
    const raw = form.get(key);
    if (raw === null) continue;
    const value = String(raw).trim();
    // Segredo em branco = manter o atual; marcar "limpar" apaga
    if (secret && !value && form.get(`${key}__clear`) !== "on") continue;
    await savePlatformSetting(key, value);
  }
  await refreshPlatformSettings();
  revalidatePath("/", "layout");
  return { ok: "Integração salva. Já está valendo (o worker atualiza em até 30s)." };
}
