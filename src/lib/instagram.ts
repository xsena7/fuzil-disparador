// Instagram do Fuzil: sobe o .zip dos posts, agenda um por horário e o worker publica sozinho pela API oficial (Instagram Graph API).
// As imagens ficam na pasta de uploads e a Meta baixa por /media/<arquivo> na hora de publicar (precisa ser JPG).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import JSZip from "jszip";
import { prisma } from "./db";
import { env } from "./env";
import { graph, MetaError } from "./meta";
import { createAlert } from "./alerts";
import { platformOwnerId } from "./onboarding";

const TZ_OFFSET_H = 3; // Brasília (sem horário de verão)
const MAX_SLIDES = 10; // limite do carrossel no Instagram

export type ParsedPost = { number: number; title: string | null; caption: string; slides: Array<{ order: number; name: string; data: Uint8Array }> };

/** Legendas no formato do pacote: "POST 3 · TEMA", uma linha de detalhe, linha em branco e a legenda (blocos separados por ------). */
export function parseCaptions(text: string): Map<number, { title: string | null; caption: string }> {
  const out = new Map<number, { title: string | null; caption: string }>();
  const blocks = text.replace(/\r/g, "").split(/\n-{5,}\n/);
  for (const block of blocks) {
    const m = block.trim().match(/^POST\s+(\d+)\s*(?:[·\-–—:]\s*(.*))?\n([\s\S]*)$/i);
    if (!m) continue;
    let body = m[3];
    // Linha de detalhe ("Carrossel · 5 imagens ... · Dia 1") antes da legenda
    const lines = body.split("\n");
    if (lines[0] && /(carrossel|post único|imagem|dia \d)/i.test(lines[0])) body = lines.slice(1).join("\n");
    out.set(Number(m[1]), { title: m[2]?.trim() || null, caption: body.trim() });
  }
  return out;
}

/** Lê o .zip: imagens "1-1.png, 1-2.png" (carrossel) ou "2.png" (post único) e as legendas (LEGENDAS.txt ou "2.txt"). */
export async function parseZip(buf: Buffer): Promise<{ posts: ParsedPost[]; warnings: string[] }> {
  const zip = await JSZip.loadAsync(buf);
  const posts = new Map<number, ParsedPost>();
  const perFile = new Map<number, string>();
  let legendas: string | null = null;
  const warnings: string[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const parts = entry.name.split("/");
    if (parts.some((p) => p.startsWith("__MACOSX") || p.startsWith(".")) || parts.some((p) => p.toLowerCase() === "logos")) continue;
    const base = parts[parts.length - 1];
    const img = base.match(/^(\d+)(?:-(\d+))?\.(png|jpe?g)$/i);
    if (img) {
      const n = Number(img[1]);
      if (n === 0) continue; // prévia do feed
      const p = posts.get(n) ?? { number: n, title: null, caption: "", slides: [] };
      p.slides.push({ order: img[2] ? Number(img[2]) : 1, name: base, data: await entry.async("uint8array") });
      posts.set(n, p);
      continue;
    }
    if (/^legendas?\.txt$/i.test(base)) legendas = await entry.async("string");
    const txt = base.match(/^(\d+)\.txt$/);
    if (txt) perFile.set(Number(txt[1]), (await entry.async("string")).trim());
  }
  const caps = legendas ? parseCaptions(legendas) : new Map();
  const list = [...posts.values()].sort((a, b) => a.number - b.number);
  for (const p of list) {
    p.slides.sort((a, b) => a.order - b.order);
    const c = caps.get(p.number);
    p.caption = perFile.get(p.number) ?? c?.caption ?? "";
    p.title = c?.title ?? null;
    if (!p.caption) warnings.push(`Post ${p.number} sem legenda`);
    if (p.slides.length > MAX_SLIDES) throw new Error(`O post ${p.number} tem ${p.slides.length} imagens: o Instagram aceita no máximo ${MAX_SLIDES} no carrossel`);
  }
  return { posts: list, warnings };
}

/** Horários de postagem: "12:00, 19:00" → [[12,0],[19,0]]. */
export function parseTimes(raw: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const t of raw.split(/[,;\s]+/).filter(Boolean)) {
    const m = t.match(/^(\d{1,2})(?::|h)?(\d{2})?$/i);
    if (!m) continue;
    const h = Number(m[1]), min = Number(m[2] ?? 0);
    if (h < 24 && min < 60) out.push([h, min]);
  }
  return [...new Map(out.map((x) => [x[0] * 60 + x[1], x])).values()].sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]));
}

