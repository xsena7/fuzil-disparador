import { readFile } from "node:fs/promises";
import { getActiveAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Comprovante do financeiro: só abre para os sócios (administradores do Fuzil) logados. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getActiveAuth();
  if (!auth?.user.isSuperAdmin) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const e = await prisma.financeEntry.findUnique({ where: { id }, select: { attachmentPath: true, attachmentMime: true, attachmentName: true } });
  if (!e?.attachmentPath) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(e.attachmentPath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": e.attachmentMime ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${(e.attachmentName ?? "comprovante").replace(/[^\w.\- ]/g, "_")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
