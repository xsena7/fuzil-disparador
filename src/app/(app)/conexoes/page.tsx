import { AlertTriangle, CheckCircle2, ChevronRight, RefreshCw, Phone, Trash2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { tierLabel } from "@/lib/limits";
import { formatPhone } from "@/lib/phone";
import { Badge, Card, Empty, Field, Input, PageHeader } from "@/components/ui";
import { PhoneStatusBadge, QualityBadge } from "@/components/status";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { EmbeddedSignup } from "@/components/embedded-signup";
import { LimitWindow } from "@/components/limit-card";
import { bmWindows } from "@/lib/limit-windows";
import { wabaReadiness } from "@/lib/readiness";
import { PHONE_REMOVED } from "@/lib/sync";
import { PasswordInput } from "@/components/password-input";
import {
  connectManualAction,
  deleteWabaAction,
  registerPhoneAction,
  syncAllAction,
  syncWabaAction,
  togglePhoneAction,
} from "@/app/actions/connections";

export const dynamic = "force-dynamic";

const CONN_LABEL = { CLOUD_API: "Cloud API", COEXISTENCE: "Coexistência", MANUAL: "Manual" } as const;

export default async function ConnectionsPage() {
  const auth = await requireAuth();
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
    orderBy: { name: "asc" },
  });
  const windows = await bmWindows(businesses.map((b) => b.id));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Conexões"
        description="BMs, WABAs e números conectados. Qualidade e limite são atualizados automaticamente a cada 10 minutos e pelos webhooks da Meta."
        actions={<ConfirmButton action={syncAllAction}><RefreshCw className="size-4" /> Sincronizar tudo</ConfirmButton>}
      />

      {businesses.length === 0 && <Empty>Nenhuma BM conectada ainda. Use uma das opções abaixo.</Empty>}

      <div className="space-y-4">
        {businesses.map((bm) => {
          // Cor da gaveta: vermelho se alguma conta não consegue disparar, amarelo se tem aviso, verde se está tudo certo
          const issues = bm.wabas.flatMap((w) => wabaReadiness({ ...w, usableTemplates: w.templates.length }));
          const tone = !bm.wabas.length || issues.some((i) => i.block) ? "red" : issues.length ? "amber" : "green";
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
              {bm.groups.map((g) => <Badge key={g.groupId} color="orange" dot={false}>{g.group.name}</Badge>)}
              <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <span>{bm.wabas.length} conta(s) · {phones} número(s)</span>
                <Badge color="blue">Limite: {tierLabel(bm.messagingLimitTier)}</Badge>
                {w && w.limit !== Infinity && <span className="font-medium text-zinc-700">{w.available.toLocaleString("pt-BR")} disponíveis</span>}
              </span>
            </summary>
            <div className="border-t border-zinc-100 p-5">
            {bm.metaBusinessId && <div className="mb-3 text-xs text-zinc-400">BM ID: {bm.metaBusinessId}</div>}
            {w && <div className="mb-4"><LimitWindow w={w} /></div>}
            <div className="space-y-3">
              {bm.wabas.map((waba) => (
                <div key={waba.id} className="overflow-hidden rounded-xl border border-zinc-200/80">
                  <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 bg-zinc-50/70 px-4 py-2.5">
                    <span className="font-medium">{waba.name}</span>
                    <Badge dot={false}>{CONN_LABEL[waba.connectionType]}</Badge>
                    <span className="text-xs text-zinc-500">WABA: {waba.wabaId}</span>
                    <span className="text-xs text-zinc-500">{waba._count.templates} templates</span>
                    {!waba.webhookSubscribed && <Badge color="yellow">Webhook não inscrito</Badge>}
                    {waba.lastSyncError && <Badge color="red">Erro: {waba.lastSyncError.slice(0, 80)}</Badge>}
                    <span className="ml-auto text-xs text-zinc-400">
                      {waba.lastSyncedAt ? `Sincronizado ${waba.lastSyncedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Nunca sincronizado"}
                    </span>
                    <ConfirmButton action={syncWabaAction.bind(null, waba.id)} variant="ghost" className="px-2 py-1"><RefreshCw className="size-4" /></ConfirmButton>
                    <ConfirmButton action={deleteWabaAction.bind(null, waba.id)} variant="ghost" className="px-2 py-1 text-red-600" confirm={`Remover a WABA ${waba.name} do painel? (Nada é apagado na Meta)`}><Trash2 className="size-4" /></ConfirmButton>
                  </div>
                  {(() => {
                    const issues = wabaReadiness({ ...waba, usableTemplates: waba.templates.length });
                    if (!issues.length)
                      return (
                        <div className="flex items-center gap-2 border-b border-zinc-100 bg-emerald-50/60 px-4 py-2 text-sm text-emerald-700">
                          <CheckCircle2 className="size-4" /> Pronta para disparar
                        </div>
                      );
                    const blocked = issues.some((i) => i.block);
                    return (
                      <div className={`border-b px-4 py-2.5 text-sm ${blocked ? "border-red-100 bg-red-50/70 text-red-800" : "border-amber-100 bg-amber-50/70 text-amber-800"}`}>
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
                  <div className="divide-y divide-zinc-100">
                    {waba.phones.length === 0 && <div className="px-4 py-3 text-zinc-500">Nenhum número nesta WABA.</div>}
                    {waba.phones.map((p) => (
                      <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10"><Phone className="size-4" /></div>
                        <div className="min-w-48">
                          <div className="font-medium">{formatPhone(p.displayPhoneNumber.replace(/\D/g, ""))}</div>
                          <div className="text-xs text-zinc-500">{p.verifiedName} · Phone ID {p.phoneNumberId}</div>
                        </div>
                        <QualityBadge q={p.qualityRating} />
                        <PhoneStatusBadge s={p.status} />
                        <Badge color="blue" dot={false}>{tierLabel(p.messagingLimitTier)}</Badge>
                        {p.isCoexistence && <Badge dot={false}>Coexistência</Badge>}
                        {p.invalidReason ? <Badge color="red">{p.invalidReason}: não entra no rodízio</Badge> : !p.enabled && <Badge color="yellow">Fora do rodízio</Badge>}
                        <div className="ml-auto flex gap-2">
                          {p.status && p.status !== "CONNECTED" && !p.isCoexistence && (
                            <ActionForm action={async () => { "use server"; return registerPhoneAction(p.id); }} submit="Registrar número" variant="secondary" />
                          )}
                          {!p.invalidReason && <ConfirmButton action={togglePhoneAction.bind(null, p.id)}>{p.enabled ? "Tirar do rodízio" : "Colocar no rodízio"}</ConfirmButton>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            </div>
          </details>
          );
        })}
      </div>

      <h2 className="mt-10 mb-4 text-base font-semibold">Nova conexão</h2>
      <EmbeddedSignup appId={env.metaAppId()} configId={env.metaConfigId()} graphVersion={env.metaGraphVersion()} />

      <Card className="mt-4 p-5">
        <div className="font-semibold">Configuração manual</div>
        <p className="mt-1 mb-4 text-zinc-500">
          Conecte uma WABA pelo ID. Se deixar o token em branco, usa o token do Tech Provider configurado no servidor.
        </p>
        <ActionForm action={connectManualAction} submit="Conectar WABA">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ID da WABA"><Input name="wabaId" placeholder="1673861331112475" required autoComplete="off" inputMode="numeric" /></Field>
            <Field label="Token de acesso (opcional)" hint="System User token com whatsapp_business_management e whatsapp_business_messaging">
              <PasswordInput name="token" placeholder="EAAG..." autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
