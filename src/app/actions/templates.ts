"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { trackedUrlBase } from "@/lib/env";
import { createUtilityTemplate, deployBlueprints } from "@/lib/blueprints";
import { syncWaba, wabaToken } from "@/lib/sync";
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
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  if (data.asBlueprint) {
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
      },
    });
    deployBlueprints(auth.workspace.id).catch((e) => console.error("[blueprints]", e));
    revalidatePath("/templates-padrao");
    return { ok: "Template padrão criado. Ele está sendo enviado para todas as BMs do escopo." };
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
      if (r.ok) await syncWaba(w.id).catch(() => undefined);
      return { label: w.business.name, r };
    }),
  );
  revalidatePath("/templates");
  const ok = results.filter((x) => x.r.ok).length;
  const recat = results.filter((x) => !x.r.ok && x.r.recategorized).map((x) => x.label);
  const errors = results.filter((x) => !x.r.ok && !x.r.recategorized).map((x) => `${x.label}: ${(x.r as { error: string }).error}`);
  const parts = [`Enviado para análise em ${ok}/${results.length} WABAs.`];
  if (recat.length) parts.push(`Excluído por vir como marketing em: ${recat.join(", ")}.`);
  if (errors.length) parts.push(`Erros: ${errors.join(" | ")}`);
  return ok === results.length ? { ok: parts.join(" ") } : { error: parts.join(" ") };
}

export async function deleteTemplateAction(templateId: string) {
  const auth = await requireAuth();
  const tpl = await prisma.template.findFirst({ where: { id: templateId, workspaceId: auth.workspace.id }, include: { waba: true } });
  if (!tpl) return;
  await meta.deleteTemplate(wabaToken(tpl.waba), tpl.waba.wabaId, tpl.name).catch((e) => console.error(e));
  await prisma.template.delete({ where: { id: tpl.id } });
  revalidatePath("/templates");
}

export async function toggleBlueprintAction(id: string) {
  const auth = await requireAuth();
  const bp = await prisma.templateBlueprint.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!bp) return;
  await prisma.templateBlueprint.update({ where: { id }, data: { active: !bp.active } });
  if (!bp.active) deployBlueprints(auth.workspace.id).catch(() => undefined);
  revalidatePath("/templates-padrao");
}

export async function deleteBlueprintAction(id: string) {
  const auth = await requireAuth();
  await prisma.templateBlueprint.deleteMany({ where: { id, workspaceId: auth.workspace.id } });
  revalidatePath("/templates-padrao");
}

export async function deployNowAction() {
  const auth = await requireAuth();
  await deployBlueprints(auth.workspace.id);
  revalidatePath("/templates-padrao");
}

export async function updateAutoDeleteAction(form: FormData) {
  const auth = await requireAuth();
  await prisma.workspace.update({ where: { id: auth.workspace.id }, data: { autoDeleteMarketing: form.get("autoDelete") === "on" } });
  revalidatePath("/templates");
}
