import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LogsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSuperAdmin();
  const { q } = await searchParams;
  const logs = await prisma.systemLog.findMany({
    where: q ? { OR: [{ message: { contains: q, mode: "insensitive" } }, { digest: q }, { path: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"><ArrowLeft className="size-4" /> Admin</Link>
      <PageHeader title="Logs do sistema" description="Erros do site, do motor de disparo e do webhook da Meta. Os mesmos vão para o canal #erros do Discord." />
      <form className="mb-4">
        <input name="q" defaultValue={q} placeholder="Buscar por mensagem, página ou código (digest)..." className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm shadow-soft outline-none focus:border-brand-400" />
      </form>
      {logs.length === 0 && <Empty>Nenhum erro registrado. 🎉</Empty>}
      <div className="space-y-2">
        {logs.map((l) => (
          <details key={l.id} className="rounded-2xl border border-zinc-200/70 bg-white shadow-soft">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <Badge color={l.level === "error" ? "red" : "yellow"}>{l.source}</Badge>
              <span className="min-w-0 flex-1 truncate font-medium">{l.message}</span>
              {l.path && <span className="text-xs text-zinc-500">{l.path}</span>}
              {l.digest && <span className="font-mono text-xs text-zinc-400">#{l.digest}</span>}
              <span className="text-xs text-zinc-400">{l.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
            </summary>
            {l.detail && <pre className="overflow-x-auto border-t border-zinc-100 bg-zinc-50/70 px-4 py-3 text-xs text-zinc-700">{l.detail}</pre>}
          </details>
        ))}
      </div>
    </div>
  );
}