/** Datas de cada post: começa no dia escolhido e vai preenchendo os horários, um post por horário (horário que já passou pula). */
export function scheduleSlots(startDay: string, times: Array<[number, number]>, count: number, now = new Date()): Date[] {
  const [y, mo, d] = startDay.split("-").map(Number);
  const out: Date[] = [];
  for (let day = 0; out.length < count && day < 3660; day++) {
    for (const [h, min] of times) {
      const at = new Date(Date.UTC(y, mo - 1, d + day, h + TZ_OFFSET_H, min));
      if (at.getTime() > now.getTime() + 60_000) out.push(at);
      if (out.length >= count) break;
    }
  }
  return out;
}

/** Converte para JPG (a API do Instagram só aceita JPG) e salva na pasta de uploads. */
async function saveJpeg(data: Uint8Array, tag: string): Promise<string> {
  const sharp = (await import("sharp")).default;
  const jpg = await sharp(Buffer.from(data)).rotate().flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();
  const dir = path.resolve(env.uploadDir());
  await mkdir(dir, { recursive: true });
  const name = `ig-${tag}-${randomBytes(6).toString("hex")}.jpg`;
  await writeFile(path.join(dir, name), jpg);
  return name;
}

/** Sobe o .zip e agenda os posts. */
export async function importZip(buf: Buffer, opts: { startDay: string; times: string }) {
  const times = parseTimes(opts.times);
  if (!times.length) throw new Error("Coloque pelo menos um horário, ex.: 12:00");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.startDay)) throw new Error("Escolha o dia do primeiro post");
  const { posts, warnings } = await parseZip(buf);
  if (!posts.length) throw new Error("Não achei imagens no .zip. Os nomes precisam ser 1-1.png, 1-2.png (carrossel) ou 2.png (post único)");
  const slots = scheduleSlots(opts.startDay, times, posts.length);
  const batchId = randomBytes(8).toString("hex");
  for (const [i, p] of posts.entries()) {
    const images: string[] = [];
    for (const s of p.slides) images.push(await saveJpeg(s.data, `${batchId}-${p.number}`));
    await prisma.instagramPost.create({ data: { batchId, number: p.number, title: p.title, caption: p.caption.slice(0, 2200), images, scheduledAt: slots[i] } });
  }
  return { count: posts.length, first: slots[0], last: slots[slots.length - 1], warnings };
}

// ---------------------------------------------------------------------------
// Publicação
// ---------------------------------------------------------------------------

async function accountId(token: string): Promise<string> {
  const id = env.instagramAccountId();
  if (id) return id;
  // Sem o ID: procura a conta do Instagram ligada às páginas que o token enxerga
  const r = await graph<{ data?: Array<{ instagram_business_account?: { id: string } }> }>(token, "GET", "me/accounts", { query: { fields: "instagram_business_account" } });
  const found = r.data?.find((p) => p.instagram_business_account)?.instagram_business_account?.id;
  if (!found) throw new Error("Não achei a conta do Instagram: preencha o ID da conta na tela Instagram");
  return found;
}

