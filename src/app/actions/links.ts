"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { FormState } from "./auth";

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 7 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

function readForm(form: FormData): { name: string; url: string } | { error: string } {
  const name = String(form.get("name") ?? "").trim();
  let url = String(form.get("url") ?? "").trim();
  if (!name) return { error: "Dê um nome para o link (ex.: Cliente João - Loja)" };
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/^https?:\/\/\S+\.\S+/.test(url)) return { error: "Cole o link de destino completo (ex.: https://seusite.com.br)" };
  return { name, url };
}

export async function createLinkAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const data = readForm(form);
  if ("error" in data) return data;
  for (let i = 0; i < 5; i++) {
    try {
      const link = await prisma.externalLink.create({ data: { workspaceId: auth.workspace.id, code: newCode(), ...data } });
      revalidatePath("/links");
      return { ok: `Link criado! O código dele é ${link.code}. Coloque esse código na variável do botão na outra plataforma.` };
    } catch {
      /* código repetido: tenta outro */
    }
  }
  return { error: "Não consegui gerar o código agora. Tente de novo." };
}

export async function updateLinkAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const data = readForm(form);
  if ("error" in data) return data;
  const r = await prisma.externalLink.updateMany({ where: { id, workspaceId: auth.workspace.id }, data });
  if (!r.count) return { error: "Link não encontrado" };
  revalidatePath("/links");
  return { ok: "Link atualizado! Quem clicar a partir de agora já vai para o destino novo, sem precisar mudar nada na outra plataforma." };
}

export async function deleteLinkAction(id: string) {
  const auth = await requireAuth();
  await prisma.externalLink.deleteMany({ where: { id, workspaceId: auth.workspace.id } });
  revalidatePath("/links");
  return { ok: "Link excluído. Quem clicar nele vai ver \"link não encontrado\"." };
}
