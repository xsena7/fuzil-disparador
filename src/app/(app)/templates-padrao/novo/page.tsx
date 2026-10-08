import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { trackedUrlBase } from "@/lib/env";
import { PageHeader } from "@/components/ui";
import { TemplateBuilder } from "../../templates/builder";

export default async function NewBlueprintPage() {
  const auth = await requireAuth();
  const groups = await prisma.bmGroup.findMany({ where: { workspaceId: auth.workspace.id }, select: { id: true, name: true } });
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Novo template padrão" description="Ele será criado em todas as BMs do escopo escolhido, inclusive nas conectadas no futuro." />
      <TemplateBuilder groups={groups} wabas={[]} redirectDomain={trackedUrlBase()} defaultBlueprint />
    </div>
  );
}
