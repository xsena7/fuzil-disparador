import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReportView } from "../../report-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Relatório de envio · Fuzil", robots: { index: false, follow: false } };

/** Link do cliente: o relatório sem login (só abre enquanto o link estiver ligado na campanha). */
export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{16,40}$/.test(token)) notFound();
  const c = await prisma.campaign.findUnique({ where: { shareToken: token }, select: { id: true, shareExpiresAt: true } });
  if (!c || !c.shareExpiresAt || c.shareExpiresAt < new Date()) {
    // Passou das 12h: apaga o link na hora (o worker também limpa)
    if (c) await prisma.campaign.update({ where: { id: c.id }, data: { shareToken: null, shareExpiresAt: null } });
    return (
      <div className="grid min-h-screen place-items-center bg-[#0b0b0f] px-5 text-center text-white">
        <div>
          <h1 className="text-2xl font-semibold">Este relatório saiu do ar</h1>
          <p className="mt-2 text-zinc-400">O link fica disponível por 12 horas. Peça um link novo para quem te enviou.</p>
        </div>
      </div>
    );
  }
  return <ReportView id={c.id} publicView expiresAt={c.shareExpiresAt} />;
}
