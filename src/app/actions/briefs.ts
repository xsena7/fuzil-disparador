"use server";

// Link para o cliente preencher a campanha (um template padrão por link) e a importação como campanha pronta.
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { saveUpload, mediaKind } from "@/lib/uploads";
import { friendlyError, metaDetail } from "@/lib/meta-errors";
import { createAlert } from "@/lib/alerts";
import { clientIp, tooMany } from "@/lib/rate-limit";
import { importAudience, readAudienceFile } from "@/lib/audience-import";
import { squareJpeg } from "@/lib/profile-photos";
import { meta } from "@/lib/meta";
import { wabaToken } from "@/lib/sync";
import { usableGroupWhere } from "@/lib/bm-problems";
import { templateShape, type VarSource, type VariableMapping } from "@/lib/template-utils";
import { briefTemplate } from "@/lib/briefs";

type FormState = { ok?: string; error?: string } | undefined;

export async function createBriefAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const [name, language] = String(form.get("template") ?? "").split("|");
  if (!name || !language) return { error: "Escolha o template padrão do link" };
  if (!(await briefTemplate(auth.workspace.id, name, language))) return { error: "Template não encontrado" };
  const label = String(form.get("label") ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || name;
  await prisma.campaignBrief.create({ data: { workspaceId: auth.workspace.id, token: randomBytes(15).toString("base64url"), label, templateName: name, templateLanguage: language } });
  revalidatePath("/campanhas");
  return { ok: "Link criado! Copie e mande para o cliente." };
}

export async function deleteBriefAction(id: string) {
  const auth = await requireAuth();
  await prisma.campaignBrief.deleteMany({ where: { id, workspaceId: auth.workspace.id } });
  revalidatePath("/campanhas");
  return { ok: "Link apagado." };
}

