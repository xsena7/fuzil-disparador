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
