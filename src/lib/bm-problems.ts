import { prisma } from "./db";
import { createAlert } from "./alerts";

/**
 * Grupo automático "BMs com problema": BM restrita, banida, sem pagamento, sem acesso etc.
 * sai dos grupos de disparo e vai para cá, com o motivo e como resolver.
 * Só acontece depois do primeiro disparo da BM (uma BM recém-conectada fica onde o cliente colocou).
 */
export const PROBLEMS_GROUP = "PROBLEMS";

/** Um grupo automático por tipo de problema. O "BMs com problema" fica para o que não se encaixa em nenhum. */
export const PROBLEM_KINDS = {
  BANNED: { system: "PROBLEMS_BANNED", name: "🚫 Banidas", color: "red", description: "Número ou conta banida, bloqueada ou restrita pela Meta." },
  PAYMENT: { system: "PROBLEMS_PAYMENT", name: "💳 Problemas de pagamento", color: "amber", description: "Sem cartão ou com erro no pagamento da conta do WhatsApp." },
  NO_PHONE: { system: "PROBLEMS_NOPHONE", name: "📱 Sem número", color: "amber", description: "Nenhum número registrado e conectado para disparar (sem número, só número de teste ou desconectado)." },
  TEMPLATE: { system: "PROBLEMS_TEMPLATE", name: "📝 Template em análise", color: "sky", description: "Nenhum template de utilidade aprovado (em análise ou faltando)." },
  QUALITY: { system: "PROBLEMS_QUALITY", name: "📉 Número com qualidade baixa", color: "pink", description: "Qualidade vermelha ou número sinalizado pela Meta." },
  UNKNOWN: { system: PROBLEMS_GROUP, name: "⚠️ BMs com problema", color: "black", description: "Problemas que o Fuzil não conseguiu identificar (ou colocadas aqui por você)." },
} as const;
export type ProblemKind = keyof typeof PROBLEM_KINDS;
// Mudam a BM de grupo mesmo se ela nunca disparou (impedem o disparo de qualquer jeito)
const SETUP_KINDS: ProblemKind[] = ["NO_PHONE", "PAYMENT", "TEMPLATE", "BANNED"];

export const isProblemSystem = (system?: string | null) => Boolean(system && system.startsWith(PROBLEMS_GROUP));
const kindOfStored = (k?: string | null): ProblemKind => (k && k in PROBLEM_KINDS ? (k as ProblemKind) : "UNKNOWN");

export async function problemGroup(workspaceId: string, kind: ProblemKind = "UNKNOWN") {
  const def = PROBLEM_KINDS[kind];
  const g = await prisma.bmGroup.findFirst({ where: { workspaceId, system: def.system } });
  if (g) return g;
  return prisma.bmGroup.create({ data: { workspaceId, system: def.system, name: def.name, color: def.color, description: def.description } });
}

