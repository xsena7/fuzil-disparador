import { readFile } from "node:fs/promises";
import type { Prisma, WhatsAppAccount } from "@prisma/client";
import { prisma } from "./db";
import { meta, MetaError, type TemplateComponent } from "./meta";
import { syncWaba, wabaToken } from "./sync";
import { createAlert } from "./alerts";

export type CreateResult =
  | { ok: true; status: string; category: string }
  | { ok: false; recategorized: true; category: string }
  | { ok: false; recategorized: false; error: string };

/**
 * Cria um template SEMPRE como UTILITY numa WABA.
 * Se a Meta devolver em outra categoria, o template é excluído na hora.
 */
export async function createUtilityTemplate(
  waba: WhatsAppAccount,
  input: { name: string; language: string; components: TemplateComponent[]; headerSample?: { path: string; mime: string } | null },
): Promise<CreateResult> {
  const token = wabaToken(waba);
  const components = structuredClone(input.components);
  try {
    const header = components.find((c) => c.type === "HEADER");
    if (header && header.format && ["IMAGE", "VIDEO", "DOCUMENT"].includes(header.format)) {
      if (!input.headerSample) return { ok: false, recategorized: false, error: "Header de mídia precisa de um arquivo de exemplo" };
      const file = await readFile(input.headerSample.path);
      const handle = await meta.uploadSampleMedia(token, file, input.headerSample.path.split("/").pop()!, input.headerSample.mime);
      header.example = { header_handle: [handle] };
    }
    const res = await meta.createTemplate(token, waba.wabaId, {
      name: input.name,
      language: input.language,
      category: "UTILITY",
      components,
    });
    if (res.category && res.category !== "UTILITY") {
      await meta.deleteTemplate(token, waba.wabaId, input.name).catch(() => undefined);
      return { ok: false, recategorized: true, category: res.category };
    }
    return { ok: true, status: res.status, category: res.category ?? "UTILITY" };
  } catch (err) {
    return { ok: false, recategorized: false, error: err instanceof MetaError ? `${err.message}${err.details ? ` (${err.details})` : ""}` : String(err) };
  }
}

async function wabasInScope(workspaceId: string, groupId: string | null) {
  return prisma.whatsAppAccount.findMany({
    where: groupId
      ? { workspaceId, business: { groups: { some: { groupId } } } }
      : { workspaceId },
    include: { business: true },
  });
}

/** Garante que todo template padrão ativo exista em todas as WABAs do seu escopo. */
export async function deployBlueprints(workspaceId?: string) {
  const blueprints = await prisma.templateBlueprint.findMany({
    where: { active: true, ...(workspaceId ? { workspaceId } : {}) },
    include: { deployments: true },
  });
  for (const bp of blueprints) {
    const wabas = await wabasInScope(bp.workspaceId, bp.groupId);
    for (const waba of wabas) {
      const dep = bp.deployments.find((d) => d.wabaId === waba.id);
      // Não insiste em WABAs onde já foi recategorizado/rejeitado; erros tentam até 3x
      if (dep && (dep.status !== "ERROR" || dep.attempts >= 3)) continue;

      const existing = await prisma.template.findUnique({
        where: { wabaId_name_language: { wabaId: waba.id, name: bp.name, language: bp.language } },
      });
      if (existing) {
        await prisma.templateDeployment.upsert({
          where: { blueprintId_wabaId: { blueprintId: bp.id, wabaId: waba.id } },
          create: { blueprintId: bp.id, wabaId: waba.id, status: deploymentStatusFor(existing.status, existing.category) },
          update: { status: deploymentStatusFor(existing.status, existing.category), error: null },
        });
        if (existing.category !== "UTILITY") await handleRecategorized(bp.workspaceId, waba.id, bp.name, bp.language, existing.category);
        continue;
      }

      const result = await createUtilityTemplate(waba, {
        name: bp.name,
        language: bp.language,
        components: bp.components as unknown as TemplateComponent[],
        headerSample: bp.headerSamplePath ? { path: bp.headerSamplePath, mime: bp.headerSampleMime ?? "image/jpeg" } : null,
      });
      const where = { blueprintId_wabaId: { blueprintId: bp.id, wabaId: waba.id } };
      if (result.ok) {
        await prisma.templateDeployment.upsert({
          where,
          create: { blueprintId: bp.id, wabaId: waba.id, status: deploymentStatusFor(result.status, result.category) },
          update: { status: deploymentStatusFor(result.status, result.category), error: null, attempts: { increment: 1 } },
        });
        await syncWaba(waba.id).catch(() => undefined);
      } else if (result.recategorized) {
        await prisma.templateDeployment.upsert({
          where,
          create: { blueprintId: bp.id, wabaId: waba.id, status: "RECATEGORIZED_DELETED", error: `Meta classificou como ${result.category}` },
          update: { status: "RECATEGORIZED_DELETED", error: `Meta classificou como ${result.category}` },
        });
        await alertRecategorized(bp.workspaceId, `${waba.business.name} / ${waba.name}`, bp.name, result.category);
      } else {
        await prisma.templateDeployment.upsert({
          where,
          create: { blueprintId: bp.id, wabaId: waba.id, status: "ERROR", error: result.error },
          update: { status: "ERROR", error: result.error, attempts: { increment: 1 } },
        });
        if ((dep?.attempts ?? 0) + 1 >= 3) {
          await createAlert({
            workspaceId: bp.workspaceId,
            type: "BLUEPRINT_ERROR",
            severity: "WARNING",
            title: `Template padrão "${bp.name}" não subiu em ${waba.business.name}`,
            message: result.error,
          });
        }
      }
    }
  }
}

