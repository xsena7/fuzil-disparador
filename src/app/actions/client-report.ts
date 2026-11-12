"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { FormState } from "./auth";
import type { ReportKey } from "@/lib/report-numbers";

/** "0,25", "R$ 0,25" ou "0.25" → 0.25. Vazio → null. */
function parsePrice(raw: FormDataEntryValue | null): number | null | "erro" {
  const v = String(raw ?? "").replace(/R\$|\s/g, "").replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1000) return "erro";
  return Math.round(n * 10000) / 10000;
}

/** Configurações: chaves Pix e valor padrão por mensagem (vale para todos os relatórios da conta). */
export async function savePixSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER") return { error: "Só donos e admins mudam a cobrança" };
  const price = parsePrice(form.get("reportPrice"));
  if (price === "erro") return { error: "Valor por mensagem inválido. Use, por exemplo, 0,25" };
  let raw: unknown = [];
  try {
    raw = JSON.parse(String(form.get("pixKeys") ?? "[]"));
  } catch {
    return { error: "Não consegui ler as chaves. Recarregue a página." };
  }
  const keys = (Array.isArray(raw) ? raw : [])
    .map((k) => ({
      id: String(k?.id ?? "").slice(0, 20) || randomBytes(4).toString("hex"),
      key: String(k?.key ?? "").trim().slice(0, 77),
      name: String(k?.name ?? "").trim().slice(0, 60),
      bank: String(k?.bank ?? "").trim().slice(0, 40),
    }))
    .filter((k) => k.key)
    .slice(0, 10);
  const noName = keys.find((k) => !k.name);
  if (noName) return { error: `Coloque o nome de quem recebe na chave ${noName.key}` };
  await prisma.workspace.update({ where: { id: auth.workspace.id }, data: { pixKeys: keys, reportPrice: price } });
  revalidatePath("/configuracoes");
  return {
    ok: keys.length
      ? `Pronto! ${keys.length > 1 ? `${keys.length} chaves salvas.` : "Chave salva."} Os relatórios dos clientes já mostram o valor e a chave Pix para pagar.`
      : "Salvo. Sem chave Pix, o relatório não mostra a cobrança.",
  };
}

async function ownCampaign(id: string) {
  const auth = await requireAuth();
  const c = await prisma.campaign.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!c) throw new Error("Campanha não encontrada");
  return c;
}

/** Valor por mensagem e chave Pix só desta campanha (em branco = o padrão das Configurações). */
export async function saveCampaignPriceAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const c = await ownCampaign(id);
  const price = parsePrice(form.get("reportPrice"));
  if (price === "erro") return { error: "Valor por mensagem inválido. Use, por exemplo, 0,25" };
  const pixKeyId = String(form.get("reportPixKeyId") ?? "").slice(0, 20) || null;
  await prisma.campaign.update({ where: { id: c.id }, data: { reportPrice: price, reportPixKeyId: pixKeyId } });
  revalidatePath(`/campanhas/${c.id}`);
  return { ok: price ? "Salvo! O relatório do cliente já mostra o valor e a chave Pix escolhida." : "Salvo sem valor: o relatório não mostra valor nem Pix." };
}

/** Tira o valor (e o Pix) do relatório desta campanha. */
export async function clearCampaignPriceAction(id: string) {
  const c = await ownCampaign(id);
  await prisma.campaign.update({ where: { id: c.id }, data: { reportPrice: null } });
  revalidatePath(`/campanhas/${c.id}`);
  return { ok: "Pronto: o relatório desta campanha não mostra mais valor nem Pix." };
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

/** Relatório do cliente: números ajustados à mão para o relatório do cliente (o resto do relatório é recalculado com eles). */
export async function saveReportNumbersAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const c = await ownCampaign(id);
  // Ajustar números do relatório é só para administradores do Fuzil
  if (!(await requireAuth()).user.isSuperAdmin) return { error: "Só administradores do Fuzil podem ajustar os números do relatório." };
  const { REPORT_FIELDS, realReportNumbers, checkLogic } = await import("@/lib/report-numbers");
  const real = await realReportNumbers(c.id);
  const v: Record<string, number> = {};
  for (const { key, label } of REPORT_FIELDS) {
    const raw = String(form.get(key) ?? "").replace(/\D/g, "");
    // Cliques não se ajustam: sempre os reais
    const n = key === "clicked" || raw === "" ? real[key] : Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 10_000_000) return { error: `Número inválido em ${label}` };
    v[key] = n;
  }
  const wrong = checkLogic(v as Record<ReportKey, number>);
  if (wrong) return { error: wrong };
  // Igual aos reais: não guarda nada (o relatório volta a seguir os números de verdade)
  const same = REPORT_FIELDS.every(({ key }) => v[key] === real[key]);
  // Guarda também os reais de agora: daqui para frente o relatório sobe junto com os reais, na mesma proporção
  const base = Object.fromEntries(REPORT_FIELDS.map(({ key }) => [key, real[key]]));
  await prisma.campaign.update({ where: { id: c.id }, data: { reportOverrides: same ? Prisma.DbNull : { ...v, base } } });
  revalidatePath(`/campanhas/${c.id}`);
  return { ok: same ? "Os números são iguais aos reais: o relatório segue os números da campanha." : "Números do relatório salvos! Daqui para frente eles sobem junto com os reais, na mesma proporção (valor e funil do relatório do cliente)." };
}

