"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireSuperAdmin, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addCredits } from "@/lib/credits";
import { sendTelegram } from "@/lib/alerts";
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
  const telegramChatId = String(form.get("telegramChatId") ?? "").trim() || null;
  await prisma.workspace.update({ where: { id: auth.workspace.id }, data: { ...(name ? { name } : {}), telegramChatId } });
  revalidatePath("/", "layout");
  return { ok: "Configurações salvas" };
}

export async function testTelegramAction(): Promise<FormState> {
  const auth = await requireAuth();
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: auth.workspace.id } });
  if (!ws.telegramChatId) return { error: "Informe o Chat ID primeiro" };
  await sendTelegram(ws.telegramChatId, "✅ Fuzil Disparador conectado. Você vai receber os alertas aqui.");
  return { ok: "Mensagem de teste enviada" };
}

export async function addMemberAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER") return { error: "Sem permissão" };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !name || password.length < 8) return { error: "Preencha nome, e-mail e senha (mín. 8)" };
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email, name, passwordHash: await hashPassword(password) } });
  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: auth.workspace.id } },
    create: { userId: user.id, workspaceId: auth.workspace.id, role: "MEMBER" },
    update: {},
  });
  revalidatePath("/configuracoes");
  return { ok: "Usuário adicionado" };
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
  await requireSuperAdmin();
  const company = String(form.get("company") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!company || !name || !email || password.length < 8) return { error: "Preencha todos os campos (senha mín. 8)" };
  if (await prisma.user.findUnique({ where: { email } })) return { error: "E-mail já cadastrado" };
  await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), memberships: { create: { role: "OWNER", workspace: { create: { name: company } } } } },
  });
  revalidatePath("/admin");
  return { ok: "Conta criada" };
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
