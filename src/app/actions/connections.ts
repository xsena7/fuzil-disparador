"use server";

import { friendlyError } from "@/lib/meta-errors";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { configureBmAppWebhook, connectWaba, syncWaba, wabaToken } from "@/lib/sync";
import { deployBlueprints } from "@/lib/blueprints";
import { meta } from "@/lib/meta";
import { env } from "@/lib/env";
import type { FormState } from "./auth";
import { resetBmSecrets } from "@/lib/webhook";
import { defaultAppSecret } from "@/lib/onboarding";

const errMsg = friendlyError;

export async function connectManualAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER" && !auth.user.isSuperAdmin) return { error: "Só o dono ou um admin da conta pode conectar BMs." };
  const typedId = String(form.get("wabaId") ?? "").trim();
  const token = String(form.get("token") ?? "").trim();
  if (typedId && !/^\d+$/.test(typedId)) return { error: "O ID da WABA tem só números (ou deixe em branco que o Fuzil acha pelo token)" };
  // O token do Tech Provider tem acesso às WABAs de todos os clientes: só o admin da plataforma pode usar sem token
  if (!token && !auth.user.isSuperAdmin) return { error: "Cole o token de acesso da WABA (token do usuário do sistema da sua BM)." };
  if (!token && !env.metaSystemToken()) return { error: "Informe um token de acesso (ou configure o token do Tech Provider)" };
  if (!token && !typedId) return { error: "Sem token, informe o ID da WABA" };

  // Sem ID: o Fuzil descobre pelo token quais contas do WhatsApp o usuário do sistema acessa e conecta todas
  let ids = typedId ? [typedId] : [];
  if (!ids.length) {
    ids = await meta.wabaIdsOfSystemToken(token).catch(() => []);
    if (!ids.length)
      return { error: "Não achei nenhuma conta do WhatsApp nesse token. Confira se o usuário do sistema fuzil-api tem a conta do WhatsApp em Atribuir ativos e gere o token de novo (ou cole o ID da WABA)." };
  }

  let appSecret = String(form.get("appSecret") ?? "").trim();
  // Sem chave no formulário: usa a chave secreta padrão (da conta ou a do app do Fuzil)
  if (!appSecret) appSecret = (await defaultAppSecret(auth.workspace.id)) ?? "";
  const ok: string[] = [];
  const failed: string[] = [];
  for (const wabaId of ids) {
    try {
      await connectWaba({ workspaceId: auth.workspace.id, wabaId, accessTokenEnc: token ? encrypt(token) : null, connectionType: "MANUAL" });
      if (/^[a-f0-9]{32}$/i.test(appSecret)) {
        await prisma.whatsAppAccount.updateMany({ where: { workspaceId: auth.workspace.id, wabaId }, data: { appSecretEnc: encrypt(appSecret) } });
        resetBmSecrets();
        const saved = await prisma.whatsAppAccount.findFirst({ where: { workspaceId: auth.workspace.id, wabaId }, select: { id: true } });
        if (saved) await configureBmAppWebhook(saved.id, appSecret);
      }
      ok.push(wabaId);
    } catch (err) {
      failed.push(`${wabaId}: ${errMsg(err)}`);
    }
  }
  if (ok.length) deployBlueprints(auth.workspace.id).catch(() => undefined);
  revalidatePath("/conexoes");
  if (!ok.length) return { error: `Não foi possível conectar: ${failed.join(" · ")}` };
  if (typedId) return { ok: "WABA conectada e sincronizada" };
  return { ok: `${ok.length} conta(s) do WhatsApp achada(s) pelo token e conectada(s)${failed.length ? `. Não deu em ${failed.length}: ${failed.join(" · ")}` : ""}` };
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
  // 4 por vez, para não estourar o limite de chamadas da Meta com muitas BMs
  for (let i = 0; i < wabas.length; i += 4) await Promise.allSettled(wabas.slice(i, i + 4).map((w) => syncWaba(w.id)));
  revalidatePath("/conexoes");
  revalidatePath("/templates");
  revalidatePath("/grupos");
  revalidatePath("/");
}

