import { requireSuperAdmin } from "@/lib/auth";
import { UserActions } from "./user-actions";
import { AccountsPanel } from "./accounts-panel";
import { listAccounts } from "@/lib/admin-accounts";
import { prisma } from "@/lib/db";
import { Card, Field, Input, PageHeader, Table, Td } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { adminCreateWorkspaceAction, adminSavePlatformAction, adminTestEmailAction, saveDiscordAction, testDiscordAction, testErrorsDiscordAction } from "@/app/actions/misc";
import { DISCORD_CHANNELS } from "@/lib/alert-channels";
import { platformDiscordHooks } from "@/lib/alerts";
import { LinkButton } from "@/components/ui";
import { ScrollText } from "lucide-react";
import { emailConfigured } from "@/lib/email";
import { Badge } from "@/components/ui";
import { PLATFORM_KEYS } from "@/lib/platform-settings";
import { env } from "@/lib/env";
import { cachedSetting } from "@/lib/settings-cache";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await requireSuperAdmin();
  const [accounts, orphans, hooks] = await Promise.all([
    listAccounts(auth.user.id),
    prisma.user.findMany({ where: { memberships: { none: {} } }, orderBy: { createdAt: "desc" } }),
    platformDiscordHooks(),
  ]);
  const discordHooks = (hooks ?? {}) as Record<string, string>;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Admin da plataforma" description="Contas de clientes, integrações e logs." actions={<LinkButton href="/admin/logs" variant="secondary"><ScrollText className="size-4" /> Logs do sistema</LinkButton>} />
      <AccountsPanel accounts={accounts} selfId={auth.user.id} />

      <Card className="p-5">
        <div className="mb-4 font-semibold">Criar conta de cliente</div>
        <ActionForm action={adminCreateWorkspaceAction} submit="Criar conta e enviar convite">
          <p className="mb-4 text-sm text-zinc-500">O cliente recebe um e-mail com o layout do Fuzil e um botão para criar a senha.</p>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Nome da conta"><Input name="company" required /></Field>
            <Field label="Nome do dono"><Input name="name" required /></Field>
            <Field label="E-mail do cliente"><Input name="email" type="email" required /></Field>
            <Field label="Créditos iniciais"><Input name="credits" type="number" min={0} defaultValue={0} /></Field>
          </div>
        </ActionForm>
      </Card>

      {orphans.length > 0 && (
        <Card className="p-5">
          <div className="mb-1 font-semibold">Usuários sem conta ({orphans.length})</div>
          <p className="mb-4 text-sm text-zinc-500">Usuários que não estão em nenhuma conta. Pode excluir.</p>
          <Table head={["Nome", "E-mail", ""]}>
            {orphans.map((u) => (
              <tr key={u.id}>
                <Td className="font-medium">{u.name}</Td>
                <Td className="text-xs">{u.email}</Td>
                <Td className="text-right"><UserActions id={u.id} email={u.email} isSelf={u.id === auth.user.id} /></Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Card className="p-5">
        <div className="mb-1 font-semibold">Integração com a Meta (Tech Provider)</div>
        <p className="mb-4 text-zinc-500">Cole aqui os dados do app do Tech Provider. Campos secretos em branco mantêm o valor atual.</p>
        <div className="mb-4 space-y-1 rounded-lg bg-zinc-50 p-4 text-xs">
          <div>URL de callback do webhook: <code className="font-semibold">{env.appUrl()}/api/webhook</code></div>
          <div>Token de verificação: <code className="font-semibold">{env.metaVerifyToken() || "(defina META_WEBHOOK_VERIFY_TOKEN)"}</code></div>
          <div>Domínio para o Facebook Login (Embedded Signup): <code className="font-semibold">{env.appUrl().replace(/^https?:\/\//, "")}</code></div>
        </div>
        <ActionForm action={adminSavePlatformAction} submit="Salvar integração">
          <div className="grid gap-4 md:grid-cols-2">
            {PLATFORM_KEYS.map(({ key, label, secret }) => {
              const current = cachedSetting(key) ?? process.env[key] ?? "";
              return (
                <Field key={key} label={label} hint={secret ? (current ? "Configurado ✓ (deixe em branco para manter)" : "Não configurado") : undefined}>
                  <Input name={key} type={secret ? "password" : "text"} defaultValue={secret ? "" : current} placeholder={key === "META_GRAPH_VERSION" ? "v23.0" : ""} autoComplete="off" />
                  {secret && current && <label className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500"><input type="checkbox" name={`${key}__clear`} /> limpar</label>}
                </Field>
              );
            })}
          </div>
        </ActionForm>
      </Card>

      <Card className="p-5">
        <div className="mb-1 flex items-center gap-3 font-semibold">
          E-mails da plataforma
          <Badge color={emailConfigured() ? "green" : "yellow"}>{emailConfigured() ? "Configurado" : "Pendente"}</Badge>
        </div>
        <p className="mb-2 text-sm text-zinc-500">
          Convites, recuperação de senha e alertas críticos. Usa o Resend (grátis até 3.000 e-mails/mês): cole a chave no campo &quot;Chave do Resend&quot; acima.
        </p>
        <ActionForm action={adminTestEmailAction} submit="Enviar e-mail de teste para mim" variant="secondary" />
      </Card>

      <Card className="p-5">
        <div className="mb-1 font-semibold">Avisos no Discord (todas as contas)</div>
        <p className="mb-4 text-sm text-zinc-500">
          Os avisos de todas as contas chegam nesses canais, com o nome da conta e explicados: o que significa, o que fazer e se é urgente.
          Os clientes não veem isso. No Discord: abra o canal → ⚙️ Editar canal → Integrações → Webhooks → Novo webhook → Copiar URL do webhook, e cole abaixo.
          Canal em branco = o aviso vai para o #geral.
        </p>
        <ActionForm action={saveDiscordAction} submit="Salvar canais">
          <div className="grid gap-4 md:grid-cols-2">
            {DISCORD_CHANNELS.map((c) => (
              <Field key={c.key} label={c.label} hint={c.hint}>
                <Input name={c.key} defaultValue={discordHooks[c.key] ?? ""} placeholder="https://discord.com/api/webhooks/..." autoComplete="off" />
              </Field>
            ))}
          </div>
        </ActionForm>
        <ActionForm action={testDiscordAction} submit="Enviar mensagem de teste nos canais" variant="secondary" />
      </Card>

      <Card className="p-5">
        <div className="mb-1 font-semibold">Discord #erros</div>
        <p className="mb-2 text-sm text-zinc-500">
          Cole o webhook do canal de erros no campo &quot;Webhook do Discord para erros do sistema&quot; (em Integração, acima) e salve. Os avisos de campanhas, templates, qualidade e limites ficam no card acima.
        </p>
        <ActionForm action={testErrorsDiscordAction} submit="Testar canal #erros" variant="secondary" />
      </Card>


    </div>
  );
}