/** Cliente (sem login) envia o que preencheu no link. Pode mandar de novo enquanto o dono não importou. */
export async function submitBriefAction(token: string, _: FormState, form: FormData): Promise<FormState> {
  if (!/^[\w-]{10,40}$/.test(token)) return { error: "Link inválido" };
  if (tooMany(`brief:${await clientIp()}`, 15, 10 * 60_000)) return { error: "Muitos envios seguidos. Espere alguns minutos." };
  const brief = await prisma.campaignBrief.findUnique({ where: { token } });
  if (!brief) return { error: "Este link não existe mais. Peça um novo para quem te enviou." };
  if (brief.status === "IMPORTED") return { error: "Esta campanha já foi recebida e montada. Para mudar algo, fale com quem te enviou o link." };
  const components = await briefTemplate(brief.workspaceId, brief.templateName, brief.templateLanguage);
  if (!components) return { error: "O modelo desta campanha não existe mais. Fale com quem te enviou o link." };
  const shape = templateShape(components, env.redirectDomain());

  const campaignName = String(form.get("campaignName") ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  if (!campaignName) return { error: "Escreva o nome da campanha" };

  // Variáveis: texto fixo, nome da pessoa ou coluna da planilha
  const readVar = (prefix: string, i: number): VarSource => {
    const kind = String(form.get(`${prefix}${i}_kind`) ?? "fixed");
    const value = String(form.get(`${prefix}${i}_value`) ?? "").trim().slice(0, 500);
    if (kind === "firstName" || kind === "name") return { type: "field", field: kind };
    if (kind === "col") return { type: "field", field: `col:${value}` };
    return { type: "fixed", value };
  };
  const mapping: VariableMapping = {
    header: shape.headerVars.map((_, i) => readVar("h", i)),
    body: shape.bodyVars.map((_, i) => readVar("b", i)),
  };
  const missing = [...(mapping.body ?? []), ...(mapping.header ?? [])].some((v) => (v.type === "fixed" ? !v.value : v.field === "col:"));
  if (missing) return { error: "Preencha todas as variáveis da mensagem" };

  const data: Prisma.CampaignBriefUpdateInput = { campaignName, variableMapping: mapping as unknown as Prisma.InputJsonValue, notes: String(form.get("notes") ?? "").trim().slice(0, 2000) || null };

  // Link do botão (vai pelo redirecionador do Fuzil, que conta os cliques)
  if (shape.urlButtons.some((b) => b.tracked || (b.dynamic && b.url.includes("{{")))) {
    const url = String(form.get("buttonUrl") ?? "").trim();
    if (!/^https?:\/\/\S+\.\S+/.test(url)) return { error: "Cole o link do botão completo (começando com https://)" };
    data.buttonUrl = url;
  }

  // Imagem/vídeo/PDF do cabeçalho
  const needsMedia = Boolean(shape.headerFormat && ["IMAGE", "VIDEO", "DOCUMENT"].includes(shape.headerFormat));
  const media = form.get("media");
  if (media instanceof File && media.size > 0) {
    if (!/^(image\/(jpeg|png)|video\/mp4|application\/pdf)$/.test(media.type)) return { error: "A imagem da mensagem precisa ser JPG, PNG, MP4 ou PDF" };
    try {
      const saved = await saveUpload(media);
      data.headerMediaUrl = saved.url;
      data.headerMediaType = mediaKind(saved.mime);
      data.headerMediaName = saved.name;
    } catch (e) {
      return { error: friendlyError(e) };
    }
  } else if (needsMedia && !brief.headerMediaUrl) return { error: "Envie a imagem da mensagem" };

  // Base de contatos: guarda o arquivo (a campanha importa na hora de montar)
  const base = form.get("audience");
  if (base instanceof File && base.size > 0) {
    if (base.size > 50 * 1024 * 1024) return { error: "A planilha passa de 50 MB" };
    const buf = Buffer.from(await base.arrayBuffer());
    let rows = 0;
    try {
      rows = (await readAudienceFile(base.name, buf)).rows.length;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Não consegui ler a planilha" };
    }
    if (!rows) return { error: "A planilha não tem nenhum telefone válido" };
    const dir = path.resolve(env.uploadDir(), "briefs");
    await mkdir(dir, { recursive: true });
    const ext = /\.csv$/i.test(base.name) ? "csv" : /\.xls$/i.test(base.name) ? "xls" : "xlsx";
    const fileName = `${brief.id}-${Date.now()}.${ext}`;
    await writeFile(path.join(dir, fileName), buf);
    data.audienceFile = fileName;
    data.audienceFileName = base.name.slice(0, 120);
    data.audienceRows = rows;
  } else if (!brief.audienceFile) return { error: "Envie a planilha com os contatos" };

  // Foto de perfil do WhatsApp (opcional)
  const photo = form.get("profilePhoto");
  if (photo instanceof File && photo.size > 0) {
    if (!["image/jpeg", "image/png"].includes(photo.type)) return { error: "A foto de perfil precisa ser JPG ou PNG" };
    if (photo.size > 5 * 1024 * 1024) return { error: "A foto de perfil passa de 5 MB" };
    const pic = await squareJpeg(Buffer.from(await photo.arrayBuffer()), photo.type);
    const saved = await saveUpload(new File([new Uint8Array(pic.buf)], "perfil.jpg", { type: pic.mime }));
    data.profilePhoto = path.basename(saved.path);
  }

  const first = brief.status === "OPEN";
  await prisma.campaignBrief.update({ where: { id: brief.id }, data: { ...data, status: "SUBMITTED", submittedAt: new Date() } });
  await createAlert({
    workspaceId: brief.workspaceId,
    type: "CAMPAIGN_COMPLETED",
    severity: "INFO",
    title: `Campanha "${campaignName}" ${first ? "recebida" : "atualizada"} pelo link`,
    message: `O cliente ${first ? "preencheu" : "atualizou"} o link "${brief.label}". Em Campanhas, clique em Importar, escolha o grupo e pronto.`,
  }).catch(() => undefined);
  return { ok: first ? "Recebemos tudo! A nossa equipe já vai montar o seu disparo." : "Atualizado! A nossa equipe recebeu as mudanças." };
}

/** Importa o que o cliente preencheu como campanha pronta: só falta escolher o grupo. */
export async function importBriefAction(briefId: string, _: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const brief = await prisma.campaignBrief.findFirst({ where: { id: briefId, workspaceId: auth.workspace.id } });
  if (!brief) return { error: "Link não encontrado" };
  if (brief.status === "OPEN") return { error: "O cliente ainda não enviou" };
  const groupId = String(form.get("groupId") ?? "");
  const group = await prisma.bmGroup.findFirst({ where: { id: groupId, workspaceId: auth.workspace.id, ...usableGroupWhere }, select: { id: true } });
  if (!group) return { error: "Escolha o grupo de BMs" };
  if (!brief.audienceFile) return { error: "O cliente não mandou a planilha" };

  const c = await prisma.campaign.create({
    data: {
      workspaceId: auth.workspace.id,
      name: brief.campaignName || brief.label,
      scope: "GROUP",
      groupId: group.id,
      templateName: brief.templateName,
      templateLanguage: brief.templateLanguage,
      variableMapping: (brief.variableMapping ?? undefined) as Prisma.InputJsonValue | undefined,
      buttonUrl: brief.buttonUrl,
      headerMediaUrl: brief.headerMediaUrl,
      headerMediaType: brief.headerMediaType as never,
      headerMediaName: brief.headerMediaName,
      briefId: brief.id,
    },
  });
  try {
    const buf = await readFile(path.join(path.resolve(env.uploadDir(), "briefs"), path.basename(brief.audienceFile)));
    await importAudience(c.id, auth.workspace.id, brief.audienceFileName || brief.audienceFile, buf);
  } catch (e) {
    await prisma.campaign.delete({ where: { id: c.id } }).catch(() => undefined);
    return { error: `Não deu para importar a planilha: ${e instanceof Error ? e.message : "erro"}` };
  }
  await prisma.campaignBrief.update({ where: { id: brief.id }, data: { status: "IMPORTED", importedCampaignId: c.id } });
  revalidatePath("/campanhas");
  redirect(`/campanhas/${c.id}?etapa=envio`);
}

/** Coloca a foto de perfil que o cliente mandou nos números conectados do grupo da campanha. */
export async function applyBriefPhotoAction(campaignId: string) {
  const auth = await requireAuth();
  const c = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: auth.workspace.id }, select: { briefId: true, groupId: true } });
  if (!c?.briefId || !c.groupId) return { error: "Esta campanha não tem foto do cliente" };
  const brief = await prisma.campaignBrief.findUnique({ where: { id: c.briefId }, select: { profilePhoto: true } });
  if (!brief?.profilePhoto) return { error: "O cliente não mandou foto de perfil" };
  const buf = await readFile(path.join(path.resolve(env.uploadDir()), path.basename(brief.profilePhoto)));
  const phones = await prisma.phoneNumber.findMany({
    where: { status: "CONNECTED", invalidReason: null, waba: { workspaceId: auth.workspace.id, business: { groups: { some: { groupId: c.groupId } } } } },
    include: { waba: true },
  });
  if (!phones.length) return { error: "Nenhum número conectado no grupo da campanha" };
  const handles = new Map<string, string>();
  let ok = 0;
  const errors: string[] = [];
  for (const p of phones) {
    try {
      const token = wabaToken(p.waba);
      if (!handles.has(token)) handles.set(token, await meta.uploadSampleMedia(token, buf, "perfil.jpg", "image/jpeg"));
      await meta.updateBusinessProfile(token, p.phoneNumberId, { profile_picture_handle: handles.get(token)! });
      const prof = await meta.getBusinessProfile(token, p.phoneNumberId).catch(() => null);
      if (prof?.profile_picture_url) await prisma.phoneNumber.update({ where: { id: p.id }, data: { profilePhotoUrl: prof.profile_picture_url } });
      ok++;
    } catch (e) {
      errors.push(`${p.displayPhoneNumber}: ${metaDetail(e)}`);
    }
  }
  revalidatePath(`/campanhas/${campaignId}`);
  revalidatePath("/grupos");
  if (!errors.length) return { ok: `Foto colocada em ${ok} número(s)!` };
  return { error: `Foto colocada em ${ok} de ${phones.length}. ${errors.slice(0, 3).join(" | ")}` };
}