/** Tipo do problema pelo código de erro da Meta (envio ou webhook). */
export function kindForCode(code: number | null | undefined): ProblemKind {
  if (code === 131042) return "PAYMENT";
  if (code === 131045) return "NO_PHONE";
  if (code === 131031 || code === 368) return "BANNED";
  if (code === 131048 || code === 131049) return "QUALITY";
  if (code !== null && code !== undefined && code >= 132000 && code < 133000) return "TEMPLATE";
  return "UNKNOWN";
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

/**
 * Move a BM para o grupo do tipo de problema (se já tiver disparado alguma vez, ou se o problema impede o primeiro disparo).
 * Se ela já está num grupo de problema e o tipo mudou, troca de grupo sozinha.
 */
export async function flagBusinessProblem(businessId: string, reason: string, fix: string, kind: ProblemKind = "UNKNOWN", fromSend = true) {
  const bm = await prisma.businessManager.findUnique({ where: { id: businessId }, include: { groups: { include: { group: true } } } });
  if (!bm) return;
  // BM que nunca disparou só muda de grupo se o problema impede o primeiro disparo (sem número, sem cartão, sem template)
  if (!bm.firstSentAt && !SETUP_KINDS.includes(kind)) return;
  if (bm.problemIgnored === reason) return; // o cliente marcou esse problema como resolvido
  if (bm.problemKind === "MANUAL") return; // colocada à mão: só sai quando o cliente clicar em Resolvido
  const group = await problemGroup(bm.workspaceId, kind);
  if (bm.problemAt) {
    // Já está num grupo de problema: só troca se o tipo mudou
    if (kindOfStored(bm.problemKind) === kind) {
      if (bm.problemReason !== reason) await prisma.businessManager.update({ where: { id: businessId }, data: { problemReason: reason, problemFix: fix } });
      return;
    }
    await prisma.$transaction([
      prisma.bmGroupMember.deleteMany({ where: { businessId, group: { system: { startsWith: PROBLEMS_GROUP } } } }),
      prisma.bmGroupMember.create({ data: { groupId: group.id, businessId } }),
      prisma.businessManager.update({ where: { id: businessId }, data: { problemReason: reason, problemFix: fix, problemKind: kind, problemFromSend: fromSend, problemAt: new Date() } }),
    ]);
    await createAlert({ workspaceId: bm.workspaceId, type: "BM_PROBLEM", severity: "WARNING", title: `${bm.name} foi para "${group.name}"`, message: `${reason}. Como resolver: ${fix}` });
    return;
  }
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
      data: { problemReason: reason, problemFix: fix, problemAt: new Date(), problemPrevGroups: prev, problemKind: kind, problemFromSend: fromSend },
    }),
  ]);
  await createAlert({
    workspaceId: bm.workspaceId,
    type: "BM_PROBLEM",
    severity: "CRITICAL",
    title: `${bm.name} foi para "${group.name}"`,
    message: `${reason}. Ela saiu dos grupos de disparo. Como resolver: ${fix}`,
  });
}

/** O problema sumiu sozinho (a Meta voltou ao normal): libera para avisar de novo no futuro. */
export async function clearIgnoredProblem(businessId: string) {
  await prisma.businessManager.updateMany({ where: { id: businessId, problemIgnored: { not: null }, problemAt: null }, data: { problemIgnored: null } });
}

