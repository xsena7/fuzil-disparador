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
import { FUZIL_APP_ID, defaultAppSecret, isPlatformOwner } from "@/lib/onboarding";

const errMsg = friendlyError;
import { metaDetail, metaErrorText } from "@/lib/meta-errors";

/** Conexão manual: ID da conta do WhatsApp (opcional) + token do usuário do sistema da BM. Sem ID, o Fuzil acha as contas pelo token. */
export async function connectManualAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER" && !auth.user.isSuperAdmin) return { error: "Só o dono ou um admin da conta pode conectar BMs." };
  const typedId = String(form.get("wabaId") ?? "").trim();
  const token = String(form.get("token") ?? "").trim();
  if (typedId && !/^\d+$/.test(typedId)) return { error: "O ID da conta do WhatsApp tem só números (ou deixe em branco que o Fuzil acha pelo token)." };
  if (!token) return { error: "Cole o token de acesso (do usuário do sistema da sua BM)." };

  // Chave no formulário só vale para o dono do Fuzil; os outros sempre usam a chave padrão
  let appSecret = (await isPlatformOwner(auth.user.id)) ? String(form.get("appSecret") ?? "").trim() : "";
  if (!appSecret) appSecret = (await defaultAppSecret(auth.workspace.id)) ?? "";

  let ids = typedId ? [typedId] : [];
  if (!ids.length) {
    const found = await meta.wabaIdsOfSystemToken(token, appSecret ? { [FUZIL_APP_ID]: appSecret } : {}).catch((e) => ({ ids: [] as string[], why: friendlyError(e) }));
    ids = found.ids;
    if (!ids.length)
      return {
        error: `Não achei nenhuma conta do WhatsApp nesse token. Confira se o usuário do sistema tem a conta do WhatsApp em "Atribuir ativos" e gere o token de novo depois disso (token antigo não enxerga conta nova).${found.why ? ` ${found.why}` : ""}`,
      };
  }
  const ok: string[] = [];
  const failed: string[] = [];
  for (const wabaId of ids) {
    try {
      await connectWaba({ workspaceId: auth.workspace.id, wabaId, accessTokenEnc: encrypt(token), connectionType: "MANUAL" });
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
  if (!ok.length) return { error: `Não foi possível conectar. ${failed.join(" · ")}` };
  if (typedId) return { ok: "BM conectada e sincronizada!" };
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

/** Ids das contas do WhatsApp do workspace, para o painel verificar uma por vez (com progresso). */
export async function verifyWabaIdsAction() {
  const auth = await requireAuth();
  const wabas = await prisma.whatsAppAccount.findMany({ where: { workspaceId: auth.workspace.id }, select: { id: true } });
  return wabas.map((w) => w.id);
}

/** Confere um lote de contas em paralelo (token e avisos da Meta, igual ao Testar conexão, depois sincroniza).
 *  O navegador manda os lotes em sequência, para mostrar a % andando. */
export async function verifyWabasAction(ids: string[]) {
  const auth = await requireAuth();
  const wabas = await prisma.whatsAppAccount.findMany({ where: { id: { in: ids }, workspaceId: auth.workspace.id } });
  await Promise.allSettled(
    wabas.map(async (w) => {
      try {
        await checkWebhookChain(w, wabaToken(w));
      } catch {
        // sem token ou a Meta não respondeu: a sincronização mostra o erro
      }
      await syncWaba(w.id);
    }),
  );
  return wabas.length;
}

/** Último passo do "Verificar todas": devolve às BMs saudáveis os grupos de antes. */
export async function finishVerifyAction() {
  const auth = await requireAuth();
  const back = await restoreHealthyBms(auth.workspace.id);
  revalidatePath("/conexoes");
  revalidatePath("/templates");
  revalidatePath("/grupos");
  revalidatePath("/");
  return { ok: `Verifiquei as contas do WhatsApp na Meta${back ? ` e ${back} BM(s) voltaram para os grupos de disparo` : ""}.` };
}

export async function syncAllAction() {
  const auth = await requireAuth();
  const wabas = await prisma.whatsAppAccount.findMany({ where: { workspaceId: auth.workspace.id }, select: { id: true } });
  // Em lotes de 6, para não estourar o limite de chamadas da Meta com muitas BMs
  for (let i = 0; i < wabas.length; i += 6) await verifyWabasAction(wabas.slice(i, i + 6).map((w) => w.id));
  const back = await restoreHealthyBms(auth.workspace.id);
  revalidatePath("/conexoes");
  revalidatePath("/templates");
  revalidatePath("/grupos");
  revalidatePath("/");
  return { ok: `Verifiquei ${wabas.length} conta(s) do WhatsApp na Meta${back ? ` e ${back} BM(s) voltaram para os grupos de disparo` : ""}.` };
}

/** BM que estava num grupo de problema e agora está tudo certo volta na hora para os grupos de antes.
 *  As colocadas à mão continuam esperando o "Resolvido". */
async function restoreHealthyBms(workspaceId: string) {
  const { restoreBusiness } = await import("@/lib/bm-problems");
  const flagged = await prisma.businessManager.findMany({
    where: { workspaceId, problemAt: { not: null }, NOT: { problemKind: "MANUAL" } },
    include: { wabas: { include: { phones: { where: { invalidReason: null } }, templates: { select: { category: true, status: true } } } } },
  });
  const { bmAptidao } = await import("@/lib/readiness");
  let back = 0;
  for (const bm of flagged) {
    const bad = bm.wabas.some((w) => w.lastSyncError || w.status === "BLOCKED" || w.hasPaymentMethod === false || w.phones.some((p) => p.qualityRating === "RED" || ["BANNED", "RESTRICTED", "FLAGGED"].includes(p.status ?? "")));
    if (!bad && bmAptidao(bm.wabas).apta) {
      await restoreBusiness(bm.id, workspaceId, false);
      back++;
    }
  }
  return back;
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

/**
 * Coloca um número novo na WABA direto pelo Fuzil (sem entrar no perfil do Facebook) e já manda o código por SMS.
 * Depois é só digitar o código: o Fuzil confirma e registra o número na Cloud API.
 */
export async function addPhoneAction(wabaRecordId: string, _: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const waba = await prisma.whatsAppAccount.findFirst({ where: { id: wabaRecordId, workspaceId: auth.workspace.id }, include: { business: true, phones: { select: { verifiedName: true } } } });
  if (!waba) return { error: "WABA não encontrada" };
  let digits = String(form.get("phone") ?? "").replace(/\D/g, "");
  // Sem o 55 na frente: é número do Brasil (DDD + número)
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!/^55\d{10,11}$/.test(digits)) return { error: "Digite o número com DDD (ex.: 11 91234-5678). Só números do Brasil." };
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  if (name.length < 3) return { error: "Escreva o nome de exibição (o nome que aparece no WhatsApp)." };
  const method = form.get("method") === "VOICE" ? "VOICE" : "SMS";
  const token = wabaToken(waba);
  // Duas etapas na Meta: colocar o número na WABA e mandar o código. O erro diz em qual a Meta recusou
  let added = false;
  try {
    const { id } = await meta.addPhone(token, waba.wabaId, "55", digits.slice(2), name);
    added = true;
    await meta.requestCode(token, id, method);
    await syncWaba(waba.id);
  } catch (err) {
    if (added) {
      await syncWaba(waba.id).catch(() => undefined);
      return { error: `O número entrou na WABA, mas a Meta recusou mandar o código: ${metaDetail(err)}. Tente pedir o código de novo no número, aqui embaixo.` };
    }
    return {
      error: `A Meta recusou colocar o número na WABA: ${metaDetail(err)}. Se a BM já tem 2 números (incluindo pendentes), ela está no limite da Meta: apague os números que sobraram no WhatsApp Manager.`,
    };
  }
  revalidatePath("/conexoes");
  return { ok: `Número adicionado! A Meta mandou um código ${method === "VOICE" ? "por ligação" : "por SMS"} para ele. Digite o código no número, logo abaixo, para terminar.` };
}

/** Manda (de novo) o código de confirmação para um número que ainda não foi confirmado. */
export async function requestPhoneCodeAction(phoneId: string, method: "SMS" | "VOICE"): Promise<FormState> {
  const auth = await requireAuth();
  const phone = await prisma.phoneNumber.findFirst({ where: { id: phoneId, waba: { workspaceId: auth.workspace.id } }, include: { waba: true } });
  if (!phone) return { error: "Número não encontrado" };
  try {
    await meta.requestCode(wabaToken(phone.waba), phone.phoneNumberId, method);
  } catch (err) {
    return { error: errMsg(err) };
  }
  return { ok: method === "VOICE" ? "A Meta vai ligar para o número com o código." : "Código enviado por SMS para o número." };
}

/** Confirma o código que chegou no número e já registra ele na Cloud API (pronto para disparar). */
export async function verifyPhoneAction(phoneId: string, _: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const phone = await prisma.phoneNumber.findFirst({ where: { id: phoneId, waba: { workspaceId: auth.workspace.id } }, include: { waba: true } });
  if (!phone) return { error: "Número não encontrado" };
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "O código tem 6 números." };
  const token = wabaToken(phone.waba);
  try {
    await meta.verifyCode(token, phone.phoneNumberId, code);
    await meta.registerPhone(token, phone.phoneNumberId, env.metaRegisterPin());
    await syncWaba(phone.wabaId);
  } catch (err) {
    return { error: errMsg(err) };
  }
  revalidatePath("/conexoes");
  return { ok: "Número confirmado e registrado! Ele já entra no rodízio dos disparos." };
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
  if (!(await isPlatformOwner((await requireAuth()).user.id))) return { error: "Só o dono do Fuzil troca a chave secreta." };
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
  if (!auth.user.isSuperAdmin || auth.inspecting || !(await isPlatformOwner(auth.user.id))) return { error: "Só o dono do Fuzil pode definir a chave padrão." };
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
  // Chave secreta: só o dono do Fuzil troca (os outros nem veem o campo)
  const owner = await isPlatformOwner((await requireAuth()).user.id);
  const appSecret = owner ? String(form.get("appSecret") ?? "").trim() : "";
  if (!token && !appSecret) return { error: owner ? "Cole o token novo, a chave secreta nova, ou os dois." : "Cole o token novo." };
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
/**
 * Confere o caminho dos avisos da Meta (entregue, lida, resposta, falha) e conserta o que der:
 * a WABA inscrita no app do token e o webhook do app apontando para o Fuzil com o campo "messages".
 */
async function checkWebhookChain(waba: { id: string; wabaId: string; appSecretEnc: string | null; workspaceId: string }, token: string): Promise<string> {
  const { meta } = await import("@/lib/meta");
  const { WEBHOOK_FIELDS } = await import("@/lib/sync");
  const url = `${env.appUrl()}/api/webhook`;
  const appId = await meta.appIdOf(token);
  const fixed: string[] = [];

  // 1) A conta do WhatsApp está inscrita no app que gerou o token?
  const subs = await meta.subscribedApps(token, waba.wabaId);
  const list = subs.data ?? [];
  const inscrita = list.some((a) => a.whatsapp_business_api_data?.id === appId);
  if (!inscrita || !list.some((a) => a.whatsapp_business_api_data?.id === appId && a.override_callback_uri === url)) {
    await meta.subscribeApp(token, waba.wabaId, env.metaVerifyToken() ? { callbackUrl: url, verifyToken: env.metaVerifyToken() } : undefined);
    await prisma.whatsAppAccount.update({ where: { id: waba.id }, data: { webhookSubscribed: true } });
    fixed.push("liguei a conta do WhatsApp no app");
  }

  // 2) O app manda os avisos para o Fuzil, com o campo "messages"?
  // Tenta a chave guardada na conta e a chave padrão (conta que trocou para o token do app do Fuzil ainda tem a chave do app antigo)
  const own = waba.appSecretEnc ? decrypt(waba.appSecretEnc) : null;
  const fallback = await defaultAppSecret(waba.workspaceId);
  const candidates = [...new Set([own, fallback].filter((x): x is string => Boolean(x)))];
  if (!candidates.length) return `Avisos da Meta: ${fixed.length ? `${fixed.join(" e ")}. ` : ""}não consigo conferir o webhook do app sem a chave secreta.`;
  let app: { callback_url?: string; active?: boolean; fields?: Array<{ name: string }> } | undefined;
  let secret: string | null = null;
  let lastErr = "";
  for (const c of candidates) {
    try {
      app = ((await meta.appSubscriptions(appId, c)).data ?? []).find((d) => d.object === "whatsapp_business_account");
      secret = c;
      break;
    } catch (e) {
      lastErr = friendlyError(e);
    }
  }
  if (!secret) return `Avisos da Meta: nenhuma chave secreta cadastrada é do app que gerou o token (${lastErr}). O dono do Fuzil precisa cadastrar a chave desse app.`;
  if (secret !== own) {
    // A chave que serve é a padrão: guarda nessa conta (os avisos dela passam a ser aceitos)
    await prisma.whatsAppAccount.update({ where: { id: waba.id }, data: { appSecretEnc: encrypt(secret) } });
    resetBmSecrets();
    fixed.push("troquei a chave secreta dessa conta pela do app do token");
  }
  const hasMessages = app?.fields?.some((f) => f.name === "messages");
  if (!app || !app.active || !hasMessages || (app.callback_url && !app.callback_url.startsWith(env.appUrl()))) {
    if (!env.appUrl().startsWith("https://") || !env.metaVerifyToken()) return "Avisos da Meta: o webhook do app não está ligado e o painel precisa estar em https com o token de verificação para ligar.";
    await meta.setAppWebhook(appId, secret, url, env.metaVerifyToken(), WEBHOOK_FIELDS);
    fixed.push("liguei o webhook do app no Fuzil (com entregas, leituras e respostas)");
  }
  return fixed.length
    ? `Avisos da Meta: ${fixed.join(", ")}. Os próximos envios já devem mostrar entregue/lida.`
    : "Avisos da Meta: tudo ligado (conta inscrita no app e webhook apontando para o Fuzil).";
}

/** O texto dos avisos indica problema que o Fuzil não conseguiu resolver sozinho? */
const hooksFailed = (t: string) => /nenhuma chave|não consigo|não consegui|precisa estar em https/i.test(t);

/** Permissões do token (debug_token com o token do app): diz qual falta para enviar por essa conta. */
async function checkTokenScopes(waba: { wabaId: string; appSecretEnc: string | null; workspaceId: string }, token: string): Promise<{ ok: boolean; text: string } | null> {
  const appId = await meta.appIdOf(token).catch(() => null);
  if (!appId) return null;
  const secrets = [...new Set([waba.appSecretEnc ? decrypt(waba.appSecretEnc) : null, await defaultAppSecret(waba.workspaceId)].filter((x): x is string => Boolean(x)))];
  for (const secret of secrets) {
    const url = new URL(`${env.metaGraphUrl()}/${env.metaGraphVersion()}/debug_token`);
    url.searchParams.set("input_token", token);
    url.searchParams.set("access_token", `${appId}|${secret}`);
    const json = (await fetch(url, { signal: AbortSignal.timeout(20_000) }).then((r) => r.json()).catch(() => null)) as {
      data?: { scopes?: string[]; granular_scopes?: Array<{ scope: string; target_ids?: string[] }>; error?: unknown };
      error?: unknown;
    } | null;
    if (!json?.data || json.error) continue;
    const scopes = json.data.scopes ?? [];
    // Para enviar e sincronizar só são necessárias estas duas (business_management não é usada e o token do cadastro pelo botão não a recebe)
    const need = ["whatsapp_business_messaging", "whatsapp_business_management"];
    const missing = need.filter((n) => !scopes.includes(n));
    // Com a lista de contas: a conta do WhatsApp tem que estar liberada para enviar
    const msg = json.data.granular_scopes?.find((g) => g.scope === "whatsapp_business_messaging");
    const notThisWaba = msg?.target_ids?.length && !msg.target_ids.includes(waba.wabaId);
    if (missing.length)
      return { ok: false, text: `Permissões do token: falta ${missing.join(", ")}. Gere o token do fuzil-api de novo marcando as 3 permissões e cole em Atualizar token.` };
    if (notThisWaba)
      return { ok: false, text: "Permissões do token: o token pode enviar mensagens, mas não por essa conta do WhatsApp. No fuzil-api, em Atribuir ativos, dê Controle total nessa conta e gere o token de novo." };
    return { ok: true, text: "Permissões do token: as 3 certinhas." };
  }
  return null;
}

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
    const scopes = await checkTokenScopes(waba, token).catch(() => null);
    const hooks = await checkWebhookChain(waba, token).catch((e) => `Não consegui conferir os avisos da Meta: ${friendlyError(e)}`);
    return {
      ok: !hooksFailed(hooks) && scopes?.ok !== false,
      text: `A Meta reconhece a conta "${info.name}" e o token tem acesso a ela.${info.account_review_status ? ` Análise da Meta: ${({ APPROVED: "aprovada", PENDING: "em análise", REJECTED: "reprovada" } as Record<string, string>)[info.account_review_status] ?? info.account_review_status}.` : ""}${scopes ? ` ${scopes.text}` : ""} ${hooks}`,
    };
  } catch (err) {
    if (err instanceof MetaError) {
      if (err.code === 100) return { text: "O ID informado não é de uma conta do WhatsApp. Use o ID da conta do WhatsApp (e não o da BM)." };
      if (/api access blocked/i.test(err.message))
        return { text: "A Meta bloqueou o app dessa BM (API access blocked), e ela não dispara assim. Entre em developers.facebook.com com a conta dona do app e conclua a verificação que a Meta pedir (código no e-mail/celular ou identidade). Depois, clique em Testar conexão de novo." };
      if (err.code === 190) return { text: "O token expirou ou foi revogado. Gere um token novo (System User, sem validade) e conecte de novo." };
      if (err.code === 10 || err.code === 200) return { text: "O token não tem permissão para essa conta. Gere o token do fuzil-api de novo, com o app do Fuzil e as 3 permissões: whatsapp_business_messaging, whatsapp_business_management e business_management." };
      return { text: `A Meta respondeu com erro. ${metaErrorText(err.code, err.message, err.details)}` };
    }
    return { text: "Não consegui falar com a Meta agora. Tente de novo em instantes." };
  }
}

