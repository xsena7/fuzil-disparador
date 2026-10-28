import { prisma } from "../lib/db";
import { settleLeftoverCredits } from "../lib/credits";
import { maybeComplete, recoverStuck, runCampaignTick, startDueCampaigns, TICK_MS } from "../lib/dispatcher";
import { syncWaba } from "../lib/sync";
import { deployBlueprints } from "../lib/blueprints";
import { marketTick } from "../lib/market";
import { creditTick } from "../lib/credit-purchase";
import { recheckInvites, reingestStockMailbox } from "../lib/market-inbox";
import { startSettingsRefresh } from "../lib/platform-settings";
import { checkLimitAlerts } from "../lib/limit-alerts";
import { reportError } from "../lib/report";
import { runFlows } from "../lib/flows";
import { smsJobsTick } from "../lib/smsbear";

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
          .catch((err) => reportError("worker", err, { path: `campanha ${id}` }))
          .finally(() => running.delete(id));
      }
    } catch (err) {
      await reportError("worker", err, { path: "dispatcher" });
    }
    await new Promise((r) => setTimeout(r, Math.max(200, TICK_MS - (Date.now() - t0))));
  }
}

async function every(ms: number, name: string, fn: () => Promise<void>) {
  while (!stopping) {
    try {
      await fn();
    } catch (err) {
      await reportError("worker", err, { path: name });
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
  // Crédito que ficou anotado em destinatário não enviado (ex.: o worker caiu no meio do lote) volta para o saldo
  await settleLeftoverCredits();
  // Campanhas "RUNNING" sem pendentes (ex.: todos descadastrados) são finalizadas
  const runningCampaigns = await prisma.campaign.findMany({ where: { status: "RUNNING" }, select: { id: true } });
  for (const c of runningCampaigns) if (!running.has(c.id)) await maybeComplete(c.id);
  // Sessões vencidas e eventos de webhook antigos (já processados)
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  // Link do relatório do cliente passou das 12h: sai do ar e é apagado
  await prisma.campaign.updateMany({ where: { shareExpiresAt: { lt: new Date() } }, data: { shareToken: null, shareExpiresAt: null } });
  await prisma.webhookEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 3 * 86400_000) } } });
  // Chat: conversas que são só disparo (cliente nunca respondeu) somem depois de 45 dias
  await prisma.conversation.deleteMany({ where: { hasInbound: false, lastMessageAt: { lt: new Date(Date.now() - 45 * 86400_000) } } });
}

async function main() {
  console.log("[worker] Fuzil Disparador worker iniciado");
  process.on("unhandledRejection", (err) => void reportError("worker", err, { path: "unhandledRejection" }));
  process.on("uncaughtException", (err) => void reportError("worker", err, { path: "uncaughtException" }));
  await startSettingsRefresh();
  // Alertas repetidos de "BM foi para o grupo X" (a BM piscava entre grupos a cada sincronização): fica só o primeiro de cada 24h
  await prisma.$executeRaw`
    DELETE FROM "Alert" a USING "Alert" b
    WHERE a.type = 'BM_PROBLEM' AND b.type = 'BM_PROBLEM' AND a."workspaceId" = b."workspaceId" AND a.title = b.title
      AND b."createdAt" < a."createdAt" AND a."createdAt" - b."createdAt" < interval '24 hours'`.catch((e) => console.error("[worker] limpar alertas", e));
  process.on("SIGTERM", () => (stopping = true));
  process.on("SIGINT", () => (stopping = true));
  void every(SYNC_EVERY_MS, "sync", syncAll);
  void every(BLUEPRINT_EVERY_MS, "blueprints", () => deployBlueprints());
  void every(60_000, "housekeeping", housekeeping);
  void every(60_000, "limites", checkLimitAlerts);
  void every(5_000, "fluxos", runFlows);
  void every(5_000, "smsbear", smsJobsTick);
  void every(20_000, "vendas", marketTick);
  void every(20_000, "recargas", creditTick);
  void every(10 * 60_000, "vendas-convites", recheckInvites);
  void every(2 * 60_000, "vendas-estoque", reingestStockMailbox);
  await dispatchLoop();
  // Desligamento: espera os envios em andamento terminarem
  while (running.size) await new Promise((r) => setTimeout(r, 200));
  await prisma.$disconnect();
  process.exit(0);
}

main();
