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

export async function connectManualAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER" && !auth.user.isSuperAdmin) return { error: "Só o dono ou um admin da conta pode conectar BMs." };
  const typedId = String(form.get("wabaId") ?? "").trim();
  const token = String(form.get("token") ?? "").trim();
  if (typedId && !/^\d+$/.test(typedId)) return { error: "O ID da WABA tem só números (ou deixe em branco que o Fuzil acha pelo token)" };
  // O token do Tech Provider tem acesso às WABAs de todos os clientes: só o admin da plataforma pode usar sem token
  if (!token) return { error: "Cole o token de acesso (token do usuário do sistema fuzil-api da sua BM)." };

  // Sem ID: o Fuzil descobre pelo token quais contas do WhatsApp o usuário do sistema acessa e conecta todas
  // Chave no formulário só vale para o dono do Fuzil; os outros sempre usam a chave padrão
  let appSecret = (await isPlatformOwner(auth.user.id)) ? String(form.get("appSecret") ?? "").trim() : "";
  // Sem chave no formulário: usa a chave secreta padrão (da conta ou a do app do Fuzil)
  if (!appSecret) appSecret = (await defaultAppSecret(auth.workspace.id)) ?? "";

  let ids = typedId ? [typedId] : [];
  if (!ids.length) {
    // A chave do app do Fuzil deixa perguntar à Meta quais contas o token do cliente acessa
    const found = await meta.wabaIdsOfSystemToken(token, appSecret ? { [FUZIL_APP_ID]: appSecret } : {}).catch((e) => ({ ids: [] as string[], why: String(e) }));
    ids = found.ids;
    if (!ids.length)
      return {
        error: `Não achei nenhuma conta do WhatsApp nesse token. Confira se o fuzil-api tem a conta do WhatsApp em Atribuir ativos e gere o token de novo depois disso (token antigo não enxerga ativo novo).${found.why ? ` Resposta da Meta: ${found.why}` : ""}`,
      };
  }
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
  // Em cada conta: confere o token e os avisos da Meta (igual ao Testar conexão) e sincroniza
  const check = async (id: string) => {
    const w = await prisma.whatsAppAccount.findUnique({ where: { id } });
    if (!w) return;
    try {
      await checkWebhookChain(w, wabaToken(w));
    } catch {
      // sem token ou a Meta não respondeu: a sincronização mostra o erro
    }
    await syncWaba(id);
  };
  for (let i = 0; i < wabas.length; i += 4) await Promise.allSettled(wabas.slice(i, i + 4).map((w) => check(w.id)));
  // BM que estava num grupo de problema e agora está tudo certo volta na hora para os grupos de antes
  // (as colocadas à mão continuam esperando o "Resolvido")
  const { restoreBusiness } = await import("@/lib/bm-problems");
  const flagged = await prisma.businessManager.findMany({
    where: { workspaceId: auth.workspace.id, problemAt: { not: null }, NOT: { problemKind: "MANUAL" } },
    include: { wabas: { include: { phones: { where: { invalidReason: null } }, templates: { select: { category: true, status: true } } } } },
  });
  const { bmAptidao } = await import("@/lib/readiness");
  let back = 0;
  for (const bm of flagged) {
    const bad = bm.wabas.some((w) => w.lastSyncError || w.status === "BLOCKED" || w.hasPaymentMethod === false || w.phones.some((p) => p.qualityRating === "RED" || ["BANNED", "RESTRICTED", "FLAGGED"].includes(p.status ?? "")));
    if (!bad && bmAptidao(bm.wabas).apta) {
      await restoreBusiness(bm.id, auth.workspace.id, false);
      back++;
    }
  }
  revalidatePath("/conexoes");
  revalidatePath("/templates");
  revalidatePath("/grupos");
  revalidatePath("/");
  return { ok: `Verifiquei ${wabas.length} conta(s) do WhatsApp na Meta${back ? ` e ${back} BM(s) voltaram para os grupos de disparo` : ""}.` };
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
      lastErr = e instanceof Error ? e.message : String(e);
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
    const need = ["whatsapp_business_messaging", "whatsapp_business_management", "business_management"];
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
    const hooks = await checkWebhookChain(waba, token).catch((e) => `Não consegui conferir os avisos da Meta: ${e instanceof Error ? e.message : String(e)}`);
    return {
      ok: !hooksFailed(hooks) && scopes?.ok !== false,
      text: `A Meta reconhece a conta "${info.name}" e o token tem acesso a ela.${info.account_review_status ? ` Status de análise: ${info.account_review_status}.` : ""}${scopes ? ` ${scopes.text}` : ""} ${hooks}`,
    };
  } catch (err) {
    if (err instanceof MetaError) {
      if (err.code === 100) return { text: "O ID informado não é de uma conta do WhatsApp. Use o ID da conta do WhatsApp (e não o da BM)." };
      if (/api access blocked/i.test(err.message))
        return { text: "A Meta bloqueou o app dessa BM (API access blocked), e ela não dispara assim. Entre em developers.facebook.com com a conta dona do app e conclua a verificação que a Meta pedir (código no e-mail/celular ou identidade). Depois, clique em Testar conexão de novo." };
      if (err.code === 190) return { text: "O token expirou ou foi revogado. Gere um token novo (System User, sem validade) e conecte de novo." };
      if (err.code === 10 || err.code === 200) return { text: "O token não tem permissão para essa conta. Gere o token do fuzil-api de novo, com o app do Fuzil e as 3 permissões: whatsapp_business_messaging, whatsapp_business_management e business_management." };
      return { text: `A Meta respondeu com erro: ${err.message}` };
    }
    return { text: "Não consegui falar com a Meta agora. Tente de novo em instantes." };
  }
}
