// Apagar os números que dispararam uma campanha (opção da campanha: X horas depois de concluir, ou na hora pelo botão).
// O número sai da conta do WhatsApp na Meta e some do Fuzil. Número que outra campanha ativa usa (inclusive aquecimento) fica.
import { prisma } from "./db";
import { meta } from "./meta";
import { createAlert } from "./alerts";
import { PHONE_REMOVED, wabaToken } from "./sync";
import { formatPhone } from "./phone";

export async function deleteCampaignSenders(campaignId: string): Promise<{ deleted: number; kept: number; failed: number }> {
  const c = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true, name: true, workspaceId: true, sendersDeletedAt: true } });
  if (!c) return { deleted: 0, kept: 0, failed: 0 };
  // Marca antes (não roda duas vezes se o worker e o botão baterem juntos)
  const claim = await prisma.campaign.updateMany({ where: { id: campaignId, sendersDeletedAt: null }, data: { sendersDeletedAt: new Date() } });
  if (!claim.count) return { deleted: 0, kept: 0, failed: 0 };

  const used = await prisma.campaignRecipient.findMany({ where: { campaignId, sentAt: { not: null }, senderId: { not: null } }, distinct: ["senderId"], select: { senderId: true } });
  const ids = used.map((u) => u.senderId!).filter(Boolean);
  const phones = await prisma.phoneNumber.findMany({ where: { id: { in: ids }, waba: { workspaceId: c.workspaceId } }, include: { waba: true } });

  // BMs dos grupos de outras campanhas ainda ativas (rodando, pausadas, agendadas, aquecimento ligado): os números delas ficam
  const active = await prisma.campaign.findMany({
    where: { workspaceId: c.workspaceId, id: { not: campaignId }, status: { in: ["RUNNING", "PAUSED", "SCHEDULED"] }, groupId: { not: null } },
    select: { groupId: true },
  });
  const busyBms = new Set(
    (await prisma.bmGroupMember.findMany({ where: { groupId: { in: active.map((a) => a.groupId!) } }, select: { businessId: true } })).map((m) => m.businessId),
  );

  let deleted = 0, kept = 0, failed = 0;
  const failedList: string[] = [];
  for (const p of phones) {
    if (p.invalidReason === PHONE_REMOVED) continue;
    if (busyBms.has(p.waba.businessId)) {
      kept++;
      continue;
    }
    try {
      const r = await meta.deletePhone(wabaToken(p.waba), p.phoneNumberId);
      if (r.deleted || r.gone || r.deregistered) {
        await prisma.phoneNumber.update({ where: { id: p.id }, data: { invalidReason: PHONE_REMOVED, enabled: false } });
        deleted++;
      } else {
        failed++;
        failedList.push(formatPhone(p.displayPhoneNumber.replace(/\D/g, "")));
      }
    } catch {
      failed++;
      failedList.push(formatPhone(p.displayPhoneNumber.replace(/\D/g, "")));
    }
  }

  await createAlert({
    workspaceId: c.workspaceId,
    type: "CAMPAIGN_COMPLETED",
    severity: "INFO",
    title: `Números da campanha "${c.name}" apagados`,
    message: [
      `${deleted} número(s) apagado(s) das BMs.`,
      kept ? `${kept} ficaram porque outra campanha ativa (ou aquecimento) usa a mesma BM.` : "",
      failed ? `${failed} a Meta não deixou apagar: ${failedList.slice(0, 5).join(", ")}${failedList.length > 5 ? "…" : ""} (apague no WhatsApp Manager).` : "",
    ].filter(Boolean).join(" "),
    data: { campaignId },
  }).catch(() => undefined);
  return { deleted, kept, failed };
}

