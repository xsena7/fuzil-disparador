// Vendas de BM (marketplace em /vendas): reserva do estoque, Pix do Mercado Pago, entrega automática e troca.
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./env";
import { randomToken } from "./crypto";
import bcrypt from "bcryptjs";
import { createPasswordLink } from "./password-tokens";
import { emailLayout, sendEmail } from "./email";
import { createAlert } from "./alerts";
import { platformOwnerId, SUPPORT_WHATSAPP } from "./onboarding";
import { buildGuidePdf } from "./market-pdf";
import { normalizeBmName } from "./market-invite";

/** Quanto tempo o estoque fica separado esperando o Pix. */
export const RESERVE_MINUTES = 15;
const LOCK = 727275;

/** Só entra na vitrine a BM com convite capturado, testado e ainda não entregue. */
export const sellableWhere = (productId: string): Prisma.MarketItemWhereInput => ({
  productId,
  status: "AVAILABLE",
  invite: { is: { check: "OK", usedAt: null, url: { not: null } } },
});

export async function stockByProduct(): Promise<Map<string, number>> {
  const rows = await prisma.marketItem.groupBy({
    by: ["productId"],
    where: { status: "AVAILABLE", invite: { is: { check: "OK", usedAt: null, url: { not: null } } } },
    _count: true,
  });
  return new Map(rows.map((r) => [r.productId, r._count]));
}

export const brlCents = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const siteUrl = () => `https://${(process.env.SITE_DOMAIN || "fuzildisparador.com.br").replace(/^https?:\/\//, "").replace(/\/.*$/, "")}`;
export const orderUrl = (token: string) => `${siteUrl()}/vendas/pedido/${token}`;

