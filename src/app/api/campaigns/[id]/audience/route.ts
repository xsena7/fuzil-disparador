import { NextResponse } from "next/server";
import { getActiveAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { importAudience } from "@/lib/audience-import";

export const maxDuration = 300;

/** Recebe a planilha (Excel ou CSV), valida e substitui a audiência da campanha. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getActiveAuth();
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!campaign) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
  if (!["DRAFT", "SCHEDULED"].includes(campaign.status)) return NextResponse.json({ error: "Campanha já iniciada" }, { status: 400 });
  // Agendada: volta para rascunho durante a troca, senão o agendamento podia começar com a lista pela metade
  if (campaign.status === "SCHEDULED") {
    const back = await prisma.campaign.updateMany({ where: { id, status: "SCHEDULED" }, data: { status: "DRAFT" } });
    if (!back.count) return NextResponse.json({ error: "A campanha acabou de começar. Atualize a página." }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Envie a planilha (Excel ou CSV)" }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "Arquivo muito grande (máx. 50 MB)" }, { status: 400 });

  try {
    const stats = await importAudience(id, auth.workspace.id, file.name, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não consegui ler esse arquivo." }, { status: 400 });
  }
}
