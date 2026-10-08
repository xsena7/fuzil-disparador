import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg", png: "image/png", mp4: "video/mp4", pdf: "application/pdf",
  mp3: "audio/mpeg", ogg: "audio/ogg", aac: "audio/aac", m4a: "audio/mp4",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Serve as mídias dos cabeçalhos (a Meta baixa daqui na hora do envio). */
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[\w-]+\.(jpg|png|mp4|pdf|mp3|ogg|aac|m4a|docx|xlsx)$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(path.resolve(env.uploadDir()), file));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": TYPES[file.split(".").pop()!], "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
