import { prisma } from "./db";
import { createAlert } from "./alerts";
import { bmWindows, whenText } from "./limit-windows";
import { formatLimit, LIMIT_REST_MS, limitResting } from "./limits";


/** Avisa quando uma BM bate o limite de 24h e quando o limite volta. Roda a cada minuto no worker. */
export async function checkLimitAlerts() {
  const bms = await prisma.businessManager.findMany({ select: { id: true, name: true, workspaceId: true, limitFullSince: true, limitHitAt: true } });
  if (!bms.length) return;
  const windows = await bmWindows(bms.map((b) => b.id));
  for (const bm of bms) {
    const w = windows.get(bm.id);
    if (!w) continue;
    // O Fuzil manda até a Meta recusar: "limite atingido" é quando a Meta recusou de verdade
    const full = limitResting(bm.limitHitAt);
    if (full && !bm.limitFullSince) {
      await prisma.businessManager.update({ where: { id: bm.id }, data: { limitFullSince: new Date() } });
      await createAlert({
        workspaceId: bm.workspaceId,
        type: "BM_LIMIT_FULL",
        severity: "WARNING",
        title: `Limite atingido: ${bm.name} (${w.used.toLocaleString("pt-BR")} enviadas em 24h${w.limit === Infinity ? "" : `, limite oficial ${formatLimit(w.limit)}`})`,
        message: `A Meta parou de aceitar envios dessa BM. O Fuzil tenta de novo ${whenText(new Date(bm.limitHitAt!.getTime() + LIMIT_REST_MS))}${w.nextReleaseAt ? `; a janela de 24h começa a abrir ${whenText(w.nextReleaseAt)}` : ""}. As outras BMs do grupo seguem mandando.`,
        data: { businessId: bm.id },
      });
    } else if (!full && bm.limitFullSince) {
      await prisma.businessManager.update({ where: { id: bm.id }, data: { limitFullSince: null } });
      await createAlert({
        workspaceId: bm.workspaceId,
        type: "BM_LIMIT_RELEASED",
        severity: "INFO",
        title: `Limite liberado: ${bm.name}`,
        message: "O Fuzil volta a mandar por essa BM até a Meta recusar de novo.",
        data: { businessId: bm.id },
      });
    }
  }
}