export function supportLink(text: string) {
  const n = env.marketWhatsapp() || SUPPORT_WHATSAPP;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

// ---------------------------------------------------------------------------
// Mercado Pago
// ---------------------------------------------------------------------------

type MpPayment = {
  id: number;
  status: string; // pending | approved | rejected | cancelled | refunded | in_process ...
  external_reference?: string;
  transaction_amount?: number;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
};

async function mp<T>(method: "GET" | "POST", path: string, body?: unknown, idempotency?: string): Promise<T> {
  const token = env.mpAccessToken();
  if (!token) throw new Error("Mercado Pago não configurado (Admin → Configurações da plataforma)");
  const res = await fetch(`${env.mpApiUrl()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(idempotency ? { "X-Idempotency-Key": idempotency } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${json.message ?? "erro"}`);
  return json;
}

/** "2026-10-26T12:15:00.000-03:00" (formato que o Mercado Pago pede para o vencimento do Pix). */
function mpDate(d: Date) {
  return `${new Date(d.getTime() - 3 * 3600_000).toISOString().replace("Z", "")}-03:00`;
}

export const mpGetPayment = (id: string) => mp<MpPayment>("GET", `/v1/payments/${encodeURIComponent(id)}`);

// ---------------------------------------------------------------------------
// Pedido: reserva + Pix
// ---------------------------------------------------------------------------

export async function createOrder(input: { productId: string; quantity: number; name: string; email: string; phone: string | null }): Promise<{ token: string } | { error: string }> {
  const quantity = Math.max(1, Math.min(50, Math.floor(input.quantity)));
  const reserved = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK})`;
    const product = await tx.marketProduct.findFirst({ where: { id: input.productId, active: true } });
    if (!product) return { error: "Esse produto não está mais à venda." };
    const items = await tx.marketItem.findMany({ where: sellableWhere(product.id), orderBy: { createdAt: "asc" }, take: quantity, select: { id: true } });
    if (items.length < quantity) return { error: items.length ? `Só temos ${items.length} em estoque agora.` : "Esgotado no momento." };
    const expiresAt = new Date(Date.now() + RESERVE_MINUTES * 60_000);
    const order = await tx.marketOrder.create({
      data: { token: randomToken(18), productId: product.id, quantity, totalCents: product.priceCents * quantity, name: input.name, email: input.email, phone: input.phone, expiresAt },
    });
    await tx.marketItem.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { status: "RESERVED", orderId: order.id, reservedUntil: expiresAt } });
    return { order, product };
  });
  if ("error" in reserved) return { error: reserved.error ?? "Não deu certo" };
  const { order, product } = reserved;
  try {
    const pay = await mp<MpPayment>(
      "POST",
      "/v1/payments",
      {
        transaction_amount: order.totalCents / 100,
        description: `${quantity}x ${product.name}`,
        payment_method_id: "pix",
        external_reference: order.id,
        notification_url: `${env.appUrl()}/api/vendas/mercadopago`,
        date_of_expiration: mpDate(order.expiresAt),
        payer: { email: order.email, first_name: order.name.split(" ")[0] },
      },
      order.id,
    );
    const tx = pay.point_of_interaction?.transaction_data;
    if (!tx?.qr_code) throw new Error("Mercado Pago não devolveu o Pix");
    await prisma.marketOrder.update({ where: { id: order.id }, data: { mpPaymentId: String(pay.id), pixCode: tx.qr_code, pixQr: tx.qr_code_base64 ?? null } });
    return { token: order.token };
  } catch (e) {
    console.error("[vendas] criar Pix", e);
    await releaseOrder(order.id, "CANCELLED", e instanceof Error ? e.message : String(e));
    return { error: "Não consegui gerar o Pix agora. Tente de novo em instantes." };
  }
}

/** Devolve o estoque reservado de um pedido que não foi pago. */
async function releaseOrder(orderId: string, status: "EXPIRED" | "CANCELLED", error?: string) {
  await prisma.$transaction([
    prisma.marketItem.updateMany({ where: { orderId, status: "RESERVED" }, data: { status: "AVAILABLE", orderId: null, reservedUntil: null } }),
    prisma.marketOrder.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status, error: error ?? null } }),
  ]);
}

/** Pagamento avisado pelo Mercado Pago: confere direto na API (nunca confia só no aviso) e entrega. */
export async function confirmPayment(paymentId: string) {
  const pay = await mpGetPayment(paymentId);
  if (pay.status !== "approved" || !pay.external_reference) return { status: pay.status };
  const order = await prisma.marketOrder.findUnique({ where: { id: pay.external_reference } });
  if (!order || (order.mpPaymentId && order.mpPaymentId !== String(pay.id))) return { status: "ignored" };
  if (Math.round((pay.transaction_amount ?? 0) * 100) < order.totalCents) {
    await prisma.marketOrder.update({ where: { id: order.id }, data: { error: `Pago valor menor: ${pay.transaction_amount}` } });
    return { status: "amount_mismatch" };
  }
  if (order.status === "PENDING" || order.status === "EXPIRED" || order.status === "CANCELLED") {
    await prisma.marketOrder.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date(), mpPaymentId: String(pay.id) } });
    await notifyOwner("SALE", `Venda paga: ${order.quantity} BM(s) · ${brlCents(order.totalCents)}`, `${order.name} (${order.email}).`, { orderId: order.id });
  }
  await deliverOrder(order.id);
  return { status: "approved" };
}

// ---------------------------------------------------------------------------
// Entrega
// ---------------------------------------------------------------------------

/** Conta do comprador no Fuzil: cria se não tem (com link para criar a senha). */
async function ensureBuyerAccount(name: string, email: string): Promise<{ userId: string; accessUrl: string; created: boolean }> {
  const found = await prisma.user.findUnique({ where: { email } });
  if (found) return { userId: found.id, accessUrl: `${env.appUrl()}/login`, created: false };
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(randomToken(24), 10),
      memberships: { create: { role: "OWNER", workspace: { create: { name } } } },
    },
  });
  return { userId: user.id, accessUrl: await createPasswordLink(user.id, "INVITE"), created: true };
}

/**
 * Separa as BMs, marca os convites como entregues e manda o e-mail (convites + acesso + PDF + WhatsApp).
 * Pode rodar de novo sem problema: o que já foi separado continua separado, e só falta o e-mail se ele falhou.
 */
export async function deliverOrder(orderId: string) {
  const ready = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK})`;
    const order = await tx.marketOrder.findUnique({ where: { id: orderId }, include: { items: { include: { invite: true } }, product: true } });
    if (!order || order.status !== "PAID") return null;
    let mine = order.items.filter((i) => i.status === "RESERVED" || i.status === "SOLD");
    // Pagou depois que a reserva venceu: separa de novo do estoque
    if (mine.length < order.quantity) {
      const more = await tx.marketItem.findMany({ where: sellableWhere(order.productId), orderBy: { createdAt: "asc" }, take: order.quantity - mine.length, include: { invite: true } });
      await tx.marketItem.updateMany({ where: { id: { in: more.map((m) => m.id) } }, data: { status: "RESERVED", orderId: order.id } });
      mine = [...mine, ...more.map((m) => ({ ...m, status: "RESERVED", orderId: order.id }))];
    }
    if (mine.length < order.quantity) {
      await tx.marketOrder.update({ where: { id: order.id }, data: { error: `Faltou estoque: pago ${order.quantity}, separado ${mine.length}. Coloque mais BMs com convite e clique em Entregar.` } });
      return { order, missing: true as const };
    }
    const now = new Date();
    await tx.marketItem.updateMany({ where: { id: { in: mine.map((m) => m.id) }, status: "RESERVED" }, data: { status: "SOLD", soldAt: now, reservedUntil: null } });
    await tx.marketInvite.updateMany({ where: { itemId: { in: mine.map((m) => m.id) }, usedAt: null }, data: { usedAt: now } });
    return { order, items: mine, missing: false as const };
  });
  if (!ready) return;
  if (ready.missing) {
    await notifyOwner("SALE_STOCK", "Venda paga sem estoque suficiente", ready.order.error ?? "", { orderId });
    return;
  }
  const { order, items } = ready;
  const account = await ensureBuyerAccount(order.name, order.email);
  if (!order.userId) await prisma.marketOrder.update({ where: { id: order.id }, data: { userId: account.userId } });
  const sent = await sendDeliveryEmail(order, items.map((i) => i.invite?.url).filter((u): u is string => Boolean(u)), account);
  await prisma.marketOrder.update({
    where: { id: order.id },
    data: sent ? { status: "DELIVERED", deliveredAt: new Date(), error: null } : { error: "O e-mail não saiu (confira a chave do Resend). Tento de novo sozinho." },
  });
}

