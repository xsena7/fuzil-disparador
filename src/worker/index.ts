import { prisma } from "../lib/db";
import { maybeComplete, recoverStuck, runCampaignTick, startDueCampaigns, TICK_MS } from "../lib/dispatcher";
import { syncWaba } from "../lib/sync";
import { deployBlueprints } from "../lib/blueprints";

const SYNC_EVERY_MS = 10 * 60_000;
const BLUEPRINT_EVERY_MS = 5 * 60_000;

const running = new Set<string>();
let stopping = false;

async function dispatchLoop() {
  while (!stopping) {
    const t0 = Date.now();
    try {
      await startDueCampaigns();
      const campaigns = await prisma.campaign.findMany({ where: { status: "RUNNING" }, select: { id: true } });
      for (const { id } of campaigns) {
        if (running.has(id)) continue; // tick anterior ainda enviando
        running.add(id);
        runCampaignTick(id)
          .catch((err) => console.error(`[dispatcher] campanha ${id}`, err))
          .finally(() => running.delete(id));
      }
    } catch (err) {
      console.error("[dispatcher]", err);
    }
    await new Promise((r) => setTimeout(r, Math.max(200, TICK_MS - (Date.now() - t0))));
  }
}

async function every(ms: number, name: string, fn: () => Promise<void>) {
  while (!stopping) {
    try {
      await fn();
    } catch (err) {
      console.error(`[${name}]`, err);
    }
    await new Promise((r) => setTimeout(r, ms));
  }
}

async function syncAll() {
  const wabas = await prisma.whatsAppAccount.findMany({ select: { id: true, name: true } });
  for (const w of wabas) {
    await syncWaba(w.id).catch((err) => console.error(`[sync] ${w.name}:`, err instanceof Error ? err.message : err));
  }
}

async function housekeeping() {
  await recoverStuck();
  // Campanhas "RUNNING" sem pendentes (ex.: todos descadastrados) são finalizadas
  const runningCampaigns = await prisma.campaign.findMany({ where: { status: "RUNNING" }, select: { id: true } });
  for (const c of runningCampaigns) if (!running.has(c.id)) await maybeComplete(c.id);
  // Sessões vencidas
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

async function main() {
  console.log("[worker] Fuzil Disparador worker iniciado");
  process.on("SIGTERM", () => (stopping = true));
  process.on("SIGINT", () => (stopping = true));
  await Promise.all([
    dispatchLoop(),
    every(SYNC_EVERY_MS, "sync", syncAll),
    every(BLUEPRINT_EVERY_MS, "blueprints", () => deployBlueprints()),
    every(60_000, "housekeeping", housekeeping),
  ]);
  await prisma.$disconnect();
}

main();
