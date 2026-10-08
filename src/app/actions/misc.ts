"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireSuperAdmin, hashPassword, verifyPassword, switchSessionWorkspace } from "@/lib/auth";
import { redirect } from "next/navigation";
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

// ---------------- Meu perfil ----------------

export async function saveProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const current = String(form.get("currentPassword") ?? "");
  if (name.length < 2) return { error: "Informe seu nome" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido" };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.user.id } });
  if (email !== user.email) {
    if (!current || !(await verifyPassword(current, user.passwordHash))) return { error: "Para trocar o e-mail, digite sua senha atual." };
    if (await prisma.user.findUnique({ where: { email } })) return { error: "Esse e-mail já está em uso por outro usuário." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { name, email } });
  revalidatePath("/", "layout");
  return { ok: email !== user.email ? `Dados salvos. Agora você entra com ${email}.` : "Dados salvos" };
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const current = String(form.get("currentPassword") ?? "");
  const next = String(form.get("newPassword") ?? "");
  const confirm = String(form.get("confirmPassword") ?? "");
  if (next.length < 8) return { error: "A nova senha precisa ter pelo menos 8 caracteres" };
  if (next !== confirm) return { error: "A confirmação não bate com a nova senha" };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.user.id } });
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Senha atual incorreta" };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: "Senha alterada" };
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
  if (await prisma.user.findUnique({ where: { email } })) return { error: "Esse e-mail já tem usuário. Procure na lista de Contas acima e use ⋮ → Reenviar convite." };
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

// ---------------- Discord ----------------

export async function saveDiscordAction(_: FormState, form: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const { DISCORD_CHANNELS } = await import("@/lib/alert-channels");
  const { isDiscordWebhook } = await import("@/lib/discord");
  const { savePlatformSetting, refreshPlatformSettings } = await import("@/lib/platform-settings");
  const hooks: Record<string, string> = {};
  for (const c of DISCORD_CHANNELS) {
    const v = String(form.get(c.key) ?? "").trim();
    if (!v) continue;
    if (!isDiscordWebhook(v)) return { error: `O link de ${c.label} não parece um webhook do Discord (começa com https://discord.com/api/webhooks/...)` };
    hooks[c.key] = v;
  }
  await savePlatformSetting("DISCORD_CHANNELS", JSON.stringify(hooks));
  await refreshPlatformSettings();
  revalidatePath("/admin");
  return { ok: "Canais do Discord salvos" };
}

export async function testDiscordAction(): Promise<FormState> {
  await requireSuperAdmin();
  const { DISCORD_CHANNELS } = await import("@/lib/alert-channels");
  const { sendDiscord, DISCORD_COLORS } = await import("@/lib/discord");
  const { platformDiscordHooks } = await import("@/lib/alerts");
  const hooks = ((await platformDiscordHooks()) ?? {}) as Record<string, string>;
  const results: string[] = [];
  for (const c of DISCORD_CHANNELS) {
    if (!hooks[c.key]) continue;
    const ok = await sendDiscord(hooks[c.key], {
      title: `✅ Canal ${c.label} conectado`,
      description: `A partir de agora chegam aqui, de todas as contas: ${c.hint.toLowerCase()}.\n\nCada aviso vem explicado: **o que significa**, **o que fazer** e se é 🔴 urgente, 🟡 atenção ou 🟢 só aviso.`,
      color: DISCORD_COLORS.SUCCESS,
    });
    results.push(`${c.label} ${ok ? "✓" : "✗ falhou"}`);
  }
  if (!results.length) return { error: "Nenhum canal configurado ainda." };
  return results.some((r) => r.includes("✗")) ? { error: results.join(" · ") } : { ok: `Teste enviado: ${results.join(" · ")}` };
}

export async function testErrorsDiscordAction(): Promise<FormState> {
  await requireSuperAdmin();
  const { sendDiscord, DISCORD_COLORS } = await import("@/lib/discord");
  const { env } = await import("@/lib/env");
  if (!env.discordErrorsWebhook()) return { error: "Cole o webhook de erros em Integração e salve antes." };
  const ok = await sendDiscord(env.discordErrorsWebhook(), {
    title: "✅ Canal #erros conectado",
    description: "Erros do site e do motor de disparo vão aparecer aqui.",
    color: DISCORD_COLORS.SUCCESS,
  });
  return ok ? { ok: "Mensagem de teste enviada para #erros" } : { error: "O Discord recusou. Confira o link do webhook." };
}

// ---------------- Usuários (Admin) ----------------

export async function adminResendInviteAction(userId: string): Promise<{ ok?: string; error?: string; link?: string }> {
  await requireSuperAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { memberships: { include: { workspace: true } } } });
  if (!user) return { error: "Usuário não encontrado" };
  const link = await createPasswordLink(user.id, user.lastLoginAt ? "RESET" : "INVITE");
  const sent = await sendInviteEmail(user.email, user.name, user.memberships[0]?.workspace.name ?? "", link);
  return sent ? { ok: `Convite reenviado para ${user.email}`, link } : { ok: "E-mail não configurado. Copie o link e envie para a pessoa.", link };
}

export async function adminDeleteUserAction(userId: string): Promise<{ ok?: string; error?: string }> {
  const auth = await requireSuperAdmin();
  if (userId === auth.user.id) return { error: "Você não pode excluir o seu próprio usuário." };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Usuário não encontrado" };
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
  return { ok: `${user.email} excluído` };
}

export async function adminEnterWorkspaceAction(workspaceId: string) {
  await requireSuperAdmin();
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) return;
  await switchSessionWorkspace(ws.id);
  redirect("/");
}