export async function instagramStatus(): Promise<{ ok: true; username: string; id: string } | { ok: false; error: string }> {
  const token = env.instagramToken();
  if (!token) return { ok: false, error: "Falta o token" };
  try {
    const id = await accountId(token);
    const r = await graph<{ username?: string }>(token, "GET", id, { query: { fields: "username" } });
    return { ok: true, username: r.username ?? "?", id };
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
}

function friendly(e: unknown): string {
  if (e instanceof MetaError) {
    if (e.code === 190) return "Token vencido ou inválido: gere um novo e cole na tela Instagram";
    if (e.code === 10 || e.code === 200) return "O token não tem permissão de publicar no Instagram (instagram_content_publish)";
    if (e.code === 9004 || /media/i.test(e.message) && /download|fetch|url/i.test(e.message)) return "A Meta não conseguiu baixar a imagem do servidor do Fuzil";
    if (e.code === 4 || e.code === 9) return "Limite de posts do Instagram atingido (50 por dia). Tenta de novo mais tarde";
    return `Instagram: ${e.message}`;
  }
  return e instanceof Error ? e.message : String(e);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Espera a Meta terminar de processar o container (carrossel demora um pouco). */
async function waitReady(token: string, containerId: string) {
  for (let i = 0; i < 20; i++) {
    const r = await graph<{ status_code?: string; status?: string }>(token, "GET", containerId, { query: { fields: "status_code,status" } }).catch(() => null);
    if (!r || r.status_code === "FINISHED" || r.status_code === "PUBLISHED") return;
    if (r.status_code === "ERROR" || r.status_code === "EXPIRED") throw new Error(`A Meta recusou a imagem (${r.status ?? r.status_code})`);
    await sleep(3000);
  }
}

async function publishOne(post: { id: string; caption: string; images: string[] }) {
  const token = env.instagramToken();
  if (!token) throw new Error("Instagram não configurado: falta o token");
  const ig = await accountId(token);
  const url = (f: string) => `${env.appUrl()}/media/${f}`;
  let creation: string;
  if (post.images.length === 1) {
    creation = (await graph<{ id: string }>(token, "POST", `${ig}/media`, { body: { image_url: url(post.images[0]), caption: post.caption } })).id;
  } else {
    const children: string[] = [];
    for (const f of post.images) {
      const c = await graph<{ id: string }>(token, "POST", `${ig}/media`, { body: { image_url: url(f), is_carousel_item: true } });
      children.push(c.id);
    }
    for (const c of children) await waitReady(token, c);
    creation = (await graph<{ id: string }>(token, "POST", `${ig}/media`, { body: { media_type: "CAROUSEL", children: children.join(","), caption: post.caption } })).id;
  }
  await waitReady(token, creation);
  const pub = await graph<{ id: string }>(token, "POST", `${ig}/media_publish`, { body: { creation_id: creation } });
  const info = await graph<{ permalink?: string }>(token, "GET", pub.id, { query: { fields: "permalink" } }).catch(() => ({ permalink: undefined }));
  return { mediaId: pub.id, permalink: info.permalink ?? null };
}

async function alertOwner(title: string, message: string) {
  const ownerId = await platformOwnerId();
  const ws = ownerId ? await prisma.membership.findFirst({ where: { userId: ownerId, role: "OWNER" }, select: { workspaceId: true } }) : null;
  if (ws) await createAlert({ workspaceId: ws.workspaceId, type: "INSTAGRAM", severity: "WARNING", title, message }).catch(() => undefined);
}

/** Publica um post agora (botão ou worker). Só um publica por vez: quem marca PUBLISHING primeiro. */
export async function publishPost(id: string) {
  const claim = await prisma.instagramPost.updateMany({ where: { id, status: { in: ["SCHEDULED", "FAILED"] } }, data: { status: "PUBLISHING", error: null } });
  if (!claim.count) return { status: "busy" as const };
  const post = await prisma.instagramPost.findUniqueOrThrow({ where: { id } });
  try {
    const r = await publishOne(post);
    await prisma.instagramPost.update({ where: { id }, data: { status: "PUBLISHED", igMediaId: r.mediaId, permalink: r.permalink, publishedAt: new Date() } });
    return { status: "published" as const };
  } catch (e) {
    const error = friendly(e);
    await prisma.instagramPost.update({ where: { id }, data: { status: "FAILED", error } });
    await alertOwner(`Post ${post.number} do Instagram não saiu`, `${error}. Veja na tela Instagram e clique em Publicar agora para tentar de novo.`);
    return { status: "failed" as const, error };
  }
}

/** Rodada do worker: publica os posts que chegaram na hora. */
export async function instagramTick() {
  // Travou no meio (o servidor reiniciou): marca como falha para não postar duas vezes; o botão tenta de novo
  await prisma.instagramPost.updateMany({
    where: { status: "PUBLISHING", scheduledAt: { lt: new Date(Date.now() - 15 * 60_000) } },
    data: { status: "FAILED", error: "A publicação foi interrompida. Confira no Instagram se saiu antes de tentar de novo" },
  });
  const due = await prisma.instagramPost.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } }, orderBy: { scheduledAt: "asc" }, take: 3, select: { id: true } });
  for (const p of due) await publishPost(p.id);
}
