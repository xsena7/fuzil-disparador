// Gerador de links (site público): login pelo WhatsApp, que também aquece as BMs.
// O login é um funil especial (kind LINKS): o código e o aviso de "novo acesso" saem pelo grupo de BM do funil.
import { createHash, randomBytes } from "node:crypto";
import type { CampaignRecipient, Funnel, Lead, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { sendLoginAlert } from "./funnels";
import { makeLinksBlueprint } from "./links-templates";
import { clientIp } from "./rate-limit";

export const LINKS_COOKIE = "fz_links";
export const SESSION_DAYS = 90;
// Abriu o site depois de 30 min parado = novo acesso (manda o aviso no WhatsApp de novo)
const NEW_VISIT_MS = 30 * 60_000;

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

/** Um funil do login do gerador de links que esteja no ar (para saber se o site está funcionando). */
export async function linksFunnel() {
  return (
    (await prisma.funnel.findFirst({ where: { kind: "LINKS", status: "ACTIVE" }, orderBy: { createdAt: "asc" } })) ??
    prisma.funnel.findFirst({ where: { kind: "LINKS" }, orderBy: { createdAt: "asc" } })
  );
}

/**
 * Funil do login para esse WhatsApp. Cada conta de administrador pode ter o seu (cada um aquece o grupo dele):
 * quem já entrou fica sempre no mesmo; quem é novo vai para o funil no ar com menos gente nas últimas 24h.
 */
export async function linksFunnelFor(phone: string) {
  const lead = await prisma.lead.findFirst({ where: { phone, funnel: { kind: "LINKS" } }, include: { funnel: true }, orderBy: { createdAt: "asc" } });
  if (lead) return lead.funnel;
  const active = await prisma.funnel.findMany({ where: { kind: "LINKS", status: "ACTIVE" }, select: { id: true } });
  if (active.length <= 1) return linksFunnel();
  const recent = await prisma.lead.groupBy({ by: ["funnelId"], where: { funnelId: { in: active.map((f) => f.id) }, createdAt: { gt: new Date(Date.now() - 86400_000) } }, _count: true });
  const load = (id: string) => recent.find((r) => r.funnelId === id)?._count ?? 0;
  const pick = [...active].sort((a, b) => load(a.id) - load(b.id))[0];
  return prisma.funnel.findUnique({ where: { id: pick.id } });
}

/** Cria o funil do login com os 3 templates padrão (código, aviso de novo acesso e boas-vindas) no grupo escolhido. */
export async function createLinksFunnel(workspaceId: string, groupId: string, name = "Login do gerador de links") {
  const suffix = randomBytes(2).toString("hex");
  const code = await makeLinksBlueprint(workspaceId, groupId, "code", suffix);
  const login = await makeLinksBlueprint(workspaceId, groupId, "login", suffix);
  const welcome = await makeLinksBlueprint(workspaceId, groupId, "welcome", suffix);
  return prisma.funnel.create({
    data: {
      workspaceId,
      kind: "LINKS",
      name,
      slug: `gerador-links-${suffix}`,
      groupId,
      page: {},
      formFields: [],
      steps: [{ id: randomBytes(5).toString("hex"), type: "send", blueprintId: welcome.id, mapping: { body: [{ type: "field", field: "firstName" }] } }],
      codeBlueprintId: code.id,
      loginBlueprintId: login.id,
      // Código e aviso de acesso saem a qualquer hora
      sendFrom: 0,
      sendTo: 24,
    },
  });
}

const quando = () =>
  new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).replace(", ", " às ");

/** Abre a sessão depois do código certo: grava o cookie e avisa no WhatsApp. */
export async function startLinksSession(funnel: Funnel, lead: Lead, userAgent: string | null) {
  const token = randomBytes(24).toString("base64url");
  const ip = await clientIp();
  await prisma.linkSession.create({ data: { leadId: lead.id, tokenHash: sha(token), ip, userAgent: userAgent?.slice(0, 300), alertedAt: new Date() } });
  (await cookies()).set(LINKS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  await sendLoginAlert(funnel, lead, quando()).catch((e) => console.error("[links] aviso de acesso", e));
}

/**
 * Quem está logado. Só vale no mesmo IP do login (IP novo pede código de novo).
 * Se ele voltou depois de um tempo parado, conta como novo acesso e avisa no WhatsApp.
 */
export async function linksAuth() {
  const token = (await cookies()).get(LINKS_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.linkSession.findUnique({ where: { tokenHash: sha(token) }, include: { lead: { include: { funnel: true } } } });
  if (!session || session.revokedAt || session.lead.status === "STOPPED" || session.lead.funnel.kind !== "LINKS") return null;
  if (Date.now() - session.createdAt.getTime() > SESSION_DAYS * 86400_000) return null;
  if (session.ip !== (await clientIp())) return null;
  const now = new Date();
  const newVisit = now.getTime() - session.lastSeenAt.getTime() > NEW_VISIT_MS && (!session.alertedAt || now.getTime() - session.alertedAt.getTime() > NEW_VISIT_MS);
  await prisma.linkSession.update({ where: { id: session.id }, data: { lastSeenAt: now, ...(newVisit ? { alertedAt: now } : {}) } });
  if (newVisit) {
    const { funnel, ...lead } = session.lead;
    await sendLoginAlert(funnel, lead, quando()).catch((e) => console.error("[links] aviso de acesso", e));
  }
  return { session, lead: session.lead };
}

export async function endLinksSession() {
  const jar = await cookies();
  const token = jar.get(LINKS_COOKIE)?.value;
  if (token) await prisma.linkSession.updateMany({ where: { tokenHash: sha(token) }, data: { revokedAt: new Date() } });
  jar.delete(LINKS_COOKIE);
}

/** Resposta aos botões do aviso de acesso. "Não fui eu" derruba todos os aparelhos. Devolve o texto para responder. */
export async function handleLoginReply(recipient: CampaignRecipient | null, text: string | null): Promise<string | null> {
  if (!recipient || !text) return null;
  const campaign = await prisma.campaign.findUnique({ where: { id: recipient.campaignId }, select: { funnelId: true, funnelStep: true } });
  if (!campaign?.funnelId || campaign.funnelStep !== "login") return null;
  const t = text.trim().toLowerCase();
  const lead = await prisma.lead.findUnique({ where: { funnelId_phone: { funnelId: campaign.funnelId, phone: recipient.phone } } });
  if (!lead) return null;
  if (/n[aã]o fui eu/.test(t)) {
    await prisma.linkSession.updateMany({ where: { leadId: lead.id, revokedAt: null }, data: { revokedAt: new Date() } });
    return "Pronto! Desconectamos todos os aparelhos da sua conta do gerador de links. 🔒\n\nPara entrar de novo, é só usar o seu WhatsApp no site: vamos pedir um código novo.";
  }
  if (/fui eu/.test(t)) return "Acesso confirmado! ✅ Obrigado por avisar.";
  return null;
}
