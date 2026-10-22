import { prisma } from "./db";
import { createAlert } from "./alerts";

/**
 * Grupo automático "BMs com problema": BM restrita, banida, sem pagamento, sem acesso etc.
 * sai dos grupos de disparo e vai para cá, com o motivo e como resolver.
 * Só acontece depois do primeiro disparo da BM (uma BM recém-conectada fica onde o cliente colocou).
 */
export const PROBLEMS_GROUP = "PROBLEMS";
const GROUP_NAME = "⚠️ BMs com problema";

export async function problemGroup(workspaceId: string) {
  const g = await prisma.bmGroup.findFirst({ where: { workspaceId, system: PROBLEMS_GROUP } });
  if (g) return g;
  return prisma.bmGroup.create({
    data: { workspaceId, system: PROBLEMS_GROUP, name: GROUP_NAME, description: "O Fuzil coloca aqui sozinho as BMs que deram problema. Elas não entram em campanha." },
  });
}

/** Como resolver, a partir do código de erro da Meta ou do tipo de problema. */
export function problemFix(code: number | null | undefined, kind?: string): string {
  if (code === 131042 || kind === "PAYMENT") return "Abra o WhatsApp Manager dessa conta → Configurações de pagamento e adicione ou atualize o cartão.";
  if (code === 131031 || kind === "BANNED") return "A Meta bloqueou a conta/número. No WhatsApp Manager → Visão geral da conta, veja o motivo e peça revisão (recurso).";
  if (code === 368 || kind === "RESTRICTED") return "Restrição temporária por política. Espere o prazo informado no WhatsApp Manager e revise os templates antes de voltar.";
  if (code === 131048 || kind === "QUALITY") return "Qualidade baixa: deixe essa BM descansar alguns dias e revise o texto do template (muita gente bloqueando/denunciando).";
  if (kind === "APP_BLOCKED")
    return "Entre em developers.facebook.com com a conta dona do app dessa BM: a Meta costuma pedir uma verificação (código no e-mail/celular ou confirmação de identidade). Depois de concluir, a BM volta sozinha para os grupos.";
  if (code === 190 || code === 0 || code === 10 || code === 200 || kind === "ACCESS") return "O Fuzil perdeu acesso: gere um novo token (ou reconecte pela Conexões) com acesso a essa WABA.";
  if (code === 131045 || kind === "REGISTER") return "Número não registrado na Cloud API: em Conexões, clique em Registrar número.";
  if (code === 131057) return "A conta está em manutenção na Meta. Tente de novo mais tarde.";
  if (kind === "REVIEW") return "A conta do WhatsApp foi rejeitada na análise da Meta. Veja o motivo no WhatsApp Manager.";
  return "Veja o detalhe em Conexões e no WhatsApp Manager dessa conta.";
}

/** Move a BM para "BMs com problema" (se ainda não estiver lá e já tiver disparado alguma vez). */
export async function flagBusinessProblem(businessId: string, reason: string, fix: string) {
  const bm = await prisma.businessManager.findUnique({ where: { id: businessId }, include: { groups: { include: { group: true } } } });
  if (!bm || !bm.firstSentAt) return;
  if (bm.problemAt) return; // já está no grupo de problema
  if (bm.problemIgnored === reason) return; // o cliente marcou esse problema como resolvido
  const group = await problemGroup(bm.workspaceId);
  const prev = bm.groups.filter((g) => !g.group.system).map((g) => g.groupId);
  await prisma.$transaction([
    prisma.bmGroupMember.deleteMany({ where: { businessId, groupId: { in: prev } } }),
    prisma.bmGroupMember.upsert({
      where: { groupId_businessId: { groupId: group.id, businessId } },
      create: { groupId: group.id, businessId },
      update: {},
    }),
    prisma.businessManager.update({
      where: { id: businessId },
      data: { problemReason: reason, problemFix: fix, problemAt: new Date(), problemPrevGroups: prev },
    }),
  ]);
  await createAlert({
    workspaceId: bm.workspaceId,
    type: "BM_PROBLEM",
    severity: "CRITICAL",
    title: `${bm.name} foi para "BMs com problema"`,
    message: `${reason}. Ela saiu dos grupos de disparo. Como resolver: ${fix}`,
  });
}

/** O problema sumiu sozinho (a Meta voltou ao normal): libera para avisar de novo no futuro. */
export async function clearIgnoredProblem(businessId: string) {
  await prisma.businessManager.updateMany({ where: { id: businessId, problemIgnored: { not: null }, problemAt: null }, data: { problemIgnored: null } });
}

