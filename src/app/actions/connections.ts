"use server";

import { friendlyError } from "@/lib/meta-errors";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { connectWaba, ensureWebhook, syncWaba, wabaToken } from "@/lib/sync";
import { deployBlueprints } from "@/lib/blueprints";
import { meta } from "@/lib/meta";
import { env } from "@/lib/env";
import type { FormState } from "./auth";
import { resetBmSecrets } from "@/lib/webhook";

const errMsg = friendlyError;

export async function connectManualAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER" && !auth.user.isSuperAdmin) return { error: "Só o dono ou um admin da conta pode conectar BMs." };
  const wabaId = String(form.get("wabaId") ?? "").trim();
  const token = String(form.get("token") ?? "").trim();
  if (!/^\d+$/.test(wabaId)) return { error: "Informe o ID da WABA (só números)" };
  // O token do Tech Provider tem acesso às WABAs de todos os clientes: só o admin da plataforma pode usar sem token
  if (!token && !auth.user.isSuperAdmin) return { error: "Cole o token de acesso da WABA (token do usuário do sistema da sua BM)." };
  if (!token && !env.metaSystemToken()) return { error: "Informe um token de acesso (ou configure o token do Tech Provider)" };
  try {
    await connectWaba({ workspaceId: auth.workspace.id, wabaId, accessTokenEnc: token ? encrypt(token) : null, connectionType: "MANUAL" });
    const appSecret = String(form.get("appSecret") ?? "").trim();
    if (/^[a-f0-9]{32}$/i.test(appSecret)) {
      await prisma.whatsAppAccount.updateMany({ where: { workspaceId: auth.workspace.id, wabaId }, data: { appSecretEnc: encrypt(appSecret) } });
      resetBmSecrets();
    }
    deployBlueprints(auth.workspace.id).catch(() => undefined);
  } catch (err) {
    return { error: `Não foi possível conectar: ${errMsg(err)}` };
  }
  revalidatePath("/conexoes");
  return { ok: "WABA conectada e sincronizada" };
}

async function ownWaba(id: string) {
  const auth = await requireAuth();
  const waba = await prisma.whatsAppAccount.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!waba) throw new Error("WABA não encontrada");
  return waba;
}

export async function syncWabaAction(id: string) {
  await ownWaba(id);
  try {
    await syncWaba(id);
  } catch {
    // o erro fica salvo em lastSyncError e aparece na tela
  }
  revalidatePath("/conexoes");
}

export async function syncAllAction() {
  const auth = await requireAuth();
  const wabas = await prisma.whatsAppAccount.findMany({ where: { workspaceId: auth.workspace.id }, select: { id: true } });
  await Promise.allSettled(wabas.map((w) => syncWaba(w.id)));
  revalidatePath("/conexoes");
  revalidatePath("/templates");
}

export async function deleteWabaAction(id: string) {
  const waba = await ownWaba(id);
  await prisma.whatsAppAccount.delete({ where: { id } });
  const left = await prisma.whatsAppAccount.count({ where: { businessId: waba.businessId } });
  if (left === 0) await prisma.businessManager.delete({ where: { id: waba.businessId } });
  revalidatePath("/conexoes");
}

export async function togglePhoneAction(phoneId: string) {
  const auth = await requireAuth();
  const phone = await prisma.phoneNumber.findFirst({ where: { id: phoneId, waba: { workspaceId: auth.workspace.id } } });
  if (!phone) return;
  await prisma.phoneNumber.update({ where: { id: phoneId }, data: { enabled: !phone.enabled } });
  revalidatePath("/conexoes");
}

export async function registerPhoneAction(phoneId: string): Promise<FormState> {
  const auth = await requireAuth();
  const phone = await prisma.phoneNumber.findFirst({ where: { id: phoneId, waba: { workspaceId: auth.workspace.id } }, include: { waba: true } });
  if (!phone) return { error: "Número não encontrado" };
  try {
    await meta.registerPhone(wabaToken(phone.waba), phone.phoneNumberId, env.metaRegisterPin());
    await syncWaba(phone.wabaId);
  } catch (err) {
    return { error: errMsg(err) };
  }
  revalidatePath("/conexoes");
  return { ok: "Número registrado na Cloud API" };
}

export async function updateBusinessAction(businessId: string, form: FormData) {
  const auth = await requireAuth();
  await prisma.businessManager.updateMany({
    where: { id: businessId, workspaceId: auth.workspace.id },
    data: { name: String(form.get("name") ?? "").trim() || undefined, notes: String(form.get("notes") ?? "") || null },
  });
  revalidatePath("/conexoes");
}

/** App Secret do app da BM: com ele o Fuzil aceita as respostas e os status que esse app manda. */
export async function setAppSecretAction(_: FormState, form: FormData): Promise<FormState> {
  const waba = await ownWaba(String(form.get("id") ?? "")).catch(() => null);
  if (!waba) return { error: "WABA não encontrada" };
  const appSecret = String(form.get("appSecret") ?? "").trim();
  if (form.get("remove")) {
    await prisma.whatsAppAccount.update({ where: { id: waba.id }, data: { appSecretEnc: null } });
  } else {
    if (!/^[a-f0-9]{32}$/i.test(appSecret)) return { error: "A chave secreta do app tem 32 letras e números (Configurações do app → Básico → Chave secreta do app)" };
    await prisma.whatsAppAccount.update({ where: { id: waba.id }, data: { appSecretEnc: encrypt(appSecret) } });
    // Reinscreve o app dessa BM na WABA apontando para o Fuzil (sem isso a Meta não manda nada)
    await ensureWebhook(waba.id).catch(() => undefined);
  }
  resetBmSecrets();
  revalidatePath("/conexoes");
  return { ok: "Salvo" };
}
