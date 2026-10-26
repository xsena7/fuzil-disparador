// E-mails do domínio do Fuzil: o serviço "mail" recebe pela porta 25 e guarda aqui; o painel lê e responde.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedMail } from "mailparser";
import { prisma } from "./db";
import { env } from "./env";
import { shortToken } from "./crypto";
import { ingestInviteEmail } from "./market-inbox";

/** Domínio dos e-mails (padrão: o do site). */
export const mailDomain = () => (process.env.MAIL_DOMAIN || process.env.SITE_DOMAIN || "fuzildisparador.com.br").replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();

/** "Estoque" → "estoque" (só letras, números, ponto, traço e sublinhado). */
export function cleanLocalPart(raw: string): string | null {
  const v = raw.trim().toLowerCase().replace(/@.*$/, "");
  return /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(v) && !v.includes("..") ? v : null;
}

export type MailAttachment = { name: string; mime: string; size: number; path: string };

const MAX_ATTACH_TOTAL = 20 * 1024 * 1024;

async function saveAttachments(mail: ParsedMail): Promise<MailAttachment[]> {
  const files = (mail.attachments ?? []).filter((a) => a.content && a.contentDisposition !== "inline");
  if (!files.length) return [];
  const dir = path.join(path.resolve(env.uploadDir()), "mail");
  await mkdir(dir, { recursive: true });
  const out: MailAttachment[] = [];
  let total = 0;
  for (const a of files) {
    total += a.size;
    if (total > MAX_ATTACH_TOTAL) break;
    const name = (a.filename || "anexo").replace(/[^\w.\- ()À-ú]/g, "_").slice(0, 120);
    const full = path.join(dir, `${Date.now()}-${shortToken(12)}`);
    await writeFile(full, a.content);
    out.push({ name, mime: a.contentType || "application/octet-stream", size: a.size, path: full });
  }
  return out;
}

/** Guarda um e-mail recebido em cada caixa de destino. A caixa do estoque também manda os convites para as Vendas. */
export async function storeIncoming(mail: ParsedMail, recipients: string[], size: number) {
  const boxes = await prisma.mailBox.findMany({ where: { address: { in: recipients.map((r) => r.toLowerCase()) } } });
  if (!boxes.length) return 0;
  const attachments = await saveAttachments(mail);
  const from = mail.from?.value?.[0];
  const subject = (mail.subject ?? "(sem assunto)").slice(0, 300);
  const html = typeof mail.html === "string" ? mail.html.slice(0, 2_000_000) : null;
  const text = (mail.text ?? "").slice(0, 500_000) || null;
  for (const box of boxes) {
    await prisma.mailMessage.create({
      data: {
        mailboxId: box.id,
        messageId: mail.messageId?.slice(0, 300) ?? null,
        fromAddr: (from?.address ?? "desconhecido").toLowerCase().slice(0, 200),
        fromName: from?.name?.slice(0, 120) || null,
        toAddr: box.address,
        subject,
        text,
        html,
        attachments: attachments.length ? attachments : undefined,
        size,
        receivedAt: mail.date && !Number.isNaN(mail.date.getTime()) ? mail.date : new Date(),
      },
    });
    // Caixa de estoque (a geral ou a de um produto): o convite entra nas Vendas
    if (box.purpose === "STOCK" || box.productId) {
      await ingestInviteEmail({ messageId: mail.messageId ?? `${box.address}-${Date.now()}`, subject, from: mail.from?.text ?? "", text, html, date: mail.date ?? new Date(), productId: box.productId }).catch((e) =>
        console.error("[mail] convite do estoque", e),
      );
    }
  }
  return boxes.length;
}

/** Caixa do estoque das vendas (a marcada como STOCK). */
export const stockMailbox = () => prisma.mailBox.findFirst({ where: { purpose: "STOCK" } });
