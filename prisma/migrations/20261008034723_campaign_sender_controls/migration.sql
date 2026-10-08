-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "creditsRefunded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "excludedSenders" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "skipRedQuality" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "CampaignRecipient" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;
