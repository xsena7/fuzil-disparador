"use server";

import { requireAuth } from "@/lib/auth";
import { createCreditPurchase } from "@/lib/credit-purchase";
import { tooMany } from "@/lib/rate-limit";
import { pixNeedsPayerDoc, validDocument } from "@/lib/pix";

export type BuyState = { error?: string; token?: string } | undefined;

/** Comprar créditos (tela de Saldo): gera o Pix da recarga. */
export async function buyCreditsAction(_: BuyState, form: FormData): Promise<BuyState> {
  const auth = await requireAuth();
  if (auth.inspecting) return { error: "Você está vendo a conta de outro cliente: a compra é feita na conta dele" };
  if (tooMany(`recarga:${auth.workspace.id}`, 10, 10 * 60_000)) return { error: "Muitas tentativas. Espere uns minutos e tente de novo." };
  const credits = Number(String(form.get("credits") ?? "").replace(/\D/g, ""));
  const document = String(form.get("document") ?? "").replace(/\D/g, "");
  const phone = String(form.get("phone") ?? "").replace(/\D/g, "");
  if (pixNeedsPayerDoc()) {
    if (!validDocument(document)) return { error: "CPF ou CNPJ inválido. Confira os números." };
    if (phone.length < 10 || phone.length > 13) return { error: "WhatsApp inválido. Coloque com DDD." };
  }
  const r = await createCreditPurchase({ workspaceId: auth.workspace.id, userId: auth.user.id, email: auth.user.email, name: auth.user.name, credits, document, phone });
  return "error" in r ? { error: r.error } : { token: r.token };
}
