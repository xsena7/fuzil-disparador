import Link from "next/link";
import { Flame, Globe, Heart, Repeat, Send, UserPlus } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { ActionForm } from "@/components/action-form";
import { Card, Empty, Field, Input, PageHeader } from "@/components/ui";
import { CampaignStatusBadge } from "@/components/status";
import { createWarmupAction } from "@/app/actions/campaigns";

export const dynamic = "force-dynamic";

/** Aquecimento: campanhas que recebem cadastros do site (anúncio e indicação) e mandam na hora. Ficam fora de Campanhas. */
export default async function WarmupPage() {
  const auth = await requireAuth();
  const list = await prisma.campaign.findMany({
    where: { workspaceId: auth.workspace.id, kind: "WARMUP" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true, leadToken: true, flowId: true, templateName: true, createdAt: true },
  });
  const counts = list.length
    ? await prisma.campaignRecipient.groupBy({ by: ["campaignId"], where: { campaignId: { in: list.map((c) => c.id) } }, _count: true, _max: { createdAt: true } })
    : [];
  const sent = list.length
    ? await prisma.campaignRecipient.groupBy({ by: ["campaignId"], where: { campaignId: { in: list.map((c) => c.id) }, sentAt: { not: null } }, _count: true })
    : [];
  const when = (d: Date | null | undefined) => (d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title="Aquecimento" description="Quem se cadastra no seu site (pelo anúncio ou indicado por alguém) recebe a mensagem na hora. Separado das Campanhas." />

      <Card className="p-5">
        <div className="mb-3 font-semibold">Como funciona</div>
        <ol className="grid gap-3 text-sm text-zinc-600 md:grid-cols-4">
          <li className="flex gap-2"><UserPlus className="size-5 shrink-0 text-orange-500" /> A pessoa se cadastra no seu site (anúncio ou indicação).</li>
          <li className="flex gap-2"><Send className="size-5 shrink-0 text-orange-500" /> O site avisa o Fuzil (webhook) e ela recebe a mensagem na hora.</li>
          <li className="flex gap-2"><Heart className="size-5 shrink-0 text-orange-500" /> Tocou em Amém: o fluxo manda o link para ela cadastrar outra pessoa.</li>
          <li className="flex gap-2"><Repeat className="size-5 shrink-0 text-orange-500" /> Quem indicou recebe a confirmação, e o ciclo continua.</li>
        </ol>
      </Card>

      <Card className="p-5">
        <div className="mb-3 font-semibold">Novo aquecimento</div>
        <ActionForm action={createWarmupAction} submit="Criar aquecimento" className="flex flex-wrap items-end gap-3 [&>div]:mt-0">
          <Field label="Nome"><Input name="name" required maxLength={100} placeholder="Ex.: Minuto de Bênção" className="w-72" /></Field>
        </ActionForm>
      </Card>

      {!list.length && <Empty icon={<Flame className="size-6" />}>Nenhum aquecimento ainda.</Empty>}
      <div className="space-y-3">
        {list.map((c) => {
          const n = counts.find((x) => x.campaignId === c.id);
          const s = sent.find((x) => x.campaignId === c.id)?._count ?? 0;
          return (
            <Link key={c.id} href={`/campanhas/${c.id}?etapa=${c.templateName ? "audiencia" : "template"}`} className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-orange-300">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-600"><Flame className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-zinc-900">{c.name}</span>
                    <CampaignStatusBadge s={c.status} />
                    {c.leadToken ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"><Globe className="size-3" /> Site ligado</span> : <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">Site desligado</span>}
                    {!c.flowId && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">Sem fluxo do Amém</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {(n?._count ?? 0).toLocaleString("pt-BR")} cadastro(s) · {s.toLocaleString("pt-BR")} enviada(s) · último cadastro {when(n?._max.createdAt)}
                  </div>
                </div>
                <span className="text-sm font-medium text-orange-600">Abrir →</span>
              </div>
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-zinc-400">Endereço base dos cadastros: {env.appUrl()}/api/leads/…</p>
    </div>
  );
}
