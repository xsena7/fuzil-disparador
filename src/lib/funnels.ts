import { createHash, randomBytes, randomInt } from "node:crypto";
import type { Funnel, Lead, Prisma, TemplateBlueprint } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./env";
import { extractVars, getComponent, type TComponent, type VariableMapping } from "./template-utils";

/**
 * Aquecimento: a pessoa se inscreve na landing page, recebe um código no WhatsApp (disparado pelo
 * rodízio de um grupo de BM), confirma no site e entra num funil de mensagens com timers.
 * Cada passo de envio é uma campanha interna (funnelId + funnelStep): usa o mesmo motor das campanhas
 * (rodízio, créditos, limite de 24h, estorno, retry, chat), então todo envio conta para o limite das BMs.
 */

export * from "./funnel-types";
import type { FormField, FunnelPage, FunnelStep } from "./funnel-types";

export const UNIT_MS = { minutes: 60_000, hours: 3600_000, days: 86400_000 } as const;
export const CODE_TTL_MIN = 10;
export const CODE_COOLDOWN_S = 60;
export const MAX_CODE_SENDS = 4;
export const MAX_CODE_ATTEMPTS = 5;

export const DEFAULT_PAGE: FunnelPage = {
  company: "Nexa Tech",
  jobTitle: "Vagas de tecnologia home office",
  headline: "Vagas home office em tecnologia",
  subtitle: "Trabalhe de casa, de qualquer lugar do Brasil. Escolha sua vaga e faça a inscrição em 1 minuto.",
  about:
    "Somos uma empresa de tecnologia 100% remota. Estamos contratando para vários times e oferecemos treinamento para quem está começando.",
  benefits: ["100% home office", "Treinamento pago", "Equipamento fornecido", "Horário flexível"],
  requirements: ["Ter 18 anos ou mais", "Computador ou notebook com internet", "Vontade de aprender"],
  cta: "Quero me candidatar",
  color: "#2b4bff",
  salary: "",
  location: "Home office · Todo o Brasil",
  jobs: [
    {
      id: "suporte",
      title: "Suporte Técnico N1",
      area: "Suporte",
      level: "Sem experiência",
      salary: "R$ 1.900 a R$ 2.400",
      description: "Atender clientes por chat e WhatsApp, ajudar a resolver problemas de acesso e configuração e registrar os chamados.",
      requirements: ["Boa escrita", "Paciência para atender", "Noções básicas de informática"],
      open: true,
    },
    {
      id: "frontend",
      title: "Desenvolvedor(a) Front-end Júnior",
      area: "Desenvolvimento",
      level: "Júnior",
      salary: "R$ 3.000 a R$ 4.500",
      description: "Criar e manter telas de sistemas web junto com o time de produto.",
      requirements: ["HTML, CSS e JavaScript", "React é um diferencial", "Git básico"],
      open: true,
    },
    {
      id: "qa",
      title: "Analista de Testes (QA) Júnior",
      area: "Qualidade",
      level: "Júnior",
      salary: "R$ 2.500 a R$ 3.500",
      description: "Testar novas funções antes de irem para o ar, encontrar e documentar erros.",
      requirements: ["Atenção aos detalhes", "Boa escrita", "Conhecer testes é um diferencial"],
      open: true,
    },
    {
      id: "dados",
      title: "Assistente de Dados",
      area: "Dados",
      level: "Sem experiência",
      salary: "R$ 2.200 a R$ 2.800",
      description: "Organizar planilhas, montar relatórios e ajudar o time a acompanhar os números.",
      requirements: ["Excel ou Google Planilhas", "Raciocínio lógico"],
      open: true,
    },
  ],
};

