import { createCampaignAction } from "@/app/actions/campaigns";
import { ActionForm } from "@/components/action-form";
import { Card, Field, Input, PageHeader } from "@/components/ui";

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Nova campanha" />
      <Card className="p-5" data-tour="new-campaign">
        <ActionForm action={createCampaignAction} submit="Continuar">
          <Field label="Nome da campanha" hint="Ex.: FELIPE 07/10 16H"><Input name="name" required autoFocus /></Field>
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium text-zinc-700">Onde vai disparar?</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer gap-3 rounded-xl border border-zinc-200 p-3 has-[:checked]:border-zinc-900 has-[:checked]:ring-1 has-[:checked]:ring-zinc-900">
                <input type="radio" name="scope" value="GROUP" defaultChecked className="mt-1 accent-zinc-900" />
                <span><b className="block font-semibold">Grupo de BMs</b><span className="text-xs text-zinc-500">Soma as BMs do grupo e distribui os envios entre todos os números</span></span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-xl border border-zinc-200 p-3 has-[:checked]:border-zinc-900 has-[:checked]:ring-1 has-[:checked]:ring-zinc-900">
                <input type="radio" name="scope" value="BM" className="mt-1 accent-zinc-900" />
                <span><b className="block font-semibold">Uma BM só</b><span className="text-xs text-zinc-500">Dispara só de uma BM, com os templates dela</span></span>
              </label>
            </div>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
