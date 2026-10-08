import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env, metaConfigured, trackedUrlBase } from "@/lib/env";
import { Badge, Card, Field, Input, PageHeader, Table, Td } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addMemberAction, saveDiscordAction, saveSettingsAction, testDiscordAction } from "@/app/actions/misc";
import { DISCORD_CHANNELS } from "@/lib/alert-channels";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const auth = await requireAuth();
  const [ws, members] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: auth.workspace.id } }),
    prisma.membership.findMany({ where: { workspaceId: auth.workspace.id }, include: { user: true } }),
  ]);
  const checks = [
    { label: "App da Meta (META_APP_ID / META_APP_SECRET)", ok: metaConfigured() },
    { label: "Embedded Signup (META_CONFIG_ID)", ok: Boolean(env.metaConfigId()) },
    { label: "Token do Tech Provider (META_SYSTEM_USER_TOKEN)", ok: Boolean(env.metaSystemToken()) },
    { label: "Token de verificação do webhook", ok: Boolean(env.metaVerifyToken()) },
    { label: "Painel com HTTPS (APP_URL)", ok: env.appUrl().startsWith("https://") },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Configurações" />

      <Card className="p-5">
        <div className="mb-4 font-semibold">Conta</div>
        <ActionForm action={saveSettingsAction} submit="Salvar">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome da conta"><Input name="name" defaultValue={ws.name} /></Field>
          </div>
          <label className="mt-4 flex items-start gap-2.5 text-sm">
            <input type="checkbox" name="emailAlerts" defaultChecked={ws.emailAlerts} className="mt-0.5" />
            <span>
              <b>Receber alertas críticos por e-mail</b>
              <span className="block text-zinc-500">Só os extremos: template virou marketing, número banido ou com qualidade vermelha, campanha pausada por erro. Vai para os donos e admins da conta.</span>
            </span>
          </label>
        </ActionForm>
      </Card>

      <Card className="p-5">
        <div className="mb-1 font-semibold">Avisos no Discord</div>
        <p className="mb-4 text-sm text-zinc-500">
          Cada canal recebe um tipo de aviso. No Discord: abra o canal → ⚙️ Editar canal → Integrações → Webhooks → Novo webhook → Copiar URL do webhook, e cole abaixo.
          Canal em branco = o aviso vai para o #geral.
        </p>
        <ActionForm action={saveDiscordAction} submit="Salvar canais">
          <div className="grid gap-4 md:grid-cols-2">
            {DISCORD_CHANNELS.map((c) => (
              <Field key={c.key} label={c.label} hint={c.hint}>
                <Input name={c.key} defaultValue={((ws.discordWebhooks ?? {}) as Record<string, string>)[c.key] ?? ""} placeholder="https://discord.com/api/webhooks/..." autoComplete="off" />
              </Field>
            ))}
          </div>
        </ActionForm>
        <ActionForm action={testDiscordAction} submit="Enviar mensagem de teste nos canais" variant="secondary" />
      </Card>

      <Card className="p-5">
        <div className="mb-4 font-semibold">Integração com a Meta</div>
        <div className="mb-4 space-y-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center justify-between">
              <span>{c.label}</span>
              <Badge color={c.ok ? "green" : "yellow"}>{c.ok ? "OK" : "Pendente"}</Badge>
            </div>
          ))}
        </div>
        <div className="space-y-2 rounded-lg bg-zinc-50 p-4 text-xs">
          <div>URL do webhook (cole no app da Meta): <code className="font-semibold">{env.appUrl()}/api/webhook</code></div>
          <div>Campos do webhook a assinar: <code>messages, message_template_status_update, template_category_update, message_template_quality_update, phone_number_quality_update, phone_number_name_update, account_update, account_review_update, business_capability_update</code></div>
          <div>URL dos botões rastreados (para aprovar templates): <code className="font-semibold">https://{trackedUrlBase()}/{"{{1}}"}</code></div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 font-semibold">Usuários da conta</div>
        <Table head={["Nome", "E-mail", "Papel"]}>
          {members.map((m) => (
            <tr key={m.id}><Td>{m.user.name}</Td><Td>{m.user.email}</Td><Td>{m.role}</Td></tr>
          ))}
        </Table>
        {auth.role !== "MEMBER" && (
          <ActionForm action={addMemberAction} submit="Enviar convite" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome"><Input name="name" required /></Field>
              <Field label="E-mail" hint="A pessoa recebe um convite por e-mail para criar a senha."><Input name="email" type="email" required /></Field>
            </div>
          </ActionForm>
        )}
      </Card>
    </div>
  );
}
