-- DropIndex
DROP INDEX "Campaign_funnelId_idx";

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "funnelStep" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_funnelId_funnelStep_key" ON "Campaign"("funnelId", "funnelStep");

