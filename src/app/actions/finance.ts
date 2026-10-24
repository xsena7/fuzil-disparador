"use server";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { shortToken } from "@/lib/crypto";
import { FINANCE_CATEGORIES, parseMoney, type FinanceKind } from "@/lib/finance";
import { financePartners } from "@/lib/finance-partners";
import type { FormState } from "./auth";

// Comprovantes ficam numa pasta separada, fora do /media público: só abrem pela rota dos sócios
const ATTACH: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
const MAX_ATTACH = 10 * 1024 * 1024;

export async function addFinanceEntryAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireSuperAdmin();
  const kind = String(form.get("kind") ?? "") as FinanceKind;
  if (!["EXPENSE", "INCOME", "SETTLEMENT"].includes(kind)) return { error: "Escolha se é despesa, entrada ou acerto" };
  const amountCents = parseMoney(String(form.get("amount") ?? ""));
  if (!amountCents) return { error: "Digite o valor (ex.: 300 ou 1.250,90)" };
  if (amountCents > 100_000_000_00) return { error: "Valor alto demais" };
  let description = String(form.get("description") ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  let category: string | null = null;
  let toUserId: string | null = null;
  if (kind === "SETTLEMENT") {
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

  // Data e hora: sempre o momento em que foi anotado
  await prisma.financeEntry.create({ data: { kind, description, amountCents, category, userId: auth.user.id, toUserId, ...(attachment ?? {}) } });
  revalidatePath("/financeiro");
  return { ok: kind === "SETTLEMENT" ? "Acerto anotado!" : kind === "EXPENSE" ? "Despesa anotada!" : "Entrada anotada!" };
}

/** Só quem anotou pode apagar (ninguém edita). */
export async function deleteFinanceEntryAction(id: string): Promise<{ ok?: string; error?: string }> {
  const auth = await requireSuperAdmin();
  const e = await prisma.financeEntry.findUnique({ where: { id } });
  if (!e) return { error: "Anotação não encontrada" };
  if (e.userId !== auth.user.id) return { error: "Só quem anotou pode apagar." };
  await prisma.financeEntry.delete({ where: { id } });
  if (e.attachmentPath) await unlink(e.attachmentPath).catch(() => undefined);
  revalidatePath("/financeiro");
  return { ok: "Anotação apagada" };
}
