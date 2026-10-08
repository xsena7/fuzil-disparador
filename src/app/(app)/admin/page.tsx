import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Field, Input, PageHeader, Table, Td } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { adminCreateWorkspaceAction, adminCreditsAction, adminPriceAction } from "@/app/actions/misc";

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
