-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "briefId" TEXT;

-- CreateTable
CREATE TABLE "CampaignBrief" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateLanguage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "campaignName" TEXT,
    "variableMapping" JSONB,
    "buttonUrl" TEXT,
    "headerMediaUrl" TEXT,
    "headerMediaType" TEXT,
    "headerMediaName" TEXT,
    "audienceFile" TEXT,
    "audienceFileName" TEXT,
    "audienceRows" INTEGER,
    "profilePhoto" TEXT,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "importedCampaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignBrief_token_key" ON "CampaignBrief"("token");

-- CreateIndex
CREATE INDEX "CampaignBrief_workspaceId_status_idx" ON "CampaignBrief"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "CampaignBrief" ADD CONSTRAINT "CampaignBrief_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

