"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createOrder } from "@/lib/market";
import { clientIp, tooMany } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { sitePath } from "@/lib/site-path";
import type { FormState } from "./auth";

const schema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "Escolha a quantidade").max(50, "Máximo de 50 por pedido"),
  name: z.string().trim().min(2, "Digite seu nome").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(120),
  phone: z.string().trim().max(30).optional(),
});

/** Compra na vitrine (/vendas): separa o estoque por 15 minutos e gera o Pix. */
export async function createOrderAction(_: FormState, form: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (tooMany(`vendas:${ip}`, 8, 10 * 60_000)) return { error: "Muitas tentativas. Espere uns minutos e tente de novo." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { productId, quantity, name, email } = parsed.data;
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  const r = await createOrder({ productId, quantity, name, email, phone: phone || null });
  if ("error" in r) return { error: r.error };
  redirect(await sitePath(`/vendas/pedido/${r.token}`));
}
