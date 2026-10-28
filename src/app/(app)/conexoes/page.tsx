import { AlertTriangle, CheckCircle2, ChevronRight, CreditCard, KeyRound, MessagesSquare, RefreshCw, Phone, Plus, Trash2 } from "lucide-react";
import { metaBillingUrl } from "@/lib/meta-links";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { tierLabel } from "@/lib/limits";
import { formatPhone } from "@/lib/phone";
import { Badge, Card, Empty, Field, Input, PageHeader } from "@/components/ui";
import { PhoneStatusBadge, QualityBadge } from "@/components/status";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { LimitWindow } from "@/components/limit-card";
import { bmWindows } from "@/lib/limit-windows";
import { wabaReadiness } from "@/lib/readiness";
import { PHONE_DISCARDED, PHONE_REMOVED } from "@/lib/sync";
import { PasswordInput } from "@/components/password-input";
import { StatusDot } from "@/components/drawer";
import { TestWaba } from "./test-waba";
import { EmbeddedSignup } from "@/components/embedded-signup";
import { VerifyAllButton } from "@/components/verify-all-button";
import { groupDot, groupTag } from "@/lib/group-colors";
import { PROBLEM_KINDS, READY_GROUP, ensureReadyGroup, isProblemSystem } from "@/lib/bm-problems";
import { ConnectGuide } from "./connect-guide";
import { ManualGuide } from "./manual-guide";
import { SharedWabas } from "./shared-wabas";
import { ProfileEditor } from "./profile-editor";
import { SmsBearPanel } from "./smsbear-panel";
import { KeepInput } from "@/components/keep-input";
import { FUZIL_APP_ID, FUZIL_BUSINESS_ID, defaultAppSecret, isPlatformOwner, supportWhatsAppLink } from "@/lib/onboarding";
import {
  connectManualAction,

  deleteWabaAction,
  deleteBusinessAction,
  registerPhoneAction,
  addPhoneAction,
  requestPhoneCodeAction,
  verifyPhoneAction,
  syncAllAction,
  setAppSecretAction,
  updateWabaCredentialsAction,
  saveDefaultAppSecretAction,
  syncWabaAction,
  togglePhoneAction,
} from "@/app/actions/connections";

export const dynamic = "force-dynamic";

const CONN_LABEL = { CLOUD_API: "Cloud API", COEXISTENCE: "Coexistência", MANUAL: "Manual" } as const;

