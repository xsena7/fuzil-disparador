-- AlterTable
ALTER TABLE "ExternalLink" ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "LinkSession" ADD COLUMN     "accountId" TEXT,
ALTER COLUMN "leadId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LinksAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "resetTokenHash" TEXT,
    "resetExpiresAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinksAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinksAccount_email_key" ON "LinksAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LinksAccount_resetTokenHash_key" ON "LinksAccount"("resetTokenHash");

-- CreateIndex
CREATE INDEX "ExternalLink_accountId_idx" ON "ExternalLink"("accountId");

-- CreateIndex
CREATE INDEX "LinkSession_accountId_idx" ON "LinkSession"("accountId");

-- AddForeignKey
ALTER TABLE "ExternalLink" ADD CONSTRAINT "ExternalLink_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LinksAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkSession" ADD CONSTRAINT "LinkSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LinksAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Login pelo WhatsApp do gerador de links desligado: fecha as sessões antigas e pausa os envios internos dele
UPDATE "LinkSession" SET "revokedAt" = NOW() WHERE "revokedAt" IS NULL AND "accountId" IS NULL;
UPDATE "Funnel" SET "status" = 'PAUSED' WHERE "kind" = 'LINKS';
UPDATE "Campaign" SET "status" = 'PAUSED', "pausedReason" = 'Funil pausado' WHERE "funnelId" IS NOT NULL AND "status" = 'RUNNING';
