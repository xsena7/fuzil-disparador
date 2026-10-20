import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Stat, Table, Td } from "@/components/ui";

export const dynamic = "force-dynamic";

const TYPE = { TOPUP: "Recarga", DEBIT: "Envio", REFUND: "Estorno", ADJUST: "Ajuste" };

export default async function BalancePage() {
  const auth = await requireAuth();
  const since = new Date(Date.now() - 30 * 86400_000);
  const [txs, used30] = await Promise.all([
    prisma.creditTransaction.findMany({ where: { workspaceId: auth.workspace.id }, orderBy: { createdAt: "desc" }, take: 3000 }),
    prisma.creditTransaction.aggregate({ where: { workspaceId: auth.workspace.id, createdAt: { gte: since }, type: { in: ["DEBIT", "REFUND"] } }, _sum: { amount: true } }),
  ]);
  // Junta as movimentações seguidas iguais (mesmo tipo e descrição, no mesmo dia) numa linha só
  const day = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const rows: Array<{ id: string; type: keyof typeof TYPE; description: string; amount: number; count: number; first: Date; last: Date; balanceAfter: number }> = [];
  for (const t of txs) {
    const prev = rows[rows.length - 1];
    if (prev && prev.type === t.type && prev.description === t.description && day(prev.first) === day(t.createdAt)) {
      prev.amount += t.amount;
      prev.count++;
      prev.first = t.createdAt;
    } else rows.push({ id: t.id, type: t.type, description: t.description, amount: t.amount, count: 1, first: t.createdAt, last: t.createdAt, balanceAfter: t.balanceAfter });
  }
  const hm = (d: Date) => d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Saldo" description="Cada mensagem enviada consome créditos e falhas são estornadas. A cobrança da Meta é à parte, no cartão de cada WABA." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Saldo atual" value={`${auth.workspace.creditBalance.toLocaleString("pt-BR")}`} sub="créditos" tone="green" />
        <Stat label="Custo por mensagem" value={auth.workspace.creditsPerMessage} sub="créditos" />
        <Stat label="Consumo (30 dias)" value={Math.abs(used30._sum.amount ?? 0).toLocaleString("pt-BR")} sub="créditos" />
      </div>
      <Table head={["Data", "Tipo", "Descrição", "Valor", "Saldo após"]}>
        {rows.slice(0, 80).map((t) => (
          <tr key={t.id}>
            <Td className="text-xs text-zinc-500">
              {day(t.last)} · {t.count > 1 && hm(t.first) !== hm(t.last) ? `${hm(t.first)}–${hm(t.last)}` : hm(t.last)}
            </Td>
            <Td>{TYPE[t.type]}</Td>
            <Td>{t.description}{t.count > 1 && <span className="text-zinc-400"> · {t.count} lançamentos</span>}</Td>
            <Td className={t.amount < 0 ? "text-red-600" : "text-emerald-700"}>{t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("pt-BR")}</Td>
            <Td>{t.balanceAfter.toLocaleString("pt-BR")}</Td>
          </tr>
        ))}
        {txs.length === 0 && <tr><Td colSpan={5} className="text-center text-zinc-500">Nenhuma movimentação.</Td></tr>}
      </Table>
    </div>
  );
}