export async function deleteWabaAction(id: string) {
  const waba = await ownWaba(id);
  await prisma.whatsAppAccount.delete({ where: { id } });
  const left = await prisma.whatsAppAccount.count({ where: { businessId: waba.businessId } });
  if (left === 0) await prisma.businessManager.delete({ where: { id: waba.businessId } });
  revalidatePath("/conexoes");
}

/**
 * Exclui a BM do Fuzil por completo (ex.: foi banida): contas do WhatsApp, números, templates, conversas do chat,
 * grupos, alertas dela. As campanhas antigas continuam (só perdem o vínculo com os números dela). Nada é apagado na Meta.
 */
export async function deleteBusinessAction(businessId: string): Promise<{ ok?: string; error?: string }> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER") return { error: "Só donos e admins excluem BMs" };
  const bm = await prisma.businessManager.findFirst({
    where: { id: businessId, workspaceId: auth.workspace.id },
    include: { wabas: { select: { id: true, wabaId: true, name: true } } },
  });
  if (!bm) return { error: "BM não encontrada" };
  const wabaIds = bm.wabas.map((w) => w.id);
  const running = await prisma.campaign.count({
    where: { workspaceId: auth.workspace.id, status: "RUNNING", recipients: { some: { status: "SENDING", sender: { wabaId: { in: wabaIds } } } } },
  });
  if (running) return { error: "Essa BM está enviando uma campanha agora. Pause a campanha e tente de novo." };
  await prisma.$transaction([
    // Alertas que falam dela (pelo nome da BM ou de uma conta dela)
    prisma.alert.deleteMany({
      where: {
        workspaceId: auth.workspace.id,
        OR: [bm.name, ...bm.wabas.map((w) => w.name), ...bm.wabas.map((w) => w.wabaId)].filter((t) => t && t.length > 3).flatMap((t) => [{ title: { contains: t } }, { message: { contains: t } }]),
      },
    }),
    // Grupo escondido de "disparar só por esta BM"
    prisma.bmGroup.deleteMany({ where: { workspaceId: auth.workspace.id, system: `BM:${bm.id}` } }),
    // Apaga em cascata: contas do WhatsApp, números, templates, cópias de templates padrão, conversas e participação em grupos
    prisma.businessManager.delete({ where: { id: bm.id } }),
  ]);
  revalidatePath("/conexoes");
  revalidatePath("/grupos");
  return { ok: `"${bm.name}" foi excluída do Fuzil, com as contas, números, templates e conversas dela. Na Meta nada foi apagado.` };
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

/**
 * Admin: chave secreta padrão. Toda BM nova conectada manualmente recebe ela sozinha.
 * Ao trocar, dá para trocar também nas BMs que usam a chave antiga (e o webhook é ligado de novo nelas).
 */
export async function saveDefaultAppSecretAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  if (!auth.user.isSuperAdmin) return { error: "Só administradores do Fuzil podem definir a chave padrão." };
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: auth.workspace.id }, select: { defaultAppSecretEnc: true } });
  if (form.get("remove")) {
    await prisma.workspace.update({ where: { id: auth.workspace.id }, data: { defaultAppSecretEnc: null } });
    revalidatePath("/conexoes");
    return { ok: "Chave padrão removida. As próximas BMs voltam a pedir a chave secreta na conexão." };
  }
  const appSecret = String(form.get("appSecret") ?? "").trim();
  if (!/^[a-f0-9]{32}$/i.test(appSecret)) return { error: "A chave secreta do app tem 32 letras e números (Configurações do app → Básico → Chave secreta do app)." };
  const old = ws.defaultAppSecretEnc ? decrypt(ws.defaultAppSecretEnc) : null;
  await prisma.workspace.update({ where: { id: auth.workspace.id }, data: { defaultAppSecretEnc: encrypt(appSecret) } });
  let changed = 0;
  if (form.get("applyExisting")) {
    // Troca nas BMs que estavam com a chave antiga (ou sem chave nenhuma)
    const wabas = await prisma.whatsAppAccount.findMany({ where: { workspaceId: auth.workspace.id, connectionType: "MANUAL" }, select: { id: true, appSecretEnc: true } });
    for (const w of wabas) {
      let current: string | null = null;
      try {
        current = w.appSecretEnc ? decrypt(w.appSecretEnc) : null;
      } catch {
        current = null;
      }
      if (current && current !== old) continue; // BM com chave de outro app: não mexe
      await prisma.whatsAppAccount.update({ where: { id: w.id }, data: { appSecretEnc: encrypt(appSecret) } });
      await configureBmAppWebhook(w.id, appSecret).catch(() => null);
      changed++;
    }
    resetBmSecrets();
  }
  revalidatePath("/conexoes");
  return { ok: `Chave padrão salva! As próximas BMs conectadas já recebem ela sozinha.${changed ? ` Trocada também em ${changed} conta(s) que usavam a chave antiga.` : ""}` };
}