export async function resetReportNumbersAction(id: string): Promise<{ ok?: string; error?: string }> {
  const c = await ownCampaign(id);
  // Ajustar números do relatório é só para administradores do Fuzil
  if (!(await requireAuth()).user.isSuperAdmin) return { error: "Só administradores do Fuzil podem ajustar os números do relatório." };
  await prisma.campaign.update({ where: { id: c.id }, data: { reportOverrides: Prisma.DbNull } });
  revalidatePath(`/campanhas/${c.id}`);
  return { ok: "Pronto! O relatório voltou a mostrar os números reais da campanha." };
}

// ---------------- Marca do relatório (revendedor) ----------------

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Escolhe a marca que aparece no relatório desta campanha (vazio = Fuzil). */
export async function setCampaignBrandAction(campaignId: string, _: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const brandId = String(form.get("reportBrandId") ?? "") || null;
  if (brandId && !(await prisma.reportBrand.findFirst({ where: { id: brandId, workspaceId: auth.workspace.id }, select: { id: true } }))) return { error: "Marca não encontrada" };
  const r = await prisma.campaign.updateMany({ where: { id: campaignId, workspaceId: auth.workspace.id }, data: { reportBrandId: brandId } });
  if (!r.count) return { error: "Campanha não encontrada" };
  revalidatePath(`/campanhas/${campaignId}`);
  return { ok: brandId ? "Marca escolhida. O relatório já sai com ela." : "O relatório volta a sair com a marca do Fuzil." };
}

/** Cria ou edita uma marca (nome, logo e cores). Com campaignId, já usa a marca nova nesta campanha. */
export async function saveReportBrandAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await requireAuth();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const color = String(form.get("color") ?? "");
  const headerColor = String(form.get("headerColor") ?? "");
  if (!name) return { error: "Coloque o nome da marca" };
  if (!HEX.test(color) || !HEX.test(headerColor)) return { error: "Escolha as duas cores" };
  let logoUrl: string | undefined;
  const logo = form.get("logo");
  if (logo instanceof File && logo.size) {
    if (!["image/png", "image/jpeg"].includes(logo.type)) return { error: "A logo precisa ser PNG ou JPG" };
    const { saveUpload } = await import("@/lib/uploads");
    try {
      logoUrl = (await saveUpload(logo)).url.replace(/^https?:\/\/[^/]+/, "");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Não consegui salvar a logo" };
    }
  }
  if (id) {
    const r = await prisma.reportBrand.updateMany({ where: { id, workspaceId: auth.workspace.id }, data: { name, color, headerColor, ...(logoUrl ? { logoUrl } : {}) } });
    if (!r.count) return { error: "Marca não encontrada" };
  } else {
    const brand = await prisma.reportBrand.create({ data: { workspaceId: auth.workspace.id, name, color, headerColor, logoUrl: logoUrl ?? null } });
    const campaignId = String(form.get("campaignId") ?? "");
    if (campaignId) await prisma.campaign.updateMany({ where: { id: campaignId, workspaceId: auth.workspace.id }, data: { reportBrandId: brand.id } });
  }
  revalidatePath("/campanhas");
  return { ok: id ? "Marca atualizada" : "Marca criada e escolhida nesta campanha" };
}

export async function deleteReportBrandAction(id: string) {
  const auth = await requireAuth();
  await prisma.reportBrand.deleteMany({ where: { id, workspaceId: auth.workspace.id } });
  revalidatePath("/campanhas");
  return { ok: "Marca apagada" };
}
