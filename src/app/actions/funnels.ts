"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deployBlueprints } from "@/lib/blueprints";
import { friendlyError } from "@/lib/meta-errors";
import { encrypt } from "@/lib/crypto";
import { createFunnel, createFunnelFromModel, funnelPage, setFunnelStatus, slugify, type FormField, type FunnelStep, type Job } from "@/lib/funnels";
import type { FormState } from "./auth";

import { usableGroupWhere } from "@/lib/bm-problems";
async function ownFunnel(id: string) {
  const auth = await requireAuth();
  const funnel = await prisma.funnel.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  return { auth, funnel };
}

const RESERVED = new Set(["admin", "api", "app", "site", "www", "c", "v"]);

export async function createFunnelAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER") return { error: "Só donos e admins criam funis" };
  const name = String(form.get("name") ?? "").trim();
  const kind = form.get("kind") === "LINKS" ? "LINKS" : "JOBS";
  if (kind === "LINKS") {
    // Só em conta de administrador do Fuzil (o login do site reparte as pessoas entre esses funis)
    const adminWs = await prisma.membership.count({ where: { workspaceId: auth.workspace.id, user: { isSuperAdmin: true } } });
    if (!auth.user.isSuperAdmin || !adminWs) return { error: "Só contas de administradores do Fuzil têm o funil do gerador de links" };
    if (await prisma.funnel.findFirst({ where: { kind: "LINKS", workspaceId: auth.workspace.id }, select: { id: true } })) return { error: "Essa conta já tem um funil do gerador de links. Abra ele na lista acima." };
    const group = await prisma.bmGroup.findFirst({ where: { id: String(form.get("groupId") ?? ""), workspaceId: auth.workspace.id, ...usableGroupWhere } });
    if (!group) return { error: "Escolha o grupo de BM que vai disparar" };
    const { createLinksFunnel } = await import("@/lib/links-login");
    const f = await createLinksFunnel(auth.workspace.id, group.id, name || "Login do gerador de links");
    void deployBlueprints(auth.workspace.id).catch((e) => console.error("[funil] templates", e));
    redirect(`/aquecimento/${f.id}`);
  }
  const slug = slugify(String(form.get("slug") ?? "") || name);
  const groupId = String(form.get("groupId") ?? "");
  const jobTitle = String(form.get("jobTitle") ?? "").trim();
  if (!name) return { error: "Dê um nome ao funil" };
  if (slug.length < 3 || RESERVED.has(slug)) return { error: "Escolha outro endereço (mínimo 3 letras)" };
  const group = await prisma.bmGroup.findFirst({ where: { id: groupId, workspaceId: auth.workspace.id, ...usableGroupWhere } });
  if (!group) return { error: "Escolha o grupo de BM que vai disparar" };
  if (await prisma.funnel.findUnique({ where: { slug } })) return { error: "Esse endereço já está em uso, escolha outro" };
  let id: string;
  try {
    // "Começar de": modelo pronto (funil de um administrador do Fuzil) ou o padrão
    const modelId = String(form.get("modelId") ?? "");
    id = modelId
      ? (await createFunnelFromModel(auth.workspace.id, modelId, { name, slug, groupId })).id
      : (await createFunnel(auth.workspace.id, { name, slug, groupId, jobTitle: jobTitle || undefined })).id;
  } catch (err) {
    return { error: friendlyError(err) };
  }
  // Sobe os templates do funil em todas as BMs do grupo (em segundo plano)
  void deployBlueprints(auth.workspace.id).catch((e) => console.error("[funil] templates", e));
  redirect(`/aquecimento/${id}`);
}

const str = (form: FormData, k: string, max = 300) => String(form.get(k) ?? "").trim().slice(0, max);
const lines = (form: FormData, k: string) =>
  String(form.get(k) ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12);

