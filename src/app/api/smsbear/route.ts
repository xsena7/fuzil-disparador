import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { manualOrders } from "@/lib/smsbear";
import { providerOf, providerToken } from "@/lib/sms-providers";
import type { SmsProviderKey } from "@/lib/smsbear-shared";

export const dynamic = "force-dynamic";

const KEYS: SmsProviderKey[] = ["smsbear", "sms24h"];
type Info = { at: number; balance: number | null; price: { cost: number; stock: number } | null; error: string | null };
// Saldo e preço mudam pouco: guarda 15s por conta e serviço para o painel não chamar o serviço a cada atualização
const cache = new Map<string, Info>();

async function info(workspaceId: string, key: SmsProviderKey, token: string): Promise<Info> {
  const ck = `${workspaceId}:${key}`;
  const c = cache.get(ck);
  if (c && Date.now() - c.at < 15_000) return c;
  let next: Info;
  try {
    const prov = providerOf(key);
    const [balance, price] = await Promise.all([prov.balance(token), prov.price(token).catch(() => null)]);
    next = { at: Date.now(), balance, price: price ? { cost: price.costCents, stock: price.stock } : null, error: null };
  } catch (e) {
    next = { at: Date.now(), balance: null, price: null, error: e instanceof Error ? e.message : "Serviço fora do ar" };
  }
  cache.set(ck, next);
  return next;
}

/** Painel de números (Conexões): saldo e preço de cada serviço, registros automáticos e números do modo manual. */
export async function GET() {
  const auth = await requireAuth();
  const providers: Record<string, { connected: boolean; balance?: number | null; price?: Info["price"]; error?: string | null }> = {};
  for (const key of KEYS) {
    const token = await providerToken(auth.workspace.id, key);
    providers[key] = token ? { connected: true, ...(await info(auth.workspace.id, key, token)) } : { connected: false };
  }
  const jobs = await prisma.smsJob.findMany({
    where: { workspaceId: auth.workspace.id },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { waba: { select: { name: true, business: { select: { name: true } } } } },
  });
  const manual = await manualOrders(auth.workspace.id).catch(() => []);
  return Response.json({
    providers,
    manual,
    jobs: jobs.map((j) => ({
      id: j.id,
      provider: j.provider,
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
      // Números ainda esperando cancelar (enquanto tiver, o registro não pode ser apagado)
      pendingCancel: Array.isArray(j.toCancel) ? j.toCancel.length : 0,
    })),
  });
}
