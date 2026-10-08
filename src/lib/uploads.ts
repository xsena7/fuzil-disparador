import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";
import { shortToken } from "./crypto";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

export const MAX_UPLOAD = { image: 5 * 1024 * 1024, video: 16 * 1024 * 1024, document: 100 * 1024 * 1024 };

/** Salva um arquivo enviado e retorna o caminho em disco e a URL pública. */
export async function saveUpload(file: File): Promise<{ path: string; url: string; mime: string; name: string }> {
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("Formato não suportado. Use JPEG, PNG, MP4 ou PDF.");
  const limit = file.type.startsWith("image/") ? MAX_UPLOAD.image : file.type.startsWith("video/") ? MAX_UPLOAD.video : MAX_UPLOAD.document;
  if (file.size > limit) throw new Error(`Arquivo muito grande (máx. ${Math.round(limit / 1024 / 1024)} MB)`);
  const dir = path.resolve(env.uploadDir());
  await mkdir(dir, { recursive: true });
  const fileName = `${Date.now()}-${shortToken(10)}.${ext}`;
  const full = path.join(dir, fileName);
  await writeFile(full, Buffer.from(await file.arrayBuffer()));
  return { path: full, url: `${env.appUrl()}/media/${fileName}`, mime: file.type, name: file.name };
}

export function mediaKind(mime: string): "IMAGE" | "VIDEO" | "DOCUMENT" {
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  return "DOCUMENT";
}
