"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseMoney } from "@/lib/finance";
import { requireFinancePartner } from "@/lib/finance-partners";
import { deliverOrder, matchInvites, replaceItem } from "@/lib/market";
import { checkInviteLink } from "@/lib/market-invite";
import type { FormState } from "./auth";

// Painel de Vendas: só os sócios (os mesmos do Financeiro)

const done = (ok: string): FormState => {
  revalidatePath("/vendas");
  return { ok };
};

export async function saveProductAction(_: FormState, form: FormData): Promise<FormState> {
  await requireFinancePartner();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const description = String(form.get("description") ?? "").trim().slice(0, 300);
  const kind = form.get("kind") === "NO_TEMPLATE" ? "NO_TEMPLATE" : "TEMPLATE";
  const priceCents = parseMoney(String(form.get("price") ?? ""));
  const sort = Math.max(0, Math.min(999, Number(form.get("sort") ?? 0) || 0));
  const active = form.get("active") === "on";
  if (!name) return { error: "Dê um nome ao produto (ex.: BM com template aprovado)" };
  if (!priceCents) return { error: "Digite o preço (ex.: 50 ou 49,90)" };
  const data = { name, description, kind, priceCents, sort, active };
  if (id) await prisma.marketProduct.update({ where: { id }, data });
  else await prisma.marketProduct.create({ data });
  // Convites que chegaram antes de existir produto entram no estoque agora
  const { reingestStockMailbox } = await import("@/lib/market-inbox");
  await reingestStockMailbox().catch(() => undefined);
  return done(id ? "Produto salvo" : "Produto criado");
}

export async function deleteProductAction(id: string) {
  await requireFinancePartner();
  const orders = await prisma.marketOrder.count({ where: { productId: id } });
  if (orders) {
    await prisma.marketProduct.update({ where: { id }, data: { active: false } });
    return done("Tem pedidos nesse produto: tirei da vitrine em vez de apagar");
  }
  await prisma.marketProduct.delete({ where: { id } });
  return done("Produto apagado");
}

/** Coloca BMs no estoque: escolhendo das BMs conectadas na sua conta e/ou digitando o nome (uma por linha). */
export async function addItemsAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireFinancePartner();
  const productId = String(form.get("productId") ?? "");
  if (!(await prisma.marketProduct.findUnique({ where: { id: productId } }))) return { error: "Escolha o produto" };
  const ids = form.getAll("businessId").map(String).filter(Boolean);
  const bms = await prisma.businessManager.findMany({ where: { id: { in: ids }, workspaceId: auth.workspace.id }, select: { id: true, name: true } });
  const names = String(form.get("names") ?? "")
    .split(/\r?\n/)
    .map((n) => n.trim().slice(0, 120))
    .filter(Boolean);
  if (!bms.length && !names.length) return { error: "Escolha uma BM conectada ou digite o nome dela" };
  const already = new Set((await prisma.marketItem.findMany({ where: { businessId: { in: bms.map((b) => b.id) }, status: { not: "SOLD" } }, select: { businessId: true } })).map((i) => i.businessId));
  const fresh = bms.filter((b) => !already.has(b.id));
  await prisma.marketItem.createMany({
    data: [...fresh.map((b) => ({ productId, businessId: b.id, bmName: b.name })), ...names.map((bmName) => ({ productId, bmName }))],
  });
  const matched = await matchInvites();
  const skipped = bms.length - fresh.length;
  return done(`${fresh.length + names.length} BM(s) no estoque${matched ? `, ${matched} já com convite` : ""}${skipped ? ` (${skipped} já estavam)` : ""}`);
}

export async function toggleItemAction(id: string) {
  await requireFinancePartner();
  const it = await prisma.marketItem.findUnique({ where: { id } });
  if (!it || (it.status !== "AVAILABLE" && it.status !== "DISABLED")) return { error: "Só dá para pausar BM que não foi vendida nem está reservada" };
  await prisma.marketItem.update({ where: { id }, data: { status: it.status === "AVAILABLE" ? "DISABLED" : "AVAILABLE" } });
  return done(it.status === "AVAILABLE" ? "BM tirada da vitrine" : "BM de volta na vitrine");
}

export async function removeItemAction(id: string) {
  await requireFinancePartner();
  const it = await prisma.marketItem.findUnique({ where: { id } });
  if (!it || (it.status !== "AVAILABLE" && it.status !== "DISABLED")) return { error: "BM vendida ou reservada não sai do estoque" };
  await prisma.marketItem.delete({ where: { id } });
  return done("BM tirada do estoque");
}

/** Liga à mão um convite (que o Fuzil não reconheceu o nome) a uma BM do estoque. */
export async function assignInviteAction(inviteId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireFinancePartner();
  const itemId = String(form.get("itemId") ?? "");
  const [inv, item] = await Promise.all([
    prisma.marketInvite.findUnique({ where: { id: inviteId } }),
    prisma.marketItem.findUnique({ where: { id: itemId }, include: { invite: true } }),
  ]);
  if (!inv?.url || inv.usedAt) return { error: "Convite sem link ou já entregue" };
  if (!item || item.invite) return { error: "Essa BM já tem convite" };
  await prisma.marketInvite.update({ where: { id: inviteId }, data: { itemId } });
  return done("Convite ligado à BM");
}

/** Tira o convite de uma BM (ex.: convite errado). Ele volta para a lista de convites soltos. */
export async function unassignInviteAction(inviteId: string) {
  await requireFinancePartner();
  const inv = await prisma.marketInvite.findUnique({ where: { id: inviteId } });
  if (!inv || inv.usedAt) return { error: "Convite já entregue não sai da BM" };
  await prisma.marketInvite.update({ where: { id: inviteId }, data: { itemId: null } });
  return done("Convite solto da BM");
}

export async function recheckInviteAction(inviteId: string) {
  await requireFinancePartner();
  const inv = await prisma.marketInvite.findUnique({ where: { id: inviteId } });
  if (!inv?.url) return { error: "Convite sem link" };
  const t = await checkInviteLink(inv.url);
  await prisma.marketInvite.update({ where: { id: inviteId }, data: { check: t.check, checkNote: t.note, checkedAt: new Date() } });
  return done(t.check === "OK" ? "Link responde" : t.note);
}

export async function deliverAgainAction(orderId: string) {
  await requireFinancePartner();
  await deliverOrder(orderId, { resend: true });
  const o = await prisma.marketOrder.findUnique({ where: { id: orderId } });
  if (o?.status === "DELIVERED") return done("Entregue e e-mail enviado");
  return { error: o?.error ?? "Ainda não deu para entregar" };
}

/** Pagou por fora (ex.: Pix direto na chave): marca como pago e entrega. */
export async function markPaidAction(orderId: string) {
  await requireFinancePartner();
  const r = await prisma.marketOrder.updateMany({ where: { id: orderId, status: { in: ["PENDING", "EXPIRED", "CANCELLED"] } }, data: { status: "PAID", paidAt: new Date(), error: "Marcado como pago à mão" } });
  if (!r.count) return { error: "Esse pedido já está pago" };
  return deliverAgainAction(orderId);
}

export async function replaceItemAction(orderId: string, itemId: string) {
  await requireFinancePartner();
  const r = await replaceItem(orderId, itemId, "Troca pelo painel");
  revalidatePath("/vendas");
  return r;
}

/** Botão "Testar o Mercado Pago" (Admin → Vendas). */
export async function testMercadoPagoAction() {
  const auth = await requireFinancePartner();
  const { mpTestPix } = await import("@/lib/market");
  return mpTestPix(auth.user.email);
}
