import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { MAX_CREDITS, MIN_AMOUNT_CENTS, creditPackages, minCredits, purchaseStatus } from "@/lib/credit-purchase";
import { supportLink } from "@/lib/market";
import { Badge, Card, PageHeader, Stat, Table, Td } from "@/components/ui";
import { BuyCredits } from "./buy-credits";

export const dynamic = "force-dynamic";

const TYPE = { TOPUP: "Recarga", DEBIT: "Envio", REFUND: "Estorno", ADJUST: "Ajuste" };

export default async function BalancePage() {
  const auth = await requireAuth();
  const since = new Date(Date.now() - 30 * 86400_000);
  const [txs, used30, purchases] = await Promise.all([
    prisma.creditTransaction.findMany({ where: { workspaceId: auth.workspace.id }, orderBy: { createdAt: "desc" }, take: 3000 }),
    prisma.creditTransaction.aggregate({ where: { workspaceId: auth.workspace.id, createdAt: { gte: since }, type: { in: ["DEBIT", "REFUND"] } }, _sum: { amount: true } }),
    prisma.creditPurchase.findMany({ where: { workspaceId: auth.workspace.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const price = env.creditPrice();
  const canBuy = Boolean(env.mpAccessToken());
  // Pix de recarga ainda em aberto: a tela volta nele (não gera outro)
  const open = purchases.find((p) => p.status === "PENDING" && p.mpPaymentId && p.expiresAt > new Date());
  const resume = open ? { token: open.token, status: (await purchaseStatus(open.token, auth.workspace.id))! } : null;
  const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const PSTATUS: Record<string, { label: string; color: "green" | "yellow" | "gray" }> = {
    PAID: { label: "Pago", color: "green" },
    PENDING: { label: "Esperando o Pix", color: "yellow" },
    EXPIRED: { label: "Venceu", color: "gray" },
    CANCELLED: { label: "Não gerado", color: "gray" },
  };
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
      <PageHeader title="Saldo" description="Cada disparo enviado gasta créditos. O que falha é estornado na hora. A cobrança da Meta é à parte, no cartão de cada WABA." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Saldo atual" value={`${auth.workspace.creditBalance.toLocaleString("pt-BR")}`} sub={`créditos · dá para ${Math.floor(auth.workspace.creditBalance / Math.max(1, auth.workspace.creditsPerMessage)).toLocaleString("pt-BR")} disparos`} tone="green" />
        <Stat label="Custo por disparo" value={auth.workspace.creditsPerMessage} sub={auth.workspace.creditsPerMessage === 1 ? "crédito" : "créditos"} />
        <Stat label="Consumo (30 dias)" value={Math.abs(used30._sum.amount ?? 0).toLocaleString("pt-BR")} sub="créditos" />
      </div>

      <Card className="mb-6 p-5">
        <div className="mb-1 font-semibold text-zinc-900">Comprar créditos</div>
        <p className="mb-4 text-sm text-zinc-500">
          {price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 })} por crédito (1 crédito = 1 disparo). Recarga mínima de {brl(MIN_AMOUNT_CENTS)}. Pague no Pix e o saldo entra sozinho.
        </p>
        {canBuy ? (
          <BuyCredits price={price} packages={creditPackages(price)} min={minCredits(price)} minCents={MIN_AMOUNT_CENTS} max={MAX_CREDITS} resume={resume} />
        ) : (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            A compra pelo Pix ainda não está ligada.{" "}
            <a href={supportLink(`Oi! Quero comprar créditos para a conta ${auth.workspace.name}.`)} target="_blank" rel="noreferrer" className="font-semibold underline">Fale com a gente no WhatsApp</a> para recarregar.
          </p>
        )}
        {purchases.length > 0 && (
          <div className="mt-5 border-t border-zinc-100 pt-4">
            <div className="mb-2 text-sm font-semibold text-zinc-700">Suas recargas</div>
            <div className="space-y-1.5">
              {purchases.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="w-28 text-xs text-zinc-500">{day(p.createdAt)} · {hm(p.createdAt)}</span>
                  <span className="font-medium text-zinc-800">{p.credits.toLocaleString("pt-BR")} créditos</span>
                  <span className="text-zinc-500">{brl(p.amountCents)}</span>
                  <span className="ml-auto"><Badge color={(PSTATUS[p.status] ?? PSTATUS.CANCELLED).color}>{(PSTATUS[p.status] ?? PSTATUS.CANCELLED).label}</Badge></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
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
