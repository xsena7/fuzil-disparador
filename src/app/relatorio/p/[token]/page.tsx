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
  const c = await prisma.campaign.findUnique({ where: { shareToken: token }, select: { id: true } });
  if (!c) notFound();
  return <ReportView id={c.id} publicView />;
}
