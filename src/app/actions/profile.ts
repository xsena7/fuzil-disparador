"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { meta, type BusinessProfile } from "@/lib/meta";
import { friendlyError } from "@/lib/meta-errors";
import { wabaToken } from "@/lib/sync";
import type { FormState } from "./auth";

// Perfil do WhatsApp dos números (foto, recado, descrição...), direto pelo Fuzil, sem entrar no Facebook.

const PHOTO_TYPES = ["image/jpeg", "image/png"];
const MAX_PHOTO = 5 * 1024 * 1024;
export type ProfileScope = "phone" | "bm" | "all";

/** Perfil atual do número, como está na Meta. */
export async function getProfileAction(phoneId: string): Promise<{ profile?: BusinessProfile; error?: string }> {
  const auth = await requireAuth();
  const phone = await prisma.phoneNumber.findFirst({ where: { id: phoneId, waba: { workspaceId: auth.workspace.id } }, include: { waba: true } });
  if (!phone) return { error: "Número não encontrado" };
  try {
    return { profile: await meta.getBusinessProfile(wabaToken(phone.waba), phone.phoneNumberId) };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

/**
 * Salva o perfil num número, em todos os números da BM ou em todos os números da conta.
 * Num número só: o que ficar vazio é apagado. Em vários: só os campos preenchidos são trocados (o resto fica como está).
 */
export async function saveProfileAction(phoneId: string, _: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const phone = await prisma.phoneNumber.findFirst({ where: { id: phoneId, waba: { workspaceId: auth.workspace.id } }, include: { waba: true } });
  if (!phone) return { error: "Número não encontrado" };
  const scope = (["phone", "bm", "all"].includes(String(form.get("scope"))) ? form.get("scope") : "phone") as ProfileScope;
  const many = scope !== "phone";

  const text = (k: string, max: number) => String(form.get(k) ?? "").replace(/\r/g, "").trim().slice(0, max);
  const about = text("about", 139);
  const description = text("description", 512);
  const address = text("address", 256);
  const email = text("email", 128);
  const website = text("website", 256);
  const vertical = text("vertical", 40);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido" };
  if (website && !/^https?:\/\/\S+\.\S+/.test(website)) return { error: "O site precisa começar com https:// (ex.: https://seusite.com.br)" };

  const file = form.get("photo");
  const photo = file instanceof File && file.size > 0 ? file : null;
  if (photo && !PHOTO_TYPES.includes(photo.type)) return { error: "Foto: envie JPG ou PNG" };
  if (photo && photo.size > MAX_PHOTO) return { error: "Foto grande demais (máximo 5 MB)" };

  const profile: Omit<BusinessProfile, "profile_picture_url"> = {};
  for (const [k, v] of [["about", about], ["description", description], ["address", address], ["email", email]] as const) if (v || !many) profile[k] = v;
  if (website) profile.websites = [website];
  if (vertical) profile.vertical = vertical;
  if (!photo && !Object.values(profile).some(Boolean) && many) return { error: "Preencha algum campo ou escolha uma foto para aplicar nos números." };

  // Números que recebem: só os conectados e válidos
  const targets = await prisma.phoneNumber.findMany({
    where: {
      waba: { workspaceId: auth.workspace.id, ...(scope === "bm" ? { businessId: phone.waba.businessId } : {}) },
      ...(scope === "phone" ? { id: phone.id } : { status: "CONNECTED", invalidReason: null }),
    },
    include: { waba: true },
  });
  const buf = photo ? Buffer.from(await photo.arrayBuffer()) : null;
  // A foto é enviada uma vez por conexão (cada token tem o seu app) e reaproveitada nos números dela
  const handles = new Map<string, Promise<string>>();
  const errors: string[] = [];
  let ok = 0;
  for (let i = 0; i < targets.length; i += 5) {
    await Promise.all(
      targets.slice(i, i + 5).map(async (p) => {
        const token = wabaToken(p.waba);
        try {
          let handle: string | undefined;
          if (buf && photo) {
            if (!handles.has(token)) handles.set(token, meta.uploadSampleMedia(token, buf, photo.name || "perfil.jpg", photo.type));
            handle = await handles.get(token)!;
          }
          await meta.updateBusinessProfile(token, p.phoneNumberId, { ...profile, ...(handle ? { profile_picture_handle: handle } : {}) });
          ok++;
        } catch (err) {
          errors.push(`${p.displayPhoneNumber}: ${friendlyError(err)}`);
        }
      }),
    );
  }
  revalidatePath("/conexoes");
  if (!targets.length) return { error: "Nenhum número conectado para receber o perfil." };
  if (!errors.length) return { ok: ok === 1 ? "Perfil do WhatsApp atualizado! Pode levar alguns minutos para aparecer no celular." : `Perfil atualizado em ${ok} números! Pode levar alguns minutos para aparecer no celular.` };
  return { error: `Atualizado em ${ok} de ${targets.length}. Erros: ${errors.slice(0, 5).join(" | ")}${errors.length > 5 ? ` (+${errors.length - 5})` : ""}` };
}
