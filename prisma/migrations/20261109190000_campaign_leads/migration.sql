-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "leadConfirmText" TEXT,
ADD COLUMN     "leadToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_leadToken_key" ON "Campaign"("leadToken");

