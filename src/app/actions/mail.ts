"use server";

import { unlink } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { requireFinancePartner } from "@/lib/finance-partners";
import { cleanLocalPart, mailDomain, type MailAttachment } from "@/lib/mail";
import type { FormState } from "./auth";

// E-mails do domínio: só os sócios

export async function createMailboxAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireFinancePartner();
  const local = cleanLocalPart(String(form.get("local") ?? ""));
  if (!local) return { error: "Use só letras, números, ponto, traço ou sublinhado (ex.: contato, vendas.bm)" };
  const address = `${local}@${mailDomain()}`;
  const name = String(form.get("name") ?? "").trim().slice(0, 60) || local;
  if (await prisma.mailBox.findUnique({ where: { address } })) return { error: `${address} já existe` };
  const box = await prisma.mailBox.create({ data: { address, name, createdById: auth.user.id } });
  const cat = await applyCategory(box.id, String(form.get("category") ?? ""));
  if (cat.error) return cat;
  redirect(`/emails?caixa=${box.id}`);
}

/**
 * Categoria da caixa: "" = e-mail comum; "STOCK" = estoque geral das Vendas; "product:<id>" = estoque de um produto.
 * Só uma caixa por categoria de estoque: quem tinha a categoria antes volta a ser e-mail comum.
 */
async function applyCategory(boxId: string, category: string): Promise<{ ok?: string; error?: string }> {
  const productId = category.startsWith("product:") ? category.slice(8) : null;
  if (productId && !(await prisma.marketProduct.findUnique({ where: { id: productId }, select: { id: true } }))) return { error: "Produto não encontrado" };
  await prisma.$transaction([
    ...(category === "STOCK" ? [prisma.mailBox.updateMany({ where: { purpose: "STOCK", NOT: { id: boxId } }, data: { purpose: null } })] : []),
    ...(productId ? [prisma.mailBox.updateMany({ where: { productId, NOT: { id: boxId } }, data: { productId: null } })] : []),
    prisma.mailBox.update({ where: { id: boxId }, data: { purpose: category === "STOCK" ? "STOCK" : null, productId } }),
  ]);
  // Convites que já estavam nessa caixa entram no estoque agora
  if (category) {
    const { reingestStockMailbox } = await import("@/lib/market-inbox");
    await reingestStockMailbox().catch(() => undefined);
  }
  return { ok: "Categoria salva" };
}

export async function setMailboxCategoryAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requireFinancePartner();
  if (!(await prisma.mailBox.findUnique({ where: { id }, select: { id: true } }))) return { error: "Caixa não encontrada" };
  const r = await applyCategory(id, String(form.get("category") ?? ""));
  revalidatePath("/emails");
  revalidatePath("/vendas");
  return r;
}

async function removeFiles(rows: Array<{ attachments: unknown }>) {
  for (const r of rows) for (const a of ((r.attachments ?? []) as MailAttachment[])) await unlink(a.path).catch(() => undefined);
}

export async function deleteMailboxAction(id: string) {
  await requireFinancePartner();
  const msgs = await prisma.mailMessage.findMany({ where: { mailboxId: id }, select: { attachments: true } });
  await prisma.mailBox.delete({ where: { id } }).catch(() => undefined);
  await removeFiles(msgs);
  redirect("/emails");
}

export async function deleteMessageAction(id: string) {
  await requireFinancePartner();
  const m = await prisma.mailMessage.findUnique({ where: { id }, select: { mailboxId: true, attachments: true } });
  if (!m) return { error: "E-mail não encontrado" };
  await prisma.mailMessage.delete({ where: { id } });
  await removeFiles([m]);
  redirect(`/emails?caixa=${m.mailboxId}`);
}

export async function markUnreadAction(id: string) {
  await requireFinancePartner();
  const m = await prisma.mailMessage.update({ where: { id }, data: { readAt: null } });
  redirect(`/emails?caixa=${m.mailboxId}`);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Manda um e-mail (novo ou resposta) saindo do endereço da caixa. Usa o Resend, com o domínio do Fuzil. */
export async function sendMailAction(_: FormState, form: FormData): Promise<FormState> {
  await requireFinancePartner();
  const box = await prisma.mailBox.findUnique({ where: { id: String(form.get("mailboxId") ?? "") } });
  if (!box) return { error: "Escolha a caixa de onde sai o e-mail" };
  const to = String(form.get("to") ?? "")
    .split(/[,;\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (!to.length || to.length > 20 || to.some((t) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t))) return { error: "Confira o e-mail de destino" };
  const subject = String(form.get("subject") ?? "").trim().slice(0, 200) || "(sem assunto)";
  const body = String(form.get("body") ?? "").trim().slice(0, 50_000);
  if (!body) return { error: "Escreva a mensagem" };
  const replyTo = String(form.get("inReplyTo") ?? "") || null;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#18181b;white-space:pre-wrap">${esc(body)}</div>`;
  const ok = await sendEmail({
    from: `${box.name} <${box.address}>`,
    to,
    subject,
    html,
    text: body,
    replyTo: box.address,
    headers: replyTo ? { "In-Reply-To": replyTo, References: replyTo } : undefined,
  });
  if (!ok) return { error: "Não consegui enviar. Confira a chave do Resend e se o domínio está verificado nele." };
  await prisma.mailMessage.create({
    data: { mailboxId: box.id, direction: "OUT", fromAddr: box.address, fromName: box.name, toAddr: to.join(", "), subject, text: body, html, readAt: new Date() },
  });
  revalidatePath("/emails");
  return { ok: "E-mail enviado!" };
}
