// Importa a planilha (Excel ou CSV) para a audiência de uma campanha. Usado na etapa Audiência e ao importar
// uma campanha que o cliente preencheu pelo link.
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { parseAudienceCsv } from "./audience";
import { audienceFileToCsv } from "./audience-file";
import { shortToken } from "./crypto";

/** Lê a planilha e devolve as linhas (erro em português se não der para ler ou não tiver telefone). */
export async function readAudienceFile(fileName: string, buf: Buffer) {
  let text: string;
  try {
    text = await audienceFileToCsv(fileName, buf);
  } catch (e) {
    throw new Error(e instanceof Error && !/zip|corrupt|end of data/i.test(e.message) ? e.message : "Não consegui ler esse arquivo. Envie em Excel (.xlsx) ou CSV.");
  }
  const parsed = parseAudienceCsv(text);
  if (!parsed.columns.phone) throw new Error("Não encontrei a coluna de telefone na planilha");
  return parsed;
}

/** Substitui a audiência da campanha pela planilha e guarda o resumo (mesma regra da etapa Audiência). */
export async function importAudience(campaignId: string, workspaceId: string, fileName: string, buf: Buffer) {
  const parsed = await readAudienceFile(fileName, buf);
  const phones = parsed.rows.map((r) => r.phone);
  const existing = new Set<string>();
  const optedOut = new Set<string>();
  for (let i = 0; i < phones.length; i += 10_000) {
    const found = await prisma.contact.findMany({
      where: { workspaceId, phone: { in: phones.slice(i, i + 10_000) } },
      select: { phone: true, optedOut: true },
    });
    for (const c of found) {
      existing.add(c.phone);
      if (c.optedOut) optedOut.add(c.phone);
    }
  }

  const sendable = parsed.rows.filter((r) => !optedOut.has(r.phone));
  await prisma.campaignRecipient.deleteMany({ where: { campaignId } });
  for (let i = 0; i < sendable.length; i += 5000) {
    const chunk = sendable.slice(i, i + 5000);
    await prisma.campaignRecipient.createMany({
      // position = linha na planilha: a prévia e o disparo seguem a mesma ordem
      data: chunk.map((r, j) => ({ campaignId, phone: r.phone, name: r.name, data: r.data as Prisma.InputJsonValue, clickToken: shortToken(), position: i + j + 1 })),
      skipDuplicates: true,
    });
    await prisma.contact.createMany({
      data: chunk.map((r) => ({ workspaceId, phone: r.phone, name: r.name, email: r.data.email || null })),
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
    where: { id: campaignId },
    data: { audienceFileName: fileName, audienceStats: stats as unknown as Prisma.InputJsonValue },
  });
  return stats;
}
