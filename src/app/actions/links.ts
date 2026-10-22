"use server";

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { trackedUrlBase } from "@/lib/env";
import { company } from "@/lib/company";
import { cachedSetting } from "@/lib/settings-cache";
import { clientIp, hitsIn, tooMany } from "@/lib/rate-limit";
import type { FormState } from "./auth";

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 7 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const sha = (v: string) => createHash("sha256").update(v).digest("hex");

export type LinkResult = { error?: string; ok?: string; code?: string; fullUrl?: string; manageUrl?: string } | undefined;

function readForm(form: FormData): { name: string; url: string } | { error: string } {
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  let url = String(form.get("url") ?? "").trim();
  if (!name) return { error: "Dê um nome para o link (ex.: Loja do João)" };
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/^https?:\/\/[^\s/]+\.[^\s]+$/.test(url) || url.length > 2000) return { error: "Cole o link de destino completo (ex.: https://seusite.com.br)" };
  // Não deixa apontar para o próprio redirecionador (vira um laço infinito)
  if (new URL(url).host === trackedUrlBase().split("/")[0]) return { error: "Esse link já é do Fuzil. Cole o site final, para onde o cliente deve ir." };
  return { name, url };
}

function accessOk(given: string) {
  const expected = cachedSetting("LINKS_ACCESS_CODE") ?? process.env.LINKS_ACCESS_CODE ?? "";
  if (!expected) return null;
  const a = Buffer.from(sha(given.trim()));
  const b = Buffer.from(sha(expected));
  return timingSafeEqual(a, b);
}

/** Site público: cria um link (precisa da senha de acesso que o dono do Fuzil passou). */
export async function createPublicLinkAction(_: LinkResult, form: FormData): Promise<LinkResult> {
  const ip = await clientIp();
  if (tooMany(`links:ip:${ip}`, 30, 60 * 60_000)) return { error: "Muitos links criados em pouco tempo. Espere um pouco e tente de novo." };
  // Senha errada muitas vezes: trava por 15 min (ninguém fica chutando)
  if (hitsIn(`links:bad:${ip}`, 15 * 60_000) >= 8) return { error: "Muitas tentativas com a senha errada. Espere 15 minutos." };
  const ok = accessOk(String(form.get("access") ?? ""));
  if (ok === null) return { error: "O gerador de links ainda não foi liberado. Fale com quem te passou este site." };
  if (!ok) {
    tooMany(`links:bad:${ip}`, 8, 15 * 60_000);
    return { error: "Senha de acesso errada. Confira com quem te passou este site." };
  }
  const data = readForm(form);
  if ("error" in data) return data;
  const key = randomBytes(18).toString("base64url");
  for (let i = 0; i < 5; i++) {
    try {
      const link = await prisma.externalLink.create({ data: { ...data, code: newCode(), editKeyHash: sha(key), creatorIp: ip } });
      return {
        ok: "Link criado!",
        code: link.code,
        fullUrl: `https://${trackedUrlBase()}/${link.code}`,
        manageUrl: `${company().siteUrl}/links/${key}`,
      };
    } catch {
      /* código repetido: tenta outro */
    }
  }
  return { error: "Não consegui gerar o código agora. Tente de novo." };
}

/** Site público: quem tem o link secreto troca o nome/destino. */
export async function updatePublicLinkAction(key: string, _: FormState, form: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (tooMany(`links:edit:${ip}`, 60, 60 * 60_000)) return { error: "Muitas alterações em pouco tempo. Espere um pouco." };
  const data = readForm(form);
  if ("error" in data) return data;
  const r = await prisma.externalLink.updateMany({ where: { editKeyHash: sha(key) }, data });
  if (!r.count) return { error: "Link não encontrado" };
  revalidatePath(`/site/links/${key}`);
  return { ok: "Salvo! Quem clicar a partir de agora já vai para o destino novo." };
}

/** Admin: senha de acesso do gerador de links. */
export async function saveLinksAccessAction(_: FormState, form: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const value = String(form.get("access") ?? "").trim();
  if (value && value.length < 6) return { error: "Use uma senha com pelo menos 6 caracteres." };
  const { savePlatformSetting, refreshPlatformSettings } = await import("@/lib/platform-settings");
  await savePlatformSetting("LINKS_ACCESS_CODE", value);
  await refreshPlatformSettings();
  return { ok: value ? "Senha salva! Passe essa senha para os clientes que vão criar links." : "Senha apagada: ninguém consegue criar link novo até você definir outra." };
}

/** Admin: apaga qualquer link (ex.: alguém usando para golpe). */
export async function adminDeleteLinkAction(id: string) {
  await requireSuperAdmin();
  await prisma.externalLink.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/admin");
  return { ok: "Link apagado. Quem clicar nele vai ver \"link não encontrado\"." };
}
