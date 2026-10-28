"use server";

import { randomBytes, randomInt } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { hashPassword, requireSuperAdmin, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { trackedUrlBase } from "@/lib/env";
import { company } from "@/lib/company";
import { emailLayout, sendEmail } from "@/lib/email";
import { clientIp, tooMany } from "@/lib/rate-limit";
import { endLinksSession, linksAuth, normEmail, sha, startLinksSession } from "@/lib/links-auth";
import type { FormState } from "./auth";

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 7 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

// ---------------- Conta: e-mail e senha ----------------

export type LoginState = { error?: string; ok?: string; done?: boolean } | undefined;

const MIN_PASSWORD = 8;
const RESET_MINUTES = 60;
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** Cria a conta e já entra. */
export async function signupLinksAction(_: LoginState, form: FormData): Promise<LoginState> {
  const ip = await clientIp();
  if (tooMany(`lk:signup:${ip}`, 5, 60 * 60_000)) return { error: "Muitas contas criadas daqui. Tente de novo mais tarde." };
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const email = normEmail(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  if (name.length < 2) return { error: "Escreva seu nome." };
  if (!validEmail(email)) return { error: "E-mail inválido." };
  if (password.length < MIN_PASSWORD) return { error: `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.` };
  if (await prisma.linksAccount.findUnique({ where: { email }, select: { id: true } })) return { error: "Já existe uma conta com esse e-mail. Entre com a sua senha." };
  const account = await prisma.linksAccount
    .create({ data: { name, email, passwordHash: await hashPassword(password) } })
    .catch(() => null);
  if (!account) return { error: "Já existe uma conta com esse e-mail. Entre com a sua senha." };
  await startLinksSession(account.id, (await headers()).get("user-agent"));
  return { done: true };
}

export async function loginLinksAction(_: LoginState, form: FormData): Promise<LoginState> {
  const ip = await clientIp();
  const email = normEmail(String(form.get("email") ?? ""));
  if (tooMany(`lk:login:${ip}`, 20, 15 * 60_000) || tooMany(`lk:login:${email}`, 8, 15 * 60_000)) return { error: "Muitas tentativas. Espere alguns minutos." };
  const account = await prisma.linksAccount.findUnique({ where: { email } });
  const ok = account ? await verifyPassword(String(form.get("password") ?? ""), account.passwordHash) : false;
  if (!account || !ok) return { error: "E-mail ou senha incorretos." };
  if (account.blockedAt) return { error: "Essa conta foi bloqueada." };
  await startLinksSession(account.id, (await headers()).get("user-agent"));
  return { done: true };
}

/** "Esqueci minha senha": manda o link por e-mail. Responde sempre igual (não revela quais e-mails existem). */
export async function forgotLinksAction(_: LoginState, form: FormData): Promise<LoginState> {
  const ip = await clientIp();
  if (tooMany(`lk:forgot:${ip}`, 5, 60 * 60_000)) return { error: "Muitos pedidos. Tente de novo mais tarde." };
  const email = normEmail(String(form.get("email") ?? ""));
  const msg = { ok: "Se esse e-mail tiver conta, mandamos um link para criar uma senha nova. Confira a caixa de entrada e o spam." };
  const account = validEmail(email) ? await prisma.linksAccount.findUnique({ where: { email } }) : null;
  if (!account || account.blockedAt) return msg;
  const token = randomBytes(24).toString("base64url");
  await prisma.linksAccount.update({ where: { id: account.id }, data: { resetTokenHash: sha(token), resetExpiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) } });
  const url = `${company().siteUrl}/links/senha?t=${token}`;
  const mail = emailLayout({
    preheader: "Crie uma senha nova para o gerador de links",
    title: "Senha nova do gerador de links",
    paragraphs: [`Olá, ${account.name}!`, `Clique no botão para criar uma senha nova. O link vale por ${RESET_MINUTES} minutos.`],
    cta: { label: "Criar senha nova", url },
    note: "Se não foi você que pediu, pode ignorar este e-mail: sua senha continua a mesma.",
  });
  await sendEmail({ to: account.email, subject: "Senha nova do gerador de links", ...mail });
  return msg;
}

export async function resetLinksAction(_: LoginState, form: FormData): Promise<LoginState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return { error: `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.` };
  const account = token ? await prisma.linksAccount.findUnique({ where: { resetTokenHash: sha(token) } }) : null;
  if (!account || !account.resetExpiresAt || account.resetExpiresAt < new Date()) return { error: "Esse link expirou. Peça outro em \"Esqueci minha senha\"." };
  await prisma.linksAccount.update({ where: { id: account.id }, data: { passwordHash: await hashPassword(password), resetTokenHash: null, resetExpiresAt: null } });
  // Senha nova derruba os outros aparelhos
  await prisma.linkSession.updateMany({ where: { accountId: account.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await startLinksSession(account.id, (await headers()).get("user-agent"));
  return { done: true };
}

export async function logoutLinksAction() {
  await endLinksSession();
  revalidatePath("/site/links");
}

// ---------------- Links do cliente logado ----------------

function readForm(form: FormData): { name: string; url: string } | { error: string } {
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  let url = String(form.get("url") ?? "").trim();
  if (!name) return { error: "Dê um nome para o link (ex.: Loja do João)" };
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/^https?:\/\/[^\s/]+\.[^\s]+$/.test(url) || url.length > 2000) return { error: "Cole o link de destino completo (ex.: https://seusite.com.br)" };
  // Não deixa apontar para o próprio redirecionador (vira um laço infinito)
  if (new URL(url).host === trackedUrlBase().split("/")[0]) return { error: "Esse link já é do Fuzil. Cole o site final, para onde o cliente deve ir." };
  return { name, url };
}

export async function createMyLinkAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await linksAuth();
  if (!auth) return { error: "Sua sessão expirou. Recarregue a página e entre de novo." };
  if (tooMany(`lk:new:${auth.account.id}`, 30, 60 * 60_000)) return { error: "Muitos links criados em pouco tempo. Espere um pouco." };
  const data = readForm(form);
  if ("error" in data) return data;
  for (let i = 0; i < 5; i++) {
    try {
      const link = await prisma.externalLink.create({ data: { ...data, code: newCode(), accountId: auth.account.id, creatorIp: await clientIp() } });
      revalidatePath("/site/links");
      return { ok: `Link criado! O código é ${link.code}. Copie e cole na variável do botão.` };
    } catch {
      /* código repetido: tenta outro */
    }
  }
  return { error: "Não consegui gerar o código agora. Tente de novo." };
}

export async function updateMyLinkAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const auth = await linksAuth();
  if (!auth) return { error: "Sua sessão expirou. Recarregue a página e entre de novo." };
  const data = readForm(form);
  if ("error" in data) return data;
  const r = await prisma.externalLink.updateMany({ where: { id, accountId: auth.account.id }, data });
  if (!r.count) return { error: "Link não encontrado" };
  revalidatePath("/site/links");
  return { ok: "Salvo! Quem clicar a partir de agora já vai para o destino novo." };
}

export async function deleteMyLinkAction(id: string): Promise<{ ok?: true; error?: string }> {
  const auth = await linksAuth();
  if (!auth) return { error: "Sua sessão expirou. Recarregue a página e entre de novo." };
  await prisma.externalLink.deleteMany({ where: { id, accountId: auth.account.id } });
  revalidatePath("/site/links");
  return { ok: true };
}

// ---------------- Admin ----------------

/** Admin: bloqueia (ou libera) uma conta do gerador de links. Bloqueada não entra; os links dela continuam funcionando. */
export async function adminBlockLinksAccountAction(id: string, block: boolean) {
  await requireSuperAdmin();
  await prisma.linksAccount.update({ where: { id }, data: { blockedAt: block ? new Date() : null } });
  if (block) await prisma.linkSession.updateMany({ where: { accountId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  revalidatePath("/admin");
  return { ok: block ? "Conta bloqueada." : "Conta liberada." };
}

/** Admin: apaga qualquer link (ex.: alguém usando para golpe). */
export async function adminDeleteLinkAction(id: string) {
  await requireSuperAdmin();
  await prisma.externalLink.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/admin");
  return { ok: "Link apagado. Quem clicar nele vai ver \"link não encontrado\"." };
}
