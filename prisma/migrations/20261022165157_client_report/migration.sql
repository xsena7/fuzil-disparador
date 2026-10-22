-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "pixCity" TEXT,
ADD COLUMN     "pixKey" TEXT,
ADD COLUMN     "pixName" TEXT,
ADD COLUMN     "reportPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "reportPrice" DOUBLE PRECISION,
ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_shareToken_key" ON "Campaign"("shareToken");

