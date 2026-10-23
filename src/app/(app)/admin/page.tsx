import { requireSuperAdmin } from "@/lib/auth";
import { UserActions } from "./user-actions";
import { AccountsPanel } from "./accounts-panel";
import { platformOwnerId } from "@/lib/onboarding";
import { listAccounts } from "@/lib/admin-accounts";
import { prisma } from "@/lib/db";
import { Field, Input, PageHeader, Table, Td } from "@/components/ui";
import { Drawer } from "@/components/drawer";
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
import { adminDeleteLinkAction } from "@/app/actions/links";
import { Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await requireSuperAdmin();
  // Dono do Fuzil: o primeiro administrador (ganha a etiqueta e é o único que dá ou tira administrador)
  const ownerId = await platformOwnerId();
  const [accounts, orphans, hooks] = await Promise.all([
    listAccounts(auth.user.id),
    prisma.user.findMany({ where: { memberships: { none: {} } }, orderBy: { createdAt: "desc" } }),
    platformDiscordHooks(),
  ]);
  const extLinks = await prisma.externalLink.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { lead: { select: { name: true, phone: true } } } });
  const linksFunnel = await prisma.funnel.findFirst({ where: { kind: "LINKS", workspaceId: auth.workspace.id }, select: { id: true, status: true } });
  const bugs = await prisma.bugReport.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 50 });
  const openBugs = bugs.filter((b) => b.status === "OPEN").length;
  const discordHooks = (hooks ?? {}) as Record<string, string>;
  const hookCount = Object.values(discordHooks).filter(Boolean).length;
  const setting = (k: string) => cachedSetting(k) ?? process.env[k] ?? "";
  const metaOk = Boolean(setting("META_APP_ID") && setting("META_APP_SECRET") && setting("META_SYSTEM_USER_TOKEN"));
  const errorsHook = Boolean(setting("DISCORD_ERRORS_WEBHOOK"));
  const companyOk = Boolean(company().legalName && company().address);
  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <PageHeader title="Admin da plataforma" description="Contas de clientes, integrações e logs." actions={<LinkButton href="/admin/logs" variant="secondary"><ScrollText className="size-4" /> Logs do sistema</LinkButton>} />
      <AccountsPanel accounts={accounts} selfId={auth.user.id} ownerId={ownerId} />

      <Drawer
        className="scroll-mt-4"
        title={<span className="flex items-center gap-2" id="bugs"><PixelBug className="size-5" /> Bugs reportados</span>}
        tone={openBugs > 0 ? "red" : "green"}
        meta={<span>{openBugs > 0 ? `${openBugs} em aberto` : "Nada em aberto"} · {bugs.length} no total</span>}
        open={openBugs > 0}
      >
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
      </Drawer>

      <Drawer title="Criar conta de cliente" meta={<span>O cliente recebe um convite por e-mail</span>}>
        <ActionForm action={adminCreateWorkspaceAction} submit="Criar conta e enviar convite">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Nome da conta"><Input name="company" required /></Field>
            <Field label="Nome do dono"><Input name="name" required /></Field>
            <Field label="E-mail do cliente"><Input name="email" type="email" required /></Field>
            <Field label="Créditos iniciais"><Input name="credits" type="number" min={0} defaultValue={0} /></Field>
          </div>
        </ActionForm>
      </Drawer>

      {orphans.length > 0 && (
        <Drawer title="Usuários sem conta" tone="amber" meta={<span>{orphans.length} usuário(s) fora de qualquer conta, pode excluir</span>}>
          <Table head={["Nome", "E-mail", ""]}>
            {orphans.map((u) => (
              <tr key={u.id}>
                <Td className="font-medium">{u.name}</Td>
                <Td className="text-xs">{u.email}</Td>
                <Td className="text-right"><UserActions id={u.id} email={u.email} isSelf={u.id === auth.user.id} /></Td>
              </tr>
            ))}
          </Table>
        </Drawer>
      )}

      <Drawer title="Empresa e site" tone={companyOk ? "green" : "amber"} meta={<span>{companyOk ? `${company().legalName} · CNPJ ${company().cnpj}` : "Falta razão social ou endereço"}</span>}>
        <p className="mb-4 text-sm text-zinc-500">
          Aparece no site público <a href={company().siteUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">{company().siteUrl.replace("https://", "")}</a> (rodapé, Política de Privacidade, Termos e Exclusão de dados).
          A Meta confere esses dados na verificação da empresa: use a razão social e o endereço <b>exatamente</b> como estão no cartão CNPJ.
        </p>
        <ActionForm action={adminSaveCompanyAction} submit="Salvar dados da empresa">
          <div className="grid gap-4 md:grid-cols-2">
            {COMPANY_KEYS.map(({ key, label, placeholder }) => (
              <Field key={key} label={label} hint={key === "META_DOMAIN_VERIFICATION" ? "Na Meta: Configurações do negócio → Segurança da marca → Domínios → Adicionar → \"Meta-tag\". Cole o código (ou a tag inteira). Mais de uma BM? Cole os códigos separados por vírgula." : undefined}>
                <Input name={key} defaultValue={cachedSetting(key) ?? (key === "COMPANY_CNPJ" ? company().cnpj : "")} placeholder={placeholder} autoComplete="off" />
              </Field>
            ))}
          </div>
        </ActionForm>
      </Drawer>

      <Drawer title="Integração com a Meta" tone={metaOk ? "green" : "red"} meta={<span>{metaOk ? "App, segredo e token configurados" : "Falta App ID, App Secret ou token"}</span>}>
        <p className="mb-4 text-sm text-zinc-500">Campos secretos em branco mantêm o valor atual.</p>
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
      </Drawer>

      <Drawer title="E-mails da plataforma" tone={emailConfigured() ? "green" : "amber"} meta={<span>{emailConfigured() ? "Configurado" : "Pendente: falta a chave do Resend"}</span>}>
        <p className="mb-2 text-sm text-zinc-500">
          Convites, recuperação de senha e alertas críticos. Usa o Resend (grátis até 3.000 e-mails/mês): cole a chave no campo &quot;Chave do Resend&quot; acima.
        </p>
        <ActionForm action={adminTestEmailAction} submit="Enviar e-mail de teste para mim" variant="secondary" />
      </Drawer>

      <Drawer
        title="Gerador de links do botão (site público)"
        tone={linksFunnel?.status === "ACTIVE" ? "green" : "amber"}
        meta={<span>{linksFunnel ? `${linksFunnel.status === "ACTIVE" ? "No ar" : "Pausado"} · ${extLinks.length} link(s)` : "Desligado: falta criar o funil"}</span>}
      >
        <p className="mb-4 text-sm text-zinc-500">
          Página sem senha onde seus clientes entram pelo WhatsApp e criam o código do botão:{" "}
          <a href={`${company().siteUrl}/links`} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">{company().siteUrl.replace(/^https:\/\//, "")}/links</a>.{" "}
          {linksFunnel ? (
            <LinkButton href={`/aquecimento/${linksFunnel.id}`} variant="secondary" className="ml-1 px-3 py-1 text-xs">Abrir o funil do login</LinkButton>
          ) : (
            <>Para ligar, vá em <b>Aquecimento → Novo funil → Login do gerador de links</b>.</>
          )}
        </p>
        {extLinks.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-sm font-semibold">Links criados</div>
            <Table head={["Nome", "Cliente", "Código", "Destino", "Cliques", ""]}>
              {extLinks.map((l) => (
                <tr key={l.id}>
                  <Td className="font-medium">{l.name}</Td>
                  <Td className="text-xs">{l.lead ? `${l.lead.name} · ${l.lead.phone}` : "—"}</Td>
                  <Td className="font-mono">{l.code}</Td>
                  <Td className="max-w-xs truncate text-xs text-zinc-500" title={l.url}>{l.url}</Td>
                  <Td>{l.clicks.toLocaleString("pt-BR")}</Td>
                  <Td>
                    <ConfirmButton action={adminDeleteLinkAction.bind(null, l.id)} variant="ghost" className="px-2 py-1 text-red-600" confirm={`Apagar o link "${l.name}" (${l.code})?\nQuem clicar no botão com esse código vai ver "link não encontrado".`}>
                      <Trash2 className="size-4" />
                    </ConfirmButton>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Drawer>

      <Drawer title="Avisos no Discord" tone={hookCount > 0 ? "green" : "red"} meta={<span>{hookCount > 0 ? `${hookCount} de ${DISCORD_CHANNELS.length} canais configurados` : "Nenhum canal: nada está indo pro Discord"}</span>}>
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
      </Drawer>

      <Drawer title="Discord #erros" tone={errorsHook ? "green" : "amber"} meta={<span>{errorsHook ? "Configurado" : "Não configurado"}</span>}>
        <p className="mb-2 text-sm text-zinc-500">
          Cole o webhook do canal de erros no campo &quot;Webhook do Discord para erros do sistema&quot; (em Integração, acima) e salve. Os avisos de campanhas, templates, qualidade e limites ficam no card acima.
        </p>
        <ActionForm action={testErrorsDiscordAction} submit="Testar canal #erros" variant="secondary" />
      </Drawer>


    </div>
  );
}
