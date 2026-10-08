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
    await prisma.$transaction([
      prisma.bmGroup.update({ where: { id }, data: { name, description } }),
      prisma.bmGroupMember.deleteMany({ where: { groupId: id } }),
      prisma.bmGroupMember.createMany({ data: owned.map((b) => ({ groupId: id, businessId: b.id })) }),
    ]);
  } else {
    await prisma.bmGroup.create({
      data: { workspaceId: auth.workspace.id, name, description, members: { create: owned.map((b) => ({ businessId: b.id })) } },
    });
  }
  revalidatePath("/grupos");
  return { ok: "Grupo salvo" };
}

export async function deleteGroupAction(id: string) {
  const auth = await requireAuth();
  await prisma.bmGroup.deleteMany({ where: { id, workspaceId: auth.workspace.id } });
  revalidatePath("/grupos");
}
