import { RefreshCw, Phone, Trash2 } from "lucide-react";
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
      wabas: { include: { phones: { orderBy: { createdAt: "asc" } }, _count: { select: { templates: true } } } },
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
        {businesses.map((bm) => (
          <Card key={bm.id} className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="text-base font-semibold">{bm.name}</div>
              <Badge color="blue">Limite: {tierLabel(bm.messagingLimitTier)}</Badge>
              {bm.groups.map((g) => <Badge key={g.groupId} color="orange" dot={false}>{g.group.name}</Badge>)}
              {bm.metaBusinessId && <span className="text-xs text-zinc-400">BM ID: {bm.metaBusinessId}</span>}
            </div>
            {windows.get(bm.id) && <div className="mb-4"><LimitWindow w={windows.get(bm.id)!} /></div>}
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
                      {waba.lastSyncedAt ? `Sincronizado ${waba.lastSyncedAt.toLocaleString("pt-BR")}` : "Nunca sincronizado"}
                    </span>
                    <ConfirmButton action={syncWabaAction.bind(null, waba.id)} variant="ghost" className="px-2 py-1"><RefreshCw className="size-4" /></ConfirmButton>
                    <ConfirmButton action={deleteWabaAction.bind(null, waba.id)} variant="ghost" className="px-2 py-1 text-red-600" confirm={`Remover a WABA ${waba.name} do painel? (Nada é apagado na Meta)`}><Trash2 className="size-4" /></ConfirmButton>
                  </div>
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
                        {!p.enabled && <Badge color="yellow">Fora do rodízio</Badge>}
                        <div className="ml-auto flex gap-2">
                          {p.status && p.status !== "CONNECTED" && !p.isCoexistence && (
                            <ActionForm action={async () => { "use server"; return registerPhoneAction(p.id); }} submit="Registrar número" variant="secondary" />
                          )}
                          <ConfirmButton action={togglePhoneAction.bind(null, p.id)}>{p.enabled ? "Tirar do rodízio" : "Colocar no rodízio"}</ConfirmButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
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
            <Field label="ID da WABA"><Input name="wabaId" placeholder="1673861331112475" required /></Field>
            <Field label="Token de acesso (opcional)" hint="System User token com whatsapp_business_management e whatsapp_business_messaging">
              <Input name="token" type="password" placeholder="EAAG..." />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
