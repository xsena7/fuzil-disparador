-- CreateEnum
CREATE TYPE "FlowRunStatus" AS ENUM ('RUNNING', 'WAITING_REPLY', 'WAITING_TIME', 'DONE', 'STOPPED', 'FAILED');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "flowId" TEXT;

-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "graph" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "recipientId" TEXT,
    "nodeId" TEXT NOT NULL,
    "status" "FlowRunStatus" NOT NULL DEFAULT 'RUNNING',
    "waitUntil" TIMESTAMP(3),
    "error" TEXT,
    "steps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Flow_workspaceId_idx" ON "Flow"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FlowRun_recipientId_key" ON "FlowRun"("recipientId");

-- CreateIndex
CREATE INDEX "FlowRun_conversationId_status_idx" ON "FlowRun"("conversationId", "status");

-- CreateIndex
CREATE INDEX "FlowRun_status_waitUntil_idx" ON "FlowRun"("status", "waitUntil");

-- CreateIndex
CREATE INDEX "FlowRun_flowId_createdAt_idx" ON "FlowRun"("flowId", "createdAt");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowRun" ADD CONSTRAINT "FlowRun_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Aquecimento saiu da plataforma: desliga os funis de vagas e as campanhas internas deles (o login do gerador de links continua)
UPDATE "Funnel" SET "status" = 'PAUSED' WHERE "kind" = 'JOBS';
UPDATE "Campaign" SET "status" = 'PAUSED', "pausedReason" = 'Funil pausado' WHERE "funnelId" IN (SELECT "id" FROM "Funnel" WHERE "kind" = 'JOBS') AND "status" = 'RUNNING';
