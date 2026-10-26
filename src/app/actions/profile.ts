"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { meta, type BusinessProfile } from "@/lib/meta";
import { friendlyError, metaDetail } from "@/lib/meta-errors";
import { wabaToken } from "@/lib/sync";
import type { FormState } from "./auth";

// Perfil do WhatsApp dos números (foto, recado, descrição...), direto pelo Fuzil, sem entrar no Facebook.

const PHOTO_TYPES = ["image/jpeg", "image/png"];
const MAX_PHOTO = 5 * 1024 * 1024;
export type ProfileScope = "phone" | "bm" | "all";

/** Foto do perfil no jeito que a Meta aceita melhor: JPG quadrado de 640×640 (se não der para converter, vai a original). */
async function squareJpeg(buf: Buffer, mime: string): Promise<{ buf: Buffer; mime: string }> {
  try {
    const sharp = (await import("sharp")).default;
    return { buf: await sharp(buf).rotate().resize(640, 640, { fit: "cover" }).flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer(), mime: "image/jpeg" };
  } catch (err) {
    console.error("[perfil] não converteu a foto", err);
    return { buf, mime };
  }
}

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

/** Pede para a Meta trocar o nome do número. Quando aprovar, o Fuzil registra o número de novo sozinho. */
export async function renamePhoneAction(phoneId: string, _: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const phone = await prisma.phoneNumber.findFirst({ where: { id: phoneId, waba: { workspaceId: auth.workspace.id } }, include: { waba: true } });
  if (!phone) return { error: "Número não encontrado" };
  const name = String(form.get("displayName") ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  if (name.length < 3) return { error: "Escreva o nome novo (pelo menos 3 letras)." };
  if (name === phone.verifiedName) return { error: "Esse já é o nome do número." };
  try {
    await meta.requestDisplayName(wabaToken(phone.waba), phone.phoneNumberId, name);
  } catch (err) {
    return { error: friendlyError(err) };
  }
  await prisma.phoneNumber.update({ where: { id: phone.id }, data: { pendingName: name, pendingNameAt: new Date() } });
  revalidatePath("/conexoes");
  return { ok: `Pedido enviado! A Meta vai analisar "${name}" (costuma levar de minutos até 48h). Quando aprovar, o Fuzil registra o número de novo sozinho e te avisa nos Alertas.` };
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
  // Campo vazio não vai: a Meta recusa texto vazio (erro 131000) e o vazio fica como estava
  for (const [k, v] of [["about", about], ["description", description], ["address", address], ["email", email]] as const) if (v) profile[k] = v;
  if (website) profile.websites = [website];
  if (vertical) profile.vertical = vertical;
  const hasText = Object.keys(profile).length > 0;
  if (!photo && !hasText) return { error: "Preencha algum campo ou escolha uma foto." };

  // Números que recebem: só os conectados e válidos
  const targets = await prisma.phoneNumber.findMany({
    where: {
      waba: { workspaceId: auth.workspace.id, ...(scope === "bm" ? { businessId: phone.waba.businessId } : {}) },
      ...(scope === "phone" ? { id: phone.id } : { status: "CONNECTED", invalidReason: null }),
    },
    include: { waba: true },
  });
  const pic = photo ? await squareJpeg(Buffer.from(await photo.arrayBuffer()), photo.type) : null;
  // A foto é enviada uma vez por conexão (cada token tem o seu app) e reaproveitada nos números dela
  const handles = new Map<string, Promise<string>>();
  const errors: string[] = [];
  let ok = 0;
  for (let i = 0; i < targets.length; i += 5) {
    await Promise.all(
      targets.slice(i, i + 5).map(async (p) => {
        const token = wabaToken(p.waba);
        // Texto e foto vão separados: se a Meta recusar a foto, o texto ainda é salvo (e vice-versa)
        const failed: string[] = [];
        if (hasText) await meta.updateBusinessProfile(token, p.phoneNumberId, profile).catch((err) => failed.push(`texto: ${metaDetail(err)}`));
        if (pic) {
          try {
            if (!handles.has(token)) handles.set(token, meta.uploadSampleMedia(token, pic.buf, "perfil.jpg", pic.mime));
            await meta.updateBusinessProfile(token, p.phoneNumberId, { profile_picture_handle: await handles.get(token)! });
          } catch (err) {
            handles.delete(token);
            failed.push(`foto: ${metaDetail(err)}`);
          }
        }
        if (failed.length) errors.push(`${p.displayPhoneNumber} (${failed.join("; ")})`);
        else ok++;
      }),
    );
  }
  revalidatePath("/conexoes");
  if (!targets.length) return { error: "Nenhum número conectado para receber o perfil." };
  if (!errors.length) return { ok: ok === 1 ? "Perfil do WhatsApp atualizado! Pode levar alguns minutos para aparecer no celular." : `Perfil atualizado em ${ok} números! Pode levar alguns minutos para aparecer no celular.` };
  return { error: `${targets.length === 1 ? "Não deu para salvar tudo" : `Atualizado em ${ok} de ${targets.length}`}. ${errors.slice(0, 5).join(" | ")}${errors.length > 5 ? ` (+${errors.length - 5})` : ""}` };
}
