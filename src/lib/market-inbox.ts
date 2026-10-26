// Convites de BM da caixa do estoque (um e-mail do próprio Fuzil): acha o convite e o nome da BM, testa o link
// e monta o estoque sozinho (a BM entra no produto certo, sem ninguém digitar nada).
import { prisma } from "./db";
import { checkInviteLink, normalizeBmName, parseInviteEmail } from "./market-invite";
import { matchInvites } from "./market";

/** E-mail que chegou na caixa do estoque: vira um convite capturado e, se ainda não existe, uma BM no estoque. */
export async function ingestInviteEmail(m: { messageId: string; subject: string; from: string; text: string | null; html: string | null; date: Date }) {
  const messageId = m.messageId.slice(0, 300);
  const { url, bmName } = parseInviteEmail({ subject: m.subject, text: m.text, html: m.html });
  const existing = await prisma.marketInvite.findUnique({ where: { messageId } });
  // Já lido e completo: nada a fazer. Lido antes sem nome/link (leitor antigo): lê de novo
  if (existing && (existing.usedAt || existing.itemId || (existing.url && existing.bmName) || (!url && !bmName))) return;
  const test = url && url !== existing?.url ? await checkInviteLink(url) : null;
  const data = {
    subject: m.subject.slice(0, 300),
    fromAddr: m.from.slice(0, 200),
    bmName: bmName ?? existing?.bmName ?? null,
    url: url ?? existing?.url ?? null,
    ...(test ? { check: test.check, checkNote: test.note, checkedAt: new Date() } : !url && !existing ? { checkNote: "E-mail sem link de convite" } : {}),
  };
  const inv = existing
    ? await prisma.marketInvite.update({ where: { id: existing.id }, data })
    : await prisma.marketInvite.create({ data: { messageId, receivedAt: Number.isNaN(m.date.getTime()) ? new Date() : m.date, ...data } });
  if (!inv.url || !inv.bmName) return;
  // BM já cadastrada no estoque com esse nome: liga o convite nela
  await matchInvites();
  const fresh = await prisma.marketInvite.findUnique({ where: { id: inv.id }, select: { itemId: true } });
  if (!fresh?.itemId) await autoStockItem(inv.id, inv.bmName);
}

/**
 * Cria a BM no estoque a partir do convite. O produto sai da própria BM: se ela está conectada no Fuzil
 * (conta de um dos sócios) com template de utilidade aprovado, vai para o produto "com template"; senão, "sem template".
 */
async function autoStockItem(inviteId: string, bmName: string) {
  const products = await prisma.marketProduct.findMany({ where: { active: true }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }] });
  if (!products.length) return; // sem produto ainda: o convite fica esperando (o painel avisa)
  const partners = await prisma.user.findMany({ where: { financePartner: true }, select: { memberships: { select: { workspaceId: true } } } });
  const workspaceIds = [...new Set(partners.flatMap((p) => p.memberships.map((m) => m.workspaceId)))];
  const key = normalizeBmName(bmName);
  const bms = await prisma.businessManager.findMany({
    where: { workspaceId: { in: workspaceIds } },
    select: { id: true, name: true, wabas: { select: { templates: { where: { status: "APPROVED", category: "UTILITY" }, select: { id: true }, take: 1 } } } },
  });
  const bm = bms.find((b) => normalizeBmName(b.name) === key);
  const hasTemplate = Boolean(bm?.wabas.some((w) => w.templates.length));
  const product = products.find((p) => p.kind === (hasTemplate ? "TEMPLATE" : "NO_TEMPLATE")) ?? products[0];
  const item = await prisma.marketItem.create({ data: { productId: product.id, bmName, businessId: bm?.id ?? null } });
  await prisma.marketInvite.update({ where: { id: inviteId }, data: { itemId: item.id } });
}

/** Lê de novo os e-mails da caixa do estoque (últimos 30 dias): pega convites que chegaram antes de o leitor entender o formato, ou antes de existir produto. */
export async function reingestStockMailbox() {
  const box = await prisma.mailBox.findFirst({ where: { purpose: "STOCK" } });
  if (!box) return;
  const msgs = await prisma.mailMessage.findMany({
    where: { mailboxId: box.id, direction: "IN", receivedAt: { gt: new Date(Date.now() - 30 * 86_400_000) } },
    orderBy: { receivedAt: "asc" },
    take: 300,
    select: { id: true, messageId: true, subject: true, fromAddr: true, fromName: true, text: true, html: true, receivedAt: true },
  });
  for (const m of msgs) {
    await ingestInviteEmail({ messageId: m.messageId ?? `msg-${m.id}`, subject: m.subject, from: m.fromName ? `${m.fromName} <${m.fromAddr}>` : m.fromAddr, text: m.text, html: m.html, date: m.receivedAt }).catch((e) =>
      console.error("[vendas] reler convite", e),
    );
  }
  // Convite completo que ficou sem BM (ex.: chegou antes de existir produto): liga na BM com o mesmo nome ou cria agora
  await matchInvites();
  const loose = await prisma.marketInvite.findMany({ where: { itemId: null, usedAt: null, url: { not: null }, bmName: { not: null } }, take: 50 });
  for (const inv of loose) await autoStockItem(inv.id, inv.bmName!).catch(() => undefined);
}

/** Testa de novo os convites ainda não entregues (convite expira com o tempo): no máximo 20 por rodada, a cada 12h cada um. */
export async function recheckInvites() {
  const old = await prisma.marketInvite.findMany({
    where: { usedAt: null, url: { not: null }, OR: [{ checkedAt: null }, { checkedAt: { lt: new Date(Date.now() - 12 * 3600_000) } }] },
    take: 20,
  });
  for (const inv of old) {
    const t = await checkInviteLink(inv.url!);
    await prisma.marketInvite.update({ where: { id: inv.id }, data: { check: t.check, checkNote: t.note, checkedAt: new Date() } });
  }
}
