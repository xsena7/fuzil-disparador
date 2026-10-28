"use server";

import { friendlyError } from "@/lib/meta-errors";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { trackedUrlBase } from "@/lib/env";
import { createUtilityTemplate, deployBlueprints } from "@/lib/blueprints";
import { wabaToken } from "@/lib/sync";
import { recheckWorkspaceBms } from "@/lib/bm-problems";
import { meta, type TemplateComponent } from "@/lib/meta";
import { extractVars } from "@/lib/template-utils";
import { saveUpload } from "@/lib/uploads";
import type { FormState } from "./auth";

const buttonSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("URL_TRACKED"), text: z.string().min(1).max(25) }),
  z.object({ type: z.literal("URL"), text: z.string().min(1).max(25), url: z.string().url() }),
  z.object({ type: z.literal("QUICK_REPLY"), text: z.string().min(1).max(25) }),
  z.object({ type: z.literal("PHONE_NUMBER"), text: z.string().min(1).max(25), phone: z.string().min(8) }),
]);

const schema = z.object({
  name: z.string().regex(/^[a-z0-9_]{1,512}$/, "Nome: só letras minúsculas, números e _"),
  language: z.string().min(2),
  headerType: z.enum(["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"]),
  headerText: z.string().max(60).optional(),
  headerExample: z.string().optional(),
  body: z.string().min(1, "Escreva o corpo da mensagem").max(1024),
  bodyExamples: z.array(z.string()),
  footer: z.string().max(60).optional(),
  buttons: z.array(buttonSchema).max(10),
  target: z.enum(["GROUP", "ALL", "WABAS"]),
  groupId: z.string().optional(),
  wabaIds: z.array(z.string()),
  asBlueprint: z.boolean(),
  keepReady: z.boolean().optional(),
});

function buildComponents(d: z.infer<typeof schema>): TemplateComponent[] {
  const comps: TemplateComponent[] = [];
  if (d.headerType === "TEXT" && d.headerText) {
    const vars = extractVars(d.headerText);
    comps.push({ type: "HEADER", format: "TEXT", text: d.headerText, ...(vars.length ? { example: { header_text: [d.headerExample || "exemplo"] } } : {}) });
  } else if (d.headerType !== "NONE" && d.headerType !== "TEXT") {
    comps.push({ type: "HEADER", format: d.headerType });
  }
  const vars = extractVars(d.body);
  comps.push({
    type: "BODY",
    text: d.body,
    ...(vars.length ? { example: { body_text: [vars.map((_, i) => d.bodyExamples[i] || `exemplo ${i + 1}`)] } } : {}),
  });
  if (d.footer) comps.push({ type: "FOOTER", text: d.footer });
  if (d.buttons.length) {
    const domain = trackedUrlBase();
    comps.push({
      type: "BUTTONS",
      buttons: d.buttons.map((b) => {
        if (b.type === "URL_TRACKED") return { type: "URL", text: b.text, url: `https://${domain}/{{1}}`, example: [`https://${domain}/abc123`] };
        if (b.type === "URL") return { type: "URL", text: b.text, url: b.url };
        if (b.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone };
        return { type: "QUICK_REPLY", text: b.text };
      }),
    });
  }
  return comps;
}