/** "Resolvido": devolve a BM aos grupos em que estava. */
export async function restoreBusiness(businessId: string, workspaceId: string) {
  const bm = await prisma.businessManager.findFirst({ where: { id: businessId, workspaceId } });
  if (!bm) return;
  const group = await problemGroup(workspaceId);
  const prev = await prisma.bmGroup.findMany({ where: { id: { in: bm.problemPrevGroups }, workspaceId, system: null }, select: { id: true } });
  await prisma.$transaction([
    prisma.bmGroupMember.deleteMany({ where: { businessId, groupId: group.id } }),
    prisma.bmGroupMember.createMany({ data: prev.map((g) => ({ groupId: g.id, businessId })), skipDuplicates: true }),
    prisma.businessManager.update({
      where: { id: businessId },
      data: { problemIgnored: bm.problemReason, problemReason: null, problemFix: null, problemAt: null, problemPrevGroups: [] },
    }),
  ]);
}

const BAD_PHONE: Record<string, { label: string; kind: string }> = {
  BANNED: { label: "Número banido", kind: "BANNED" },
  RESTRICTED: { label: "Número restrito", kind: "RESTRICTED" },
  FLAGGED: { label: "Número sinalizado pela Meta", kind: "QUALITY" },
  DISCONNECTED: { label: "Número desconectado", kind: "REGISTER" },
};

/** Depois de sincronizar uma WABA: confere se a BM tem algum problema e move se tiver. */
export async function checkBusinessAfterSync(wabaRecordId: string) {
  const waba = await prisma.whatsAppAccount.findUnique({
    where: { id: wabaRecordId },
    include: { phones: { where: { invalidReason: null } } },
  });
  if (!waba) return;
  let reason: string | null = null;
  let fix = "";
  const health = (Array.isArray(waba.healthIssues) ? waba.healthIssues : []) as Array<{ text?: string; fix?: string }>;
  // Só erro de acesso de verdade (token/permissão); queda de rede ou instabilidade da Meta não conta
  // Só erro de acesso de verdade (token/permissão/app bloqueado); queda de rede ou instabilidade da Meta não conta
  const appBlocked = Boolean(waba.lastSyncError && /api access blocked/i.test(waba.lastSyncError));
  const accessLost =
    appBlocked ||
    (waba.lastSyncError &&
      /invalid.{0,20}token|token.{0,30}(invalid|inv[aá]lido|expired|expirad)|session has expired|error validating access token|oauth|permiss/i.test(waba.lastSyncError) &&
      !/fetch failed|ECONN|ETIMEDOUT|timeout|socket|network|indispon|temporar/i.test(waba.lastSyncError));
  if (appBlocked) {
    reason = `O Fuzil não consegue acessar a WABA ${waba.name}: a Meta bloqueou o app dessa BM (API access blocked)`;
    fix = problemFix(null, "APP_BLOCKED");
  } else if (accessLost) {
    reason = `O Fuzil não consegue acessar a WABA ${waba.name}`;
    fix = problemFix(null, "ACCESS");
  } else if (waba.status === "BLOCKED") {
    reason = `A Meta bloqueou o envio na WABA ${waba.name}${health[0]?.text ? `: ${health[0].text}` : ""}`;
    fix = health[0]?.fix || problemFix(null, /pag|payment/i.test(health[0]?.text ?? "") ? "PAYMENT" : "BANNED");
  } else if (waba.reviewStatus === "REJECTED") {
    reason = `WABA ${waba.name} rejeitada na análise da Meta`;
    fix = problemFix(null, "REVIEW");
  } else {
    const bad = waba.phones.find((p) => p.status && BAD_PHONE[p.status]);
    const red = waba.phones.find((p) => p.qualityRating === "RED");
    if (bad) {
      reason = `${BAD_PHONE[bad.status!].label}: ${bad.displayPhoneNumber}`;
      fix = problemFix(null, BAD_PHONE[bad.status!].kind);
    } else if (red) {
      reason = `Qualidade vermelha no número ${red.displayPhoneNumber}`;
      fix = problemFix(null, "QUALITY");
    }
  }
  // Foi para "BMs com problema" por falta de acesso e o acesso voltou: volta sozinha para os grupos
  if (!accessLost) {
    const bm = await prisma.businessManager.findUnique({ where: { id: waba.businessId }, select: { problemAt: true, problemReason: true, workspaceId: true } });
    if (bm?.problemAt && bm.problemReason?.startsWith("O Fuzil não consegue acessar a WABA")) {
      await restoreBusiness(waba.businessId, bm.workspaceId);
      await prisma.businessManager.update({ where: { id: waba.businessId }, data: { problemIgnored: null } });
    }
  }
  if (reason) await flagBusinessProblem(waba.businessId, reason, fix);
  else if (!waba.lastSyncError) await clearIgnoredProblem(waba.businessId);
}