export const DEFAULT_FIELDS: FormField[] = [
  { key: "cidade", label: "Cidade e estado", type: "text", required: true },
  { key: "idade", label: "Qual sua idade?", type: "select", options: ["18 a 24", "25 a 34", "35 a 44", "45 ou mais"], required: true },
  { key: "escolaridade", label: "Escolaridade", type: "select", options: ["Médio em andamento", "Médio completo", "Superior em andamento", "Superior completo"], required: true },
  { key: "computador", label: "Você tem computador ou notebook?", type: "select", options: ["Sim", "Não", "Só celular"], required: true },
  { key: "internet", label: "Como é sua internet em casa?", type: "select", options: ["Fibra (boa)", "4G ou rádio", "Instável"], required: true },
  { key: "experiencia", label: "Já trabalhou com tecnologia ou atendimento?", type: "select", options: ["Nunca, quero aprender", "Já atendi clientes", "Já trabalhei com TI"], required: true },
  { key: "horario", label: "Qual horário você tem disponível?", type: "select", options: ["Manhã", "Tarde", "Noite", "Integral"], required: true },
  { key: "inicio", label: "Quando pode começar?", type: "select", options: ["Imediatamente", "Em até 15 dias", "Em até 30 dias"], required: true },
  { key: "motivo", label: "Por que você quer trabalhar com tecnologia?", type: "textarea", required: false },
];

// --- Templates padrão que todo funil novo ganha ---------------------------

const ex = (vars: string[]) => ({ body_text: [vars] });

function defaultBlueprints(prefix: string) {
  return {
    code: {
      name: `${prefix}_codigo`,
      category: "AUTHENTICATION",
      components: [
        { type: "BODY", add_security_recommendation: true },
        { type: "FOOTER", code_expiration_minutes: CODE_TTL_MIN },
        { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Copiar código" }] },
      ],
    },
    welcome: {
      name: `${prefix}_inscricao`,
      category: "UTILITY",
      components: [
        {
          type: "BODY",
          text: "Olá, {{1}}! Sua inscrição para a vaga de {{2}} foi confirmada. ✅\n\nSalve este número: é por aqui que vamos enviar as próximas etapas do processo seletivo.",
          example: ex(["Maria", "Atendente de WhatsApp"]),
        },
        { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Recebi" }] },
      ],
      mapping: { body: [{ type: "field", field: "firstName" }, { type: "field", field: "col:vaga" }] } as VariableMapping,
    },
    form: {
      name: `${prefix}_cadastro`,
      category: "UTILITY",
      components: [
        {
          type: "BODY",
          text: "Olá, {{1}}! Seu processo seletivo para a vaga de {{2}} avançou para a próxima etapa.\n\nPara continuar, complete seu cadastro neste link: {{3}}\n\nLeva menos de 2 minutos.",
          example: ex(["Maria", "Atendente de WhatsApp", "https://exemplo.com.br/c/abc123"]),
        },
      ],
      mapping: { body: [{ type: "field", field: "firstName" }, { type: "field", field: "col:vaga" }, { type: "field", field: "col:link" }] } as VariableMapping,
    },
    reminder: {
      name: `${prefix}_lembrete`,
      category: "UTILITY",
      components: [
        {
          type: "BODY",
          text: "Olá, {{1}}! Seu cadastro para a vaga de {{2}} ainda está pendente.\n\nPara continuar no processo seletivo, finalize por aqui: {{3}}\n\nSe você já finalizou, pode desconsiderar esta mensagem.",
          example: ex(["Maria", "Atendente de WhatsApp", "https://exemplo.com.br/c/abc123"]),
        },
      ],
      mapping: { body: [{ type: "field", field: "firstName" }, { type: "field", field: "col:vaga" }, { type: "field", field: "col:link" }] } as VariableMapping,
    },
    done: {
      name: `${prefix}_recebido`,
      category: "UTILITY",
      components: [
        {
          type: "BODY",
          text: "Pronto, {{1}}! Recebemos seu cadastro para a vaga de {{2}}. 🙌\n\nNosso time vai analisar suas respostas e o próximo contato será por este número.",
          example: ex(["Maria", "Atendente de WhatsApp"]),
        },
      ],
      mapping: { body: [{ type: "field", field: "firstName" }, { type: "field", field: "col:vaga" }] } as VariableMapping,
    },
  };
}

export const DONE_MAPPING = defaultBlueprints("x").done.mapping;

const newId = () => randomBytes(5).toString("hex");

export function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Prefixo dos nomes de template na Meta (letras, números e _). */
async function templatePrefix(workspaceId: string, slug: string) {
  const base = `vg_${slug.replace(/-/g, "_").slice(0, 18)}`.replace(/_+$/, "");
  for (let i = 1; i < 50; i++) {
    const prefix = i === 1 ? base : `${base}${i}`;
    const taken = await prisma.templateBlueprint.findFirst({ where: { workspaceId, name: { startsWith: `${prefix}_` } }, select: { id: true } });
    if (!taken) return prefix;
  }
  return `${base}_${newId()}`;
}

/** Cria o funil com landing, perguntas, templates padrão e passos prontos para usar. */
export async function createFunnel(workspaceId: string, input: { name: string; slug: string; groupId: string; jobTitle?: string; company?: string }) {
  const prefix = await templatePrefix(workspaceId, input.slug);
  const tpls = defaultBlueprints(prefix);
  const mk = (t: { name: string; category: string; components: unknown[] }) =>
    prisma.templateBlueprint.create({
      data: { workspaceId, groupId: input.groupId, name: t.name, language: "pt_BR", category: t.category, components: t.components as Prisma.InputJsonValue },
    });
  const [code, welcome, form, reminder, done] = [await mk(tpls.code), await mk(tpls.welcome), await mk(tpls.form), await mk(tpls.reminder), await mk(tpls.done)];
  const steps: FunnelStep[] = [
    { id: newId(), type: "send", blueprintId: welcome.id, mapping: tpls.welcome.mapping },
    { id: newId(), type: "wait", amount: 1, unit: "days" },
    { id: newId(), type: "send", blueprintId: form.id, mapping: tpls.form.mapping },
    { id: newId(), type: "wait", amount: 2, unit: "days" },
    { id: newId(), type: "send", blueprintId: reminder.id, mapping: tpls.reminder.mapping, onlyIfPending: true },
  ];
  const page = { ...DEFAULT_PAGE, ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}), ...(input.company ? { company: input.company } : {}) };
  return prisma.funnel.create({
    data: {
      workspaceId,
      name: input.name,
      slug: input.slug,
      groupId: input.groupId,
      page,
      formFields: DEFAULT_FIELDS,
      steps,
      codeBlueprintId: code.id,
      doneBlueprintId: done.id,
    },
  });
}

