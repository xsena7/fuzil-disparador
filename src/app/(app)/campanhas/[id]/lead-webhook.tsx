import { Globe, UserPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { Card, Field } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { disableLeadWebhookAction, enableLeadWebhookAction, saveLeadConfirmAction } from "@/app/actions/campaigns";
import { CopyLink } from "./copy-link";
import { LEAD_CONFIRM_EXAMPLE } from "@/lib/leads";

/** Cadastro pelo site: o site manda cada contato para o Fuzil e ele recebe a mensagem na hora. */
export async function LeadWebhookCard({ campaignId }: { campaignId: string }) {
  const c = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { leadToken: true, leadConfirmText: true, status: true } });
  const url = c.leadToken ? `${env.appUrl()}/api/leads/${c.leadToken}` : null;
  const received = url ? await prisma.campaignRecipient.count({ where: { campaignId } }) : 0;
  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <Globe className="size-4 text-brand-500" /> Receber cadastros do seu site
        {url && <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Ligado · {received.toLocaleString("pt-BR")} contato(s)</span>}
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Quem se cadastrar no seu site entra neste aquecimento e recebe a mensagem na mesma hora (com ele iniciado). Ele fica sempre aberto esperando os próximos.
      </p>
      <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
        <b>O link é sempre o mesmo.</b> Coloque no site uma vez só: quando você cria um aquecimento novo, o link passa para ele sozinho (com a mesma mensagem de confirmação) e o anterior para de receber cadastros.
      </p>
      {!url ? (
        <ConfirmButton action={enableLeadWebhookAction.bind(null, campaignId)} variant="primary">
          <UserPlus className="size-4" /> Receber os cadastros do site aqui
        </ConfirmButton>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-xs font-semibold text-zinc-600">Endereço para o seu site chamar (webhook)</div>
            <CopyLink url={url} />
          </div>
          <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 ring-1 ring-zinc-200">
            <div className="mb-1 font-semibold">Como o site deve mandar (POST, JSON ou formulário):</div>
            <ul className="list-disc space-y-0.5 pl-4">
              <li><b>telefone</b>: obrigatório, com DDD (ex.: 11999998888)</li>
              <li><b>nome</b>: opcional (vira a coluna nome para as variáveis)</li>
              <li><b>indicado_por</b>: opcional, telefone de quem cadastrou a pessoa (recebe a confirmação abaixo)</li>
              <li>Outros campos também entram como colunas, com o mesmo nome.</li>
            </ul>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-900 p-2 text-[11px] text-zinc-100">{`{ "telefone": "11999998888", "nome": "Maria", "indicado_por": "11988887777" }`}</pre>
            <p className="mt-2">Dica: mande um cadastro de teste primeiro. Assim as colunas aparecem em <b>Conteúdo</b> para ligar nas variáveis.</p>
            <p className="mt-2">
              <b>Indicação:</b> no fluxo do Amém, mande o link do site com o telefone de quem está indicando, assim:{" "}
              <code className="rounded bg-white px-1 py-0.5 ring-1 ring-zinc-200">https://seusite.com.br/cadastro?ref={"{{telefone}}"}</code>. O site guarda esse <b>ref</b> e manda como <b>indicado_por</b>.
            </p>
          </div>
          <ActionForm action={saveLeadConfirmAction.bind(null, campaignId)} submit="Salvar confirmação" variant="secondary">
            <Field label="Mensagem para quem indicou (vai para o campo indicado_por)" hint={`${c.leadConfirmText === null ? "Exemplo pronto: ajuste se quiser e clique em Salvar confirmação para ativar. " : ""}Só chega se essa pessoa falou com o seu número nas últimas 24h (regra da Meta). {nome} = nome de quem foi cadastrado. Vazio = não manda.`}>
              <textarea name="leadConfirmText" defaultValue={c.leadConfirmText ?? LEAD_CONFIRM_EXAMPLE} rows={3} maxLength={1000} placeholder="Amém! 🙏 {nome} foi cadastrado(a) com sucesso e já vai começar a receber o Minuto de Bênção." className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </Field>
          </ActionForm>
          <ConfirmButton action={disableLeadWebhookAction.bind(null, campaignId)} variant="ghost" className="text-xs text-red-600" confirm={"Desligar o cadastro pelo site?\\nO link para de funcionar e, quando ligar de novo, vem um link NOVO (o site vai precisar trocar). Para só trocar de aquecimento, não precisa desligar: crie o novo que o link passa para ele."}>
            Desligar cadastro pelo site
          </ConfirmButton>
        </div>
      )}
    </Card>
  );
}
