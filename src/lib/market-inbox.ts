// Caixa de e-mail do estoque: lê os convites de BM que chegam (IMAP), testa o link e liga ao estoque.
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "./db";
import { env } from "./env";
import { checkInviteLink, parseInviteEmail } from "./market-invite";
import { matchInvites } from "./market";

export function inboxConfigured() {
  const c = env.marketImap();
  return Boolean(c.host && c.user && c.pass);
}

/** Lê os e-mails dos últimos 7 dias que ainda não foram vistos pelo Fuzil. Devolve quantos convites novos achou. */
export async function pollInbox(): Promise<{ read: number; invites: number }> {
  const c = env.marketImap();
  if (!c.host || !c.user || !c.pass) return { read: 0, invites: 0 };
  const client = new ImapFlow({ host: c.host, port: c.port, secure: c.port === 993, auth: { user: c.user, pass: c.pass }, logger: false, socketTimeout: 60_000 });
  let read = 0;
  let invites = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 7 * 86_400_000);
      const uids = (await client.search({ since }, { uid: true })) || [];
      // Os mais novos primeiro, no máximo 200 por rodada
      for (const uid of uids.slice(-200).reverse()) {
        const msg = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
        if (!msg || !msg.source) continue;
        const messageId = msg.envelope?.messageId || `uid-${uid}-${c.user}`;
        if (await prisma.marketInvite.findUnique({ where: { messageId }, select: { id: true } })) continue;
        const mail = await simpleParser(msg.source);
        read++;
        const subject = mail.subject ?? "(sem assunto)";
        const { url, bmName } = parseInviteEmail({ subject, text: mail.text, html: typeof mail.html === "string" ? mail.html : null });
        const test = url ? await checkInviteLink(url) : null;
        await prisma.marketInvite.create({
          data: {
            messageId,
            subject: subject.slice(0, 300),
            fromAddr: (mail.from?.text ?? "").slice(0, 200),
            bmName,
            url,
            check: test?.check ?? null,
            checkNote: test?.note ?? (url ? null : "E-mail sem link de convite"),
            checkedAt: test ? new Date() : null,
            receivedAt: mail.date ?? new Date(),
          },
        });
        if (url) invites++;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
  if (invites) await matchInvites();
  return { read, invites };
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