/** "Resolvido" (ou o problema sumiu): devolve a BM aos grupos em que estava. `remember` = não avisar de novo do mesmo problema. */
export async function restoreBusiness(businessId: string, workspaceId: string, remember = true) {
  const bm = await prisma.businessManager.findFirst({ where: { id: businessId, workspaceId } });
  if (!bm) return;
  const prev = await prisma.bmGroup.findMany({ where: { id: { in: bm.problemPrevGroups }, workspaceId, system: null }, select: { id: true } });
  await prisma.$transaction([
    prisma.bmGroupMember.deleteMany({ where: { businessId, group: { system: { startsWith: PROBLEMS_GROUP } } } }),
    prisma.bmGroupMember.createMany({ data: prev.map((g) => ({ groupId: g.id, businessId })), skipDuplicates: true }),
    prisma.businessManager.update({
      where: { id: businessId },
      data: { problemIgnored: remember ? bm.problemReason : null, problemReason: null, problemFix: null, problemAt: null, problemPrevGroups: [], problemKind: null, problemFromSend: false },
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
  let kind: ProblemKind = "UNKNOWN";
  // Template de utilidade aprovado na BM (o template é o primeiro critério: sem ele a BM nem dispara)
  const [approvedTemplates, pendingTemplates] = await Promise.all([
    prisma.template.count({ where: { waba: { businessId: waba.businessId }, status: "APPROVED", category: "UTILITY" } }),
    prisma.template.count({ where: { waba: { businessId: waba.businessId }, status: "PENDING" } }),
  ]);
  // Template em análise é prioridade mesmo se a BM já tem outro aprovado; sem nenhum aprovado também
  const templateProblem = approvedTemplates === 0 || pendingTemplates > 0;
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
    const payment = /pag|payment/i.test(health[0]?.text ?? "");
    reason = `A Meta bloqueou o envio na WABA ${waba.name}${health[0]?.text ? `: ${health[0].text}` : ""}`;
    fix = health[0]?.fix || problemFix(null, payment ? "PAYMENT" : "BANNED");
    kind = payment ? "PAYMENT" : "BANNED";
  } else if (templateProblem) {
    // Prioridade 1: template em análise (ou faltando). Depois de aprovado, a BM segue para pagamento/número ou volta às prontas
    reason = pendingTemplates ? `${pendingTemplates} template(s) em análise na Meta` : "Nenhum template de utilidade aprovado";
    fix = pendingTemplates ? "Espere a Meta aprovar (costuma levar de minutos a 24h). A BM volta sozinha para o grupo quando aprovar." : "Crie um template de utilidade (ou ative um Template padrão para essa BM).";
    kind = "TEMPLATE";
  } else if (waba.hasPaymentMethod === false) {
    // Prioridade 2: sem cartão
    reason = `Sem forma de pagamento (cartão) na WABA ${waba.name}`;
    fix = problemFix(null, "PAYMENT");
    kind = "PAYMENT";
  } else if (waba.reviewStatus === "REJECTED") {
    reason = `WABA ${waba.name} rejeitada na análise da Meta`;
    fix = problemFix(null, "REVIEW");
  } else if (!waba.phones.some((p) => p.status === "CONNECTED" || (p.status && BAD_PHONE[p.status] && BAD_PHONE[p.status].kind !== "REGISTER"))) {
    // Sem número de verdade conectado. Só conta se nenhuma outra conta da BM tem número pronto (BM com uma WABA vazia a mais não é problema)
    const otherReady = await prisma.phoneNumber.count({
      where: { waba: { businessId: waba.businessId }, wabaId: { not: waba.id }, invalidReason: null, enabled: true, status: "CONNECTED" },
    });
    if (!otherReady) {
      reason = waba.phones.length ? `Nenhum número conectado na WABA ${waba.name} (precisa registrar)` : `Nenhum número na WABA ${waba.name}`;
      fix = waba.phones.length ? problemFix(null, "REGISTER") : "Adicione um número real nessa conta do WhatsApp (no WhatsApp Manager) e registre ele em Conexões.";
      kind = "NO_PHONE";
    }
  } else {
    const bad = waba.phones.find((p) => p.status && BAD_PHONE[p.status]);
    const red = waba.phones.find((p) => p.qualityRating === "RED");
    if (bad) {
      reason = `${BAD_PHONE[bad.status!].label}: ${bad.displayPhoneNumber}`;
      fix = problemFix(null, BAD_PHONE[bad.status!].kind);
      const k = BAD_PHONE[bad.status!].kind;
      kind = k === "QUALITY" ? "QUALITY" : k === "REGISTER" ? "NO_PHONE" : "BANNED";
    } else if (red) {
      reason = `Qualidade vermelha no número ${red.displayPhoneNumber}`;
      fix = problemFix(null, "QUALITY");
      kind = "QUALITY";
    }
  }
  // O problema sumiu: volta sozinha para os grupos em que estava.
  // Se veio de um envio (ex.: pagamento recusado), espera algumas horas sem o problema antes de voltar.
  if (!reason && !waba.lastSyncError) {
    const bm = await prisma.businessManager.findUnique({ where: { id: waba.businessId }, select: { problemAt: true, problemKind: true, problemFromSend: true, workspaceId: true } });
    const settled = bm?.problemAt && (!bm.problemFromSend || Date.now() - bm.problemAt.getTime() > 6 * 3600_000);
    // Só volta se nenhuma outra conta do WhatsApp dessa BM ainda tem problema
    const others = settled
      ? await prisma.whatsAppAccount.count({
          where: {
            businessId: waba.businessId,
            id: { not: waba.id },
            OR: [
              { lastSyncError: { not: null } },
              { status: "BLOCKED" },
              { hasPaymentMethod: false },
              { phones: { some: { invalidReason: null, OR: [{ qualityRating: "RED" }, { status: { in: Object.keys(BAD_PHONE) } }] } } },
            ],
          },
        })
      : 1;
    if (bm?.problemAt && bm.problemKind !== "MANUAL" && settled && others === 0) await restoreBusiness(waba.businessId, bm.workspaceId, false);
  }
  if (reason) await flagBusinessProblem(waba.businessId, reason, fix, accessLost ? "UNKNOWN" : kind, false);
  else if (!waba.lastSyncError) await clearIgnoredProblem(waba.businessId);
}
