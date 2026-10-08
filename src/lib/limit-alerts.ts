import { prisma } from "./db";
import { createAlert } from "./alerts";
import { bmWindows, whenText } from "./limit-windows";
import { formatLimit } from "./limits";


/** Avisa quando uma BM bate o limite de 24h e quando o limite volta. Roda a cada minuto no worker. */
export async function checkLimitAlerts() {
  const bms = await prisma.businessManager.findMany({ select: { id: true, name: true, workspaceId: true, limitFullSince: true } });
  if (!bms.length) return;
  const windows = await bmWindows(bms.map((b) => b.id));
  for (const bm of bms) {
    const w = windows.get(bm.id);
    if (!w || w.limit === Infinity) continue;
    const full = w.available === 0;
    if (full && !bm.limitFullSince) {
      await prisma.businessManager.update({ where: { id: bm.id }, data: { limitFullSince: new Date() } });
      await createAlert({
        workspaceId: bm.workspaceId,
        type: "BM_LIMIT_FULL",
        severity: "WARNING",
        title: `Limite atingido: ${bm.name} (${formatLimit(w.limit)}/24h)`,
        message: w.nextReleaseAt
          ? `Volta a liberar ${whenText(w.nextReleaseAt)} (+${w.nextReleaseCount.toLocaleString("pt-BR")}). Zera totalmente ${whenText(w.fullResetAt!)}.`
          : "Aguardando a janela de 24h liberar.",
        data: { businessId: bm.id },
      });
    } else if (!full && bm.limitFullSince) {
      await prisma.businessManager.update({ where: { id: bm.id }, data: { limitFullSince: null } });
      await createAlert({
        workspaceId: bm.workspaceId,
        type: "BM_LIMIT_RELEASED",
        severity: "INFO",
        title: `Limite liberado: ${bm.name}`,
        message: `${formatLimit(w.available)} disponíveis agora.`,
        data: { businessId: bm.id },
      });
    }
  }
}
