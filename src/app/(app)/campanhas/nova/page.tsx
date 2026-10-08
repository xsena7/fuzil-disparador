import { createCampaignAction } from "@/app/actions/campaigns";
import { ActionForm } from "@/components/action-form";
import { Card, Field, Input, PageHeader } from "@/components/ui";

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Nova campanha" />
      <Card className="p-5">
        <ActionForm action={createCampaignAction} submit="Continuar">
          <Field label="Nome da campanha" hint="Ex.: FELIPE 07/10 16H"><Input name="name" required autoFocus /></Field>
        </ActionForm>
      </Card>
    </div>
  );
}
