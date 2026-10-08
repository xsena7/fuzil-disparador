import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getActiveAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { meta } from "@/lib/meta";
import { wabaToken } from "@/lib/sync";

/** Mídia de uma mensagem do chat. Recebidas: baixa da Meta uma vez e guarda no servidor. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getActiveAuth();
  if (!auth) return new Response("unauthorized", { status: 401 });
  const { id } = await params;
  const m = await prisma.chatMessage.findFirst({
    where: { id, workspaceId: auth.workspace.id },
    include: { conversation: { include: { phone: { include: { waba: true } } } } },
  });
  if (!m) return new Response("not found", { status: 404 });
  if (m.mediaUrl) return Response.redirect(m.mediaUrl, 302);
  if (!m.mediaId) return new Response("not found", { status: 404 });

  const dir = path.join(path.resolve(env.uploadDir()), "chat");
  const file = path.join(dir, m.id.replace(/\W/g, ""));
  const headers = (mime: string) => ({
    "Content-Type": mime,
    "Cache-Control": "private, max-age=31536000, immutable",
    ...(m.mediaName ? { "Content-Disposition": `inline; filename="${m.mediaName.replace(/"/g, "")}"` } : {}),
  });
  try {
    const data = await readFile(file);
    return new Response(new Uint8Array(data), { headers: headers(m.mediaMime ?? "application/octet-stream") });
  } catch {
    /* ainda não baixada */
  }
  try {
    const token = wabaToken(m.conversation.phone.waba);
    const info = await meta.getMedia(token, m.mediaId);
    const data = await meta.downloadMedia(token, info.url);
    await mkdir(dir, { recursive: true });
    await writeFile(file, data);
    const mime = m.mediaMime ?? info.mime_type;
    if (!m.mediaMime) await prisma.chatMessage.update({ where: { id: m.id }, data: { mediaMime: info.mime_type } });
    return new Response(new Uint8Array(data), { headers: headers(mime) });
  } catch {
    return new Response("A mídia expirou ou não pôde ser baixada da Meta.", { status: 410 });
  }
}
