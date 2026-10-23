import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getActiveAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseAudienceCsv } from "@/lib/audience";
import { audienceFileToCsv } from "@/lib/audience-file";
import { shortToken } from "@/lib/crypto";

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

  const buf = Buffer.from(await file.arrayBuffer());
  let text: string;
  try {
    text = await audienceFileToCsv(file.name, buf);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error && !/zip|corrupt|end of data/i.test(e.message) ? e.message : "Não consegui ler esse arquivo. Envie em Excel (.xlsx) ou CSV." }, { status: 400 });
  }
  const parsed = parseAudienceCsv(text);
  if (!parsed.columns.phone) return NextResponse.json({ error: "Não encontrei a coluna de telefone na planilha" }, { status: 400 });

  const phones = parsed.rows.map((r) => r.phone);
  const existing = new Set<string>();
  const optedOut = new Set<string>();
  for (let i = 0; i < phones.length; i += 10_000) {
    const found = await prisma.contact.findMany({
      where: { workspaceId: auth.workspace.id, phone: { in: phones.slice(i, i + 10_000) } },
      select: { phone: true, optedOut: true },
    });
    for (const c of found) {
      existing.add(c.phone);
      if (c.optedOut) optedOut.add(c.phone);
    }
  }

  const sendable = parsed.rows.filter((r) => !optedOut.has(r.phone));
  await prisma.campaignRecipient.deleteMany({ where: { campaignId: id } });
  for (let i = 0; i < sendable.length; i += 5000) {
    const chunk = sendable.slice(i, i + 5000);
    await prisma.campaignRecipient.createMany({
      // position = linha na planilha: a prévia e o disparo seguem a mesma ordem
      data: chunk.map((r, j) => ({ campaignId: id, phone: r.phone, name: r.name, data: r.data as Prisma.InputJsonValue, clickToken: shortToken(), position: i + j + 1 })),
      skipDuplicates: true,
    });
    await prisma.contact.createMany({
      data: chunk.map((r) => ({ workspaceId: auth.workspace.id, phone: r.phone, name: r.name, email: r.data.email || null })),
      skipDuplicates: true,
    });
  }

  const stats = {
    ...parsed.stats,
    optedOut: optedOut.size,
    sendable: sendable.length,
    alreadyKnown: existing.size,
    newContacts: parsed.rows.length - existing.size,
    columns: parsed.columns,
    headers: parsed.headers,
  };
  await prisma.campaign.update({
    where: { id },
    data: { audienceFileName: file.name, audienceStats: stats as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json({ ok: true, stats });
}
