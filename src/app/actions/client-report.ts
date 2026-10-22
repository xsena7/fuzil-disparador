"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { FormState } from "./auth";

/** "0,25", "R$ 0,25" ou "0.25" → 0.25. Vazio → null. */
function parsePrice(raw: FormDataEntryValue | null): number | null | "erro" {
  const v = String(raw ?? "").replace(/R\$|\s/g, "").replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1000) return "erro";
  return Math.round(n * 10000) / 10000;
}

/** Configurações: chave Pix, recebedor e valor padrão por mensagem (vale para todos os relatórios da conta). */
export async function savePixSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER") return { error: "Só donos e admins mudam a cobrança" };
  const pixKey = String(form.get("pixKey") ?? "").trim().slice(0, 77) || null;
  const pixName = String(form.get("pixName") ?? "").trim().slice(0, 60) || null;
  const pixCity = String(form.get("pixCity") ?? "").trim().slice(0, 40) || null;
  const price = parsePrice(form.get("reportPrice"));
  if (price === "erro") return { error: "Valor por mensagem inválido. Use, por exemplo, 0,25" };
  if (pixKey && !pixName) return { error: "Coloque o nome de quem recebe o Pix (aparece no app do banco do cliente)" };
  await prisma.workspace.update({ where: { id: auth.workspace.id }, data: { pixKey, pixName, pixCity, reportPrice: price } });
  revalidatePath("/configuracoes");
  return { ok: pixKey ? "Pronto! Os relatórios dos clientes já mostram o valor e o seu Pix para pagar." : "Salvo. Sem chave Pix, o relatório não mostra a cobrança." };
}

async function ownCampaign(id: string) {
  const auth = await requireAuth();
  const c = await prisma.campaign.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!c) throw new Error("Campanha não encontrada");
  return c;
}

/** Valor por mensagem só desta campanha (em branco = o padrão das Configurações). */
export async function saveCampaignPriceAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const c = await ownCampaign(id);
  const price = parsePrice(form.get("reportPrice"));
  if (price === "erro") return { error: "Valor por mensagem inválido. Use, por exemplo, 0,25" };
  await prisma.campaign.update({ where: { id: c.id }, data: { reportPrice: price } });
  revalidatePath(`/campanhas/${c.id}`);
  return { ok: price === null ? "Essa campanha volta a usar o valor padrão das Configurações." : "Valor salvo! O relatório do cliente já mostra o total novo." };
}

const LINK_HOURS = 12;

/** Liga o link público do relatório (o cliente abre sem login). Fica no ar 12h e depois some sozinho. */
export async function shareReportAction(id: string): Promise<{ ok?: string; error?: string }> {
  const c = await ownCampaign(id);
  const alive = c.shareToken && c.shareExpiresAt && c.shareExpiresAt > new Date();
  await prisma.campaign.update({
    where: { id: c.id },
    data: alive
      ? { shareExpiresAt: new Date(Date.now() + LINK_HOURS * 3600_000) }
      : { shareToken: randomBytes(16).toString("base64url"), shareExpiresAt: new Date(Date.now() + LINK_HOURS * 3600_000) },
  });
  revalidatePath(`/campanhas/${c.id}`);
  return { ok: alive ? `Pronto! O link fica no ar por mais ${LINK_HOURS} horas.` : `Link do cliente ligado! Ele fica no ar por ${LINK_HOURS} horas. Copie e mande para ele.` };
}

/** Desliga o link: quem tiver o endereço antigo vê "relatório não encontrado". */
export async function unshareReportAction(id: string): Promise<{ ok?: string; error?: string }> {
  const c = await ownCampaign(id);
  await prisma.campaign.update({ where: { id: c.id }, data: { shareToken: null, shareExpiresAt: null } });
  revalidatePath(`/campanhas/${c.id}`);
  return { ok: "Link desligado. O endereço antigo não abre mais." };
}
