import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env, metaConfigured, trackedUrlBase } from "@/lib/env";
import { Badge, Card, Field, Input, PageHeader, Table, Td } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addMemberAction, saveSettingsAction, testTelegramAction } from "@/app/actions/misc";

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
    { label: "Bot do Telegram (TELEGRAM_BOT_TOKEN)", ok: Boolean(env.telegramBotToken()) },
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
            <Field label="Chat ID do Telegram para alertas" hint="Fale com o bot e use @userinfobot para descobrir seu Chat ID. Pode ser um grupo (ID negativo).">
              <Input name="telegramChatId" defaultValue={ws.telegramChatId ?? ""} placeholder="123456789" />
            </Field>
          </div>
        </ActionForm>
        <ActionForm action={testTelegramAction} submit="Enviar teste no Telegram" variant="secondary" />
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
          <ActionForm action={addMemberAction} submit="Adicionar usuário" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Nome"><Input name="name" /></Field>
              <Field label="E-mail"><Input name="email" type="email" /></Field>
              <Field label="Senha inicial"><Input name="password" type="password" minLength={8} /></Field>
            </div>
          </ActionForm>
        )}
      </Card>
    </div>
  );
}