/** Funis de vagas que servem de modelo: os das contas dos administradores do Fuzil (e os da própria conta). */
export async function funnelModels(workspaceId: string) {
  return prisma.funnel.findMany({
    where: { kind: "JOBS", OR: [{ workspaceId }, { workspace: { memberships: { some: { user: { isSuperAdmin: true } } } } }] },
    select: { id: true, name: true, workspaceId: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Cria um funil igual ao modelo: mesma página, vagas, perguntas, passos, horários e textos dos templates.
 * Os templates viram novos (com o prefixo do funil novo) e sobem nas BMs do grupo escolhido.
 */
export async function createFunnelFromModel(workspaceId: string, modelId: string, input: { name: string; slug: string; groupId: string }) {
  const allowed = await funnelModels(workspaceId);
  if (!allowed.some((m) => m.id === modelId)) throw new Error("Modelo não encontrado");
  const model = await prisma.funnel.findUniqueOrThrow({ where: { id: modelId } });
  const steps = funnelSteps(model);
  const ids = [model.codeBlueprintId, model.doneBlueprintId, ...steps.map((st) => (st.type === "send" ? st.blueprintId : null))].filter((x): x is string => Boolean(x));
  const bps = await prisma.templateBlueprint.findMany({ where: { id: { in: [...new Set(ids)] }, workspaceId: model.workspaceId } });
  const prefix = await templatePrefix(workspaceId, input.slug);
  const map = new Map<string, string>();
  const usedNames = new Set<string>();
  for (const bp of bps) {
    // Mesmo final do nome do modelo (ex.: _inscricao), com o prefixo do funil novo
    let name = `${prefix}_${bp.name.split("_").pop() || "msg"}`.slice(0, 500);
    for (let i = 2; usedNames.has(name); i++) name = `${prefix}_${bp.name.split("_").pop()}${i}`;
    usedNames.add(name);
    const created = await prisma.templateBlueprint.create({
      data: {
        workspaceId,
        groupId: input.groupId,
        name,
        language: bp.language,
        category: bp.category,
        components: bp.components as Prisma.InputJsonValue,
        headerSamplePath: bp.headerSamplePath,
        headerSampleMime: bp.headerSampleMime,
      },
    });
    map.set(bp.id, created.id);
  }
  const newSteps = steps
    .map((st) => (st.type === "send" ? (map.has(st.blueprintId) ? { ...st, id: newId(), blueprintId: map.get(st.blueprintId)! } : null) : { ...st, id: newId() }))
    .filter((st): st is FunnelStep => Boolean(st));
  return prisma.funnel.create({
    data: {
      workspaceId,
      name: input.name,
      slug: input.slug,
      groupId: input.groupId,
      page: model.page as Prisma.InputJsonValue,
      formFields: model.formFields as Prisma.InputJsonValue,
      steps: newSteps as unknown as Prisma.InputJsonValue,
      codeBlueprintId: model.codeBlueprintId ? map.get(model.codeBlueprintId) ?? null : null,
      doneBlueprintId: model.doneBlueprintId ? map.get(model.doneBlueprintId) ?? null : null,
      sendFrom: model.sendFrom,
      sendTo: model.sendTo,
    },
  });
}

export const funnelPage = (f: Pick<Funnel, "page">): FunnelPage => {
  const p = { ...DEFAULT_PAGE, ...((f.page ?? {}) as Partial<FunnelPage>) };
  return { ...p, jobs: Array.isArray(p.jobs) ? p.jobs : [] };
};
export const funnelFields = (f: Pick<Funnel, "formFields">) => (Array.isArray(f.formFields) ? (f.formFields as unknown as FormField[]) : DEFAULT_FIELDS);
export const funnelSteps = (f: Pick<Funnel, "steps">) => (Array.isArray(f.steps) ? (f.steps as unknown as FunnelStep[]) : []);

/** Endereço público do funil (domínio próprio, se tiver). */
export function funnelUrl(f: Pick<Funnel, "slug" | "domain">) {
  return f.domain ? `https://${f.domain}` : `${env.appUrl()}/v/${f.slug}`;
}

export function formLink(f: Pick<Funnel, "slug" | "domain">, lead: Pick<Lead, "formToken">) {
  return `${funnelUrl(f)}/c/${lead.formToken}`;
}

export const hashCode = (leadId: string, code: string) => createHash("sha256").update(`${leadId}:${code}`).digest("hex");

export function bodyVarsOf(bp: Pick<TemplateBlueprint, "components">) {
  return extractVars(getComponent(bp.components as unknown as TComponent[], "BODY")?.text);
}

// --- Campanhas internas de cada passo --------------------------------------

/** Acha (ou cria) a campanha interna que envia um passo do funil. */
async function stepCampaign(funnel: Funnel, step: string, bp: TemplateBlueprint, mapping: VariableMapping, label: string) {
  const status = funnel.status === "ACTIVE" ? "RUNNING" : "PAUSED";
  const data = {
    name: `Aquecimento · ${funnel.name} · ${label}`,
    groupId: funnel.groupId,
    templateName: bp.name,
    templateLanguage: bp.language,
    templateCategory: bp.category,
    variableMapping: mapping as Prisma.InputJsonValue,
  };
  const existing = await prisma.campaign.findUnique({ where: { funnelId_funnelStep: { funnelId: funnel.id, funnelStep: step } } });
  if (existing) {
    const changed = existing.templateName !== data.templateName || existing.groupId !== data.groupId || JSON.stringify(existing.variableMapping) !== JSON.stringify(mapping) || existing.name !== data.name;
    // Alguém cancelou/concluiu a campanha interna: com o funil ligado, ela volta a rodar
    const revive = funnel.status === "ACTIVE" && !["RUNNING", "PAUSED"].includes(existing.status);
    return changed || revive ? prisma.campaign.update({ where: { id: existing.id }, data: { ...data, ...(revive ? { status: "RUNNING" as const, pausedReason: null } : {}) } }) : existing;
  }
  // "Recebi" na mensagem de inscrição abre a conversa: responde na hora (mensagem grátis, conta como conversa de verdade)
  const autoReply =
    step !== "code" && step !== "login" && getComponent(bp.components as unknown as TComponent[], "BUTTONS")?.buttons?.some((b) => b.type === "QUICK_REPLY")
      ? {
          autoReplyEnabled: true,
          autoReplyText:
            funnel.kind === "LINKS"
              ? "Perfeito, {{primeiro_nome}}! Tudo certo com a sua conta. Qualquer acesso novo, a gente te avisa por aqui. 😉"
              : "Perfeito, {{primeiro_nome}}! Fique de olho por aqui, em breve enviamos a próxima etapa. 😉",
        }
      : {};
  return prisma.campaign
    .create({ data: { ...data, workspaceId: funnel.workspaceId, funnelId: funnel.id, funnelStep: step, status, startedAt: new Date(), ...autoReply } })
    .catch(() => prisma.campaign.findUniqueOrThrow({ where: { funnelId_funnelStep: { funnelId: funnel.id, funnelStep: step } } }));
}

function leadData(funnel: Funnel, lead: Lead, extra: Record<string, string> = {}) {
  const page = funnelPage(funnel);
  return { email: lead.email ?? "", vaga: lead.job || page.jobTitle, empresa: page.company, link: formLink(funnel, lead), ...extra };
}

/** Coloca o lead na fila de um passo. `again` = reenviar mesmo se já foi (código novo). */
async function enqueue(funnel: Funnel, lead: Lead, step: string, bp: TemplateBlueprint, mapping: VariableMapping, label: string, extra: Record<string, string> = {}, again = false) {
  const campaign = await stepCampaign(funnel, step, bp, mapping, label);
  const data = leadData(funnel, lead, extra);
  const existing = await prisma.campaignRecipient.findUnique({ where: { campaignId_phone: { campaignId: campaign.id, phone: lead.phone } } });
  if (!existing) {
    await prisma.campaignRecipient.create({ data: { campaignId: campaign.id, phone: lead.phone, name: lead.name, data, clickToken: randomBytes(8).toString("base64url") } }).catch(() => undefined);
    return;
  }
  if (!again) return;
  // Reenvio: só volta para a fila se não estiver saindo agora
  await prisma.campaignRecipient.updateMany({
    where: { id: existing.id, status: { not: "SENDING" } },
    data: { status: "PENDING", data, name: lead.name, attempts: 0, retryAt: null, wamid: null, errorCode: null, errorTitle: null, errorDetail: null, sentAt: null, deliveredAt: null, readAt: null, failedAt: null },
  });
}

/** Gera um código novo e manda pelo WhatsApp. */
export async function sendCode(funnel: Funnel, lead: Lead) {
  const bp = funnel.codeBlueprintId ? await prisma.templateBlueprint.findUnique({ where: { id: funnel.codeBlueprintId } }) : null;
  if (!bp) throw new Error("Funil sem template de código");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: { codeHash: hashCode(lead.id, code), codeExpiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000), codeAttempts: 0, codeSends: { increment: 1 }, lastCodeAt: new Date() },
  });
  await enqueue(funnel, updated, "code", bp, { body: [{ type: "field", field: "col:codigo" }] }, "Código", { codigo: code }, true);
}

/** Gerador de links: aviso de "novo acesso" no WhatsApp (com os botões Fui eu / Não fui eu). */
export async function sendLoginAlert(funnel: Funnel, lead: Lead, quando: string) {
  const bp = funnel.loginBlueprintId ? await prisma.templateBlueprint.findUnique({ where: { id: funnel.loginBlueprintId } }) : null;
  if (bp) await enqueue(funnel, lead, "login", bp, { body: [{ type: "field", field: "col:quando" }] }, "Novo acesso", { quando }, true);
}

/** Cadastro final respondido: manda a mensagem de "recebemos". */
export async function sendDone(funnel: Funnel, lead: Lead) {
  const bp = funnel.doneBlueprintId ? await prisma.templateBlueprint.findUnique({ where: { id: funnel.doneBlueprintId } }) : null;
  if (bp) await enqueue(funnel, lead, "done", bp, DONE_MAPPING, "Cadastro recebido");
}

// --- Motor do funil (roda no worker) ----------------------------------------

const BRT_OFFSET_MS = 3 * 3600_000; // Brasília (sem horário de verão)

/** Próximo horário dentro da janela de envio (ex.: 8h às 21h de Brasília). */
export function nextAllowed(now: Date, from: number, to: number): Date {
  if (from >= to) return now;
  const local = new Date(now.getTime() - BRT_OFFSET_MS);
  const h = local.getUTCHours();
  if (h >= from && h < to) return now;
  const next = new Date(local);
  next.setUTCHours(from, randomInt(0, 20), 0, 0);
  if (h >= to) next.setUTCDate(next.getUTCDate() + 1);
  return new Date(next.getTime() + BRT_OFFSET_MS);
}

/** Avança o lead pelos passos até o próximo timer (ou até o fim). */
export async function advanceLead(funnel: Funnel, lead: Lead) {
  const steps = funnelSteps(funnel);
  let index = lead.stepIndex;
  let nextAt: Date | null = null;
  const now = new Date();
  const bps = new Map((await prisma.templateBlueprint.findMany({ where: { workspaceId: funnel.workspaceId, id: { in: steps.flatMap((s) => (s.type === "send" ? [s.blueprintId] : [])) } } })).map((b) => [b.id, b]));
  while (index < steps.length) {
    const step = steps[index];
    if (step.type === "wait") {
      index++;
      nextAt = new Date(now.getTime() + Math.max(1, step.amount) * UNIT_MS[step.unit]);
      break;
    }
    if (step.onlyIfPending && lead.status === "COMPLETED") {
      index++;
      continue;
    }
    // Fora do horário de envio: espera a janela abrir
    const allowed = nextAllowed(now, funnel.sendFrom, funnel.sendTo);
    if (allowed > now) {
      nextAt = allowed;
      break;
    }
    const bp = bps.get(step.blueprintId);
    if (bp) await enqueue(funnel, lead, step.id, bp, step.mapping ?? {}, `Passo ${index + 1}`);
    index++;
  }
  // Só grava se ninguém mexeu no lead enquanto isso (evita enviar duas vezes)
  await prisma.lead.updateMany({ where: { id: lead.id, stepIndex: lead.stepIndex }, data: { stepIndex: index, nextStepAt: nextAt } });
}

/** Tick do worker: leads com passo vencido + retomada das campanhas do funil pausadas por falta de saldo/número. */
export async function runFunnels() {
  const due = await prisma.lead.findMany({
    where: { nextStepAt: { lte: new Date() }, status: { in: ["VERIFIED", "COMPLETED"] }, funnel: { status: "ACTIVE", workspace: { blockedAt: null } } },
    include: { funnel: true },
    orderBy: { nextStepAt: "asc" },
    take: 500,
  });
  for (const { funnel, ...lead } of due) await advanceLead(funnel, lead as Lead).catch((e) => console.error("[funil]", lead.id, e));

  await prisma.campaign.updateMany({
    where: {
      funnelId: { not: null },
      status: "PAUSED",
      // Pausa do funil ou pausa à mão: fica pausada até alguém retomar
      pausedReason: { notIn: [FUNNEL_PAUSED, "Pausada manualmente"] },
      updatedAt: { lt: new Date(Date.now() - 5 * 60_000) },
      funnel: { status: "ACTIVE" },
    },
    data: { status: "RUNNING" },
  });
}

export const FUNNEL_PAUSED = "Funil pausado";

/** Liga/desliga o funil (e as campanhas internas dele). */
export async function setFunnelStatus(funnelId: string, active: boolean) {
  await prisma.funnel.update({ where: { id: funnelId }, data: { status: active ? "ACTIVE" : "PAUSED" } });
  await prisma.campaign.updateMany({
    where: { funnelId },
    data: active ? { status: "RUNNING", pausedReason: null } : { status: "PAUSED", pausedReason: FUNNEL_PAUSED },
  });
}

/** Cancela o que ainda estava na fila do funil para esse número (não chega mais nada). */
async function cancelQueued(lead: Pick<Lead, "funnelId" | "phone">, reason: string) {
  await prisma.campaignRecipient.updateMany({
    where: { phone: lead.phone, status: "PENDING", campaign: { funnelId: lead.funnelId } },
    data: { status: "SKIPPED", errorTitle: reason },
  });
}

/** Tira a pessoa do funil: para os timers e cancela o que estava na fila. */
export async function stopLead(lead: Lead) {
  await prisma.lead.update({ where: { id: lead.id }, data: { status: "STOPPED", stoppedAt: new Date(), nextStepAt: null } });
  await cancelQueued(lead, "Tirado do funil");
}

/** Volta para o funil do passo em que parou. */
export async function resumeLead(lead: Lead) {
  const status = lead.answeredAt ? "COMPLETED" : lead.verifiedAt ? "VERIFIED" : "CODE_SENT";
  await prisma.lead.update({ where: { id: lead.id }, data: { status, stoppedAt: null, nextStepAt: lead.verifiedAt ? new Date() : null } });
}

export async function deleteLead(lead: Lead) {
  await cancelQueued(lead, "Lead excluído");
  await prisma.lead.delete({ where: { id: lead.id } });
}
