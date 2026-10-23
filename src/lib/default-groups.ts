import { prisma } from "./db";

/** Grupos de disparo que toda conta ganha de início (o cliente pode renomear ou apagar depois). */
const DEFAULT_GROUPS = [
  { name: "Aquecimento", color: "orange", description: "BMs que estão sendo aquecidas pelo funil de aquecimento.", like: /aquec/i },
  { name: "Prontas para disparo", color: "emerald", description: "BMs prontas para as campanhas.", like: /pront/i },
];

/** Cria os grupos padrão uma vez por conta. Não cria se a conta já tem um grupo parecido (ex.: "Contas prontas"). */
export async function ensureDefaultGroups(workspaceId: string) {
  // Marca primeiro: duas abas abertas ao mesmo tempo não criam em dobro
  const claimed = await prisma.workspace.updateMany({ where: { id: workspaceId, defaultGroupsAt: null }, data: { defaultGroupsAt: new Date() } });
  if (!claimed.count) return;
  const existing = await prisma.bmGroup.findMany({ where: { workspaceId, system: null }, select: { name: true } });
  for (const g of DEFAULT_GROUPS) {
    if (existing.some((e) => g.like.test(e.name))) continue;
    await prisma.bmGroup.create({ data: { workspaceId, name: g.name, color: g.color, description: g.description } });
  }
}
