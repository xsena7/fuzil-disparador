"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Guarda que o usuário já respondeu o convite do tour (fez ou não quis), para não perguntar de novo. */
export async function setTourStateAction(state: "DONE" | "SKIPPED") {
  const auth = await requireAuth();
  await prisma.user.update({ where: { id: auth.user.id }, data: { tourState: state } });
}
