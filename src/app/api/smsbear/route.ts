import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { smsbear, workspaceBearToken } from "@/lib/smsbear";

export const dynamic = "force-dynamic";

// Saldo e preço mudam pouco: guarda 15s por conta para o painel não chamar o SMSBear a cada atualização
const cache = new Map<string, { at: number; balance: number | null; price: { cost: number; stock: number } | null; error: string | null }>();

/** Painel do SMSBear (Conexões): saldo, preço do WhatsApp BR e o andamento dos registros automáticos. */
export async function GET() {
  const auth = await requireAuth();
  const token = await workspaceBearToken(auth.workspace.id);
  if (!token) return Response.json({ connected: false });
  let c = cache.get(auth.workspace.id);
  if (!c || Date.now() - c.at > 15_000) {
    try {
      const [balance, price] = await Promise.all([smsbear.balance(token), smsbear.price(token)]);
      c = { at: Date.now(), balance, price: price ? { cost: Number(price.cost), stock: Number(price.stock) } : null, error: null };
    } catch (e) {
      c = { at: Date.now(), balance: null, price: null, error: e instanceof Error ? e.message : "SMSBear fora do ar" };
    }
    cache.set(auth.workspace.id, c);
  }
  const jobs = await prisma.smsJob.findMany({
    where: { workspaceId: auth.workspace.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { waba: { select: { name: true, business: { select: { name: true } } } } },
  });
  return Response.json({
    connected: true,
    balance: c.balance,
    price: c.price,
    error: c.error,
    jobs: jobs.map((j) => ({
      id: j.id,
      status: j.status,
      step: j.step,
      attempt: j.attempt,
      maxAttempts: j.maxAttempts,
      number: j.number,
      stepAt: j.stepAt,
      spentCents: j.spentCents,
      bm: j.waba.business.name,
      waba: j.waba.name,
      log: j.log,
      error: j.error,
      // Números ainda esperando cancelar no SMSBear (enquanto tiver, o registro não pode ser apagado)
      pendingCancel: Array.isArray(j.toCancel) ? j.toCancel.length : 0,
    })),
  });
}
