-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "folderId" TEXT;

-- CreateTable
CREATE TABLE "CampaignFolder" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignFolder_workspaceId_name_key" ON "CampaignFolder"("workspaceId", "name");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "CampaignFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFolder" ADD CONSTRAINT "CampaignFolder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