export async function createTemplateAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  let data: z.infer<typeof schema>;
  try {
    data = schema.parse(JSON.parse(String(form.get("payload") ?? "{}")));
  } catch (err) {
    return { error: err instanceof z.ZodError ? err.issues[0].message : "Dados inválidos" };
  }
  const components = buildComponents(data);

  let sample: { path: string; mime: string } | null = null;
  const file = form.get("sample");
  if (["IMAGE", "VIDEO", "DOCUMENT"].includes(data.headerType)) {
    if (!(file instanceof File) || file.size === 0) return { error: "Envie um arquivo de exemplo para o cabeçalho" };
    try {
      const saved = await saveUpload(file);
      sample = { path: saved.path, mime: saved.mime };
    } catch (err) {
      return { error: friendlyError(err) };
    }
  }

  if (data.asBlueprint) {
    if (data.target === "GROUP" && data.groupId && !(await prisma.bmGroup.findFirst({ where: { id: data.groupId, workspaceId: auth.workspace.id }, select: { id: true } })))
      return { error: "Grupo não encontrado" };
    const exists = await prisma.templateBlueprint.findUnique({
      where: { workspaceId_name_language: { workspaceId: auth.workspace.id, name: data.name, language: data.language } },
    });
    if (exists) return { error: "Já existe um template padrão com esse nome/idioma. Use outro nome (a Meta não deixa reaproveitar nomes excluídos)." };
    await prisma.templateBlueprint.create({
      data: {
        workspaceId: auth.workspace.id,
        groupId: data.target === "GROUP" ? data.groupId || null : null,
        name: data.name,
        language: data.language,
        components: components as unknown as Prisma.InputJsonValue,
        headerSamplePath: sample?.path,
        headerSampleMime: sample?.mime,
        keepReady: Boolean(data.keepReady),
      },
    });
    deployBlueprints(auth.workspace.id).catch((e) => console.error("[blueprints]", e));
    revalidatePath("/templates-padrao");
    return { ok: "Seu template padrão foi criado! Agora o Fuzil está mandando ele para a Meta aprovar em todas as BMs escolhidas. A aprovação costuma levar de alguns minutos até 24 horas. Acompanhe em Templates padrão." };
  }

  const wabas = await prisma.whatsAppAccount.findMany({
    where: {
      workspaceId: auth.workspace.id,
      ...(data.target === "GROUP" ? { business: { groups: { some: { groupId: data.groupId } } } } : {}),
      ...(data.target === "WABAS" ? { id: { in: data.wabaIds } } : {}),
    },
    include: { business: true },
  });
  if (!wabas.length) return { error: "Nenhuma WABA selecionada" };

  const results = await Promise.all(
    wabas.map(async (w) => {
      const r = await createUtilityTemplate(w, { name: data.name, language: data.language, components, headerSample: sample });
      return { label: w.business.name, r };
    }),
  );
  revalidatePath("/templates");
  const ok = results.filter((x) => x.r.ok).length;
  const recat = results.filter((x) => !x.r.ok && x.r.recategorized).map((x) => x.label);
  const errors = results.filter((x) => !x.r.ok && !x.r.recategorized).map((x) => `${x.label}: ${(x.r as { error: string }).error}`);
  const parts = [ok === results.length ? `Seu template foi enviado para a Meta aprovar${results.length > 1 ? ` em ${ok} contas` : ""}. A aprovação costuma levar de alguns minutos até 24 horas. Acompanhe em Templates.` : `Enviado para a Meta aprovar em ${ok} de ${results.length} contas.`];
  if (recat.length) parts.push(`Excluído por vir como marketing em: ${recat.join(", ")}.`);
  if (errors.length) parts.push(`Erros: ${errors.join(" | ")}`);
  return ok === results.length ? { ok: parts.join(" ") } : { error: parts.join(" ") };
}

/** Apaga o template direto na Meta e, se deu certo (ou ele já não existia lá), tira da plataforma. */
export async function deleteTemplateAction(templateId: string): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER" && !auth.user.isSuperAdmin) return { error: "Só o dono ou um admin da conta pode excluir template." };
  const tpl = await prisma.template.findFirst({ where: { id: templateId, workspaceId: auth.workspace.id }, include: { waba: true } });
  if (!tpl) return { ok: true };
  const token = wabaToken(tpl.waba);
  try {
    await meta.deleteTemplate(token, tpl.waba.wabaId, tpl.name, tpl.metaTemplateId ?? undefined);
  } catch (e) {
    // Se a Meta não tem mais esse template, só limpa aqui; senão mostra o motivo
    const still = await meta
      .listTemplates(token, tpl.waba.wabaId)
      .then((list) => list.some((t) => t.name === tpl.name && t.language === tpl.language))
      .catch(() => true);
    if (still) return { error: `A Meta não deixou excluir "${tpl.name}": ${friendlyError(e)}` };
  }
  await prisma.template.delete({ where: { id: tpl.id } });
  return { ok: true };
}