export async function savePageAction(_: FormState, form: FormData): Promise<FormState> {
  const { funnel } = await ownFunnel(str(form, "id"));
  if (!funnel) return { error: "Funil não encontrado" };
  const color = str(form, "color", 7);
  const page = {
    ...funnelPage(funnel),
    company: str(form, "company", 80),
    jobTitle: str(form, "jobTitle", 80),
    headline: str(form, "headline", 160),
    subtitle: str(form, "subtitle", 300),
    about: str(form, "about", 2000),
    salary: str(form, "salary", 80),
    location: str(form, "location", 80),
    cta: str(form, "cta", 40) || "Quero me inscrever",
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : "#2563eb",
    benefits: lines(form, "benefits"),
    requirements: lines(form, "requirements"),
  };
  if (!page.jobTitle || !page.headline) return { error: "Preencha pelo menos a vaga e o título" };
  await prisma.funnel.update({ where: { id: funnel.id }, data: { page } });
  revalidatePath(`/aquecimento/${funnel.id}`);
  return { ok: "Página salva" };
}

export async function saveSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  const { auth, funnel } = await ownFunnel(str(form, "id"));
  if (!funnel) return { error: "Funil não encontrado" };
  const name = str(form, "name", 80);
  const groupId = str(form, "groupId");
  const pixelId = str(form, "pixelId", 30).replace(/\D/g, "") || null;
  const sendFrom = Math.min(23, Math.max(0, Number(form.get("sendFrom") ?? 8) || 0));
  const sendTo = Math.min(24, Math.max(1, Number(form.get("sendTo") ?? 21) || 24));
  const domain =
    str(form, "domain", 120)
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/^www\./, "") || null;
  if (!name) return { error: "Dê um nome ao funil" };
  if (domain && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return { error: "Domínio inválido. Exemplo: vagasbrasil.com.br" };
  if (domain) {
    const taken = await prisma.funnel.findFirst({ where: { domain, id: { not: funnel.id } }, select: { id: true } });
    const own = [process.env.APP_URL, process.env.REDIRECT_DOMAIN, process.env.SITE_DOMAIN].some((v) => v && v.replace(/^https?:\/\//, "").replace(/[:/].*$/, "").endsWith(domain));
    if (taken || own) return { error: "Esse domínio já está em uso" };
  }
  const group = await prisma.bmGroup.findFirst({ where: { id: groupId, workspaceId: auth.workspace.id, ...usableGroupWhere } });
  if (!group) return { error: "Escolha o grupo de BM" };
  // Token da API de Conversões: em branco mantém o atual; "remover" apaga
  const capiToken = str(form, "capiToken", 600).replace(/\s+/g, "");
  const capi = form.get("capiRemove") ? { capiTokenEnc: null, capiLastOkAt: null, capiLastError: null } : capiToken ? { capiTokenEnc: encrypt(capiToken), capiLastError: null } : {};
  const capiTestCode = str(form, "capiTestCode", 40) || null;
  await prisma.funnel.update({ where: { id: funnel.id }, data: { name, groupId, pixelId, domain, sendFrom, sendTo, capiTestCode, ...capi } });
  if (group.id !== funnel.groupId) {
    // Os templates do funil passam a subir nas BMs do grupo novo
    const ids = [funnel.codeBlueprintId, funnel.doneBlueprintId, funnel.loginBlueprintId, ...(funnel.steps as unknown as FunnelStep[]).flatMap((s) => (s.type === "send" ? [s.blueprintId] : []))].filter((x): x is string => Boolean(x));
    await prisma.templateBlueprint.updateMany({ where: { id: { in: ids }, workspaceId: auth.workspace.id }, data: { groupId: group.id } });
    await prisma.campaign.updateMany({ where: { funnelId: funnel.id }, data: { groupId: group.id } });
    void deployBlueprints(auth.workspace.id).catch(() => undefined);
  }
  revalidatePath(`/aquecimento/${funnel.id}`);
  return { ok: "Configurações salvas" };
}

export async function saveStepsAction(id: string, steps: FunnelStep[]): Promise<{ ok?: true; error?: string }> {
  const { auth, funnel } = await ownFunnel(id);
  if (!funnel) return { error: "Funil não encontrado" };
  const bps = new Set((await prisma.templateBlueprint.findMany({ where: { workspaceId: auth.workspace.id }, select: { id: true } })).map((b) => b.id));
  const clean: FunnelStep[] = [];
  for (const s of steps.slice(0, 30)) {
    const sid = String(s.id || Math.random().toString(16).slice(2, 12)).slice(0, 20);
    if (s.type === "wait") {
      const unit = ["minutes", "hours", "days"].includes(s.unit) ? s.unit : "days";
      clean.push({ id: sid, type: "wait", amount: Math.min(365, Math.max(1, Math.round(Number(s.amount) || 1))), unit });
    } else if (s.type === "send") {
      if (!bps.has(s.blueprintId)) return { error: "Escolha o template de cada mensagem" };
      clean.push({ id: sid, type: "send", blueprintId: s.blueprintId, mapping: s.mapping ?? {}, onlyIfPending: Boolean(s.onlyIfPending) });
    }
  }
  // Leads no meio do funil continuam do passo em que estavam (limitado ao novo tamanho)
  await prisma.funnel.update({ where: { id: funnel.id }, data: { steps: clean as unknown as Prisma.InputJsonValue } });
  await prisma.lead.updateMany({ where: { funnelId: funnel.id, stepIndex: { gt: clean.length } }, data: { stepIndex: clean.length } });
  revalidatePath(`/aquecimento/${funnel.id}`);
  return { ok: true };
}

export async function saveFieldsAction(id: string, fields: FormField[]): Promise<{ ok?: true; error?: string }> {
  const { funnel } = await ownFunnel(id);
  if (!funnel) return { error: "Funil não encontrado" };
  const used = new Set<string>();
  const clean: FormField[] = [];
  for (const f of fields.slice(0, 20)) {
    const label = String(f.label ?? "").trim().slice(0, 120);
    if (!label) continue;
    let key = slugify(label).replace(/-/g, "_").slice(0, 30) || "campo";
    while (used.has(key)) key += "_";
    used.add(key);
    const type = ["text", "textarea", "select"].includes(f.type) ? f.type : "text";
    const options = type === "select" ? (f.options ?? []).map((o) => String(o).trim().slice(0, 60)).filter(Boolean).slice(0, 15) : undefined;
    if (type === "select" && !options?.length) return { error: `Coloque as opções de "${label}"` };
    clean.push({ key, label, type, options, required: Boolean(f.required) });
  }
  await prisma.funnel.update({ where: { id: funnel.id }, data: { formFields: clean as unknown as Prisma.InputJsonValue } });
  revalidatePath(`/aquecimento/${funnel.id}`);
  return { ok: true };
}

export async function toggleFunnelAction(id: string) {
  const { funnel } = await ownFunnel(id);
  if (!funnel) return { error: "Funil não encontrado" };
  await setFunnelStatus(funnel.id, funnel.status !== "ACTIVE");
  revalidatePath(`/aquecimento/${funnel.id}`);
  revalidatePath("/aquecimento");
  return { ok: true };
}

export async function deleteFunnelAction(id: string) {
  const { auth, funnel } = await ownFunnel(id);
  if (!funnel) return { error: "Funil não encontrado" };
  if (auth.role === "MEMBER") return { error: "Só donos e admins excluem funis" };
  // Os templates continuam na Meta, mas param de ser criados em BMs novas
  const ids = [funnel.codeBlueprintId, funnel.doneBlueprintId, funnel.loginBlueprintId, ...(funnel.steps as unknown as FunnelStep[]).flatMap((s) => (s.type === "send" ? [s.blueprintId] : []))].filter((x): x is string => Boolean(x));
  await prisma.templateBlueprint.updateMany({ where: { id: { in: ids }, workspaceId: auth.workspace.id }, data: { active: false } });
  await prisma.funnel.delete({ where: { id: funnel.id } });
  revalidatePath("/aquecimento");
  redirect("/aquecimento");
}

export async function saveJobsAction(id: string, jobs: Job[]): Promise<{ ok?: true; error?: string }> {
  const { funnel } = await ownFunnel(id);
  if (!funnel) return { error: "Funil não encontrado" };
  const used = new Set<string>();
  const clean: Job[] = [];
  for (const j of jobs.slice(0, 40)) {
    const title = String(j.title ?? "").trim().slice(0, 80);
    if (!title) continue;
    let jid = String(j.id || slugify(title)).slice(0, 40) || "vaga";
    while (used.has(jid)) jid += "-2";
    used.add(jid);
    clean.push({
      id: jid,
      title,
      area: String(j.area ?? "").trim().slice(0, 40),
      level: String(j.level ?? "").trim().slice(0, 40),
      salary: String(j.salary ?? "").trim().slice(0, 60),
      description: String(j.description ?? "").trim().slice(0, 1500),
      requirements: (j.requirements ?? []).map((r) => String(r).trim().slice(0, 120)).filter(Boolean).slice(0, 12),
      open: j.open !== false,
      positions: Math.min(100_000, Math.max(1, Math.round(Number(j.positions) || 200))),
    });
  }
  await prisma.funnel.update({ where: { id: funnel.id }, data: { page: { ...funnelPage(funnel), jobs: clean } } });
  revalidatePath(`/aquecimento/${funnel.id}`);
  return { ok: true };
}

export async function checkDomainAction(id: string): Promise<{ error?: string; result?: import("@/lib/domain-check").DomainCheck }> {
  const { funnel } = await ownFunnel(id);
  if (!funnel) return { error: "Funil não encontrado" };
  if (!funnel.domain) return { error: "Salve o domínio primeiro" };
  const { checkDomain } = await import("@/lib/domain-check");
  const result = await checkDomain(funnel.domain, true);
  revalidatePath(`/aquecimento/${funnel.id}`);
  return { result };
}

async function ownLead(id: string) {
  const auth = await requireAuth();
  return prisma.lead.findFirst({ where: { id, workspaceId: auth.workspace.id } });
}

export async function stopLeadAction(id: string) {
  const lead = await ownLead(id);
  if (!lead) return { error: "Lead não encontrado" };
  const { stopLead } = await import("@/lib/funnels");
  await stopLead(lead);
  revalidatePath(`/aquecimento/${lead.funnelId}`);
  return { ok: true };
}

export async function resumeLeadAction(id: string) {
  const lead = await ownLead(id);
  if (!lead) return { error: "Lead não encontrado" };
  const { resumeLead } = await import("@/lib/funnels");
  await resumeLead(lead);
  revalidatePath(`/aquecimento/${lead.funnelId}`);
  return { ok: true };
}

export async function deleteLeadAction(id: string) {
  const lead = await ownLead(id);
  if (!lead) return { error: "Lead não encontrado" };
  const { deleteLead } = await import("@/lib/funnels");
  await deleteLead(lead);
  revalidatePath(`/aquecimento/${lead.funnelId}`);
  return { ok: true };
}

export async function saveAvatarAction(id: string, form: FormData): Promise<{ ok?: true; error?: string }> {
  const { funnel } = await ownFunnel(id);
  if (!funnel) return { error: "Funil não encontrado" };
  let avatar: string | undefined;
  if (!form.get("remove")) {
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return { error: "Escolha uma imagem" };
    if (!["image/jpeg", "image/png"].includes(file.type)) return { error: "Use uma imagem JPG ou PNG" };
    const { saveUpload } = await import("@/lib/uploads");
    try {
      const saved = await saveUpload(file);
      avatar = `/media/${saved.path.split("/").pop()}`;
    } catch (err) {
      return { error: friendlyError(err) };
    }
  }
  await prisma.funnel.update({ where: { id: funnel.id }, data: { page: { ...funnelPage(funnel), avatar } } });
  revalidatePath(`/aquecimento/${funnel.id}`);
  return { ok: true };
}