export default async function ConnectionsPage() {
  const auth = await requireAuth();
  const wsKeys = await prisma.workspace.findUnique({ where: { id: auth.workspace.id }, select: { defaultAppSecretEnc: true } });
  const hasDefaultSecret = Boolean(wsKeys?.defaultAppSecretEnc);
  // Cliente sem chave própria: a chave padrão do app do Fuzil entra sozinha (campo some)
  const usesDefaultSecret = hasDefaultSecret || Boolean(await defaultAppSecret(auth.workspace.id));
  // Chave secreta padrão: só o dono da plataforma vê, e só na conta dele (nem outros administradores)
  const isOwner = await isPlatformOwner(auth.user.id);
  const showDefaultSecret = !auth.inspecting && isOwner;
  // Chaves secretas (de cada conta): só o dono do Fuzil vê e troca. Clientes e administradores usam a chave padrão sozinhos
  const businesses = await prisma.businessManager.findMany({
    where: { workspaceId: auth.workspace.id },
    include: {
      wabas: { include: { phones: { where: { OR: [{ invalidReason: null }, { invalidReason: { not: PHONE_REMOVED } }] }, orderBy: { createdAt: "asc" } },
          templates: { where: { status: "APPROVED", category: "UTILITY" }, select: { id: true } },
          _count: { select: { templates: true } },
        },
      },
      groups: { include: { group: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  // Ordem de conexão: a BM que recebeu a última WABA conectada fica em cima
  const lastConnected = (b: (typeof businesses)[number]) => Math.max(b.createdAt.getTime(), ...b.wabas.map((w) => w.createdAt.getTime()));
  businesses.sort((a, b) => lastConnected(b) - lastConnected(a));
  for (const b of businesses) b.wabas.sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime());
  const windows = await bmWindows(businesses.map((b) => b.id));

  // Gavetas por grupo: cada BM fica no grupo principal dela (problema > Prontas para disparo > grupo seu > Sem grupo)
  type Sec = { key: string; name: string; color: string | null; order: number; items: typeof businesses };
  const secs = new Map<string, Sec>();
  for (const b of businesses) {
    const gs = b.groups.map((g) => g.group).filter((g) => !g.system?.startsWith("BM:"));
    const main = gs.find((g) => isProblemSystem(g.system)) ?? gs.find((g) => g.system === READY_GROUP) ?? gs.find((g) => !g.system) ?? null;
    const key = main?.id ?? "none";
    if (!secs.has(key))
      secs.set(key, {
        key,
        name: main?.name ?? "Sem grupo",
        color: main?.color ?? null,
        order: !main ? 3 : main.system === READY_GROUP ? 0 : isProblemSystem(main.system) ? 1 : 2,
        items: [],
      });
    secs.get(key)!.items.push(b);
  }
  // "Prontas para disparo" é fixo: aparece mesmo sem BM nenhuma dentro
  const ready = await ensureReadyGroup(auth.workspace.id);
  if (businesses.length && !secs.has(ready.id)) secs.set(ready.id, { key: ready.id, name: ready.name, color: ready.color, order: 0, items: [] });
  const sections = [...secs.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "pt-BR"));

  // WABAs para o painel do SMSBear (registrar número sozinho)
  // Só as BMs do grupo "Sem número" (são as que precisam de número)
  const smsWabas = businesses.filter((b) => b.groups.some((g) => g.group.system === PROBLEM_KINDS.NO_PHONE.system)).flatMap((b) => b.wabas.map((w) => ({ id: w.id, label: `${b.name} · ${w.name}`, name: w.phones.find((p) => p.verifiedName)?.verifiedName ?? b.name })));

  return (
    <div className="mx-auto max-w-[1520px] xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
      <div className="min-w-0">
      <PageHeader
        title="Conexões"
        description="BMs, WABAs e números conectados. Qualidade e limite são atualizados automaticamente a cada 10 minutos e pelos webhooks da Meta."
        actions={<VerifyAllButton>Sincronizar tudo</VerifyAllButton>}
      />

      <h2 className="mb-4 text-base font-semibold">Nova conexão</h2>
      <ConnectGuide open={businesses.length === 0} />
      <EmbeddedSignup appId={env.metaAppId()} configId={env.metaConfigId()} graphVersion={env.metaGraphVersion()} />

      <SharedWabas workspace={auth.workspace.name} partnerId={FUZIL_BUSINESS_ID} owner={isOwner} />

      <details className="group mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm" data-tour="connect-form">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white"><KeyRound className="size-4" /></span>
          <span className="flex-1">
            <span className="block font-semibold text-zinc-900">Conectar manualmente</span>
            <span className="block text-xs text-zinc-600">Libera o app do Fuzil na sua BM, gera o token e cola aqui. Leva uns 5 minutos</span>
          </span>
          <ChevronRight className="size-4 text-zinc-400 transition-transform group-open:rotate-90" />
        </summary>
        <div className="border-t border-zinc-100 p-5">
          <ManualGuide
            appId={FUZIL_APP_ID}
            admin={auth.user.isSuperAdmin}
            whatsappUrl={supportWhatsAppLink(`Oi! Pedi acesso ao app do Fuzil (ID ${FUZIL_APP_ID}) na minha BM. Pode aprovar? Conta: ${auth.workspace.name}`)}
          />
          <ActionForm action={connectManualAction} submit="Conectar" celebrateOk="BM conectada! 🎉">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ID da conta do WhatsApp (opcional)" hint="Na BM: Contas → Contas do WhatsApp → clique na conta: o número em ID">
                <Input name="wabaId" placeholder="1673861331112475" autoComplete="off" inputMode="numeric" />
              </Field>
              <Field label="Token de acesso" hint="Token do usuário do sistema com as 3 permissões">
                <PasswordInput name="token" placeholder="EAAG..." autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" />
              </Field>
              {!usesDefaultSecret && isOwner && (
                <Field label="Chave secreta do app (opcional)" hint="Configurações do app → Básico. Sem ela, as respostas dessa BM não aparecem no Chat">
                  <PasswordInput name="appSecret" autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" />
                </Field>
              )}
            </div>
            {usesDefaultSecret && <p className="mt-3 text-xs font-medium text-emerald-700">✓ A chave secreta padrão entra sozinha nessa conexão.</p>}
          </ActionForm>
        </div>
      </details>

      {showDefaultSecret && (
        <details className="group mt-4 overflow-hidden rounded-2xl border border-orange-200 bg-orange-50" open={!hasDefaultSecret}>
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-gradient text-white"><KeyRound className="size-4" /></span>
            <span className="flex-1">
              <span className="block font-semibold text-zinc-900">Chave secreta padrão {hasDefaultSecret && <span className="ml-1 text-xs font-medium text-emerald-700">configurada ✓</span>}</span>
              <span className="block text-xs text-zinc-600">Entra sozinha em toda BM nova que você conectar (só você, dono do Fuzil, vê isso)</span>
            </span>
            <ChevronRight className="size-4 text-orange-500 transition-transform group-open:rotate-90" />
          </summary>
          <div className="border-t border-orange-200 bg-white px-5 py-4">
            <ActionForm action={saveDefaultAppSecretAction} submit={hasDefaultSecret ? "Trocar chave padrão" : "Salvar chave padrão"}>
              <Field label={hasDefaultSecret ? "Chave secreta nova" : "Chave secreta do app"} hint="developers.facebook.com → app → Configurações do app → Básico → Chave secreta do aplicativo">
                <PasswordInput name="appSecret" autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" />
              </Field>
              {hasDefaultSecret && (
                <label className="mt-3 flex items-start gap-2 text-sm text-zinc-700">
                  <input type="checkbox" name="applyExisting" defaultChecked className="mt-0.5" />
                  <span>Trocar também nas BMs que já usam a chave padrão atual (as que usam a chave de outro app não mudam)</span>
                </label>
              )}
              {!hasDefaultSecret && <input type="hidden" name="applyExisting" value="on" />}
            </ActionForm>
          </div>
        </details>
      )}

      <div data-tour="connections">
      <div className="mt-10 mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">Suas conexões</h2>
        {businesses.length > 0 && (
          <VerifyAllButton className="px-3 py-1.5 text-xs">Verificar todas</VerifyAllButton>
        )}
      </div>
      {businesses.length === 0 && <Empty>Nenhuma BM conectada ainda. Use uma das opções acima.</Empty>}

      <div className="space-y-4">
        {sections.map((sec) => (
          <details key={sec.key} className="group/sec overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/60">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 hover:bg-zinc-100/70 [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-4 shrink-0 text-zinc-400 transition-transform group-open/sec:rotate-90" />
              <span className={`size-2.5 shrink-0 rounded-full ${sec.key === "none" ? "bg-zinc-300" : groupDot(sec.color)}`} />
              <span className="text-base font-semibold text-zinc-900">{sec.name}</span>
              <span className="ml-auto rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">{sec.items.length} BM{sec.items.length === 1 ? "" : "s"}</span>
            </summary>
            <div className="space-y-4 border-t border-zinc-200 p-3">
        {sec.items.length === 0 && <p className="px-2 py-3 text-sm text-zinc-500">Nenhuma BM pronta agora. Elas entram aqui sozinhas quando têm número conectado, cartão e template aprovado.</p>}
        {sec.items.map((bm) => {
          // Cor da gaveta: vermelho se alguma conta não consegue disparar, amarelo se tem aviso, verde se está tudo certo
          const issues = bm.wabas.flatMap((w) => wabaReadiness({ ...w, usableTemplates: w.templates.length }));
          const tone = bm.problemAt || !bm.wabas.length || issues.some((i) => i.block) ? "red" : issues.length ? "amber" : "green";
          const w = windows.get(bm.id);
          const phones = bm.wabas.reduce((a, x) => a + x.phones.filter((p) => !p.invalidReason).length, 0);
          return (
          <details key={bm.id} className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90" />
              <span
                className={`size-2.5 shrink-0 rounded-full ${tone === "red" ? "bg-red-500" : tone === "amber" ? "bg-amber-400" : "bg-emerald-500"}`}
                title={tone === "red" ? "Falta algo para disparar" : tone === "amber" ? "Tem aviso" : "Pronta para disparar"}
              />
              <span className="text-base font-semibold">{bm.name}</span>
              {bm.groups
                .filter((g) => !g.group.system?.startsWith("BM:")) // grupo oculto de campanha de uma BM só não aparece como grupo
                .map((g) => (
                  <span key={g.groupId} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${groupTag(g.group.color)}`}>
                    <span className={`size-1.5 rounded-full ${groupDot(g.group.color)}`} />
                    {g.group.name}
                  </span>
                ))}
              <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <span>{bm.wabas.length} conta(s) · {phones} número(s)</span>
                <Badge color="blue">Limite: {tierLabel(bm.messagingLimitTier)}</Badge>
                {w && w.limit !== Infinity && <span className="font-medium text-zinc-700">{w.available.toLocaleString("pt-BR")} disponíveis</span>}
              </span>
            </summary>
            <div className="border-t border-zinc-100 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-600">{bm.metaBusinessId ? `BM ID: ${bm.metaBusinessId}` : ""}</span>
              <ConfirmButton
                action={deleteBusinessAction.bind(null, bm.id)}
                variant="ghost"
                className="px-2 py-1 text-xs text-red-600"
                confirm={`Excluir a BM ${bm.name} do Fuzil?\nSomem as contas do WhatsApp, números, templates, conversas do chat e alertas dela, e ela sai de todos os grupos. As campanhas antigas continuam no histórico. Na Meta nada é apagado. Não dá para desfazer.`}
              >
                <Trash2 className="size-3.5" /> Excluir BM
              </ConfirmButton>
            </div>
            {w && <div className="mb-4"><LimitWindow w={w} /></div>}
            <div className="space-y-3">
              {bm.wabas.map((waba) => (
                <div key={waba.id} className="overflow-hidden rounded-2xl border border-zinc-300 bg-zinc-50 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white"><Phone className="size-4" /></span>
                    <span className="font-semibold text-zinc-900">{waba.name}</span>
                    <Badge dot={false}>{CONN_LABEL[waba.connectionType]}</Badge>
                    <span className="text-xs font-medium text-zinc-600">WABA: {waba.wabaId}</span>
                    <span className="text-xs font-medium text-zinc-600">{waba._count.templates} templates</span>
                    {!waba.webhookSubscribed && <Badge color="yellow">Webhook não inscrito</Badge>}
                    {waba.lastSyncError && (
                      <Badge color="red">{/api access blocked/i.test(waba.lastSyncError) ? "App da BM bloqueado pela Meta" : `Erro: ${waba.lastSyncError.slice(0, 80)}`}</Badge>
                    )}
                    <span className="ml-auto text-xs text-zinc-500">
                      {waba.lastSyncedAt ? `Sincronizado ${waba.lastSyncedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Nunca sincronizado"}
                    </span>
                    {/* Cartão: a Meta não deixa colocar pela API; o botão abre a página de pagamento dessa conta */}
                    <a
                      href={metaBillingUrl(waba.wabaId, bm.metaBusinessId)}
                      target="_blank"
                      rel="noreferrer"
                      title="Abre a página de pagamento dessa conta na Meta (precisa estar logado com um perfil administrador da BM)"
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${waba.hasPaymentMethod === false ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"}`}
                    >
                      <CreditCard className="size-3.5" /> {waba.hasPaymentMethod === false ? "Colocar cartão na Meta" : "Pagamento na Meta"}
                    </a>
                    <TestWaba id={waba.id} />
                    <ConfirmButton action={syncWabaAction.bind(null, waba.id)} className="px-2.5 py-1 text-xs"><RefreshCw className="size-3.5" /> Verificar</ConfirmButton>
                    <ConfirmButton action={deleteWabaAction.bind(null, waba.id)} variant="ghost" className="px-2 py-1 text-red-600" confirm={`Remover a WABA ${waba.name} do painel? (Nada é apagado na Meta)`}><Trash2 className="size-4" /></ConfirmButton>
                  </div>
                  <div className="space-y-3 p-3">
                  {(() => {
                    const issues = wabaReadiness({ ...waba, usableTemplates: waba.templates.length });
                    if (!issues.length)
                      return (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
                          <CheckCircle2 className="size-4" /> Pronta para disparar
                        </div>
                      );
                    const blocked = issues.some((i) => i.block);
                    return (
                      <div className={`rounded-xl border px-4 py-3 text-sm ${blocked ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                        <div className="mb-1 flex items-center gap-2 font-semibold">
                          <AlertTriangle className="size-4" /> {blocked ? "Falta isso para essa conta disparar:" : "Atenção nessa conta:"}
                        </div>
                        <ul className="space-y-1 pl-6">
                          {issues.map((i) => (
                            <li key={i.text} className="list-disc">
                              <b className="font-medium">{i.text}</b>
                              {i.fix && <span className="opacity-80"> {i.fix}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                  {waba.connectionType === "MANUAL" && (
                    <details className="group overflow-hidden rounded-xl border border-orange-200 bg-orange-50">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-gradient text-white"><KeyRound className="size-4" /></span>
                        <span className="flex-1">
                          <span className="block font-semibold text-zinc-900">{isOwner ? "Atualizar token e chave secreta" : "Atualizar token"}</span>
                          <span className="block text-xs text-zinc-600">{isOwner ? "Cole o token novo e/ou a chave secreta." : "Cole o token novo."} O ID da WABA continua o mesmo</span>
                        </span>
                        <ChevronRight className="size-4 text-orange-500 transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="border-t border-orange-200 bg-white px-4 py-4">
                        <ActionForm action={updateWabaCredentialsAction.bind(null, waba.id)} submit="Atualizar acesso" variant="secondary">
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Token de acesso novo" hint="Em branco = mantém o atual">
                              <PasswordInput name="token" placeholder="EAAG..." autoComplete="off" />
                            </Field>
                            {isOwner && (
                              <Field label="Chave secreta do app nova" hint={waba.appSecretEnc ? "Configurada ✓ · em branco = mantém a atual" : "Em branco = continua sem"}>
                                <PasswordInput name="appSecret" autoComplete="off" />
                              </Field>
                            )}
                          </div>
                        </ActionForm>
                      </div>
                    </details>
                  )}
                  {waba.connectionType === "MANUAL" && isOwner && (() => {
                    const last = waba.webhookLastAt;
                    const rejected = waba.webhookRejectedAt && (!last || waba.webhookRejectedAt > last) ? waba.webhookRejectedAt : null;
                    const ok = Boolean(waba.appSecretEnc && last && !rejected);
                    const when = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                    return (
                      <details className={`group overflow-hidden rounded-xl border ${ok ? "border-emerald-200 bg-emerald-50" : rejected ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                          <span className={`flex size-8 items-center justify-center rounded-lg text-white ${ok ? "bg-emerald-600" : rejected ? "bg-red-600" : "bg-amber-500"}`}><MessagesSquare className="size-4" /></span>
                          <span className="font-semibold text-zinc-900">Receber respostas no Chat</span>
                          <span className="text-xs font-medium text-zinc-600">
                            {ok ? `funcionando · último evento ${when(last!)}` : rejected ? "a Meta está mandando, mas a chave não confere" : !waba.appSecretEnc ? "falta a chave secreta do app dessa BM" : "nenhum evento dessa conta chegou ainda"}
                          </span>
                        </summary>
                        <div className="space-y-4 border-t border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-700">
                          {rejected && (
                            <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
                              Última recusa {when(rejected)}: a chave cadastrada não é a do app que está mandando os eventos. Confira se copiou a chave do app certo (o mesmo do token).
                            </p>
                          )}
                          <div>
                            <b className="text-zinc-800">1. Chave secreta do app</b> {waba.appSecretEnc && <span className="text-emerald-700">cadastrada ✅</span>}
                            <p className="mt-1">developers.facebook.com → Meus apps → app dessa BM → <b>Configurações do app → Básico</b> → Chave secreta do aplicativo → Mostrar. Cole abaixo (não mande em chat nem print).</p>
                            <ActionForm action={setAppSecretAction} submit={waba.appSecretEnc ? "Trocar chave" : "Salvar chave"} variant="secondary">
                              <input type="hidden" name="id" value={waba.id} />
                              <PasswordInput name="appSecret" placeholder={waba.appSecretEnc ? "••••••••••••••••" : "Chave secreta do app (32 caracteres)"} autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" />
                            </ActionForm>
                          </div>
                          <div>
                            <b className="text-zinc-800">2. Publicar o app</b> {last && <span className="text-emerald-700">chegando ✅</span>}
                            <p className="mt-1">
                              Ao salvar a chave, o Fuzil liga o webhook do app sozinho. Falta só: no app da BM, menu da esquerda → <b>Publish</b> → <b>Publish</b> (app &quot;Unpublished&quot; não recebe
                              respostas). Se pedir política de privacidade, use o link de privacidade do seu site.
                            </p>
                          </div>
                          <details>
                            <summary className="cursor-pointer text-xs text-zinc-500">Ligar o webhook na mão (se o automático der erro)</summary>
                            <ol className="mt-2 list-decimal space-y-1 pl-5">
                              <li>No app da BM: <b>Use cases → Connect with customers through WhatsApp → Customize → Configuration</b>.</li>
                              <li>
                                Em Webhook, clique em <b>Editar</b>. URL de callback: <code className="rounded bg-zinc-100 px-1">{env.appUrl()}/api/webhook</code> · Token de verificação:{" "}
                                <code className="rounded bg-zinc-100 px-1">{env.metaVerifyToken() || "(peça ao admin)"}</code> → <b>Verificar e salvar</b>.
                              </li>
                              <li>
                                Em <b>Webhook fields</b>, ligue <b>messages</b>, message_template_status_update, template_category_update e account_update.
                              </li>
                              <li>No topo do app, se estiver &quot;Em desenvolvimento&quot;, mude para <b>Publicado</b> (pede um link de privacidade: use o do seu site).</li>
                              <li>Volte aqui, clique em ↻ (sincronizar) e responda uma mensagem para testar.</li>
                            </ol>
                          </details>
                        </div>
                      </details>
                    );
                  })()}
                  <div className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                    <div className="bg-zinc-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">Números</div>
                    {waba.phones.length === 0 && <div className="px-4 py-3 text-zinc-500">Nenhum número nesta WABA.</div>}
                    {waba.phones.map((p) => (
                      <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10"><Phone className="size-4" /></div>
                        <div className="min-w-48">
                          <div className="font-medium">{formatPhone(p.displayPhoneNumber.replace(/\D/g, ""))}</div>
                          <div className="text-xs text-zinc-600">{p.verifiedName} · Phone ID {p.phoneNumberId}</div>
                        </div>
                        <QualityBadge q={p.qualityRating} />
                        <PhoneStatusBadge s={p.status} />
                        <Badge color="blue" dot={false}>{tierLabel(p.messagingLimitTier)}</Badge>
                        {p.isCoexistence && <Badge dot={false}>Coexistência</Badge>}
                        {p.invalidReason === PHONE_DISCARDED ? (
                          <Badge color="gray">Sobra do SMSBear: ocupa vaga na Meta. Apague no WhatsApp Manager</Badge>
                        ) : p.invalidReason ? <Badge color="red">{p.invalidReason}: não entra no rodízio</Badge> : !p.enabled && <Badge color="yellow">Fora do rodízio</Badge>}
                        <div className="ml-auto flex flex-wrap justify-end gap-2">
                          {p.status === "CONNECTED" && !p.invalidReason && <ProfileEditor phoneId={p.id} bmName={bm.name} currentName={p.verifiedName} pendingName={p.pendingName} />}
                          {p.status && p.status !== "CONNECTED" && !p.isCoexistence && (
                            <ActionForm action={async () => { "use server"; return registerPhoneAction(p.id); }} submit="Registrar número" variant="secondary" />
                          )}
                          {!p.invalidReason && <ConfirmButton action={togglePhoneAction.bind(null, p.id)}>{p.enabled ? "Tirar do rodízio" : "Colocar no rodízio"}</ConfirmButton>}
                        </div>
                        {/* Número ainda não confirmado: digita o código que chegou e o Fuzil confirma e registra */}
                        {p.status && p.status !== "CONNECTED" && !p.isCoexistence && p.invalidReason !== PHONE_DISCARDED && (
                          <details className="w-full rounded-xl bg-orange-50/60 px-3 py-2 ring-1 ring-orange-100" open={p.invalidReason === "Número não registrado na API"}>
                            <summary className="cursor-pointer text-sm font-medium text-orange-900">Confirmar o número pelo código (SMS ou ligação)</summary>
                            <div className="mt-3 flex flex-wrap items-end gap-3">
                              <ActionForm action={verifyPhoneAction.bind(null, p.id)} submit="Confirmar e registrar" className="flex flex-wrap items-end gap-2">
                                <Field label="Código de 6 números">
                                  <Input name="code" inputMode="numeric" maxLength={7} placeholder="123456" className="w-36" autoComplete="one-time-code" />
                                </Field>
                              </ActionForm>
                              <div className="flex flex-wrap gap-2 text-sm">
                                <ActionForm action={async () => { "use server"; return requestPhoneCodeAction(p.id, "SMS"); }} submit="Mandar código por SMS" variant="secondary" />
                                <ActionForm action={async () => { "use server"; return requestPhoneCodeAction(p.id, "VOICE"); }} submit="Receber por ligação" variant="secondary" />
                              </div>
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                    {/* Número novo direto pelo Fuzil: não precisa entrar no perfil do Facebook */}
                    <details className="group/add px-4 py-3">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-orange-700 [&::-webkit-details-marker]:hidden">
                        <Plus className="size-4" /> Adicionar número nesta WABA
                      </summary>
                      <p className="mt-2 text-sm text-zinc-600">
                        Sem entrar no Facebook: o Fuzil coloca o número na WABA e a Meta manda um código para ele. O número não pode estar em uso no WhatsApp do celular (apague a conta do WhatsApp nele antes).
                      </p>
                      <ActionForm action={addPhoneAction.bind(null, waba.id)} submit="Adicionar e mandar código" className="mt-3 space-y-3">
                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                          <Field label="Número com DDD">
                            <KeepInput name="phone" inputMode="tel" placeholder="11 91234-5678" required />
                          </Field>
                          <Field label="Nome de exibição" hint="O nome que aparece no WhatsApp (a Meta analisa)">
                            <KeepInput name="name" remember={`nome-waba-${waba.id}`} defaultValue={waba.phones.find((x) => x.verifiedName)?.verifiedName ?? bm.name} required maxLength={100} />
                          </Field>
                          <Field label="Código por">
                            <select name="method" className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm">
                              <option value="SMS">SMS</option>
                              <option value="VOICE">Ligação</option>
                            </select>
                          </Field>
                        </div>
                      </ActionForm>
                    </details>
                  </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </details>
          );
        })}
            </div>
          </details>
        ))}
      </div>
      </div>
      </div>
      {/* SMSBear: comprar número BR e registrar na WABA sozinho */}
      <aside className="mt-8 xl:mt-0">
        <div className="xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:overscroll-contain xl:rounded-2xl">
          <SmsBearPanel wabas={smsWabas} />
        </div>
      </aside>
    </div>
  );
}
