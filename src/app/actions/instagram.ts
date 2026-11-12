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
    const r = await importZip(Buffer.from(await file.arrayBuffer()), { startDay: String(form.get("startDay") ?? ""), times: String(form.get("times") ?? ""), storyTimes: String(form.get("storyTimes") ?? "") });
    const fmt = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    revalidatePath("/instagram");
    return { ok: `${[r.count ? `${r.count} posts` : "", r.stories ? `${r.stories} stories` : ""].filter(Boolean).join(" e ")} lidos (de ${fmt(r.first)} até ${fmt(r.last)}). Confira abaixo e clique em Confirmar agendamento.${r.warnings.length ? ` Atenção: ${r.warnings.join("; ")}.` : ""}` };
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
  // Rascunho continua rascunho (só muda a hora); o resto volta para a fila
  await prisma.instagramPost.updateMany({ where: { id, status: "DRAFT" }, data: { scheduledAt: at } });
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

export async function confirmInstagramBatchAction(batchId: string) {
  await requireSuperAdmin();
  const { confirmBatch } = await import("@/lib/instagram");
  const r = await confirmBatch(batchId);
  revalidatePath("/instagram");
  return r;
}

export async function discardInstagramBatchAction(batchId: string) {
  await requireSuperAdmin();
  const { discardBatch } = await import("@/lib/instagram");
  await discardBatch(batchId);
  revalidatePath("/instagram");
  return { ok: "Rascunho descartado" };
}

/** Cancela tudo de um dia (feed ou stories) que ainda não saiu. `day` = AAAA-MM-DD no horário de Brasília. */
export async function cancelInstagramDayAction(kind: "FEED" | "STORY", day: string) {
  await requireSuperAdmin();
  const m = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { error: "Dia inválido" };
  const from = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 3));
  const to = new Date(from.getTime() + 86400_000);
  const r = await prisma.instagramPost.updateMany({ where: { kind, status: { in: ["SCHEDULED", "FAILED"] }, scheduledAt: { gte: from, lt: to } }, data: { status: "CANCELLED" } });
  revalidatePath("/instagram");
  return { ok: `${r.count} ${kind === "STORY" ? "stories cancelados" : "posts cancelados"}` };
}

/** Publica de novo os que falharam (feed ou stories): volta para a fila, um a cada 2 minutos a partir de agora. */
export async function retryFailedInstagramAction(kind: "FEED" | "STORY", day?: string) {
  await requireSuperAdmin();
  let range = {};
  const m = day?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const from = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 3));
    range = { scheduledAt: { gte: from, lt: new Date(from.getTime() + 86400_000) } };
  }
  const failed = await prisma.instagramPost.findMany({ where: { kind, status: "FAILED", ...range }, orderBy: { scheduledAt: "asc" }, select: { id: true } });
  if (!failed.length) return { error: "Nenhum com falha" };
  const now = Date.now();
  for (const [i, p] of failed.entries()) {
    await prisma.instagramPost.update({ where: { id: p.id }, data: { status: "SCHEDULED", error: null, scheduledAt: new Date(now + i * 2 * 60_000) } });
  }
  revalidatePath("/instagram");
  return { ok: `${failed.length} ${kind === "STORY" ? "story(s)" : "post(s)"} de volta na fila: sai um a cada 2 minutos, começando agora` };
}

/** Pausa todas as publicações (feed e stories). */
export async function pauseInstagramAction() {
  await requireSuperAdmin();
  const { pauseInstagram } = await import("@/lib/instagram");
  await pauseInstagram();
  revalidatePath("/instagram");
  return { ok: "Publicações pausadas. Nada sai até você retomar." };
}

/** Retoma: a fila anda em dias inteiros, mantendo os horários e o intervalo (não solta tudo de uma vez). */
export async function resumeInstagramAction() {
  await requireSuperAdmin();
  const { resumeInstagram } = await import("@/lib/instagram");
  const r = await resumeInstagram();
  revalidatePath("/instagram");
  return { ok: r.length ? `Retomado. ${r.join(" · ")}` : "Retomado. Não tinha nada na fila." };
}
