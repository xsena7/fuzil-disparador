-- AlterTable
ALTER TABLE "ExternalLink" ADD COLUMN     "leadId" TEXT;

-- AlterTable
ALTER TABLE "Funnel" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'JOBS',
ADD COLUMN     "loginBlueprintId" TEXT;

-- CreateTable
CREATE TABLE "LinkSession" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "LinkSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkSession_tokenHash_key" ON "LinkSession"("tokenHash");

-- CreateIndex
CREATE INDEX "LinkSession_leadId_idx" ON "LinkSession"("leadId");

-- CreateIndex
CREATE INDEX "ExternalLink_leadId_idx" ON "ExternalLink"("leadId");

-- AddForeignKey
ALTER TABLE "ExternalLink" ADD CONSTRAINT "ExternalLink_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkSession" ADD CONSTRAINT "LinkSession_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

