-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "reportBrandId" TEXT;

-- CreateTable
CREATE TABLE "ReportBrand" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#FF6A2B',
    "headerColor" TEXT NOT NULL DEFAULT '#1C1C1E',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportBrand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportBrand_workspaceId_idx" ON "ReportBrand"("workspaceId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_reportBrandId_fkey" FOREIGN KEY ("reportBrandId") REFERENCES "ReportBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBrand" ADD CONSTRAINT "ReportBrand_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

