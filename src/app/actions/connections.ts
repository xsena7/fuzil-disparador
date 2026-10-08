"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { connectWaba, syncWaba, wabaToken } from "@/lib/sync";
import { deployBlueprints } from "@/lib/blueprints";
import { meta } from "@/lib/meta";
import { env } from "@/lib/env";
import type { FormState } from "./auth";

function errMsg(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export async function connectManualAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const wabaId = String(form.get("wabaId") ?? "").trim();
  const token = String(form.get("token") ?? "").trim();
  if (!/^\d{5,}$/.test(wabaId)) return { error: "Informe o ID da WABA (só números)" };
  if (!token && !env.metaSystemToken()) return { error: "Informe um token de acesso (ou configure o token do Tech Provider)" };
  try {
    await connectWaba({ workspaceId: auth.workspace.id, wabaId, accessTokenEnc: token ? encrypt(token) : null, connectionType: "MANUAL" });
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
