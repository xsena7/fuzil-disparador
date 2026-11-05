"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { FormState } from "@/app/actions/auth";

/** Sobe o .zip dos posts e agenda um por horário. */
export async function importInstagramZipAction(_: FormState, form: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const file = form.get("zip");
  if (!(file instanceof File) || !file.size) return { error: "Escolha o arquivo .zip" };
  if (file.size > 60 * 1024 * 1024) return { error: "O .zip passa de 60 MB" };
  const { importZip } = await import("@/lib/instagram");
  try {
    const r = await importZip(Buffer.from(await file.arrayBuffer()), { startDay: String(form.get("startDay") ?? ""), times: String(form.get("times") ?? "") });
    const fmt = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    revalidatePath("/instagram");
    return { ok: `${r.count} posts agendados: de ${fmt(r.first)} até ${fmt(r.last)}.${r.warnings.length ? ` Atenção: ${r.warnings.join("; ")}.` : ""}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function publishInstagramNowAction(id: string) {
  await requireSuperAdmin();
  const { publishPost } = await import("@/lib/instagram");
  await prisma.instagramPost.updateMany({ where: { id, status: { in: ["SCHEDULED", "FAILED"] } }, data: { scheduledAt: new Date() } });
  const r = await publishPost(id);
  revalidatePath("/instagram");
  return r.status === "published" ? { ok: "Publicado no Instagram!" } : r.status === "failed" ? { error: r.error } : { error: "Esse post já está sendo publicado" };
}

export async function cancelInstagramPostAction(id: string) {
  await requireSuperAdmin();
  await prisma.instagramPost.updateMany({ where: { id, status: { in: ["SCHEDULED", "FAILED"] } }, data: { status: "CANCELLED" } });
  revalidatePath("/instagram");
  return { ok: "Post cancelado" };
}

/** Muda o dia e a hora de um post agendado. */
export async function rescheduleInstagramPostAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const v = String(form.get("at") ?? "");
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return { error: "Data inválida" };
  const at = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 3, +m[5]));
  if (at.getTime() < Date.now()) return { error: "Escolha um horário no futuro" };
  await prisma.instagramPost.updateMany({ where: { id, status: { in: ["SCHEDULED", "FAILED", "CANCELLED"] } }, data: { scheduledAt: at, status: "SCHEDULED", error: null } });
  revalidatePath("/instagram");
  return { ok: "Horário alterado" };
}

/** Cancela todos os posts ainda não publicados. */
export async function cancelAllInstagramAction() {
  await requireSuperAdmin();
  await prisma.instagramPost.updateMany({ where: { status: { in: ["SCHEDULED", "FAILED"] } }, data: { status: "CANCELLED" } });
  revalidatePath("/instagram");
  return { ok: "Agendamentos cancelados" };
}