function deploymentStatusFor(status: string, category: string): Prisma.TemplateDeploymentCreateInput["status"] {
  if (category !== "UTILITY") return "RECATEGORIZED_DELETED";
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  return "SUBMITTED";
}

async function alertRecategorized(workspaceId: string, wabaLabel: string, name: string, category: string) {
  await createAlert({
    workspaceId,
    type: "BLUEPRINT_RECATEGORIZED",
    severity: "CRITICAL",
    title: `Template padrão "${name}" virou ${category} e foi EXCLUÍDO`,
    message: `WABA ${wabaLabel}. A cópia foi apagada para nunca ser disparada como marketing. Crie uma nova versão do template padrão (com outro nome) se quiser tentar de novo.`,
  });
}

/**
 * Chamado quando um template muda de categoria. Se for cópia de um template padrão
 * (ou se a conta pediu para apagar tudo que virar marketing), exclui na Meta.
 */
export async function handleRecategorized(workspaceId: string, wabaRecordId: string, name: string, language: string, to: string) {
  if (to === "UTILITY") return;
  const bp = await prisma.templateBlueprint.findUnique({ where: { workspaceId_name_language: { workspaceId, name, language } } });
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { autoDeleteMarketing: true } });
  if (!bp && !ws?.autoDeleteMarketing) return;

  const waba = await prisma.whatsAppAccount.findUnique({ where: { id: wabaRecordId }, include: { business: true } });
  if (!waba) return;
  try {
    await meta.deleteTemplate(wabaToken(waba), waba.wabaId, name);
  } catch (err) {
    await createAlert({
      workspaceId,
      type: "TEMPLATE_DELETE_FAILED",
      severity: "CRITICAL",
      title: `Não consegui excluir o template "${name}" (${to})`,
      message: `WABA ${waba.business.name} / ${waba.name}: ${err instanceof Error ? err.message : err}. Ele continua bloqueado para disparos.`,
    });
    return;
  }
  await prisma.template.deleteMany({ where: { wabaId: wabaRecordId, name, language } });
  if (bp) {
    await prisma.templateDeployment.upsert({
      where: { blueprintId_wabaId: { blueprintId: bp.id, wabaId: wabaRecordId } },
      create: { blueprintId: bp.id, wabaId: wabaRecordId, status: "RECATEGORIZED_DELETED", error: `Recategorizado para ${to}` },
      update: { status: "RECATEGORIZED_DELETED", error: `Recategorizado para ${to}` },
    });
    await alertRecategorized(workspaceId, `${waba.business.name} / ${waba.name}`, name, to);
  } else {
    await createAlert({
      workspaceId,
      type: "TEMPLATE_AUTO_DELETED",
      severity: "CRITICAL",
      title: `Template "${name}" virou ${to} e foi excluído`,
      message: `WABA ${waba.business.name} / ${waba.name}. Exclusão automática ativada nas configurações.`,
    });
  }
}
