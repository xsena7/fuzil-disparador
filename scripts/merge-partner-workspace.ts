/**
 * Junta o workspace de um sócio no workspace do dono (o padrão).
 *
 *   npx tsx scripts/merge-partner-workspace.ts --owner=<email do dono> --partner=<email do sócio>          (simulação)
 *   npx tsx scripts/merge-partner-workspace.ts --owner=<email do dono> --partner=<email do sócio> --apply  (aplica)
 *
 * Regras:
 * - O workspace do dono fica. Tudo que estava no workspace do sócio é movido para ele.
 * - Duplicados (mesmo template padrão, grupo com o mesmo nome) ficam só com a versão do dono.
 * - Se a mesma BM, WABA, contato, atalho ou pasta existir nos dois, a linha do sócio fica onde está e vai no relatório.
 * - O sócio passa a ser membro do workspace do dono. Sessões abertas dele são apontadas para lá.
 */
import { prisma } from "../src/lib/db";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, "").split("=");
  return [k, v.join("=") || "true"];
}));
const APPLY = args.apply === "true";
const ownerEmail = String(args.owner ?? "").toLowerCase();
const partnerEmail = String(args.partner ?? "").toLowerCase();
if (!ownerEmail || !partnerEmail) throw new Error("Use --owner=<email> --partner=<email>");

async function main() {
  const owner = await prisma.user.findUnique({ where: { email: ownerEmail }, include: { memberships: true } });
  const partner = await prisma.user.findUnique({ where: { email: partnerEmail }, include: { memberships: true } });
  if (!owner || !partner) throw new Error("Usuário não encontrado");
  const keeper = owner.memberships.find((m) => m.role === "OWNER") ?? owner.memberships[0];
  if (!keeper) throw new Error("O dono não tem workspace");
  const keeperId = keeper.workspaceId;
  const sources = [...new Set(partner.memberships.map((m) => m.workspaceId))].filter((id) => id !== keeperId);
  console.log(`Workspace do dono: ${keeperId}`);
  console.log(`Workspaces do sócio a juntar: ${sources.length ? sources.join(", ") : "nenhum"}`);

  for (const src of sources) {
    await mergeWorkspace(src, keeperId);
  }

  if (!APPLY) {
    console.log("\nSimulação: nada foi alterado. Rode com --apply para aplicar.");
    return;
  }

  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: partner.id, workspaceId: keeperId } },
    create: { userId: partner.id, workspaceId: keeperId, role: "ADMIN" },
    update: {},
  });
  await prisma.membership.deleteMany({ where: { userId: partner.id, workspaceId: { in: sources } } });
  await prisma.session.updateMany({ where: { userId: partner.id, workspaceId: { in: sources } }, data: { workspaceId: keeperId } });
  console.log("\nPronto. Sócio agora é membro do workspace do dono.");
}

