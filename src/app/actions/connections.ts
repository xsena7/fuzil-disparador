"use server";

import { friendlyError } from "@/lib/meta-errors";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { configureBmAppWebhook, connectWaba, syncWaba, wabaToken } from "@/lib/sync";
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
      const saved = await prisma.whatsAppAccount.findFirst({ where: { workspaceId: auth.workspace.id, wabaId }, select: { id: true } });
      if (saved) await configureBmAppWebhook(saved.id, appSecret);
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
    resetBmSecrets();
    // Configura sozinho o webhook do app da BM (URL do Fuzil + campos) e reinscreve na WABA
    const problem = await configureBmAppWebhook(waba.id, appSecret);
    revalidatePath("/conexoes");
    if (problem) return { error: `Chave salva, mas não consegui ligar o webhook do app sozinho (${problem}). Confira se a chave é do mesmo app do token, ou siga o passo 2.` };
    return { ok: "Chave salva e webhook do app configurado. Falta só publicar o app (Publish) no painel da Meta." };
  }
  resetBmSecrets();
  revalidatePath("/conexoes");
  return { ok: "Salvo" };
}

/** Testa o token guardado dessa WABA na Meta e devolve uma explicação em português (sem mostrar o token). */
export async function testWabaAction(id: string): Promise<{ ok?: boolean; text: string }> {
  const waba = await ownWaba(id);
  const { wabaToken } = await import("@/lib/sync");
  const { meta, MetaError } = await import("@/lib/meta");
  let token: string;
  try {
    token = wabaToken(waba);
  } catch {
    return { text: "Não há token guardado para essa conta. Conecte de novo com o token." };
  }
  try {
    const info = await meta.getWaba(token, waba.wabaId);
    return {
      ok: true,
      text: `A Meta reconhece a conta "${info.name}" e o token tem acesso a ela.${info.account_review_status ? ` Status de análise: ${info.account_review_status}.` : ""}`,
    };
  } catch (err) {
    if (err instanceof MetaError) {
      if (err.code === 100) return { text: "O ID informado não é de uma conta do WhatsApp. Use o ID da conta do WhatsApp (e não o da BM)." };
      // Sem o Tech Provider a Meta bloqueia só alguns dados da conta: confere se o token envia (lista os números)
      if (/api access blocked/i.test(err.message)) {
        const phones = await meta.listPhones(token, waba.wabaId).catch(() => null);
        if (phones)
          return { ok: true, text: `O token está funcionando e enxerga ${phones.length} número(s) dessa conta: os disparos funcionam. A Meta só não libera alguns dados extras (qualidade da conta, pagamento) até o Tech Provider ser aprovado.` };
        return { text: "A Meta bloqueou o acesso do app a essa conta (API access blocked). Confira se o app dessa BM está publicado e com as permissões de WhatsApp." };
      }
      if (err.code === 190) return { text: "O token expirou ou foi revogado. Gere um token novo (System User, sem validade) e conecte de novo." };
      if (err.code === 10 || err.code === 200) return { text: "O token não tem permissão para essa conta. Gere um token com o app dessa BM e as permissões whatsapp_business_management e whatsapp_business_messaging." };
      return { text: `A Meta respondeu com erro: ${err.message}` };
    }
    return { text: "Não consegui falar com a Meta agora. Tente de novo em instantes." };
  }
}
