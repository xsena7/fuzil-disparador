// Só admins do Fuzil: excluir da BM o número que falhar X envios numa campanha (opção da campanha).
import { prisma } from "./db";
import { meta } from "./meta";
import { createAlert } from "./alerts";
import { PHONE_REMOVED, wabaToken } from "./sync";
import { formatPhone } from "./phone";

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