async function sendDeliveryEmail(
  order: { name: string; email: string; quantity: number; token: string; product: { name: string; kind: string } },
  urls: string[],
  account: { accessUrl: string; created: boolean },
  replacement = false,
) {
  const first = order.name.split(" ")[0];
  const list = urls.map((u, i) => `<b>BM ${i + 1}:</b> <a href="${u}" style="color:#ea580c;word-break:break-all;">${u}</a>`).join("<br>");
  const wa = supportLink(`Oi! Comprei BM no Fuzil (pedido ${order.token.slice(0, 8)}) e preciso de ajuda.`);
  const { html, text } = emailLayout({
    preheader: replacement ? "Sua BM de troca chegou" : "Seus convites de BM e o acesso ao Fuzil",
    title: replacement ? `${first}, sua BM de troca chegou` : `${first}, sua compra chegou!`,
    paragraphs: [
      replacement
        ? "Trocamos a BM do seu pedido. O convite novo está aqui embaixo:"
        : `Aqui ${urls.length > 1 ? `estão os ${urls.length} convites` : "está o convite"} de ${order.product.name}. Abra cada link logado no Facebook que vai ser dono da BM e aceite:`,
      list,
      account.created
        ? "Também criamos sua conta no Fuzil Disparador com este e-mail. Clique no botão para criar sua senha e conectar a BM."
        : "Entre no Fuzil Disparador com este e-mail e conecte a BM em Conexões → Conectar Cloud API.",
      "No PDF anexo está o passo a passo completo: aceitar o convite, conectar no Fuzil, disparar e usar o gerador de links em outras plataformas.",
      `<a href="${wa}" style="display:inline-block;padding:12px 22px;border-radius:12px;background:#16a34a;color:#ffffff;font-weight:700;text-decoration:none;">Problema com a compra? Fale no WhatsApp</a><br><span style="font-size:12px;color:#a1a1aa;">WhatsApp: <a href="${wa}" style="color:#16a34a;">${wa.split("?")[0]}</a></span>`,
    ],
    cta: { label: account.created ? "Criar minha senha no Fuzil" : "Entrar no Fuzil", url: account.accessUrl },
    note:
      "Garantia: você tem 24 horas depois da compra para avisar se tiver problema, e respondemos em até 24 horas. Trocamos a BM em dois casos: o link do convite não funcionou ou a conta chegou banida. Cada convite é único: não repasse o link.",
  });
  const pdf = await buildGuidePdf({ buyerName: order.name, appUrl: env.appUrl(), siteUrl: siteUrl(), withTemplate: order.product.kind === "TEMPLATE" }).catch((e) => {
    console.error("[vendas] pdf", e);
    return null;
  });
  return sendEmail({
    to: order.email,
    subject: replacement ? "Fuzil: sua BM de troca" : `Fuzil: ${urls.length > 1 ? "seus convites de BM" : "seu convite de BM"}`,
    html,
    text,
    attachments: pdf ? [{ filename: "fuzil-como-disparar.pdf", content: pdf }] : undefined,
  });
}

