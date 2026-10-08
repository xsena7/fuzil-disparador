import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseAudienceCsv } from "@/lib/audience";
import { shortToken } from "@/lib/crypto";

export const maxDuration = 300;

/** Recebe a planilha (CSV), valida e substitui a audiência da campanha. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, workspaceId: auth.workspace.id } });
  if (!campaign) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
  if (!["DRAFT", "SCHEDULED"].includes(campaign.status)) return NextResponse.json({ error: "Campanha já iniciada" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Envie um arquivo CSV" }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "Arquivo muito grande (máx. 50 MB)" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  // Planilhas exportadas do Excel BR costumam vir em latin1
  let text = buf.toString("utf8");
  if (text.includes("�")) text = buf.toString("latin1");
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
      data: chunk.map((r) => ({ campaignId: id, phone: r.phone, name: r.name, data: r.data as Prisma.InputJsonValue, clickToken: shortToken() })),
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
