-- CreateEnum
CREATE TYPE "FunnelStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('CODE_SENT', 'VERIFIED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "funnelId" TEXT,
ADD COLUMN     "templateCategory" TEXT NOT NULL DEFAULT 'UTILITY';

-- AlterTable
ALTER TABLE "TemplateBlueprint" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'UTILITY';

-- CreateTable
CREATE TABLE "Funnel" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "status" "FunnelStatus" NOT NULL DEFAULT 'ACTIVE',
    "groupId" TEXT,
    "page" JSONB NOT NULL,
    "pixelId" TEXT,
    "formFields" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "codeBlueprintId" TEXT,
    "doneBlueprintId" TEXT,
    "sendFrom" INTEGER NOT NULL DEFAULT 8,
    "sendTo" INTEGER NOT NULL DEFAULT 21,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'CODE_SENT',
    "codeHash" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "codeAttempts" INTEGER NOT NULL DEFAULT 0,
    "codeSends" INTEGER NOT NULL DEFAULT 0,
    "lastCodeAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "formToken" TEXT NOT NULL,
    "answers" JSONB,
    "answeredAt" TIMESTAMP(3),
    "stepIndex" INTEGER NOT NULL DEFAULT 0,
    "nextStepAt" TIMESTAMP(3),
    "utm" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Funnel_slug_key" ON "Funnel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Funnel_domain_key" ON "Funnel"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_formToken_key" ON "Lead"("formToken");

-- CreateIndex
CREATE INDEX "Lead_nextStepAt_idx" ON "Lead"("nextStepAt");

-- CreateIndex
CREATE INDEX "Lead_funnelId_createdAt_idx" ON "Lead"("funnelId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_funnelId_phone_key" ON "Lead"("funnelId", "phone");

-- CreateIndex
CREATE INDEX "Campaign_funnelId_idx" ON "Campaign"("funnelId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

