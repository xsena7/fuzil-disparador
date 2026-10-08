import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { trackedUrlBase } from "@/lib/env";
import { PageHeader } from "@/components/ui";
import { TemplateBuilder } from "../builder";

export default async function NewTemplatePage() {
  const auth = await requireAuth();
  const [groups, wabas] = await Promise.all([
    prisma.bmGroup.findMany({ where: { workspaceId: auth.workspace.id }, select: { id: true, name: true } }),
    prisma.whatsAppAccount.findMany({ where: { workspaceId: auth.workspace.id }, include: { business: true } }),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Criar template" description="O template é criado como Utilidade em todas as WABAs escolhidas. Se a Meta classificar como marketing, a cópia é apagada na hora." />
      <TemplateBuilder groups={groups} wabas={wabas.map((w) => ({ id: w.id, label: `${w.business.name} / ${w.name}` }))} redirectDomain={trackedUrlBase()} />
    </div>
  );
}
