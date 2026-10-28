import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, Copy, Pause, Play, RotateCcw, Trash2, XCircle } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { trackedUrlBase } from "@/lib/env";
import { planSenders } from "@/lib/dispatcher";
import { formatLimit } from "@/lib/limits";
import type { TComponent, VariableMapping } from "@/lib/template-utils";
import { Badge, Card, Stat, Table, Td } from "@/components/ui";
import { CampaignStatusBadge } from "@/components/status";
import { ConfirmButton } from "@/components/action-form";
import {
  cancelCampaignAction, deleteCampaignAction, duplicateCampaignAction, pauseCampaignAction, resumeCampaignAction,
  retryFailedAction, saveAutoReplyAction, saveContentStepAction, saveTemplateStepAction, startCampaignAction,
} from "@/app/actions/campaigns";
import { ActionForm } from "@/components/action-form";
import { Workflow, Zap } from "lucide-react";
import { setCampaignFlowAction } from "@/app/actions/flows";
import { StepTemplate, type TemplateOption } from "./step-template";
import { StepContent } from "./step-content";
import { StepAudience, type AudienceStats } from "./step-audience";
import { StepSendForm } from "./step-send";
import { TestSend } from "./test-send";
import { CampaignName } from "./campaign-name";
import { Metrics } from "./metrics";
import { ClientReportStep } from "./client-report";
import { AutoRefresh } from "./auto-refresh";
import { templateAliases, templateFamily } from "@/lib/blueprints";

import { usableGroupWhere } from "@/lib/bm-problems";
export const dynamic = "force-dynamic";

