import { Download, Link2, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { Drawer } from "@/components/drawer";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { Field, Input, Select } from "@/components/ui";
import { usableGroupWhere } from "@/lib/bm-problems";
import { createBriefAction, deleteBriefAction, importBriefAction } from "@/app/actions/briefs";
import { CopyLink } from "./[id]/copy-link";

const when = (d: Date | null) => (d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");

/** Campanhas que o cliente preencheu pelo link (para importar) e os links por template. */
export async function BriefsPanel({ workspaceId, onlyReceived = false }: { workspaceId: string; onlyReceived?: boolean }) {
  const [briefs, blueprints, groups] = await Promise.all([
    prisma.campaignBrief.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.templateBlueprint.findMany({ where: { workspaceId, category: "UTILITY" }, select: { name: true, language: true }, orderBy: { name: "asc" } }),
    prisma.bmGroup.findMany({ where: { workspaceId, ...usableGroupWhere }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const received = briefs.filter((b) => b.status === "SUBMITTED");
  const others = briefs.filter((b) => b.status !== "SUBMITTED");
  const base = env.appUrl().replace(/\/$/, "");
  const tplOptions = [...new Map(blueprints.map((b) => [`${b.name}|${b.language}`, b])).values()];

  return (
    <div className="mb-6 space-y-3">
      {received.length > 0 && (
        <Drawer title={<span className="flex items-center gap-2"><Download className="size-4 text-brand-500" /> Campanhas prontas para importar</span>} tone="green" open meta={<span>{received.length} enviada(s) pelo cliente</span>}>
          <div className="space-y-3">
            {received.map((b) => (
              <div key={b.id} className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-semibold text-zinc-900">{b.campaignName || b.label}</span>
                  <span className="text-xs text-zinc-500">link “{b.label}” · template {b.templateName} · recebida {when(b.submittedAt)}</span>
                </div>
                <div className="mt-1 text-sm text-zinc-600">
                  {b.audienceRows ? `${b.audienceRows.toLocaleString("pt-BR")} contatos` : "sem planilha"}
                  {b.headerMediaUrl ? " · com imagem" : ""}
                  {b.buttonUrl ? ` · botão: ${b.buttonUrl}` : ""}
                  {b.profilePhoto ? " · com foto de perfil" : ""}
                </div>
                {b.notes && <p className="mt-1 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">Observação: {b.notes}</p>}
                <ActionForm action={importBriefAction.bind(null, b.id)} submit="Importar campanha" className="mt-3 flex flex-wrap items-end gap-3 [&>div]:mt-0">
                  <Field label="Disparar pelo grupo">
                    <Select name="groupId" required defaultValue="">
                      <option value="" disabled>Escolha o grupo de BMs</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </Select>
                  </Field>
                </ActionForm>
              </div>
            ))}
          </div>
        </Drawer>
      )}

      {!onlyReceived && <Drawer title={<span className="flex items-center gap-2"><Link2 className="size-4 text-brand-500" /> Links para o cliente montar a campanha</span>} meta={<span>{briefs.filter((b) => b.status === "OPEN").length} esperando o cliente</span>}>
        <p className="mb-4 text-sm text-zinc-500">
          Gere um link por template e mande para o cliente. Ele preenche o nome da campanha, as variáveis, a imagem, o link do botão, a planilha e a foto de perfil. Quando ele enviar, a campanha aparece aqui para importar: é só escolher o grupo.
        </p>
        <ActionForm action={createBriefAction} submit="Gerar link" className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end [&>div]:mt-0">
          <Field label="Template padrão">
            <Select name="template" required defaultValue="">
              <option value="" disabled>Escolha o template</option>
              {tplOptions.map((t) => <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>{t.name} ({t.language})</option>)}
            </Select>
          </Field>
          <Field label="Nome do link (só você vê)">
            <Input name="label" placeholder="Ex.: Cliente Sávio · aviso" maxLength={80} />
          </Field>
        </ActionForm>
        {others.length > 0 && (
          <ul className="mt-5 divide-y divide-zinc-100 rounded-2xl border border-zinc-200">
            {others.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-[12rem] flex-1">
                  <div className="font-medium text-zinc-900">{b.label}</div>
                  <div className="text-xs text-zinc-500">template {b.templateName} · {b.status === "IMPORTED" ? "importada" : "esperando o cliente"}</div>
                </div>
                {b.status === "OPEN" && <div className="w-full max-w-md"><CopyLink url={`${base}/briefing/${b.token}`} /></div>}
                {b.status === "IMPORTED" && b.importedCampaignId && <a href={`/campanhas/${b.importedCampaignId}`} className="text-sm font-medium text-brand-600 hover:underline">Abrir campanha</a>}
                <ConfirmButton action={deleteBriefAction.bind(null, b.id)} variant="ghost" className="text-red-600" confirm={`Apagar o link "${b.label}"? O cliente não consegue mais abrir.`}><Trash2 className="size-4" /></ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </Drawer>}
    </div>
  );
}