async function mergeWorkspace(src: string, keeper: string) {
  const count = async (label: string, n: Promise<number>) => console.log(`  ${label}: ${await n}`);
  console.log(`\nWorkspace ${src} → ${keeper}`);

  // Duplicados: o do dono sempre prevalece
  const keeperBlueprints = await prisma.templateBlueprint.findMany({ where: { workspaceId: keeper }, select: { name: true, language: true } });
  const dupBlueprints = await prisma.templateBlueprint.findMany({
    where: { workspaceId: src, OR: keeperBlueprints.map((b) => ({ name: b.name, language: b.language })) },
    select: { id: true, name: true },
  });
  console.log(`  templates padrão duplicados (ficam os do dono): ${dupBlueprints.map((b) => b.name).join(", ") || "nenhum"}`);

  const keeperWabas = new Set((await prisma.whatsAppAccount.findMany({ where: { workspaceId: keeper }, select: { wabaId: true } })).map((w) => w.wabaId));
  const keeperBms = new Set((await prisma.businessManager.findMany({ where: { workspaceId: keeper }, select: { metaBusinessId: true } })).map((b) => b.metaBusinessId));
  const srcWabas = await prisma.whatsAppAccount.findMany({ where: { workspaceId: src }, select: { id: true, wabaId: true } });
  const srcBms = await prisma.businessManager.findMany({ where: { workspaceId: src }, select: { id: true, metaBusinessId: true } });
  const conflictWabas = srcWabas.filter((w) => keeperWabas.has(w.wabaId));
  const conflictBms = srcBms.filter((b) => keeperBms.has(b.metaBusinessId));
  if (conflictWabas.length || conflictBms.length) {
    console.log(`  ATENÇÃO, existem nos dois (ficam no workspace antigo do sócio, resolver à mão): WABAs ${conflictWabas.length}, BMs ${conflictBms.length}`);
  }

  const keeperContacts = new Set((await prisma.contact.findMany({ where: { workspaceId: keeper }, select: { phone: true } })).map((c) => c.phone));
  const contactConflicts = await prisma.contact.count({ where: { workspaceId: src, phone: { in: [...keeperContacts] } } });
  const keeperShortcuts = new Set((await prisma.quickReply.findMany({ where: { workspaceId: keeper }, select: { shortcut: true } })).map((q) => q.shortcut));
  const keeperFolders = new Set((await prisma.campaignFolder.findMany({ where: { workspaceId: keeper }, select: { name: true } })).map((f) => f.name));

  await count("BMs para mover", Promise.resolve(srcBms.length - conflictBms.length));
  await count("WABAs para mover", Promise.resolve(srcWabas.length - conflictWabas.length));
  await count("contatos com telefone repetido (ficam)", Promise.resolve(contactConflicts));
  await count("campanhas", prisma.campaign.count({ where: { workspaceId: src } }));
  await count("grupos de BM", prisma.bmGroup.count({ where: { workspaceId: src } }));
  await count("funis", prisma.funnel.count({ where: { workspaceId: src } }));
  await count("conversas do chat", prisma.conversation.count({ where: { workspaceId: src } }));
  await count("respostas rápidas repetidas (ficam)", Promise.resolve([...keeperShortcuts].length));
  await count("pastas de campanha repetidas (ficam)", Promise.resolve([...keeperFolders].length));
  if (!APPLY) return;

  // Templates padrão e grupos com o mesmo nome: apaga a cópia do sócio
  await prisma.templateDeployment.deleteMany({ where: { blueprintId: { in: dupBlueprints.map((b) => b.id) } } });
  await prisma.templateBlueprint.deleteMany({ where: { id: { in: dupBlueprints.map((b) => b.id) } } });

  const keeperGroups = await prisma.bmGroup.findMany({ where: { workspaceId: keeper }, select: { id: true, name: true } });
  const srcGroups = await prisma.bmGroup.findMany({ where: { workspaceId: src }, select: { id: true, name: true } });
  for (const g of srcGroups) {
    const same = keeperGroups.find((k) => k.name === g.name);
    if (same) {
      const members = await prisma.bmGroupMember.findMany({ where: { groupId: g.id } });
      for (const m of members) {
        await prisma.bmGroupMember.upsert({
          where: { groupId_businessId: { groupId: same.id, businessId: m.businessId } },
          create: { groupId: same.id, businessId: m.businessId },
          update: {},
        });
      }
      await prisma.bmGroup.delete({ where: { id: g.id } });
    }
  }

  // Contatos, respostas rápidas e pastas repetidas: fica a do dono (a do sócio some)
  await prisma.contact.deleteMany({ where: { workspaceId: src, phone: { in: [...keeperContacts] } } });
  await prisma.quickReply.deleteMany({ where: { workspaceId: src, shortcut: { in: [...keeperShortcuts] } } });
  await prisma.campaignFolder.deleteMany({ where: { workspaceId: src, name: { in: [...keeperFolders] } } });

  // BMs e WABAs que já existem no dono ficam onde estão (conflito, resolver à mão); o resto vai para o dono
  const moveBms = srcBms.filter((b) => !keeperBms.has(b.metaBusinessId)).map((b) => b.id);
  const moveWabas = srcWabas.filter((w) => !keeperWabas.has(w.wabaId)).map((w) => w.id);
  await prisma.whatsAppAccount.updateMany({ where: { id: { in: moveWabas } }, data: { workspaceId: keeper } });
  await prisma.businessManager.updateMany({ where: { id: { in: moveBms } }, data: { workspaceId: keeper } });
  // Templates seguem a WABA que mudou de workspace
  await prisma.template.updateMany({ where: { workspaceId: src, wabaId: { in: moveWabas } }, data: { workspaceId: keeper } });

  for (const model of ["campaign", "bmGroup", "funnel", "conversation", "contact", "quickReply", "campaignFolder", "alert", "inboundMessage", "creditTransaction", "lead", "externalLink", "chatMessage"] as const) {
    const delegate = prisma[model] as unknown as { updateMany: (a: unknown) => Promise<{ count: number }> };
    if (!delegate) continue;
    const r = await delegate.updateMany({ where: { workspaceId: src }, data: { workspaceId: keeper } }).catch((e: unknown) => {
      console.log(`  ${model}: não movido (${e instanceof Error ? e.message.split("\n").pop() : e})`);
      return { count: 0 };
    });
    if (r.count) console.log(`  ${model} movido: ${r.count}`);
  }
  await prisma.templateBlueprint.updateMany({ where: { workspaceId: src }, data: { workspaceId: keeper } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
