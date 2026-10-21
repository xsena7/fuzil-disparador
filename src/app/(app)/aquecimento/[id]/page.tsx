import { notFound } from "next/navigation";
import { Download, ExternalLink, Pause, Play, Trash2 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { planSenders } from "@/lib/dispatcher";
import { tierLabel } from "@/lib/limits";
import { formatPhone } from "@/lib/phone";
import { bodyVarsOf, funnelFields, funnelPage, funnelSteps, funnelUrl } from "@/lib/funnels";
import { getComponent, type TComponent } from "@/lib/template-utils";
import { Drawer, MetaItem } from "@/components/drawer";
import { Badge, Field, Input, PageHeader, Select, Stat, Table, Td, Textarea } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { deleteFunnelAction, savePageAction, saveSettingsAction, toggleFunnelAction } from "@/app/actions/funnels";
import { FlowEditor, type BlueprintOption } from "./flow-editor";
import { FieldsEditor } from "./fields-editor";
import { DomainChecker } from "./domain-check";
import { checkDomain } from "@/lib/domain-check";
import { JobsEditor } from "./jobs-editor";

export const dynamic = "force-dynamic";

const STATUS = { CODE_SENT: { label: "Falta o código", color: "yellow" }, VERIFIED: { label: "Confirmado", color: "blue" }, COMPLETED: { label: "Cadastro completo", color: "green" } } as const;

export default async function FunnelPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const auth = await requireAuth();
  const { id } = await params;
  const { s } = await searchParams;
  const ws = auth.workspace.id;
  const funnel = await prisma.funnel.findFirst({ where: { id, workspaceId: ws } });
  if (!funnel) notFound();
  const statusFilter = s && s in STATUS ? (s as keyof typeof STATUS) : undefined;

  const [counts, today, leads, groups, blueprints, warm] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], where: { funnelId: id }, _count: true }),
    prisma.lead.count({ where: { funnelId: id, createdAt: { gte: new Date(Date.now() - 86400_000) } } }),
    prisma.lead.findMany({ where: { funnelId: id, ...(statusFilter ? { status: statusFilter } : {}) }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.bmGroup.findMany({ where: { workspaceId: ws, system: null }, orderBy: { name: "asc" } }),
    prisma.templateBlueprint.findMany({ where: { workspaceId: ws, active: true }, orderBy: { createdAt: "asc" } }),
    prisma.$queryRaw<Array<{ name: string; tier: string | null; sent: bigint; delivered: bigint; read: bigint; replied: bigint; failed: bigint }>>`
      SELECT b.name, b."messagingLimitTier" AS tier,
        COUNT(*) FILTER (WHERE r."sentAt" IS NOT NULL) AS sent,
        COUNT(*) FILTER (WHERE r."deliveredAt" IS NOT NULL) AS delivered,
        COUNT(*) FILTER (WHERE r."readAt" IS NOT NULL) AS read,
        COUNT(*) FILTER (WHERE r."repliedAt" IS NOT NULL) AS replied,
        COUNT(*) FILTER (WHERE r.status = 'FAILED') AS failed
      FROM "CampaignRecipient" r
      JOIN "Campaign" c ON c.id = r."campaignId"
      JOIN "PhoneNumber" p ON p.id = r."senderId"
      JOIN "WhatsAppAccount" w ON w.id = p."wabaId"
      JOIN "BusinessManager" b ON b.id = w."businessId"
      WHERE c."funnelId" = ${id} AND r."createdAt" > NOW() - INTERVAL '7 days'
      GROUP BY b.id, b.name, b."messagingLimitTier" ORDER BY sent DESC`,
  ]);
  const count = (k: keyof typeof STATUS) => counts.find((c) => c.status === k)?._count ?? 0;
  const total = counts.reduce((a, c) => a + c._count, 0);
  const verified = count("VERIFIED") + count("COMPLETED");
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

  // Quantas BMs do grupo já conseguem enviar cada template do funil
  const ready = async (bp: (typeof blueprints)[number]) => {
    const plan = await planSenders({ workspaceId: ws, groupId: funnel.groupId, templateName: bp.name, templateLanguage: bp.language, skipRedQuality: true, excludedSenders: [], templateCategory: bp.category });
    const bms = new Set(plan.senders.map((x) => x.businessId)).size;
    if (bms) return `${bms} BM${bms > 1 ? "s" : ""} pronta${bms > 1 ? "s" : ""} · ${plan.senders.length} número${plan.senders.length > 1 ? "s" : ""} no rodízio`;
    const reasons = plan.skipped.map((x) => x.reason);
    const top = reasons.sort((a, b) => reasons.filter((r) => r === b).length - reasons.filter((r) => r === a).length)[0];
    return `0 BMs prontas${top ? ` · ${top}` : funnel.groupId ? " · grupo sem números" : " · escolha o grupo"}`;
  };
  const used = new Set([funnel.codeBlueprintId, funnel.doneBlueprintId, ...funnelSteps(funnel).flatMap((x) => (x.type === "send" ? [x.blueprintId] : []))]);
  const options: BlueprintOption[] = await Promise.all(
    blueprints
      .filter((b) => b.category === "UTILITY" || used.has(b.id))
      .map(async (b) => ({ id: b.id, name: b.name, text: getComponent(b.components as unknown as TComponent[], "BODY")?.text ?? "", vars: bodyVarsOf(b), ready: used.has(b.id) ? await ready(b) : "" })),
  );
  const byId = new Map(options.map((o) => [o.id, o]));
  const page = funnelPage(funnel);
  const url = funnelUrl(funnel);
  const dns = funnel.domain ? await checkDomain(funnel.domain) : null;
  const serverIps = dns?.serverIps ?? [];
  const domainOk = Boolean(dns?.rootOk);
  const n = (v: bigint | number) => Number(v).toLocaleString("pt-BR");

  return (
    <div className="space-y-4">
      <PageHeader
        title={funnel.name}
        description={
          <a href={url} target="_blank" className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
            {url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3.5" />
          </a>
        }
        actions={
          <>
            <Badge color={funnel.status === "ACTIVE" ? "green" : "gray"}>{funnel.status === "ACTIVE" ? "Rodando" : "Pausado"}</Badge>
            <ConfirmButton action={toggleFunnelAction.bind(null, funnel.id)} variant="secondary">
              {funnel.status === "ACTIVE" ? <Pause className="size-4" /> : <Play className="size-4" />}
              {funnel.status === "ACTIVE" ? "Pausar" : "Ativar"}
            </ConfirmButton>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Inscritos" value={n(total)} sub={`${n(today)} nas últimas 24h`} />
        <Stat label="Confirmaram o WhatsApp" value={n(verified)} sub={`${pct(verified, total)} dos inscritos`} tone="brand" />
        <Stat label="Cadastro completo" value={n(count("COMPLETED"))} sub={`${pct(count("COMPLETED"), verified)} dos confirmados`} tone="green" />
        <Stat label="Mensagens (7 dias)" value={n(warm.reduce((a, w) => a + Number(w.sent), 0))} sub={`${warm.length} BM${warm.length === 1 ? "" : "s"} aquecendo`} />
      </div>

      <Drawer title="Funil" subtitle="O caminho de cada pessoa, do formulário até o cadastro" tone={funnel.status === "ACTIVE" ? "green" : "gray"} open>
        <FlowEditor
          funnelId={funnel.id}
          initial={funnelSteps(funnel)}
          blueprints={options.filter((o) => blueprints.find((b) => b.id === o.id)?.category === "UTILITY")}
          code={funnel.codeBlueprintId ? byId.get(funnel.codeBlueprintId) ?? null : null}
          done={funnel.doneBlueprintId ? byId.get(funnel.doneBlueprintId) ?? null : null}
        />
        <p className="mt-3 text-xs text-zinc-500">
          Mensagens dos passos só saem entre {funnel.sendFrom}h e {funnel.sendTo}h (Brasília). O código sai na hora. Os templates sobem sozinhos em todas as BMs do grupo (Templates padrão).
        </p>
      </Drawer>

      <Drawer title="Aquecimento das BMs" subtitle="Envios do funil nos últimos 7 dias, por BM" tone={warm.length ? "green" : "gray"} meta={<MetaItem value={warm.length} label="BMs" />}>
        {warm.length ? (
          <Table head={["BM", "Limite", "Enviadas", "Entregues", "Lidas", "Responderam", "Falhas"]}>
            {warm.map((w) => (
              <tr key={w.name}>
                <Td className="font-medium">{w.name}</Td>
                <Td>{tierLabel(w.tier)}</Td>
                <Td>{n(w.sent)}</Td>
                <Td>{pct(Number(w.delivered), Number(w.sent))}</Td>
                <Td>{pct(Number(w.read), Number(w.sent))}</Td>
                <Td>{n(w.replied)}</Td>
                <Td className={Number(w.failed) ? "text-red-600" : ""}>{n(w.failed)}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-zinc-500">Ainda sem envios. Assim que as primeiras pessoas se inscreverem, cada BM do grupo aparece aqui.</p>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          A Meta sobe o limite quando a BM manda para muitas pessoas diferentes com qualidade boa. Por isso cada mensagem do funil sai por uma BM diferente do rodízio, e o botão
          &quot;Recebi&quot; incentiva a pessoa a responder.
        </p>
      </Drawer>

      <Drawer title="Leads" subtitle="Todo mundo que se inscreveu" meta={<MetaItem value={n(total)} label="inscritos" />} open={total > 0}>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          {[undefined, ...Object.keys(STATUS)].map((k) => (
            <a
              key={k ?? "all"}
              href={`/aquecimento/${id}${k ? `?s=${k}` : ""}`}
              className={`rounded-full px-3 py-1 ${statusFilter === k ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
            >
              {k ? STATUS[k as keyof typeof STATUS].label : "Todos"} {k ? `(${n(count(k as keyof typeof STATUS))})` : `(${n(total)})`}
            </a>
          ))}
          <a href={`/api/funnels/${id}/leads`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50">
            <Download className="size-4" /> Baixar planilha
          </a>
        </div>
        {leads.length ? (
          <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
            {leads.map((l) => {
              const answers = (l.answers ?? {}) as Record<string, string>;
              return (
                <details key={l.id} className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-40 flex-1 font-medium">{l.name}</span>
                    <span className="text-zinc-500">{formatPhone(l.phone)}</span>
                    {l.job && <span className="truncate text-xs text-zinc-500">{l.job}</span>}
                    <Badge color={STATUS[l.status].color}>{STATUS[l.status].label}</Badge>
                    <span className="text-xs text-zinc-400">{l.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</span>
                  </summary>
                  <div className="grid gap-x-6 gap-y-1.5 bg-zinc-50/60 px-4 py-3 text-sm sm:grid-cols-2">
                    <Info label="E-mail" value={l.email} />
                    <Info label="Origem" value={Object.entries((l.utm ?? {}) as Record<string, string>).map(([k, v]) => `${k.replace("utm_", "")}: ${v}`).join(" · ")} />
                    {funnelFields(funnel).map((f) => (
                      <Info key={f.key} label={f.label} value={answers[f.key]} />
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-500">Nenhum lead {statusFilter ? "nesse filtro" : "ainda"}.</p>
        )}
      </Drawer>

      <Drawer
        title="Vagas"
        subtitle="Aparecem em cartões na página. A pessoa escolhe uma e se inscreve"
        tone={page.jobs.some((j) => j.open) ? "green" : "amber"}
        meta={<MetaItem value={page.jobs.filter((j) => j.open).length} label="abertas" />}
      >
        <JobsEditor funnelId={funnel.id} initial={page.jobs} />
      </Drawer>

      <Drawer title="Página de inscrição" subtitle="Textos e cor da landing page" meta={<span className="truncate">{page.jobTitle}</span>}>
        <ActionForm action={savePageAction} submit="Salvar página">
          <input type="hidden" name="id" value={funnel.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome da empresa">
              <Input name="company" defaultValue={page.company} />
            </Field>
            <Field label="Nome geral das vagas" hint="Título da aba e o nome usado nas mensagens se não tiver vaga escolhida">
              <Input name="jobTitle" defaultValue={page.jobTitle} required />
            </Field>
            <Field label="Título grande">
              <Input name="headline" defaultValue={page.headline} required />
            </Field>
            <Field label="Subtítulo">
              <Input name="subtitle" defaultValue={page.subtitle} />
            </Field>
            <Field label="Local" hint="Ex.: Home office · Todo o Brasil">
              <Input name="location" defaultValue={page.location} />
            </Field>
            <Field label="Salário (opcional)" hint="Ex.: R$ 1.800 + comissão">
              <Input name="salary" defaultValue={page.salary} />
            </Field>
            <Field label="Sobre a vaga">
              <Textarea name="about" defaultValue={page.about} rows={5} />
            </Field>
            <div className="grid gap-4">
              <Field label="O que oferecemos" hint="Um por linha">
                <Textarea name="benefits" defaultValue={page.benefits.join("\n")} rows={4} />
              </Field>
              <Field label="Requisitos" hint="Um por linha">
                <Textarea name="requirements" defaultValue={page.requirements.join("\n")} rows={3} />
              </Field>
            </div>
            <Field label="Texto do botão">
              <Input name="cta" defaultValue={page.cta} />
            </Field>
            <Field label="Cor">
              <Input name="color" type="color" defaultValue={page.color} className="h-11 p-1" />
            </Field>
          </div>
        </ActionForm>
      </Drawer>

      <Drawer title="Cadastro final" subtitle="Perguntas do link que chega no WhatsApp" meta={<MetaItem value={funnelFields(funnel).length} label="perguntas" />}>
        <FieldsEditor funnelId={funnel.id} initial={funnelFields(funnel)} />
      </Drawer>

      <Drawer
        title="Domínio, grupo, Pixel e API de Conversões"
        subtitle={funnel.domain ? funnel.domain : "Sem domínio próprio (usando o endereço do painel)"}
        tone={funnel.domain ? (domainOk ? "green" : "amber") : "gray"}
        toneTitle={funnel.domain ? (domainOk ? "Domínio apontado" : "Domínio ainda não aponta para o servidor") : undefined}
        open={Boolean(funnel.domain && !domainOk)}
      >
        <ActionForm action={saveSettingsAction} submit="Salvar">
          <input type="hidden" name="id" value={funnel.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome do funil (só você vê)">
              <Input name="name" defaultValue={funnel.name} required />
            </Field>
            <Field label="Grupo de BM que dispara" hint="Use um grupo só de aquecimento: cada mensagem sai por uma BM diferente">
              <Select name="groupId" defaultValue={funnel.groupId ?? ""} required>
                <option value="">Escolha</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Domínio próprio" hint="Ex.: vagasbrasil.com.br (sem https://)">
              <Input name="domain" defaultValue={funnel.domain ?? ""} placeholder="vagasbrasil.com.br" />
            </Field>
            <Field label="Pixel do Facebook (opcional)" hint="Só o número do pixel. Marca Lead, cadastro completo e envio do formulário">
              <Input name="pixelId" defaultValue={funnel.pixelId ?? ""} inputMode="numeric" />
            </Field>
            <Field
              label="Token da API de Conversões (opcional)"
              hint={
                funnel.capiTokenEnc ? (
                  <>
                    Configurado ✅ (fica guardado criptografado). Em branco mantém o atual.{" "}
                    <label className="inline-flex items-center gap-1">
                      <input type="checkbox" name="capiRemove" /> remover
                    </label>
                  </>
                ) : (
                  "Gerado no Gerenciador de Eventos → pixel → Configurações → API de Conversões"
                )
              }
            >
              <Input name="capiToken" type="password" autoComplete="off" placeholder={funnel.capiTokenEnc ? "••••••••••••" : "Cole o token aqui"} />
            </Field>
            <Field label="Código de teste (opcional)" hint="Só para testar na aba Testar eventos (ex.: TEST12345). Apague depois">
              <Input name="capiTestCode" defaultValue={funnel.capiTestCode ?? ""} />
            </Field>
            <Field label="Mensagens dos passos a partir de (hora)">
              <Input name="sendFrom" type="number" min={0} max={23} defaultValue={funnel.sendFrom} />
            </Field>
            <Field label="Até (hora)">
              <Input name="sendTo" type="number" min={1} max={24} defaultValue={funnel.sendTo} />
            </Field>
          </div>
        </ActionForm>
        {funnel.capiTokenEnc && (
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${funnel.capiLastError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            API de Conversões:{" "}
            {funnel.capiLastError
              ? `último envio falhou (${funnel.capiLastError}). Confira o token e o número do pixel.`
              : funnel.capiLastOkAt
                ? `funcionando, último evento enviado em ${funnel.capiLastOkAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}`
                : "esperando a primeira inscrição para enviar o primeiro evento"}
            {!funnel.pixelId && " (falta o número do pixel)"}
          </p>
        )}
        <div className="mt-6 rounded-xl bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-600">
          <b className="text-zinc-800">Como ligar o domínio</b>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Compre um domínio com nome neutro (ex.: no registro.br).</li>
            <li>
              No DNS do domínio, crie 2 registros do tipo <b>A</b>: nome <b>@</b> e nome <b>www</b>, os dois apontando para <b className="font-mono">{serverIps[0] ?? "o IP do servidor"}</b>.
            </li>
            <li>Cole o domínio acima e salve. Quando o DNS propagar (de minutos a algumas horas), a bolinha fica verde e a página abre no domínio com cadeado (HTTPS).</li>
          </ol>
          {funnel.domain && dns && <DomainChecker funnelId={funnel.id} domain={funnel.domain} initial={dns} />}
        </div>
        <div className="mt-6 flex justify-end">
          <ConfirmButton action={deleteFunnelAction.bind(null, funnel.id)} variant="danger" confirm="Excluir o funil e todos os leads dele? Não dá para desfazer.">
            <Trash2 className="size-4" /> Excluir funil
          </ConfirmButton>
        </div>
      </Drawer>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="whitespace-pre-line text-zinc-800">{value || "—"}</div>
    </div>
  );
}
