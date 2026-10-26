"use server";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { shortToken } from "@/lib/crypto";
import { FINANCE_CATEGORIES, parseMoney, settle, type FinanceKind } from "@/lib/finance";
import { financePartners, isFinanceOwner, requireFinancePartner } from "@/lib/finance-partners";
import type { FormState } from "./auth";

// Comprovantes ficam numa pasta separada, fora do /media público: só abrem pela rota dos sócios
const ATTACH: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
const MAX_ATTACH = 10 * 1024 * 1024;

export async function addFinanceEntryAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireFinancePartner();
  const kind = String(form.get("kind") ?? "") as FinanceKind;
  if (!["EXPENSE", "INCOME", "SETTLEMENT", "WITHDRAW"].includes(kind)) return { error: "Escolha se é despesa, entrada ou acerto" };
  const amountCents = parseMoney(String(form.get("amount") ?? ""));
  if (!amountCents) return { error: "Digite o valor (ex.: 300 ou 1.250,90)" };
  if (amountCents > 100_000_000_00) return { error: "Valor alto demais" };
  let description = String(form.get("description") ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  let category: string | null = null;
  let toUserId: string | null = null;
  // Despesa/entrada: do caixa da empresa (padrão) ou da conta de quem anotou
  const cash = (kind === "EXPENSE" || kind === "INCOME") && form.get("where") !== "me";
  if (kind === "WITHDRAW") {
    // Pix que saiu do caixa da empresa para um sócio (qualquer um, inclusive quem anota)
    const partners = await financePartners();
    toUserId = form.get("fromButton") === "1" ? auth.user.id : String(form.get("toUserId") ?? "");
    const to = partners.find((p) => p.id === toUserId);
    if (!to) return { error: "Escolha para quem o caixa mandou o Pix" };
    if (!description) description = form.get("fromButton") === "1" ? "Reembolso do caixa da empresa" : `Pix do caixa para ${to.name.split(" ")[0]} (cobrir custos)`;
  } else if (kind === "SETTLEMENT") {
    const partners = await financePartners();
    const others = partners.filter((p) => p.id !== auth.user.id);
    toUserId = String(form.get("toUserId") ?? "") || (others.length === 1 ? others[0].id : "");
    const to = others.find((p) => p.id === toUserId);
    if (!to) return { error: "Escolha para quem você passou o Pix" };
    if (!description) description = `Pix de acerto para ${to.name}`;

  } else {
    if (!description) return { error: "Escreva a descrição (ex.: Compra de 5 BMs)" };
    const c = String(form.get("category") ?? "");
    category = (FINANCE_CATEGORIES as readonly string[]).includes(c) ? c : "Sem categoria";
  }

  let attachment: { attachmentPath: string; attachmentName: string; attachmentMime: string } | null = null;
  const file = form.get("attachment");
  if (file instanceof File && file.size > 0) {
    const ext = ATTACH[file.type];
    if (!ext) return { error: "Comprovante: envie foto (JPG, PNG) ou PDF" };
    if (file.size > MAX_ATTACH) return { error: "Comprovante grande demais (máx. 10 MB)" };
    const dir = path.join(path.resolve(env.uploadDir()), "finance");
    await mkdir(dir, { recursive: true });
    const full = path.join(dir, `${Date.now()}-${shortToken(16)}.${ext}`);
    await writeFile(full, Buffer.from(await file.arrayBuffer()));
    attachment = { attachmentPath: full, attachmentName: file.name.slice(0, 120), attachmentMime: file.type };
  }

  // Uma anotação de cada vez (trava no banco): dois cliques ao mesmo tempo nunca gravam o acerto em dobro
  const partnerIds = (await financePartners()).map((p) => p.id);
  const fromButton = (kind === "SETTLEMENT" || kind === "WITHDRAW") && form.get("fromButton") === "1";
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(727274)`;
    // Botões "Já fiz o Pix" e "Já recebi do caixa": só anota se ainda deve esse valor (clique duplo ou outra aba não anotam em dobro)
    if (fromButton) {
      const lines = await tx.financeEntry.findMany({ select: { kind: true, amountCents: true, userId: true, toUserId: true, cash: true } });
      const r = settle(lines.map((l) => ({ ...l, kind: l.kind as FinanceKind })), partnerIds);
      const owed =
        kind === "WITHDRAW"
          ? (r.refunds.find((x) => x.to === auth.user.id)?.amountCents ?? 0)
          : (r.transfers.find((t) => t.from === auth.user.id && t.to === toUserId)?.amountCents ?? 0);
      if (owed <= 0) return { error: kind === "WITHDRAW" ? "Esse reembolso já foi anotado." : "Esse acerto já foi anotado: não há nada a passar agora." };
      if (amountCents > owed) return { error: `O valor mudou: agora é de ${(owed / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Atualize a página.` };
    }
    // Data e hora: sempre o momento em que foi anotado
    await tx.financeEntry.create({ data: { kind, description, amountCents, category, cash, userId: auth.user.id, toUserId, ...(attachment ?? {}) } });
    return null;
  });
  if (result?.error) {
    if (attachment) await unlink(attachment.attachmentPath).catch(() => undefined);
    return result;
  }
  revalidatePath("/financeiro");
  return { ok: kind === "SETTLEMENT" ? "Acerto anotado!" : kind === "WITHDRAW" ? "Pix do caixa anotado!" : kind === "EXPENSE" ? "Despesa anotada!" : "Entrada anotada!" };
}

/** Quem anotou apaga o próprio lançamento; o dono do financeiro apaga qualquer um (ninguém edita). */
export async function deleteFinanceEntryAction(id: string): Promise<{ ok?: string; error?: string }> {
  const auth = await requireFinancePartner();
  const e = await prisma.financeEntry.findUnique({ where: { id } });
  if (!e) return { error: "Anotação não encontrada" };
  if (e.userId !== auth.user.id && !(await isFinanceOwner(auth.user.id))) return { error: "Só quem anotou pode apagar." };
  await prisma.financeEntry.delete({ where: { id } });
  if (e.attachmentPath) await unlink(e.attachmentPath).catch(() => undefined);
  revalidatePath("/financeiro");
  return { ok: "Anotação apagada" };
}

/** Chave Pix do próprio sócio (o outro vê o botão de copiar quando precisar passar). */
export async function savePixKeyAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireFinancePartner();
  const key = String(form.get("pixKey") ?? "").trim().slice(0, 140);
  await prisma.user.update({ where: { id: auth.user.id }, data: { pixKey: key || null } });
  revalidatePath("/financeiro");
  return { ok: key ? "Chave Pix salva!" : "Chave Pix apagada" };
}
