import { requireSuperAdmin } from "@/lib/auth";
import { UserActions } from "./user-actions";
import { AccountsPanel } from "./accounts-panel";
import { listAccounts } from "@/lib/admin-accounts";
import { prisma } from "@/lib/db";
import { Card, Field, Input, PageHeader, Table, Td } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { PixelBug } from "@/components/pixel-bug";
import { deleteBugAction, resendBugDiscordAction, setBugStatusAction } from "@/app/actions/bugs";
import { adminCreateWorkspaceAction, adminSaveCompanyAction, adminSavePlatformAction, adminTestEmailAction, saveDiscordAction, testDiscordAction, testErrorsDiscordAction } from "@/app/actions/misc";
import { DISCORD_CHANNELS } from "@/lib/alert-channels";
import { platformDiscordHooks } from "@/lib/alerts";
import { LinkButton } from "@/components/ui";
import { ScrollText } from "lucide-react";
import { emailConfigured } from "@/lib/email";
import { Badge } from "@/components/ui";
import { COMPANY_KEYS, PLATFORM_KEYS } from "@/lib/platform-settings";
import { company } from "@/lib/company";
import { env } from "@/lib/env";
import { cachedSetting } from "@/lib/settings-cache";
import { PasswordInput } from "@/components/password-input";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await requireSuperAdmin();
  const [accounts, orphans, hooks] = await Promise.all([
    listAccounts(auth.user.id),
    prisma.user.findMany({ where: { memberships: { none: {} } }, orderBy: { createdAt: "desc" } }),
    platformDiscordHooks(),
  ]);
  const bugs = await prisma.bugReport.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 50 });
  const openBugs = bugs.filter((b) => b.status === "OPEN").length;
  const discordHooks = (hooks ?? {}) as Record<string, string>;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Admin da plataforma" description="Contas de clientes, integrações e logs." actions={<LinkButton href="/admin/logs" variant="secondary"><ScrollText className="size-4" /> Logs do sistema</LinkButton>} />
      <AccountsPanel accounts={accounts} selfId={auth.user.id} />

      <Card className="p-5" id="bugs">
        <div className="mb-1 flex items-center gap-3 font-semibold">
          <PixelBug className="size-6" /> Bugs reportados
          {openBugs > 0 ? <Badge color="red">{openBugs} em aberto</Badge> : <Badge color="green">Nada em aberto</Badge>}
        </div>
        <p className="mb-4 text-sm text-zinc-500">O que os clientes mandam pelo botão do bichinho no canto da tela. Também chega no Discord #bugs.</p>
        {bugs.length === 0 && <p className="text-sm text-zinc-400">Nenhum bug reportado ainda.</p>}
        <div className="space-y-2">
          {bugs.map((b) => (
            <div key={b.id} className={`rounded-xl border p-4 ${b.status === "OPEN" ? "border-amber-200 bg-amber-50/40" : "border-zinc-200 opacity-70"}`}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="font-mono font-semibold text-zinc-700">#{b.id.slice(-6).toUpperCase()}</span>
                <span>{b.userName} ({b.userEmail}) · {b.workspaceName}</span>
                {b.pagePath && <span>· página <code>{b.pagePath}</code></span>}
                <span className="ml-auto">{b.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-zinc-800">{b.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {b.screenshotUrl && <a href={b.screenshotUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 hover:underline">Ver print</a>}
                {b.discordSent ? (
                  <span className="text-xs text-emerald-700">✓ chegou no Discord</span>
                ) : (
                  <span className="text-xs text-rose-600">✗ não chegou no Discord{b.discordError ? `: ${b.discordError}` : ""}</span>
                )}
                <span className="flex-1" />
                {!b.discordSent && <ConfirmButton action={resendBugDiscordAction.bind(null, b.id)} className="px-2.5 py-1 text-xs">Reenviar pro Discord</ConfirmButton>}
                <ConfirmButton action={setBugStatusAction.bind(null, b.id, b.status === "OPEN")} className="px-2.5 py-1 text-xs">{b.status === "OPEN" ? "Marcar resolvido" : "Reabrir"}</ConfirmButton>
                <ConfirmButton action={deleteBugAction.bind(null, b.id)} variant="ghost" confirm="Apagar esse relato?" className="px-2.5 py-1 text-xs">Apagar</ConfirmButton>
              </div>
            </div>
          ))}
        </div>
      </Card>

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
        <div className="mb-1 font-semibold">Empresa e site</div>
        <p className="mb-4 text-sm text-zinc-500">
          Aparece no site público <a href={company().siteUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">{company().siteUrl.replace("https://", "")}</a> (rodapé, Política de Privacidade, Termos e Exclusão de dados).
          A Meta confere esses dados na verificação da empresa: use a razão social e o endereço <b>exatamente</b> como estão no cartão CNPJ.
        </p>
        <ActionForm action={adminSaveCompanyAction} submit="Salvar dados da empresa">
          <div className="grid gap-4 md:grid-cols-2">
            {COMPANY_KEYS.map(({ key, label, placeholder }) => (
              <Field key={key} label={label} hint={key === "META_DOMAIN_VERIFICATION" ? "Na Meta: Configurações do negócio → Segurança da marca → Domínios → Adicionar → \"Meta-tag\". Cole o código (ou a tag inteira) aqui." : undefined}>
                <Input name={key} defaultValue={cachedSetting(key) ?? (key === "COMPANY_CNPJ" ? company().cnpj : "")} placeholder={placeholder} autoComplete="off" />
              </Field>
            ))}
          </div>
        </ActionForm>
      </Card>

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
                  {secret ? <PasswordInput name={key} defaultValue="" autoComplete="off" /> : <Input name={key} defaultValue={current} placeholder={key === "META_GRAPH_VERSION" ? "v23.0" : ""} autoComplete="off" />}
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
        {Object.values(discordHooks).filter(Boolean).length === 0 && (
          <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Nenhum canal configurado: hoje <b>nada</b> está indo pro Discord (alertas e bugs). Cole pelo menos o webhook do #geral e salve.
          </p>
        )}
        <ActionForm action={saveDiscordAction} submit="Salvar canais">
          <div className="grid gap-4 md:grid-cols-2">
            {DISCORD_CHANNELS.map((c) => (
              <Field key={c.key} label={<>{c.label} {discordHooks[c.key] ? <span className="text-xs font-normal text-emerald-600">✓ configurado</span> : <span className="text-xs font-normal text-zinc-400">vazio</span>}</>} hint={c.hint}>
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
