import { requireAuth } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { Hygiene } from "./hygiene";

export const dynamic = "force-dynamic";

export default async function HigienizacaoPage() {
  await requireAuth();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Higienização"
        description="Confere se os números da sua lista têm WhatsApp antes de disparar. Quem não tem, sai da lista e não gasta crédito nem limite da BM."
      />
      <Hygiene />
    </div>
  );
}