/** Roda no worker: apaga os números das campanhas concluídas que pediram, quando chega a hora. */
export async function sweepSenderCleanup() {
  const due = await prisma.campaign.findMany({
    where: { status: "COMPLETED", deleteSendersAfterHours: { not: null }, sendersDeletedAt: null, completedAt: { not: null } },
    select: { id: true, completedAt: true, deleteSendersAfterHours: true },
    take: 50,
  });
  for (const c of due) {
    if (c.completedAt!.getTime() + (c.deleteSendersAfterHours ?? 0) * 3600_000 > Date.now()) continue;
    await deleteCampaignSenders(c.id).catch((e) => console.error("[apagar números]", c.id, e instanceof Error ? e.message : e));
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Exclui o número da BM na Meta de todo jeito: descadastra e apaga, tentando de novo algumas vezes. */
async function forceDeletePhone(token: string, phoneNumberId: string): Promise<{ deleted: boolean; deregistered: boolean }> {
  let deregistered = false;
  for (let i = 0; i < 4; i++) {
    const r = await meta.deletePhone(token, phoneNumberId).catch(() => ({ deleted: false, deregistered: false, gone: false }));
    deregistered ||= r.deregistered;
    if (r.deleted || r.gone) return { deleted: true, deregistered: true };
    await sleep(1500 * (i + 1));
  }
  return { deleted: false, deregistered };
}

/**
 * Opção da campanha (só admins do Fuzil): número que falhou X envios NESTA campanha (no total) sai do rodízio na hora
 * e é excluído da BM na Meta (força, tentando de novo). Chamado a cada rodada do disparo e também pelo worker
 * (falhas que a Meta avisa depois, pelo webhook).
 */
export async function autoDeleteFailingForCampaign(campaignId: string) {
  const c = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true, name: true, workspaceId: true, autoDeleteFailures: true } });
  if (!c?.autoDeleteFailures) return 0;
  const limit = Math.max(1, c.autoDeleteFailures);
  const rows = await prisma.$queryRaw<Array<{ senderId: string; n: bigint }>>`
    SELECT "senderId", COUNT(*) AS n FROM "CampaignRecipient"
    WHERE "campaignId" = ${c.id} AND status = 'FAILED' AND "senderId" IS NOT NULL
    GROUP BY "senderId" HAVING COUNT(*) >= ${limit}`;
  if (!rows.length) return 0;
  const phones = await prisma.phoneNumber.findMany({
    where: { id: { in: rows.map((r) => r.senderId) }, waba: { workspaceId: c.workspaceId }, OR: [{ invalidReason: null }, { invalidReason: { not: PHONE_REMOVED } }] },
    include: { waba: { include: { business: { select: { name: true } } } } },
  });
  // Primeiro tira todos do rodízio (na hora), depois exclui na Meta um por um (com novas tentativas)
  const claimed: typeof phones = [];
  for (const p of phones) {
    const claim = await prisma.phoneNumber.updateMany({ where: { id: p.id, OR: [{ invalidReason: null }, { invalidReason: { not: PHONE_REMOVED } }] }, data: { invalidReason: PHONE_REMOVED, enabled: false } });
    if (claim.count) claimed.push(p);
  }
  for (const p of claimed) {
    const n = Number(rows.find((r) => r.senderId === p.id)?.n ?? 0);
    const label = formatPhone(p.displayPhoneNumber.replace(/\D/g, ""));
    let r = { deleted: false, deregistered: false };
    try {
      r = await forceDeletePhone(wabaToken(p.waba), p.phoneNumberId);
    } catch {
      /* sem token: fica só fora do rodízio */
    }
    await createAlert({
      workspaceId: c.workspaceId,
      type: "BM_PROBLEM",
      severity: "WARNING",
      title: `Número ${label} excluído: ${n} falhas na campanha "${c.name}"`,
      message: `O número ${label} (BM ${p.waba.business.name}) falhou ${n} envios na campanha "${c.name}". ${r.deleted ? "Ele foi excluído da BM na Meta e saiu do Fuzil." : r.deregistered ? "Ele foi descadastrado da API e saiu do rodízio; a Meta não deixou apagar de vez (apague no WhatsApp Manager para liberar a vaga)." : "Ele saiu do rodízio do Fuzil, mas a Meta recusou excluir: apague no WhatsApp Manager."}`,
      data: { campaignId: c.id },
    }).catch(() => undefined);
  }
  return claimed.length;
}

/** Worker, a cada minuto: campanhas com a opção ligada (rodando ou que terminaram há pouco, para pegar falhas que chegam depois). */
export async function autoDeleteFailingPhones() {
  const camps = await prisma.campaign.findMany({
    where: { autoDeleteFailures: { not: null }, OR: [{ status: { in: ["RUNNING", "PAUSED"] } }, { status: "COMPLETED", completedAt: { gt: new Date(Date.now() - 6 * 3600_000) } }] },
    select: { id: true },
  });
  for (const c of camps) await autoDeleteFailingForCampaign(c.id).catch((e) => console.error("[números com falha]", c.id, e instanceof Error ? e.message : e));
}
