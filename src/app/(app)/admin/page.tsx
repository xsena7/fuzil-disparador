import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Field, Input, PageHeader, Table, Td } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { adminCreateWorkspaceAction, adminCreditsAction, adminPriceAction, adminSavePlatformAction } from "@/app/actions/misc";
import { PLATFORM_KEYS } from "@/lib/platform-settings";
import { env } from "@/lib/env";
import { cachedSetting } from "@/lib/settings-cache";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireSuperAdmin();
  const workspaces = await prisma.workspace.findMany({
    include: { memberships: { include: { user: true }, where: { role: "OWNER" } }, _count: { select: { businesses: true, campaigns: true } } },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Admin da plataforma" description="Contas de clientes, saldo e preço por mensagem." />
      <Table head={["Conta", "Dono", "BMs", "Campanhas", "Saldo", "Créditos/msg", "Recarga", "Preço"]}>
        {workspaces.map((w) => (
          <tr key={w.id}>
            <Td className="font-medium">{w.name}</Td>
            <Td className="text-xs">{w.memberships[0]?.user.email}</Td>
            <Td>{w._count.businesses}</Td>
            <Td>{w._count.campaigns}</Td>
            <Td>{w.creditBalance.toLocaleString("pt-BR")}</Td>
            <Td>{w.creditsPerMessage}</Td>
            <Td>
              <ActionForm action={adminCreditsAction} submit="Lançar" variant="secondary">
                <input type="hidden" name="workspaceId" value={w.id} />
                <div className="flex gap-2"><Input name="amount" type="number" placeholder="+10000 ou -500" className="w-32" /><Input name="note" placeholder="Obs." className="w-28" /></div>
              </ActionForm>
            </Td>
            <Td>
              <ActionForm action={adminPriceAction} submit="Salvar" variant="secondary">
                <input type="hidden" name="workspaceId" value={w.id} />
                <Input name="price" type="number" min={0} defaultValue={w.creditsPerMessage} className="w-20" />
              </ActionForm>
            </Td>
          </tr>
        ))}
      </Table>
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
        <div className="mb-4 font-semibold">Criar conta de cliente</div>
        <ActionForm action={adminCreateWorkspaceAction} submit="Criar conta">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Nome da conta"><Input name="company" /></Field>
            <Field label="Nome do dono"><Input name="name" /></Field>
            <Field label="E-mail"><Input name="email" type="email" /></Field>
            <Field label="Senha"><Input name="password" type="password" minLength={8} /></Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