// ---------------- Contas compartilhadas com a BM do Fuzil (parceria) · só o dono do Fuzil ----------------

export type SharedWaba = { id: string; name: string; owner: string | null; via: string; connectedIn: string | null; here: boolean };

async function requireOwner() {
  const auth = await requireAuth();
  if (!(await isPlatformOwner(auth.user.id))) throw new Error("Só o dono do Fuzil pode fazer isso.");
  return auth;
}

/** Lista as contas do WhatsApp que clientes compartilharam com a BM do Fuzil (adicionando como parceira). */
export async function listSharedWabasAction(): Promise<{ wabas?: SharedWaba[]; error?: string }> {
  const auth = await requireOwner();
  const token = env.metaSystemToken();
  if (!token) return { error: "Falta o token do usuário do sistema da BM do Fuzil (Admin → Plataforma → Token do System User)." };
  try {
    const { wabas } = await meta.sharedWabas(token);
    const known = await prisma.whatsAppAccount.findMany({ where: { wabaId: { in: wabas.map((w) => w.id) } }, select: { wabaId: true, workspaceId: true, workspace: { select: { name: true } } } });
    return {
      wabas: wabas.map((w) => {
        const k = known.find((x) => x.wabaId === w.id);
        return { ...w, connectedIn: k?.workspace.name ?? null, here: k?.workspaceId === auth.workspace.id };
      }),
    };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

/** Conecta uma conta compartilhada nesta conta do Fuzil: dá acesso ao usuário do sistema e sincroniza. */
export async function connectSharedWabaAction(wabaId: string): Promise<FormState> {
  const auth = await requireOwner();
  const token = env.metaSystemToken();
  if (!token) return { error: "Falta o token do usuário do sistema da BM do Fuzil." };
  if (!/^\d+$/.test(wabaId)) return { error: "Conta inválida." };
  try {
    const { userId } = await meta.sharedWabas(token).catch(() => ({ userId: null as string | null }));
    // Sem essa atribuição o usuário do sistema enxerga a conta mas não manda mensagem (se já tiver, a Meta só confirma)
    if (userId) await meta.assignSystemUser(token, wabaId, userId).catch((e) => console.error("[parceria] atribuir", wabaId, friendlyError(e)));
    await connectWaba({ workspaceId: auth.workspace.id, wabaId, accessTokenEnc: null, connectionType: "MANUAL" });
  } catch (e) {
    return { error: friendlyError(e) };
  }
  deployBlueprints(auth.workspace.id).catch(() => undefined);
  revalidatePath("/conexoes");
  return { ok: `Conta conectada em ${auth.workspace.name}!` };
}
