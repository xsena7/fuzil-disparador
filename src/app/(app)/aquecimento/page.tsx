import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { funnelPage, funnelUrl } from "@/lib/funnels";
import { StatusDot, MetaItem, Drawer } from "@/components/drawer";
import { Empty, Field, Input, PageHeader, Select } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { createFunnelAction } from "@/app/actions/funnels";

export const dynamic = "force-dynamic";

export default async function WarmupPage() {
  const auth = await requireAuth();
  const ws = auth.workspace.id;
  const [funnels, groups, counts] = await Promise.all([
    prisma.funnel.findMany({ where: { workspaceId: ws }, orderBy: { createdAt: "desc" } }),
    prisma.bmGroup.findMany({ where: { workspaceId: ws, system: null }, orderBy: { name: "asc" } }),
    prisma.lead.groupBy({ by: ["funnelId", "status"], where: { workspaceId: ws }, _count: true }),
  ]);
  const count = (id: string, status?: string) => counts.filter((c) => c.funnelId === id && (!status || c.status === status)).reduce((a, c) => a + c._count, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Aquecimento"
        description="Página de vagas num domínio seu → a pessoa se inscreve → recebe um código no WhatsApp → entra num funil de mensagens com timers. Cada mensagem sai pelo rodízio de um grupo de BM: aquece as contas com gente real e ainda gera uma lista de contatos."
      />

      {funnels.length ? (
        <div className="space-y-2">
          {funnels.map((f) => (
            <Link
              key={f.id}
              href={`/aquecimento/${f.id}`}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 shadow-sm hover:bg-zinc-50"
            >
              <StatusDot tone={f.status === "ACTIVE" ? "green" : "gray"} title={f.status === "ACTIVE" ? "Rodando" : "Pausado"} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{f.name}</span>
                <span className="block truncate text-xs text-zinc-500">
                  {funnelUrl(f).replace(/^https?:\/\//, "")} · {funnelPage(f).jobs.filter((j) => j.open).length} vagas abertas
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-x-4 text-xs text-zinc-500">
                <MetaItem value={count(f.id)} label="inscritos" />
                <MetaItem value={count(f.id, "VERIFIED") + count(f.id, "COMPLETED")} label="confirmados" />
                <MetaItem value={count(f.id, "COMPLETED")} label="cadastros" />
              </span>
              <ChevronRight className="size-4 text-zinc-400" />
            </Link>
          ))}
        </div>
      ) : (
        <Empty icon={<Flame className="size-6" />}>
          <p>Nenhum funil ainda. Crie o primeiro abaixo: ele já vem com página de vagas, perguntas, mensagens e timers prontos.</p>
        </Empty>
      )}

      <Drawer title="Novo funil" subtitle="Leva 10 segundos. Depois é só ajustar as vagas e textos" open={!funnels.length}>
        {groups.length ? (
          <ActionForm action={createFunnelAction} submit="Criar funil">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Nome (só você vê)">
                <Input name="name" required placeholder="Vagas tech" />
              </Field>
              <Field label="Endereço" hint="Usado em /v/endereco enquanto não tiver domínio próprio">
                <Input name="slug" placeholder="vagas-tech" />
              </Field>
              <Field label="Grupo de BM que dispara">
                <Select name="groupId" required defaultValue="">
                  <option value="" disabled>
                    Escolha
                  </option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </ActionForm>
        ) : (
          <p className="text-zinc-500">
            Primeiro crie um grupo de BM em{" "}
            <Link href="/grupos" className="text-brand-700 underline">
              Grupos de BM
            </Link>{" "}
            com as BMs que você quer aquecer.
          </p>
        )}
      </Drawer>
    </div>
  );
}
