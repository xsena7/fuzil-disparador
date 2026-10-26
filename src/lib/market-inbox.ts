// Convites de BM da caixa do estoque (um e-mail do próprio Fuzil): acha o convite, testa o link e liga ao estoque.
import { prisma } from "./db";
import { checkInviteLink, parseInviteEmail } from "./market-invite";
import { matchInvites } from "./market";

/** E-mail que chegou na caixa do estoque: vira um convite capturado (se tiver link de convite da Meta). */
export async function ingestInviteEmail(m: { messageId: string; subject: string; from: string; text: string | null; html: string | null; date: Date }) {
  const messageId = m.messageId.slice(0, 300);
  if (await prisma.marketInvite.findUnique({ where: { messageId }, select: { id: true } })) return;
  const { url, bmName } = parseInviteEmail({ subject: m.subject, text: m.text, html: m.html });
  const test = url ? await checkInviteLink(url) : null;
  await prisma.marketInvite.create({
    data: {
      messageId,
      subject: m.subject.slice(0, 300),
      fromAddr: m.from.slice(0, 200),
      bmName,
      url,
      check: test?.check ?? null,
      checkNote: test?.note ?? (url ? null : "E-mail sem link de convite"),
      checkedAt: test ? new Date() : null,
      receivedAt: Number.isNaN(m.date.getTime()) ? new Date() : m.date,
    },
  });
  if (url) await matchInvites();
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
