import { Sparkles } from "lucide-react";
import { CHANGELOG } from "@/version";
import { requireAuth } from "@/lib/auth";
import { Badge, Card, PageHeader } from "@/components/ui";

const ADMIN = "[admin] ";

export default async function NovidadesPage() {
  const auth = await requireAuth();
  const admin = auth.user.isSuperAdmin;
  // Itens marcados "[admin]" (ferramentas internas do Fuzil) só aparecem para administradores
  const versions = CHANGELOG.map((v) => ({ ...v, items: v.items.filter((i) => admin || !i.startsWith(ADMIN)) })).filter((v) => v.items.length);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Novidades" description="O que mudou em cada versão do Fuzil Disparador." />
      <div className="space-y-4">
        {versions.map((v, i) => (
          <Card key={v.version} className="p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Sparkles className="size-4" /></div>
              <span className="text-lg font-semibold">v{v.version}</span>
              {i === 0 && <Badge color="orange">Atual</Badge>}
              <span className="ml-auto text-xs text-zinc-500">{v.date}</span>
            </div>
            <ul className="space-y-1.5 text-sm text-zinc-700">
              {v.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" />
                  <span>
                    {item.startsWith(ADMIN) && <span className="mr-1.5 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">só admin</span>}
                    {item.startsWith(ADMIN) ? item.slice(ADMIN.length) : item}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
