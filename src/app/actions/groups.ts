"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { FormState } from "./auth";

export async function saveGroupAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim() || null;
  const businessIds = form.getAll("businessIds").map(String);
  if (!name) return { error: "Dê um nome ao grupo" };
  const owned = await prisma.businessManager.findMany({ where: { id: { in: businessIds }, workspaceId: auth.workspace.id }, select: { id: true } });

  if (id) {
    const group = await prisma.bmGroup.findFirst({ where: { id, workspaceId: auth.workspace.id } });
    if (!group) return { error: "Grupo não encontrado" };
    if (group.system) return { error: "Esse grupo é automático. Use \"Resolvido\" em cada BM para devolver aos grupos." };
    await prisma.$transaction([
      prisma.bmGroup.update({ where: { id }, data: { name, description } }),
      prisma.bmGroupMember.deleteMany({ where: { groupId: id } }),
      // Uma BM só pode estar em um grupo de disparo: sai dos outros ao entrar aqui
      prisma.bmGroupMember.deleteMany({ where: { businessId: { in: owned.map((b) => b.id) }, group: { system: null, workspaceId: auth.workspace.id, id: { not: id } } } }),
      prisma.bmGroupMember.createMany({ data: owned.map((b) => ({ groupId: id, businessId: b.id })) }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.bmGroupMember.deleteMany({ where: { businessId: { in: owned.map((b) => b.id) }, group: { system: null, workspaceId: auth.workspace.id } } }),
      prisma.bmGroup.create({
        data: { workspaceId: auth.workspace.id, name, description, members: { create: owned.map((b) => ({ businessId: b.id })) } },
      }),
    ]);
  }
  revalidatePath("/grupos");
  return { ok: "Grupo salvo" };
}

export async function deleteGroupAction(id: string) {
  const auth = await requireAuth();
  await prisma.bmGroup.deleteMany({ where: { id, workspaceId: auth.workspace.id, system: null } });
  revalidatePath("/grupos");
}

/** BM com problema resolvido: volta para os grupos em que estava. */
export async function restoreBusinessAction(businessId: string) {
  const auth = await requireAuth();
  const { restoreBusiness } = await import("@/lib/bm-problems");
  await restoreBusiness(businessId, auth.workspace.id);
  revalidatePath("/grupos");
  return { ok: true };
}

/** Coloca a BM também no grupo escolhido (ela continua nos grupos em que já estava). */
export async function addBusinessToGroupAction(businessId: string, groupId: string): Promise<{ ok?: true; error?: string }> {
  const auth = await requireAuth();
  const [bm, group] = await Promise.all([
    prisma.businessManager.findFirst({ where: { id: businessId, workspaceId: auth.workspace.id }, select: { id: true } }),
    prisma.bmGroup.findFirst({ where: { id: groupId, workspaceId: auth.workspace.id, system: null }, select: { id: true, name: true } }),
  ]);
  if (!bm || !group) return { error: "BM ou grupo não encontrado" };
  // Move: a BM sai dos outros grupos de disparo e fica só no escolhido
  await prisma.$transaction([
    prisma.bmGroupMember.deleteMany({ where: { businessId: bm.id, groupId: { not: group.id }, group: { system: null, workspaceId: auth.workspace.id } } }),
    prisma.bmGroupMember.upsert({
      where: { groupId_businessId: { groupId: group.id, businessId: bm.id } },
      create: { groupId: group.id, businessId: bm.id },
      update: {},
    }),
  ]);
  revalidatePath("/grupos");
  return { ok: true };
}