export async function backToMyWorkspaceAction() {
  const auth = await requireAuth();
  const own = await prisma.membership.findFirst({ where: { userId: auth.user.id }, orderBy: { role: "asc" } });
  if (own) await switchSessionWorkspace(own.workspaceId);
  redirect("/admin");
}

// ---------------- Painel de contas (Admin) ----------------

type Result = { ok?: string; error?: string; link?: string };

export async function adminBlockWorkspaceAction(workspaceId: string, reason: string): Promise<Result> {
  const auth = await requireSuperAdmin();
  if (await prisma.membership.findFirst({ where: { workspaceId, userId: auth.user.id } })) return { error: "Você não pode bloquear a sua própria conta." };
  const ws = await prisma.workspace.update({ where: { id: workspaceId }, data: { blockedAt: new Date(), blockedReason: reason.trim() || null } });
  // Para tudo que estava rodando ou agendado; ao desbloquear, o cliente retoma pela tela da campanha
  const paused = await prisma.campaign.updateMany({
    where: { workspaceId, status: { in: ["RUNNING", "SCHEDULED"] } },
    data: { status: "PAUSED", pausedReason: "Conta bloqueada pelo administrador" },
  });
  revalidatePath("/admin");
  return { ok: `${ws.name} bloqueada${paused.count ? ` · ${paused.count} campanha(s) pausada(s)` : ""}` };
}

export async function adminUnblockWorkspaceAction(workspaceId: string): Promise<Result> {
  await requireSuperAdmin();
  const ws = await prisma.workspace.update({ where: { id: workspaceId }, data: { blockedAt: null, blockedReason: null } });
  revalidatePath("/admin");
  return { ok: `${ws.name} desbloqueada` };
}

export async function adminDeleteWorkspaceAction(workspaceId: string, confirmName: string): Promise<Result> {
  const auth = await requireSuperAdmin();
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, include: { memberships: { include: { user: { include: { _count: { select: { memberships: true } } } } } } } });
  if (!ws) return { error: "Conta não encontrada" };
  if (ws.memberships.some((m) => m.userId === auth.user.id)) return { error: "Você não pode excluir a sua própria conta." };
  if (confirmName.trim() !== ws.name) return { error: "O nome digitado não confere. Nada foi excluído." };
  // Usuários que só tinham essa conta saem junto (o admin da plataforma nunca)
  const orphanUsers = ws.memberships.filter((m) => m.user._count.memberships === 1 && !m.user.isSuperAdmin).map((m) => m.userId);
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { workspaceId } }),
    prisma.workspace.delete({ where: { id: workspaceId } }),
    prisma.user.deleteMany({ where: { id: { in: orphanUsers } } }),
  ]);
  revalidatePath("/admin");
  return { ok: `Conta ${ws.name} excluída${orphanUsers.length ? ` com ${orphanUsers.length} usuário(s)` : ""}` };
}

export async function adminRenameWorkspaceAction(workspaceId: string, name: string): Promise<Result> {
  await requireSuperAdmin();
  if (!name.trim()) return { error: "Informe o nome" };
  await prisma.workspace.update({ where: { id: workspaceId }, data: { name: name.trim() } });
  revalidatePath("/admin");
  return { ok: "Nome alterado" };
}

/** Link para o dono definir uma nova senha e entrar (não envia e-mail, só devolve para copiar). */
export async function adminLoginLinkAction(workspaceId: string): Promise<Result> {
  await requireSuperAdmin();
  const owner = await prisma.membership.findFirst({ where: { workspaceId }, orderBy: { role: "asc" }, include: { user: true } });
  if (!owner) return { error: "Conta sem usuário" };
  const link = await createPasswordLink(owner.userId, owner.user.lastLoginAt ? "RESET" : "INVITE");
  return { ok: `Link para ${owner.user.email} (vale ${owner.user.lastLoginAt ? "2 horas" : "7 dias"}, uso único)`, link };
}

export async function adminQuickCreditsAction(workspaceId: string, amount: number, note: string): Promise<Result> {
  const auth = await requireSuperAdmin();
  amount = Math.trunc(amount);
  if (!amount) return { error: "Informe a quantidade" };
  await addCredits(workspaceId, amount, amount > 0 ? "TOPUP" : "ADJUST", note.trim() || (amount > 0 ? "Recarga" : "Ajuste"), { createdById: auth.user.id });
  revalidatePath("/admin");
  return { ok: `${amount > 0 ? "Adicionados" : "Removidos"} ${Math.abs(amount).toLocaleString("pt-BR")} créditos` };
}

export async function adminQuickPriceAction(workspaceId: string, price: number): Promise<Result> {
  await requireSuperAdmin();
  await prisma.workspace.update({ where: { id: workspaceId }, data: { creditsPerMessage: Math.max(0, Math.trunc(price) || 0) } });
  revalidatePath("/admin");
  return { ok: "Preço atualizado" };
}

// ---------------- Empresa (site público) ----------------

export async function adminSaveCompanyAction(_: FormState, form: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const { COMPANY_KEYS, savePlatformSetting, refreshPlatformSettings } = await import("@/lib/platform-settings");
  for (const { key } of COMPANY_KEYS) {
    const raw = form.get(key);
    if (raw === null) continue;
    let value = String(raw).trim();
    // Aceita colar a tag inteira da Meta: <meta name="facebook-domain-verification" content="abc" />
    if (key === "META_DOMAIN_VERIFICATION") value = value.match(/content=["']([^"']+)["']/)?.[1] ?? value;
    await savePlatformSetting(key, value);
  }
  await refreshPlatformSettings();
  revalidatePath("/", "layout");
  return { ok: "Dados da empresa salvos. O site já mostra as informações novas." };
}