/** Troca (feita pelo dono): a BM antiga sai do pedido e entra outra do mesmo tipo, com convite novo por e-mail. */
export async function replaceItem(orderId: string, itemId: string, reason: string): Promise<{ ok: string } | { error: string }> {
  const r = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK})`;
    const order = await tx.marketOrder.findUnique({ where: { id: orderId }, include: { product: true } });
    const old = await tx.marketItem.findFirst({ where: { id: itemId, orderId } });
    if (!order || !old) return { error: "BM não encontrada nesse pedido" };
    const next = await tx.marketItem.findFirst({ where: sellableWhere(order.productId), orderBy: { createdAt: "asc" }, include: { invite: true } });
    if (!next?.invite?.url) return { error: "Sem BM com convite no estoque desse tipo para trocar" };
    const now = new Date();
    await tx.marketItem.update({ where: { id: old.id }, data: { status: "DISABLED", orderId: null } });
    await tx.marketItem.update({ where: { id: next.id }, data: { status: "SOLD", orderId: order.id, soldAt: now } });
    await tx.marketInvite.update({ where: { id: next.invite.id }, data: { usedAt: now } });
    return { order, url: next.invite.url, reason };
  });
  if ("error" in r) return { error: r.error ?? "Não deu certo" };
  const account = await ensureBuyerAccount(r.order.name, r.order.email);
  const sent = await sendDeliveryEmail(r.order, [r.url], { ...account, created: false, accessUrl: `${env.appUrl()}/login` }, true);
  return sent ? { ok: "Troca feita e e-mail enviado ao cliente" } : { error: "Troca feita, mas o e-mail não saiu. Mande o link manualmente." };
}

async function notifyOwner(type: string, title: string, message: string, data: Prisma.InputJsonValue) {
  const ownerId = await platformOwnerId();
  const ws = ownerId ? await prisma.membership.findFirst({ where: { userId: ownerId, role: "OWNER" }, select: { workspaceId: true } }) : null;
  if (ws) await createAlert({ workspaceId: ws.workspaceId, type, severity: type === "SALE" ? "INFO" : "CRITICAL", title, message, data }).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Convites x estoque
// ---------------------------------------------------------------------------

/** Liga cada convite capturado (com nome de BM) à BM do estoque com o mesmo nome que ainda não tem convite. */
export async function matchInvites() {
  const free = await prisma.marketInvite.findMany({ where: { itemId: null, usedAt: null, url: { not: null }, bmName: { not: null } }, orderBy: { receivedAt: "desc" } });
  if (!free.length) return 0;
  const items = await prisma.marketItem.findMany({ where: { status: { in: ["AVAILABLE", "DISABLED"] }, invite: { is: null } }, select: { id: true, bmName: true } });
  let n = 0;
  for (const inv of free) {
    const key = normalizeBmName(inv.bmName!);
    const item = items.find((i) => normalizeBmName(i.bmName) === key);
    if (!item) continue;
    await prisma.marketInvite.update({ where: { id: inv.id }, data: { itemId: item.id } });
    items.splice(items.indexOf(item), 1);
    n++;
  }
  return n;
}

/** Rodada do worker: confere Pix sem aviso, vence reservas e tenta de novo entregas que falharam. */
export async function marketTick() {
  const now = Date.now();
  // Pix pendente: pergunta ao Mercado Pago (caso o aviso tenha se perdido)
  const pending = await prisma.marketOrder.findMany({ where: { status: "PENDING", mpPaymentId: { not: null } }, take: 50 });
  for (const o of pending) {
    try {
      const r = await confirmPayment(o.mpPaymentId!);
      if (r.status !== "approved" && o.expiresAt.getTime() < now - 60_000) await releaseOrder(o.id, "EXPIRED");
    } catch (e) {
      if (o.expiresAt.getTime() < now - 10 * 60_000) await releaseOrder(o.id, "EXPIRED", e instanceof Error ? e.message : String(e));
    }
  }
  // Pedido sem Pix (deu erro ao gerar) e vencido
  const stale = await prisma.marketOrder.findMany({ where: { status: "PENDING", mpPaymentId: null, expiresAt: { lt: new Date(now) } }, select: { id: true } });
  for (const o of stale) await releaseOrder(o.id, "EXPIRED");
  // Pago e ainda não entregue (faltou estoque ou o e-mail falhou): tenta de novo nas primeiras 48h
  const paid = await prisma.marketOrder.findMany({ where: { status: "PAID", paidAt: { gt: new Date(now - 48 * 3600_000) } }, select: { id: true } });
  for (const o of paid) await deliverOrder(o.id).catch((e) => console.error("[vendas] entrega", e));
}

// ---------------------------------------------------------------------------
// Vitrine
// ---------------------------------------------------------------------------

export type TemplatePreview = { name: string; header: string | null; body: string; footer: string | null; buttons: string[] };
export type VitrineProduct = { id: string; name: string; description: string; kind: string; priceCents: number; stock: number; templates: TemplatePreview[] };

type Comp = { type: string; format?: string; text?: string; buttons?: Array<{ text: string }> };

/** Produtos ativos com o estoque à venda e os templates aprovados das BMs do estoque (para mostrar ao passar o mouse). */
export async function vitrine(): Promise<VitrineProduct[]> {
  const [products, stock] = await Promise.all([
    prisma.marketProduct.findMany({ where: { active: true }, orderBy: [{ sort: "asc" }, { priceCents: "asc" }] }),
    stockByProduct(),
  ]);
  const out: VitrineProduct[] = [];
  for (const p of products) {
    let templates: TemplatePreview[] = [];
    if (p.kind === "TEMPLATE") {
      const items = await prisma.marketItem.findMany({
        where: { ...sellableWhere(p.id), businessId: { not: null } },
        take: 30,
        select: { business: { select: { wabas: { select: { templates: { where: { status: "APPROVED", category: "UTILITY" }, select: { name: true, components: true } } } } } } },
      });
      const seen = new Map<string, TemplatePreview>();
      for (const it of items)
        for (const w of it.business?.wabas ?? [])
          for (const t of w.templates) {
            const comps = (t.components ?? []) as unknown as Comp[];
            const body = comps.find((c) => c.type === "BODY")?.text ?? "";
            if (!body || seen.has(body)) continue;
            const header = comps.find((c) => c.type === "HEADER");
            seen.set(body, {
              name: t.name,
              header: header ? (header.format === "TEXT" ? (header.text ?? "") : `[${header.format === "IMAGE" ? "Imagem" : header.format === "VIDEO" ? "Vídeo" : "Documento"}]`) : null,
              body,
              footer: comps.find((c) => c.type === "FOOTER")?.text ?? null,
              buttons: comps.find((c) => c.type === "BUTTONS")?.buttons?.map((b) => b.text) ?? [],
            });
          }
      templates = [...seen.values()].slice(0, 3);
    }
    out.push({ id: p.id, name: p.name, description: p.description, kind: p.kind, priceCents: p.priceCents, stock: stock.get(p.id) ?? 0, templates });
  }
  return out;
}

/** O que a página pública do pedido mostra (pelo token secreto do link). */
export async function publicOrder(token: string) {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  const o = await prisma.marketOrder.findUnique({
    where: { token },
    include: { product: { select: { name: true } }, items: { where: { status: "SOLD" }, select: { invite: { select: { url: true } } } } },
  });
  if (!o) return null;
  const delivered = o.status === "DELIVERED";
  return {
    status: o.status,
    product: o.product.name,
    quantity: o.quantity,
    totalCents: o.totalCents,
    email: o.email,
    pixCode: o.status === "PENDING" ? o.pixCode : null,
    pixQr: o.status === "PENDING" ? o.pixQr : null,
    expiresAt: o.expiresAt.toISOString(),
    invites: delivered ? o.items.map((i) => i.invite?.url).filter((u): u is string => Boolean(u)) : [],
    support: supportLink(`Oi! Comprei BM no Fuzil (pedido ${o.token.slice(0, 8)}) e preciso de ajuda.`),
  };
}
export type PublicOrder = NonNullable<Awaited<ReturnType<typeof publicOrder>>>;
