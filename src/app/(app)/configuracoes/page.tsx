import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Field, Input, PageHeader, Table, Td } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addMemberAction, changePasswordAction, saveProfileAction, saveSettingsAction } from "@/app/actions/misc";
import { PasswordInput } from "@/components/password-input";

export const dynamic = "force-dynamic";

const ROLE: Record<string, string> = { OWNER: "Dono", ADMIN: "Admin", MEMBER: "Membro" };

export default async function SettingsPage() {
  const auth = await requireAuth();
  const [ws, members] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: auth.workspace.id } }),
    prisma.membership.findMany({ where: { workspaceId: auth.workspace.id }, include: { user: true }, orderBy: { role: "asc" } }),
  ]);
  const canManage = auth.role !== "MEMBER";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Configurações" description="Seus dados de acesso e as preferências da conta." />

      {!auth.inspecting && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 font-semibold">Meus dados</div>
            <ActionForm action={saveProfileAction} submit="Salvar">
              <div className="space-y-4">
                <Field label="Nome"><Input name="name" defaultValue={auth.user.name} required /></Field>
                <Field label="E-mail de acesso"><Input name="email" type="email" defaultValue={auth.user.email} required /></Field>
                <Field label="Senha atual" hint="Só precisa se for trocar o e-mail.">
                  <PasswordInput name="currentPassword" autoComplete="current-password" />
                </Field>
              </div>
            </ActionForm>
          </Card>

          <Card className="p-5">
            <div className="mb-4 font-semibold">Trocar senha</div>
            <ActionForm action={changePasswordAction} submit="Trocar senha">
              <div className="space-y-4">
                <Field label="Senha atual"><PasswordInput name="currentPassword" autoComplete="current-password" required /></Field>
                <Field label="Nova senha" hint="Pelo menos 8 caracteres."><PasswordInput name="newPassword" autoComplete="new-password" minLength={8} required /></Field>
                <Field label="Repita a nova senha"><PasswordInput name="confirmPassword" autoComplete="new-password" minLength={8} required /></Field>
              </div>
            </ActionForm>
          </Card>
        </div>
      )}

      {canManage && (
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
      )}

      <Card className="p-5">
        <div className="mb-4 font-semibold">Usuários da conta</div>
        <Table head={["Nome", "E-mail", "Papel"]}>
          {members.map((m) => (
            <tr key={m.id}><Td>{m.user.name}</Td><Td>{m.user.email}</Td><Td>{ROLE[m.role] ?? m.role}</Td></tr>
          ))}
        </Table>
        {canManage && (
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
