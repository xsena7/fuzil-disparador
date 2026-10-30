"use server";

import { z } from "zod";
import { createOrder } from "@/lib/market";
import { clientIp, tooMany } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { sitePath } from "@/lib/site-path";
import { prisma } from "@/lib/db";

// Quantas BMs um mesmo IP pode deixar separadas por hora (sem isso dá para travar o estoque sem pagar)
// Trava contra quem tenta segurar o estoque sem pagar: soma só os pedidos deste aparelho que ainda esperam o Pix
// (pedido pago ou vencido não conta). Cada pedido vai até 50.
const MAX_PENDING_PER_IP = 60;
const reservedByIp = new Map<string, Array<{ at: number; token: string }>>();
export type OrderState = { error?: string; goTo?: string } | undefined;

const schema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "Escolha a quantidade").max(50, "Máximo de 50 por pedido"),
  name: z.string().trim().min(2, "Digite seu nome").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(120),
  phone: z.string().trim().max(30).optional(),
});

/** Compra na vitrine (/vendas): separa o estoque por 15 minutos e gera o Pix. */
export async function createOrderAction(_: OrderState, form: FormData): Promise<OrderState> {
  const ip = await clientIp();
  if (tooMany(`vendas:${ip}`, 4, 30 * 60_000)) return { error: "Muitas tentativas. Espere uns minutos e tente de novo." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { productId, quantity, name, email } = parsed.data;
  // Um pedido esperando Pix por e-mail
  if (await prisma.marketOrder.count({ where: { email, status: "PENDING", expiresAt: { gt: new Date() } } }))
    return { error: "Você já tem um pedido esperando o Pix. Pague esse ou espere ele vencer (15 minutos) para fazer outro." };
  const now = Date.now();
  const recent = (reservedByIp.get(ip) ?? []).filter((r) => now - r.at < 3600_000);
  const waiting = recent.length
    ? await prisma.marketOrder.aggregate({ where: { token: { in: recent.map((r) => r.token) }, status: "PENDING", expiresAt: { gt: new Date() } }, _sum: { quantity: true } })
    : null;
  if ((waiting?._sum.quantity ?? 0) + quantity > MAX_PENDING_PER_IP) return { error: "Muitas BMs separadas daqui esperando o Pix. Pague os pedidos abertos ou espere eles vencerem (15 minutos)." };
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  const r = await createOrder({ productId, quantity, name, email, phone: phone || null });
  if ("error" in r) return { error: r.error };
  reservedByIp.set(ip, [...recent, { at: now, token: r.token }]);
  if (reservedByIp.size > 10_000) reservedByIp.clear();
  // O navegador abre o endereço (passa pela reescrita do domínio do site). Redirecionar daqui dava 404 no domínio do site
  return { goTo: await sitePath(`/vendas/pedido/${r.token}`) };
}