const STEPS = [
  { key: "template", label: "1. Template" },
  // Audiência antes do Conteúdo: as variáveis já mostram as colunas da planilha com exemplo
  { key: "audiencia", label: "2. Audiência" },
  { key: "conteudo", label: "3. Conteúdo" },
  { key: "envio", label: "4. Envio" },
  { key: "metricas", label: "5. Métricas" },
  { key: "relatorio", label: "6. Relatório do cliente" },
];

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ etapa?: string }> }) {
  const auth = await requireAuth();
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, workspaceId: auth.workspace.id }, include: { group: true } });
  if (!campaign) notFound();
  // Campanha interna do login do gerador de links: não aparece na lista
  if (campaign.funnelId) redirect("/campanhas");
  const started = !["DRAFT", "SCHEDULED"].includes(campaign.status);
  const step = (await searchParams).etapa ?? (started ? "metricas" : "template");

  return (
    <div className="relative -mx-10 -my-9 min-h-screen overflow-hidden">
      <div className="relative">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-zinc-200/70 bg-white/85 px-6 py-3 backdrop-blur">
        <Link href="/campanhas" className="rounded-full border border-zinc-200 p-1.5 hover:bg-zinc-50"><ArrowLeft className="size-4" /></Link>
        <CampaignName id={campaign.id} name={campaign.name} />
        <CampaignStatusBadge s={campaign.status} />
        {campaign.pausedReason && <span className="text-xs text-amber-700">{campaign.pausedReason}</span>}
        {campaign.scheduledAt && campaign.status === "SCHEDULED" && <Badge color="blue" dot={false}>Agendada para {campaign.scheduledAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</Badge>}
        <div className="ml-auto flex flex-wrap gap-2">
          {campaign.status === "RUNNING" && <ConfirmButton action={pauseCampaignAction.bind(null, id)}><Pause className="size-4" /> Pausar</ConfirmButton>}
          {campaign.status === "PAUSED" && <ConfirmButton action={resumeCampaignAction.bind(null, id)} variant="primary"><Play className="size-4" /> Retomar</ConfirmButton>}
          {["COMPLETED", "PAUSED"].includes(campaign.status) && <ConfirmButton action={retryFailedAction.bind(null, id)} confirm="Reenviar para quem falhou por erro temporário? (não inclui números sem WhatsApp/bloqueados)"><RotateCcw className="size-4" /> Reenviar falhas</ConfirmButton>}
          <ConfirmButton action={duplicateCampaignAction.bind(null, id)}><Copy className="size-4" /> Duplicar</ConfirmButton>
          {["RUNNING", "PAUSED", "SCHEDULED"].includes(campaign.status) && <ConfirmButton action={cancelCampaignAction.bind(null, id)} variant="danger" confirm="Cancelar a campanha? Os pendentes não serão enviados."><XCircle className="size-4" /> Cancelar</ConfirmButton>}
          {campaign.status !== "RUNNING" && <ConfirmButton action={deleteCampaignAction.bind(null, id)} variant="ghost" className="text-red-600" confirm="Excluir a campanha e todo o relatório?"><Trash2 className="size-4" /></ConfirmButton>}
        </div>
      </div>
      <div className="flex flex-col md:flex-row">
        <nav data-tour="campaign-steps" className="flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-200/70 p-2 md:block md:w-52 md:space-y-1 md:border-b-0 md:border-r md:p-4">
          {STEPS.map((s, i) => (
            <Link
              key={s.key}
              href={`/campanhas/${id}?etapa=${s.key}`}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                step === s.key ? "bg-white font-semibold text-zinc-900 shadow-lift ring-2 ring-orange-300/70" : "bg-white/70 font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-white hover:text-zinc-900",
              )}
            >
              <span className={clsx("flex size-7 items-center justify-center rounded-full text-xs font-bold", step === s.key ? "bg-brand-gradient text-white shadow-md shadow-orange-500/30" : "bg-zinc-800 text-white")}>{i + 1}</span>
              {s.label.replace(/^\d+\. /, "")}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1 p-8">
          {step === "template" && <TemplateStep campaignId={id} workspaceId={auth.workspace.id} locked={started} />}
          {step === "conteudo" && (
            <>
              <ContentStep campaignId={id} locked={started} />
              <FlowCard campaignId={id} workspaceId={auth.workspace.id} />
              <AutoReplyCard campaignId={id} />
            </>
          )}
          {step === "audiencia" && (
            <AudienceStep campaignId={id} fileName={campaign.audienceFileName} stats={campaign.audienceStats as unknown as AudienceStats | null} locked={started} />
          )}
          {step === "envio" && (
            <>
              <SendStep campaignId={id} />
              <TestSend campaignId={id} />
            </>
          )}
          {step === "relatorio" && <ClientReportStep campaignId={id} workspaceId={auth.workspace.id} canAdjust={auth.user.isSuperAdmin} />}
          {step === "metricas" && (
            <>
              {/* Entregas, leituras, cliques e respostas continuam chegando depois do envio: atualiza sempre */}
              <AutoRefresh every={campaign.status === "RUNNING" ? 3000 : 8000} live />
              <Metrics campaignId={id} />
              <FlowCard campaignId={id} workspaceId={auth.workspace.id} />
              <AutoReplyCard campaignId={id} />
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

async function TemplateStep({ campaignId, workspaceId, locked }: { campaignId: string; workspaceId: string; locked: boolean }) {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const groups = await prisma.bmGroup.findMany({ where: { workspaceId, ...usableGroupWhere }, include: { members: true }, orderBy: { name: "asc" } });
  const templates = await prisma.template.findMany({ where: { workspaceId }, include: { waba: true } });
  const wabas = await prisma.whatsAppAccount.findMany({ where: { workspaceId }, include: { business: true } });
  const wabaLabel = (w: { name: string; business: { name: string } }) => `${w.business.name} / ${w.name}`;
  // Versões numeradas de um template padrão (fzl_disp2...) entram como o template original
  const aliases = await templateAliases(workspaceId);
  const optionsByGroup: Record<string, TemplateOption[]> = {};
  // Cada BM também pode ser usada sozinha: entra como "bm:<id>" (vira um grupo oculto só com ela ao salvar)
  const businesses = await prisma.businessManager.findMany({ where: { workspaceId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const pickable = [
    ...(campaign.scope === "BM" ? [] : groups.map((g) => ({ id: g.id, name: g.name, members: g.members }))),
    ...(campaign.scope === "GROUP" ? [] : businesses.map((b) => ({ id: `bm:${b.id}`, name: `Só a BM: ${b.name}`, members: [{ businessId: b.id }] }))),
  ];
  const currentGroup = campaign.groupId ? await prisma.bmGroup.findUnique({ where: { id: campaign.groupId }, select: { system: true } }) : null;
  const groupKey = currentGroup?.system?.startsWith("BM:") ? `bm:${currentGroup.system.slice(3)}` : (campaign.groupId ?? "");
  for (const g of pickable) {
    const bms = new Set(g.members.map((m) => m.businessId));
    const inGroup = templates.filter((t) => bms.has(t.waba.businessId));
    const map = new Map<string, TemplateOption>();
    // Quais WABAs do grupo estão aptas para cada template (aprovado e de utilidade)
    const usable = new Map<string, Set<string>>();
    for (const t of inGroup) {
      if (t.status !== "APPROVED" || t.category !== "UTILITY") continue;
      const name = aliases.get(`${t.name}|${t.language}`) ?? t.name;
      const set = usable.get(`${name}|${t.language}`) ?? new Set<string>();
      set.add(t.wabaId);
      usable.set(`${name}|${t.language}`, set);
    }
    const groupWabas = wabas.filter((w) => bms.has(w.businessId));
    for (const t of inGroup) {
      const name = aliases.get(`${t.name}|${t.language}`) ?? t.name;
      const key = `${name}|${t.language}`;
      const opt = map.get(key) ?? { key, name, language: t.language, usable: 0, total: 0, notApt: [], body: (t.components as unknown as TComponent[]).find((c) => c.type === "BODY")?.text ?? "" };
      opt.total++;
      if (t.status === "APPROVED" && t.category === "UTILITY") opt.usable++;
      map.set(key, opt);
    }
    for (const o of map.values()) {
      const ok = usable.get(o.key) ?? new Set<string>();
      o.notApt = groupWabas.filter((w) => !ok.has(w.id)).map(wabaLabel);
    }
    optionsByGroup[g.id] = [...map.values()].filter((o) => o.usable > 0).sort((a, b) => a.name.localeCompare(b.name));
  }
  return (
    <StepTemplate
      action={saveTemplateStepAction.bind(null, campaignId)}
      name={campaign.name}
      groups={pickable.map((g) => ({ id: g.id, name: g.name }))}
      optionsByGroup={optionsByGroup}
      groupId={groupKey}
      scope={campaign.scope === "BM" ? "BM" : "GROUP"}
      templateKey={campaign.templateName ? `${campaign.templateName}|${campaign.templateLanguage}` : ""}
      locked={locked}
    />
  );
}

async function ContentStep({ campaignId, locked }: { campaignId: string; locked: boolean }) {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  if (!campaign.templateName) return <p className="text-zinc-500">Escolha o template primeiro.</p>;
  const family = await templateFamily(campaign.workspaceId, campaign.templateName, campaign.templateLanguage!);
  const tpl = await prisma.template.findFirst({
    where: { workspaceId: campaign.workspaceId, name: { in: family }, language: campaign.templateLanguage!, status: "APPROVED", category: "UTILITY" },
  });
  if (!tpl) return <p className="text-red-600">Nenhuma cópia aprovada de utilidade desse template foi encontrada.</p>;
  const sample = await prisma.campaignRecipient.findFirst({ where: { campaignId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  const stats = campaign.audienceStats as unknown as { headers?: string[] } | null;
  return (
    <StepContent
      action={saveContentStepAction.bind(null, campaignId)}
      components={tpl.components as unknown as TComponent[]}
      redirectDomain={trackedUrlBase()}
      mapping={(campaign.variableMapping ?? {}) as VariableMapping}
      buttonUrl={campaign.buttonUrl ?? ""}
      mediaUrl={campaign.headerMediaUrl}
      columns={stats?.headers ?? []}
      sample={sample ? { phone: sample.phone, name: sample.name, data: sample.data as Record<string, unknown> } : { phone: "5511999999999", name: "Maria Silva", data: {} }}
      locked={locked}
    />
  );
}

async function AudienceStep({ campaignId, fileName, stats, locked }: { campaignId: string; fileName: string | null; stats: AudienceStats | null; locked: boolean }) {
  const preview = await prisma.campaignRecipient.findMany({ where: { campaignId }, take: 10, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  return (
    <div className="space-y-6">
      <StepAudience campaignId={campaignId} fileName={fileName} stats={stats} locked={locked} />
      {preview.length > 0 && (
        <Table head={["Nome", "Telefone"]}>
          {preview.map((r) => (
            <tr key={r.id}><Td>{r.name ?? "—"}</Td><Td>+{r.phone}</Td></tr>
          ))}
        </Table>
      )}
    </div>
  );
}

async function SendStep({ campaignId }: { campaignId: string }) {
  const auth = await requireAuth();
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const pending = await prisma.campaignRecipient.count({ where: { campaignId, status: "PENDING" } });
  const plan = await planSenders(campaign);
  // Só as BMs que têm número apto contam (igual ao disparador)
  const senderBms = new Set(plan.senders.map((x) => x.businessId));
  const capacity = [...plan.capacity.entries()].filter(([id]) => senderBms.has(id)).reduce((a, [, v]) => a + v, 0);
  const cost = pending * auth.workspace.creditsPerMessage;
  const insufficient = auth.workspace.creditBalance < cost;
  const editable = ["DRAFT", "SCHEDULED"].includes(campaign.status);
  const missing = [!campaign.templateName && "template", !campaign.groupId && "grupo de BM", pending === 0 && "audiência"].filter(Boolean);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Envio</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Destinatários pendentes" value={pending.toLocaleString("pt-BR")} />
        <Stat label="Números aptos" value={plan.senders.length} sub={`${plan.skipped.length} de fora`} tone={plan.senders.length ? "green" : "red"} />
        <Stat label="Capacidade das BMs (24h)" value={formatLimit(capacity)} sub={capacity !== Infinity && capacity < pending ? "Menor que a audiência: o resto sai quando o limite liberar" : undefined} tone={capacity !== Infinity && capacity < pending ? "red" : "default"} />
        <Stat label="Custo" value={`${cost.toLocaleString("pt-BR")} créditos`} sub={`Saldo: ${auth.workspace.creditBalance.toLocaleString("pt-BR")}`} tone={insufficient ? "red" : "default"} />
      </div>

      <Card className="p-5">
        <div className="mb-3 font-semibold">Números que vão disparar</div>
        <div className="flex flex-wrap gap-2">
          {plan.senders.map((s) => <Badge key={s.phoneId} color="green">{s.display} · {s.businessName}</Badge>)}
          {plan.senders.length === 0 && <span className="text-red-600">Nenhum número apto.</span>}
        </div>
        {plan.skipped.length > 0 && (
          <>
            <div className="mt-4 mb-2 font-medium text-zinc-600">Fora desta campanha</div>
            <div className="flex flex-wrap gap-2">
              {plan.skipped.map((s, i) => <Badge key={i} color="gray">{s.display}: {s.reason}</Badge>)}
            </div>
          </>
        )}
      </Card>

      {editable ? (
        missing.length ? (
          <p className="text-amber-700">Falta definir: {missing.join(", ")}.</p>
        ) : (
          <StepSendForm
            action={startCampaignAction.bind(null, campaignId)}
            defaultTotal={campaign.totalRatePerSecond}
            skipRed={campaign.skipRedQuality}
            insufficient={insufficient}
            pending={pending}
            senders={plan.senders.length}
            capacity={Number.isFinite(capacity) ? capacity : null}
          />
        )
      ) : (
        <p className="text-zinc-500">Campanha já iniciada. Acompanhe em <Link href={`/campanhas/${campaignId}?etapa=metricas`} className="underline">Métricas</Link>.</p>
      )}
    </div>
  );
}

/** Fluxo: quem responder este disparo segue os blocos do fluxo escolhido (no lugar da resposta automática). */
async function FlowCard({ campaignId, workspaceId }: { campaignId: string; workspaceId: string }) {
  const [c, flows, runs] = await Promise.all([
    prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { flowId: true } }),
    prisma.flow.findMany({ where: { workspaceId }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" } }),
    prisma.flowRun.groupBy({ by: ["status"], where: { campaignId }, _count: true }),
  ]);
  const total = runs.reduce((a, r) => a + r._count, 0);
  const done = runs.find((r) => r.status === "DONE")?._count ?? 0;
  return (
    <Card className="mt-6 p-5">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <Workflow className="size-4 text-brand-500" /> Fluxo
        {c.flowId ? <Badge color="green">Ligado</Badge> : <Badge color="gray">Sem fluxo</Badge>}
        {total > 0 && <span className="ml-auto text-xs font-normal text-zinc-500">{total.toLocaleString("pt-BR")} entraram · {done.toLocaleString("pt-BR")} terminaram</span>}
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Quando o cliente responder este disparo (ou clicar num botão de resposta do template), ele entra no fluxo e segue o caminho da resposta. Com fluxo ligado, a resposta automática abaixo não vai.{" "}
        <Link href="/fluxos" className="font-medium text-brand-600 hover:underline">Criar ou editar fluxos</Link>
      </p>
      {flows.length ? (
        <ActionForm action={setCampaignFlowAction.bind(null, campaignId)} submit="Salvar fluxo">
          <select name="flowId" defaultValue={c.flowId ?? ""} className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm shadow-soft outline-none focus:border-brand-400">
            <option value="">Sem fluxo</option>
            {flows.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </ActionForm>
      ) : (
        <p className="text-sm text-zinc-500">Você ainda não tem fluxo. <Link href="/fluxos" className="font-medium text-brand-600 hover:underline">Crie o primeiro</Link>.</p>
      )}
    </Card>
  );
}

/** Resposta automática: enviada uma vez, na hora, quando o contato responde a esta campanha. */
async function AutoReplyCard({ campaignId }: { campaignId: string }) {
  const [c, sent] = await Promise.all([
    prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    prisma.campaignRecipient.count({ where: { campaignId, autoReplySentAt: { not: null } } }),
  ]);
  return (
    <Card className="mt-6 p-5">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <Zap className="size-4 text-violet-500" /> Resposta automática
        {c.autoReplyEnabled ? <Badge color="green">Ativa</Badge> : <Badge color="gray">Desligada</Badge>}
        {sent > 0 && <span className="ml-auto text-xs font-normal text-zinc-500">{sent.toLocaleString("pt-BR")} enviadas</span>}
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Quando o cliente responder este disparo, o Fuzil manda esta mensagem na hora, pelo mesmo número (uma vez por contato). Não precisa de template: a resposta do cliente abre a janela de 24h.
        Use <code className="rounded bg-zinc-100 px-1">{"{{primeiro_nome}}"}</code> ou <code className="rounded bg-zinc-100 px-1">{"{{nome}}"}</code> para personalizar. Quem responde SAIR não recebe.
      </p>
      <ActionForm action={saveAutoReplyAction.bind(null, campaignId)} submit="Salvar resposta automática">
        <label className="mb-3 flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="enabled" defaultChecked={c.autoReplyEnabled} /> Ativar resposta automática
        </label>
        <textarea
          name="text"
          defaultValue={c.autoReplyText ?? ""}
          rows={4}
          placeholder={"Ex.: Oi {{primeiro_nome}}! Recebemos sua mensagem 😊\nPara acompanhar seu pedido, acesse: https://..."}
          className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm shadow-soft outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="text-zinc-600">
            Anexo (opcional: imagem, vídeo, áudio ou PDF){" "}
            <input type="file" name="media" accept="image/jpeg,image/png,video/mp4,audio/mpeg,audio/ogg,audio/aac,audio/mp4,application/pdf" className="mt-1 block text-xs" />
          </label>
          {c.autoReplyMediaUrl && (
            <span className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-1.5 text-xs ring-1 ring-zinc-200/70">
              <a href={c.autoReplyMediaUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">{c.autoReplyMediaName ?? "anexo atual"}</a>
              <label className="flex items-center gap-1 text-zinc-500"><input type="checkbox" name="removeMedia" /> remover</label>
            </span>
          )}
        </div>
      </ActionForm>
    </Card>
  );
}
