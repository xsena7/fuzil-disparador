// Link do cliente: o template padrão escolhido no link (componentes para montar o formulário).
import { prisma } from "./db";
import type { TComponent } from "./template-utils";

export async function briefTemplate(workspaceId: string, name: string, language: string): Promise<TComponent[] | null> {
  const bp = await prisma.templateBlueprint.findFirst({ where: { workspaceId, name, language }, select: { components: true } });
  if (bp) return bp.components as unknown as TComponent[];
  const tpl = await prisma.template.findFirst({ where: { workspaceId, name, language }, select: { components: true } });
  return (tpl?.components as unknown as TComponent[]) ?? null;
}
