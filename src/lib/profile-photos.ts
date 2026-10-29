import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./db";
import { env } from "./env";
import { meta } from "./meta";
import { wabaToken } from "./sync";

// Foto de perfil automática: ao adicionar um número, escolhe mulher ou homem e o Fuzil coloca a foto
// sozinho assim que o número fica conectado. Cada conta pode trocar as fotos; sem trocar, vale a padrão do Fuzil.

export type PhotoKind = "female" | "male";
export const PHOTO_KINDS: PhotoKind[] = ["female", "male"];
export const PHOTO_LABEL: Record<PhotoKind, string> = { female: "Mulher", male: "Homem" };
const DEFAULT_FILE: Record<PhotoKind, string> = { female: "mulher.jpg", male: "homem.jpg" };

export const parsePhoto = (v: unknown): PhotoKind | null => (PHOTO_KINDS.includes(v as PhotoKind) ? (v as PhotoKind) : null);
/** Foto própria de um número só (arquivo na pasta de uploads): fica marcada como "file:<arquivo>". */
const FILE_PREFIX = "file:";
export const customPhotoMark = (fileName: string) => `${FILE_PREFIX}${path.basename(fileName)}`;

type WsPhotos = { profilePhotoFemale: string | null; profilePhotoMale: string | null };
const custom = (ws: WsPhotos, kind: PhotoKind) => (kind === "female" ? ws.profilePhotoFemale : ws.profilePhotoMale);

/** Endereço da foto para mostrar na tela. */
export function photoUrl(ws: WsPhotos, kind: PhotoKind): string {
  const file = custom(ws, kind);
  return file ? `/media/${file}` : `/perfil/${DEFAULT_FILE[kind]}`;
}

async function photoBuffer(ws: WsPhotos, kind: PhotoKind): Promise<Buffer> {
  const file = custom(ws, kind);
  if (file) {
    const buf = await readFile(path.join(path.resolve(env.uploadDir()), path.basename(file))).catch(() => null);
    if (buf) return buf;
  }
  return readFile(path.join(process.cwd(), "public", "perfil", DEFAULT_FILE[kind]));
}

/** Foto do perfil no jeito que a Meta aceita melhor: JPG quadrado de 640×640 (se não der para converter, vai a original). */
export async function squareJpeg(buf: Buffer, mime: string): Promise<{ buf: Buffer; mime: string }> {
  try {
    const sharp = (await import("sharp")).default;
    return { buf: await sharp(buf).rotate().resize(640, 640, { fit: "cover" }).flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer(), mime: "image/jpeg" };
  } catch (err) {
    console.error("[perfil] não converteu a foto", err);
    return { buf, mime };
  }
}

/** Marca a foto que o número vai receber quando ficar conectado. */
export async function setPendingPhoto(where: { id?: string; phoneNumberId?: string }, kind: PhotoKind | string | null) {
  if (!kind || (!where.id && !where.phoneNumberId)) return;
  await prisma.phoneNumber.updateMany({ where, data: { pendingPhoto: kind, pendingPhotoAt: new Date() } });
}

/** Roda no worker: coloca a foto escolhida nos números que já ficaram conectados. Desiste depois de 1 dia. */
export async function applyPendingPhotos() {
  await prisma.phoneNumber.updateMany({ where: { pendingPhoto: { not: null }, pendingPhotoAt: { lt: new Date(Date.now() - 86400_000) } }, data: { pendingPhoto: null, pendingPhotoAt: null } });
  const phones = await prisma.phoneNumber.findMany({
    where: { pendingPhoto: { not: null }, status: "CONNECTED", invalidReason: null },
    include: { waba: { include: { workspace: { select: { profilePhotoFemale: true, profilePhotoMale: true } } } } },
    take: 20,
  });
  for (const p of phones) {
    const kind = parsePhoto(p.pendingPhoto);
    const own = p.pendingPhoto?.startsWith(FILE_PREFIX) ? path.join(path.resolve(env.uploadDir()), path.basename(p.pendingPhoto.slice(FILE_PREFIX.length))) : null;
    try {
      if (kind || own) {
        const token = wabaToken(p.waba);
        const buf = own ? await readFile(own) : await photoBuffer(p.waba.workspace, kind!);
        const handle = await meta.uploadSampleMedia(token, buf, "perfil.jpg", "image/jpeg");
        await meta.updateBusinessProfile(token, p.phoneNumberId, { profile_picture_handle: handle });
        const prof = await meta.getBusinessProfile(token, p.phoneNumberId).catch(() => null);
        if (prof?.profile_picture_url) await prisma.phoneNumber.update({ where: { id: p.id }, data: { profilePhotoUrl: prof.profile_picture_url } });
      }
      await prisma.phoneNumber.update({ where: { id: p.id }, data: { pendingPhoto: null, pendingPhotoAt: null } });
    } catch (err) {
      // Tenta de novo na próxima rodada (o número pode ter acabado de registrar)
      console.error(`[perfil] foto automática ${p.displayPhoneNumber}:`, err instanceof Error ? err.message : err);
    }
  }
}