/** Troca o token e/ou a chave secreta de uma WABA já conectada (o ID da WABA continua o mesmo). Campo em branco = mantém. */
export async function updateWabaCredentialsAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const waba = await ownWaba(id).catch(() => null);
  if (!waba) return { error: "Conta não encontrada" };
  const token = String(form.get("token") ?? "").trim();
  const appSecret = String(form.get("appSecret") ?? "").trim();
  if (!token && !appSecret) return { error: "Cole o token novo, a chave secreta nova, ou os dois." };
  if (appSecret && !/^[a-f0-9]{32}$/i.test(appSecret)) return { error: "A chave secreta do app tem 32 letras e números (Configurações do app → Básico → Chave secreta do app)." };
  const { meta } = await import("@/lib/meta");
  if (token) {
    // Confere na Meta se o token novo enxerga essa conta antes de trocar
    const ok = await meta.getWaba(token, waba.wabaId).then(() => true).catch(() => meta.listPhones(token, waba.wabaId).then(() => true).catch(() => false));
    if (!ok) return { error: "A Meta não deu acesso a essa conta com o token novo. Confira se o token é do usuário do sistema dessa BM e tem a conta do WhatsApp atribuída." };
  }
  await prisma.whatsAppAccount.update({
    where: { id: waba.id },
    data: { ...(token ? { accessTokenEnc: encrypt(token), lastSyncError: null } : {}), ...(appSecret ? { appSecretEnc: encrypt(appSecret) } : {}) },
  });
  let webhookProblem: string | null = null;
  if (appSecret) {
    resetBmSecrets();
    // Liga o webhook do app (URL do Fuzil + campos) e reinscreve na WABA
    webhookProblem = await configureBmAppWebhook(waba.id, appSecret);
  }
  void syncWaba(waba.id).catch(() => undefined);
  revalidatePath("/conexoes");
  const what = token && appSecret ? "Token e chave secreta atualizados" : token ? "Token atualizado" : "Chave secreta atualizada";
  if (webhookProblem) return { error: `${what}, mas não consegui ligar o webhook do app sozinho (${webhookProblem}). Confira se a chave é do mesmo app do token.` };
  return { ok: `${what}! O Fuzil já está sincronizando essa conta de novo.` };
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
      if (/api access blocked/i.test(err.message))
        return { text: "A Meta bloqueou o app dessa BM (API access blocked), e ela não dispara assim. Entre em developers.facebook.com com a conta dona do app e conclua a verificação que a Meta pedir (código no e-mail/celular ou identidade). Depois, clique em Testar conexão de novo." };
      if (err.code === 190) return { text: "O token expirou ou foi revogado. Gere um token novo (System User, sem validade) e conecte de novo." };
      if (err.code === 10 || err.code === 200) return { text: "O token não tem permissão para essa conta. Gere um token com o app dessa BM e as permissões whatsapp_business_management e whatsapp_business_messaging." };
      return { text: `A Meta respondeu com erro: ${err.message}` };
    }
    return { text: "Não consegui falar com a Meta agora. Tente de novo em instantes." };
  }
}
