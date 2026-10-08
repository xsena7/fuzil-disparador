import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Stat, Table, Td } from "@/components/ui";

export const dynamic = "force-dynamic";

const TYPE = { TOPUP: "Recarga", DEBIT: "Envio", REFUND: "Estorno", ADJUST: "Ajuste" };

export default async function BalancePage() {
  const auth = await requireAuth();
  const since = new Date(Date.now() - 30 * 86400_000);
  const [txs, used30] = await Promise.all([
    prisma.creditTransaction.findMany({ where: { workspaceId: auth.workspace.id }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.creditTransaction.aggregate({ where: { workspaceId: auth.workspace.id, createdAt: { gte: since }, type: { in: ["DEBIT", "REFUND"] } }, _sum: { amount: true } }),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Saldo" description="Créditos da conta. Cada mensagem enviada consome créditos; falhas são estornadas automaticamente." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Saldo atual" value={`${auth.workspace.creditBalance.toLocaleString("pt-BR")}`} sub="créditos" tone="green" />
        <Stat label="Custo por mensagem" value={auth.workspace.creditsPerMessage} sub="créditos" />
        <Stat label="Consumo (30 dias)" value={Math.abs(used30._sum.amount ?? 0).toLocaleString("pt-BR")} sub="créditos" />
      </div>
      <p className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 text-zinc-600">
        Os créditos são o controle interno da plataforma. A cobrança da Meta continua sendo feita direto em cada WABA (cartão cadastrado na própria BM).
      </p>
      <Table head={["Data", "Tipo", "Descrição", "Valor", "Saldo após"]}>
        {txs.map((t) => (
          <tr key={t.id}>
            <Td className="text-xs text-zinc-500">{t.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</Td>
            <Td>{TYPE[t.type]}</Td>
            <Td>{t.description}</Td>
            <Td className={t.amount < 0 ? "text-red-600" : "text-emerald-700"}>{t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("pt-BR")}</Td>
            <Td>{t.balanceAfter.toLocaleString("pt-BR")}</Td>
          </tr>
        ))}
        {txs.length === 0 && <tr><Td colSpan={5} className="text-center text-zinc-500">Nenhuma movimentação.</Td></tr>}
      </Table>
    </div>
  );
}
