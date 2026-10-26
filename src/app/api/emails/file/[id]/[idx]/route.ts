import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import { isFinancePartner } from "@/lib/finance-partners";
import type { MailAttachment } from "@/lib/mail";

/** Anexo de um e-mail: só os sócios abrem. Sempre baixa como arquivo (nunca abre HTML/JS do anexo dentro do Fuzil). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string; idx: string }> }) {
  const auth = await getAuth();
  if (!auth || !(await isFinancePartner(auth.user.id))) return new NextResponse("Não autorizado", { status: 403 });
  const { id, idx } = await params;
  const m = await prisma.mailMessage.findUnique({ where: { id }, select: { attachments: true } });
  const a = ((m?.attachments ?? []) as MailAttachment[])[Number(idx)];
  if (!a) return new NextResponse("Não encontrado", { status: 404 });
  const file = await readFile(a.path).catch(() => null);
  if (!file) return new NextResponse("Arquivo não encontrado", { status: 404 });
  const safeImage = /^image\/(png|jpe?g|gif|webp)$/.test(a.mime) || a.mime === "application/pdf";
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": safeImage ? a.mime : "application/octet-stream",
      "Content-Disposition": `${safeImage ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(a.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
