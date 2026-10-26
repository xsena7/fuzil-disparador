import Link from "next/link";
import { ExternalLink, FileBarChart, Link2, QrCode, RotateCcw, SlidersHorizontal } from "lucide-react";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { Card, Field, Input, Select } from "@/components/ui";
import { parsePixKeys } from "@/lib/pix-keys";
import { realReportNumbers, reportNumbers } from "@/lib/report-numbers";
import { ReportNumbersFields } from "./report-numbers-fields";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { resetReportNumbersAction, saveCampaignPriceAction, saveReportNumbersAction, shareReportAction, unshareReportAction } from "@/app/actions/client-report";
import { CopyLink } from "./copy-link";
import { Countdown } from "@/components/countdown";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Aba "Relatório do cliente": valor cobrado, Pix e o link público do relatório. */
export async function ClientReportStep({ campaignId, workspaceId, canAdjust = false }: { campaignId: string; workspaceId: string; canAdjust?: boolean }) {
  const [c, ws] = await Promise.all([
    prisma.campaign.findFirstOrThrow({ where: { id: campaignId, workspaceId }, select: { reportPrice: true, reportPixKeyId: true, shareToken: true, shareExpiresAt: true, reportOverrides: true } }),
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { pixKeys: true, reportPrice: true } }),
  ]);
  // Enviadas do relatório (as ajustadas em Métricas, se você ajustou)
  const [rn, real] = await Promise.all([reportNumbers(campaignId, c.reportOverrides), realReportNumbers(campaignId)]);
  const sent = rn.sent;
  const price = c.reportPrice ?? ws.reportPrice ?? 0;
  const keys = parsePixKeys(ws.pixKeys);
  const total = Math.round(sent * price * 100) / 100;
  const alive = c.shareToken && c.shareExpiresAt && c.shareExpiresAt > new Date();
  const url = alive ? `${env.appUrl()}/relatorio/p/${c.shareToken}` : null;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Relatório do cliente</h2>
        <p className="text-sm text-zinc-500">O relatório que você manda para o cliente: resultados da campanha, o valor a pagar e a sua chave Pix.</p>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold"><QrCode className="size-4 text-brand-500" /> Valor a cobrar</div>
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-bold tracking-tight text-brand-gradient">{brl(total)}</span>
          <span className="text-sm text-zinc-500">{sent.toLocaleString("pt-BR")} enviadas × {brl(price)}</span>
          {rn.adjusted && canAdjust && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200">com os números ajustados abaixo</span>}
        </div>
        <ActionForm action={saveCampaignPriceAction.bind(null, campaignId)} submit="Salvar" variant="secondary">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Valor por mensagem nesta campanha (R$)" hint={ws.reportPrice != null ? `Em branco = o padrão das Configurações (${brl(ws.reportPrice)})` : "Em branco = sem cobrança. Dá para definir um padrão em Configurações"}>
              <Input name="reportPrice" defaultValue={c.reportPrice != null ? String(c.reportPrice).replace(".", ",") : ""} placeholder={ws.reportPrice != null ? String(ws.reportPrice).replace(".", ",") : "0,25"} inputMode="decimal" />
            </Field>
            {keys.length > 0 && (
              <Field label="Chave Pix que aparece no relatório">
                <Select name="reportPixKeyId" defaultValue={c.reportPixKeyId ?? keys[0].id}>
                  {keys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.key}{k.bank ? ` · ${k.bank}` : ""}{k.name ? ` · ${k.name}` : ""}
                    </option>
                  ))}
                  {keys.length > 1 && <option value="ALL">Todas as chaves</option>}
                </Select>
              </Field>
            )}
          </div>
        </ActionForm>
        {!keys.length && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Falta cadastrar sua chave Pix: vá em <Link href="/configuracoes" className="font-medium underline">Configurações → Cobrança no relatório do cliente</Link>.
          </p>
        )}
      </Card>

      {/* Ajustar os números: só administradores do Fuzil */}
      {canAdjust && (
      <Card className="p-5">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <SlidersHorizontal className="size-4 text-brand-500" /> Números do relatório
          {rn.adjusted && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">ajustados por você</span>}
        </div>
        <p className="mb-4 text-sm text-zinc-500">
          Se a Meta cobrou diferente do que o Fuzil contou (ex.: conta banida no meio do disparo), ajuste aqui. O valor cobrado usa as <b>Enviadas</b>, e o funil do relatório (inclusive o que aparece ao passar o mouse) usa todos estes números. Depois de salvar, eles continuam subindo ao vivo junto com os reais, na mesma proporção (ex.: real 200 cliques, você colocou 2.000; o real foi a 250, o relatório mostra 2.500). As Métricas continuam mostrando os números reais.
        </p>
        <p className="mb-4 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">Os números precisam fechar: <b>Público ≥ Enviadas ≥ Lidas ≥ Clicaram</b>, e <b>Responderam ≤ Lidas</b>.</p>
        <ActionForm action={saveReportNumbersAction.bind(null, campaignId)} submit="Salvar números" variant="secondary">
          <ReportNumbersFields
            real={{ total: real.total, sent: real.sent, read: real.read, clicked: real.clicked, replied: real.replied }}
            initial={rn.adjusted ? { total: rn.total, sent: rn.sent, read: rn.read, clicked: rn.clicked, replied: rn.replied } : { total: real.total, sent: real.sent, read: real.read, clicked: real.clicked, replied: real.replied }}
          />
        </ActionForm>
        {rn.adjusted && (
          <div className="mt-3">
            <ConfirmButton action={resetReportNumbersAction.bind(null, campaignId)} variant="ghost" className="text-zinc-600" confirm={"Voltar aos números reais?\nO relatório do cliente volta a mostrar os números de verdade da campanha."}>
              <RotateCcw className="size-4" /> Voltar aos números reais
            </ConfirmButton>
          </div>
        )}
      </Card>
      )}

      <Card className="p-5">
        <div className="mb-1 flex items-center gap-2 font-semibold"><Link2 className="size-4 text-brand-500" /> Link para o cliente</div>
        <p className="mb-4 text-sm text-zinc-500">Ele abre o relatório sem precisar de login e vê os números atualizando ao vivo. O link fica no ar por 12 horas e depois é apagado sozinho. Os nomes e números das suas BMs não aparecem para ele.</p>
        {url ? (
          <div className="space-y-3">
            <CopyLink url={url} />
            <p className="flex items-center gap-1.5 text-sm text-zinc-600">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" /> No ar · sai do ar em <b className="font-semibold text-zinc-900"><Countdown to={c.shareExpiresAt!.toISOString()} done="instantes" /></b>
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50">
                <ExternalLink className="size-4" /> Abrir como o cliente vê
              </a>
              <ConfirmButton action={shareReportAction.bind(null, campaignId)} variant="secondary">
                Mais 12 horas
              </ConfirmButton>
              <ConfirmButton action={unshareReportAction.bind(null, campaignId)} variant="ghost" className="text-red-600" confirm={"Desligar o link do cliente?\nQuem tiver o endereço não consegue mais abrir o relatório. Se ligar de novo, o link muda."}>
                Desligar link
              </ConfirmButton>
            </div>
          </div>
        ) : (
          <ConfirmButton action={shareReportAction.bind(null, campaignId)} variant="primary">
            <Link2 className="size-4" /> Gerar link do cliente (12 horas)
          </ConfirmButton>
        )}
      </Card>

      <Link href={`/relatorio/${campaignId}`} target="_blank" className="flex items-center gap-3 rounded-2xl bg-[#0b0b0f] px-4 py-3 text-white shadow-sm transition hover:opacity-95">
        <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient"><FileBarChart className="size-5" /></span>
        <span className="flex-1">
          <span className="block font-semibold">Ver o relatório</span>
          <span className="block text-xs text-zinc-400">Com o valor e o Pix. Dá para salvar em PDF também.</span>
        </span>
        <span className="text-sm font-medium text-orange-300">Abrir →</span>
      </Link>
    </div>
  );
}