export async function toggleBlueprintAction(id: string) {
  const auth = await requireAuth();
  const bp = await prisma.templateBlueprint.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!bp) return;
  await prisma.templateBlueprint.update({ where: { id }, data: { active: !bp.active } });
  if (!bp.active) deployBlueprints(auth.workspace.id).catch(() => undefined);
  revalidatePath("/templates-padrao");
}

/** Liga/desliga "não tirar as BMs prontas do disparo enquanto esse template estiver em análise" e já acerta os grupos. */
export async function toggleKeepReadyAction(id: string) {
  const auth = await requireAuth();
  const bp = await prisma.templateBlueprint.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!bp) return;
  await prisma.templateBlueprint.update({ where: { id }, data: { keepReady: !bp.keepReady } });
  await recheckWorkspaceBms(auth.workspace.id);
  revalidatePath("/templates-padrao");
  revalidatePath("/grupos");
}

export async function deleteBlueprintAction(id: string) {
  const auth = await requireAuth();
  await prisma.templateBlueprint.deleteMany({ where: { id, workspaceId: auth.workspace.id } });
  revalidatePath("/templates-padrao");
}

export async function deployNowAction() {
  const auth = await requireAuth();
  // "Aplicar agora" é uma nova tentativa manual: zera as contas que deram erro
  await prisma.templateDeployment.updateMany({ where: { status: "ERROR", blueprint: { workspaceId: auth.workspace.id } }, data: { attempts: 0 } });
  await deployBlueprints(auth.workspace.id);
  revalidatePath("/templates-padrao");
  return { ok: true };
}

export async function updateAutoDeleteAction(form: FormData) {
  const auth = await requireAuth();
  if (auth.role === "MEMBER" && !auth.user.isSuperAdmin) return;
  await prisma.workspace.update({ where: { id: auth.workspace.id }, data: { autoDeleteMarketing: form.get("autoDelete") === "on" } });
  revalidatePath("/templates");
}

/** Troca o texto de um template padrão e reenvia (com o próximo nome) nas BMs onde foi rejeitado ou deu erro. */
export async function editBlueprintTextAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const bp = await prisma.templateBlueprint.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!bp) return { error: "Template padrão não encontrado" };
  if (bp.category === "AUTHENTICATION") return { error: "O template de código não tem texto para editar (a Meta monta sozinha)." };
  const text = String(form.get("body") ?? "").replace(/\r/g, "").trim();
  if (text.length < 10) return { error: "Escreva o texto da mensagem." };
  if (text.length > 1024) return { error: "Texto grande demais (máximo 1.024 caracteres)." };
  const components = bp.components as unknown as TemplateComponent[];
  const body = components.find((c) => c.type === "BODY");
  const before = extractVars(body?.text ?? "");
  const after = extractVars(text);
  // As campanhas e o funil preenchem as variáveis pela posição: a quantidade tem que continuar igual
  if (before.length !== after.length) return { error: `O texto precisa ter as mesmas variáveis de antes (${before.map((v) => `{{${v}}}`).join(", ") || "nenhuma"}).` };
  if (/^\s*\{\{|\}\}\s*$/.test(text)) return { error: "A Meta não aceita variável no começo nem no fim do texto. Coloque alguma palavra antes/depois." };
  const next = components.map((c) => (c.type === "BODY" ? { ...c, text } : c));
  await prisma.templateBlueprint.update({ where: { id: bp.id }, data: { components: next as unknown as Prisma.InputJsonValue } });
  const r = await prisma.templateDeployment.updateMany({
    where: { blueprintId: bp.id, status: { in: ["REJECTED", "ERROR", "MARKETING_ON_CREATE"] } },
    data: { status: "RETRY", attempts: 0, error: null },
  });
  void deployBlueprints(auth.workspace.id).catch((e) => console.error("[blueprints] reenviar", e));
  revalidatePath("/templates-padrao");
  return {
    ok: r.count
      ? `Texto salvo! O Fuzil está reenviando para a Meta aprovar em ${r.count} BM${r.count > 1 ? "s" : ""} (com um nome novo, porque o antigo ficou rejeitado). Onde já estava aprovado continua igual.`
      : "Texto salvo! Ele vale para as BMs que forem entrar no grupo daqui pra frente. Onde já estava aprovado continua igual.",
  };
}
