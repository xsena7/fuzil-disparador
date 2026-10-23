import { readFile } from "node:fs/promises";
import type { Prisma, WhatsAppAccount } from "@prisma/client";
import { prisma } from "./db";
import { ensureLinksBlueprints } from "./links-templates";
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
  input: { name: string; language: string; components: TemplateComponent[]; headerSample?: { path: string; mime: string } | null; category?: "UTILITY" | "AUTHENTICATION" },
): Promise<CreateResult> {
  const category = input.category ?? "UTILITY";
  const token = wabaToken(waba);
  const components = structuredClone(input.components);
  // A Meta recusa botão com emoji, quebra de linha ou formatação (*, _, ~): limpa antes de enviar
  for (const c of components)
    for (const btn of c.buttons ?? [])
      if (btn.text) btn.text = btn.text.replace(/[\p{Extended_Pictographic}\uFE0F\u200D*_~`]/gu, "").replace(/\s+/g, " ").trim() || "OK";
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
      category,
      components,
    });
    if (res.category && res.category !== category) {
      await meta.deleteTemplate(token, waba.wabaId, input.name).catch(() => undefined);
      return { ok: false, recategorized: true, category: res.category };
    }
    // Traz o template para o Fuzil e guarda a hora do envio
    await syncWaba(waba.id).catch(() => undefined);
    await prisma.template.updateMany({ where: { wabaId: waba.id, name: input.name, language: input.language }, data: { submittedAt: new Date() } });
    return { ok: true, status: res.status, category: res.category ?? category };
  } catch (err) {
    return { ok: false, recategorized: false, error: err instanceof MetaError ? `${err.message}${err.details ? ` (${err.details})` : ""}` : String(err) };
  }
}

/** Quantas vezes o Fuzil tenta um nome novo numa WABA depois de reclassificações. */
const MAX_VERSIONS = 10;

/** fzl_disp1 → fzl_disp2; aviso → aviso2 */
export function nextTemplateName(name: string) {
  const m = name.match(/^(.*?)(\d+)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : `${name}2`;
}

/** O template padrão de onde veio esse nome (o nome original ou uma das versões numeradas). */
async function blueprintForName(workspaceId: string, name: string, language: string) {
  return prisma.templateBlueprint.findFirst({
    where: { workspaceId, language, OR: [{ name }, { deployments: { some: { currentName: name } } }] },
    include: { deployments: { select: { currentName: true, wabaId: true } } },
  });
}

/** Todos os nomes que valem como "o mesmo template": o original e as versões numeradas de cada WABA. */
export async function templateFamily(workspaceId: string, name: string, language: string): Promise<string[]> {
  const bp = await blueprintForName(workspaceId, name, language);
  if (!bp) return [name];
  return [...new Set([name, bp.name, ...bp.deployments.map((d) => d.currentName).filter((n): n is string => Boolean(n))])];
}

/** Nome versionado → nome do template padrão, para a campanha mostrar uma opção só. */
export async function templateAliases(workspaceId: string): Promise<Map<string, string>> {
  const bps = await prisma.templateBlueprint.findMany({ where: { workspaceId }, include: { deployments: { select: { currentName: true } } } });
  const out = new Map<string, string>();
  for (const bp of bps) for (const d of bp.deployments) if (d.currentName && d.currentName !== bp.name) out.set(`${d.currentName}|${bp.language}`, bp.name);
  return out;
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
  // Funil do gerador de links: garante que o código e o aviso de acesso existem antes de subir
  await ensureLinksBlueprints().catch((e) => console.error("[links] templates", e));
  const blueprints = await prisma.templateBlueprint.findMany({
    where: { active: true, ...(workspaceId ? { workspaceId } : {}) },
    include: { deployments: true },
  });
  for (const bp of blueprints) {
    const wabas = await wabasInScope(bp.workspaceId, bp.groupId);
    for (const waba of wabas) {
      const dep = bp.deployments.find((d) => d.wabaId === waba.id);
      // Erros tentam até 3x
      if ((dep?.status === "ERROR" && dep.attempts >= 3) || dep?.status === "MARKETING_ON_CREATE") continue;

      let name = dep?.currentName ?? bp.name;
      let version = dep?.version ?? 1;
      // Rejeitado: apaga o rejeitado na Meta e sobe de novo com o próximo nome (até MAX_VERSIONS)
      const rejected = dep?.status === "REJECTED" && version < MAX_VERSIONS;
      if (rejected) {
        try {
          await meta.deleteTemplate(wabaToken(waba), waba.wabaId, name);
        } catch (e) {
          console.error("[blueprints] apagar rejeitado", name, e);
        }
        await prisma.template.deleteMany({ where: { wabaId: waba.id, name, language: bp.language } });
      }
      // Queimou o nome (virou marketing, rejeitou) ou o texto foi editado depois de rejeitar: sobe com o próximo nome
      const burned = rejected || dep?.status === "RECATEGORIZED_DELETED" || dep?.status === "RETRY";
      if (burned) {
        // O nome queimou nessa WABA: tenta o próximo número (pulando nomes que já existem nela)
        if (version >= MAX_VERSIONS) continue;
        do {
          name = nextTemplateName(name);
          version++;
        } while (version < MAX_VERSIONS && (await prisma.template.findUnique({ where: { wabaId_name_language: { wabaId: waba.id, name, language: bp.language } } })));
        // Acabaram as tentativas e o nome ainda existe nessa WABA: para aqui
        if (await prisma.template.findUnique({ where: { wabaId_name_language: { wabaId: waba.id, name, language: bp.language } } })) continue;
      }

      const existing = burned
        ? null
        : await prisma.template.findUnique({ where: { wabaId_name_language: { wabaId: waba.id, name, language: bp.language } } });
      // Já enviado: só acompanha o status (não cria de novo enquanto a sincronização não trouxer)
      if (dep && !burned && dep.status !== "ERROR" && !existing) continue;
      if (existing) {
        const status = deploymentStatusFor(existing.status, existing.category, bp.category);
        if (dep?.status !== status) {
          await prisma.templateDeployment.upsert({
            where: { blueprintId_wabaId: { blueprintId: bp.id, wabaId: waba.id } },
            create: { blueprintId: bp.id, wabaId: waba.id, status, currentName: name },
            update: { status, error: existing.rejectedReason },
          });
        }
        if (existing.category !== bp.category) await handleRecategorized(bp.workspaceId, waba.id, name, bp.language, existing.category);
        continue;
      }

      const result = await createUtilityTemplate(waba, {
        name,
        language: bp.language,
        components: bp.components as unknown as TemplateComponent[],
        headerSample: bp.headerSamplePath ? { path: bp.headerSamplePath, mime: bp.headerSampleMime ?? "image/jpeg" } : null,
        category: bp.category === "AUTHENTICATION" ? "AUTHENTICATION" : "UTILITY",
      });
      const where = { blueprintId_wabaId: { blueprintId: bp.id, wabaId: waba.id } };
      const naming = { currentName: name, version };
      if (result.ok) {
        await prisma.templateDeployment.upsert({
          where,
          create: { blueprintId: bp.id, wabaId: waba.id, status: deploymentStatusFor(result.status, result.category, bp.category), submittedAt: new Date(), ...naming },
          update: { status: deploymentStatusFor(result.status, result.category, bp.category), error: null, attempts: burned ? 1 : { increment: 1 }, submittedAt: new Date(), ...naming },
        });
      } else if (result.recategorized) {
        await prisma.templateDeployment.upsert({
          where,
          create: { blueprintId: bp.id, wabaId: waba.id, status: "MARKETING_ON_CREATE", error: `Meta classificou ${name} como ${result.category}`, ...naming },
          update: { status: "MARKETING_ON_CREATE", error: `Meta classificou ${name} como ${result.category}`, ...naming },
        });
        await alertRecategorized(bp.workspaceId, `${waba.business.name} / ${waba.name}`, name, result.category, false);
      } else {
        await prisma.templateDeployment.upsert({
          where,
          create: { blueprintId: bp.id, wabaId: waba.id, status: "ERROR", error: result.error, ...naming },
          update: { status: "ERROR", error: result.error, attempts: burned ? 1 : { increment: 1 }, ...naming },
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

function deploymentStatusFor(status: string, category: string, expected = "UTILITY"): Prisma.TemplateDeploymentCreateInput["status"] {
  if (category !== expected) return "RECATEGORIZED_DELETED";
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  return "SUBMITTED";
}

async function alertRecategorized(workspaceId: string, wabaLabel: string, name: string, category: string, retry: boolean) {
  await createAlert({
    workspaceId,
    type: "BLUEPRINT_RECATEGORIZED",
    severity: "CRITICAL",
    title: `Template padrão "${name}" virou ${category} e foi EXCLUÍDO`,
    message: retry
      ? `WABA ${wabaLabel}. A cópia foi apagada para nunca ser disparada como marketing. O Fuzil vai criar sozinho a próxima versão (${nextTemplateName(name)}) nessa WABA, e as campanhas usam ela no lugar.`
      : `WABA ${wabaLabel}. A cópia foi apagada para nunca ser disparada como marketing. A Meta entende esse texto como marketing: trocar só o nome não resolve, mude o texto do template padrão.`,
  });
}

/**
 * Chamado quando um template muda de categoria. Se for cópia de um template padrão
 * (ou se a conta pediu para apagar tudo que virar marketing), exclui na Meta.
 */
export async function handleRecategorized(workspaceId: string, wabaRecordId: string, name: string, language: string, to: string) {
  if (to === "UTILITY") return;
  const bp = await blueprintForName(workspaceId, name, language);
  // Template de código (AUTHENTICATION) é assim mesmo: não é recategorização
  if (bp && bp.category === to) return;
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { autoDeleteMarketing: true } });
  if (!bp && !ws?.autoDeleteMarketing) return;

  const waba = await prisma.whatsAppAccount.findUnique({ where: { id: wabaRecordId }, include: { business: true } });
  if (!waba) return;
  try {
    await meta.deleteTemplate(wabaToken(waba), waba.wabaId, name);
  } catch (err) {
    // Tenta de novo a cada 5 min: avisa no máximo uma vez por dia
    const title = `Não consegui excluir o template "${name}" (${to})`;
    if (await prisma.alert.findFirst({ where: { workspaceId, title, createdAt: { gte: new Date(Date.now() - 86400_000) } }, select: { id: true } })) return;
    await createAlert({
      workspaceId,
      type: "TEMPLATE_DELETE_FAILED",
      severity: "CRITICAL",
      title,
      message: `WABA ${waba.business.name} / ${waba.name}: ${err instanceof Error ? err.message : err}. Ele continua bloqueado para disparos.`,
    });
    return;
  }
  await prisma.template.deleteMany({ where: { wabaId: wabaRecordId, name, language } });
  if (bp) {
    const dep = await prisma.templateDeployment.upsert({
      where: { blueprintId_wabaId: { blueprintId: bp.id, wabaId: wabaRecordId } },
      create: { blueprintId: bp.id, wabaId: wabaRecordId, status: "RECATEGORIZED_DELETED", error: `${name} recategorizado para ${to}`, currentName: name },
      update: { status: "RECATEGORIZED_DELETED", error: `${name} recategorizado para ${to}`, currentName: name },
    });
    await alertRecategorized(workspaceId, `${waba.business.name} / ${waba.name}`, name, to, dep.version < MAX_VERSIONS);
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
