import { requireAuth } from "@/lib/auth";
import { ReportView } from "../report-view";

export const dynamic = "force-dynamic";

/** Relatório da campanha (visão do dono, com login). */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  const { id } = await params;
  return <ReportView id={id} workspaceId={auth.workspace.id} />;
}
