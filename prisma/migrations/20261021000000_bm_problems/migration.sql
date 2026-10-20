-- AlterTable
ALTER TABLE "BmGroup" ADD COLUMN     "system" TEXT;

-- AlterTable
ALTER TABLE "BusinessManager" ADD COLUMN     "firstSentAt" TIMESTAMP(3),
ADD COLUMN     "problemAt" TIMESTAMP(3),
ADD COLUMN     "problemFix" TEXT,
ADD COLUMN     "problemIgnored" TEXT,
ADD COLUMN     "problemPrevGroups" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "problemReason" TEXT;


-- BMs que já dispararam alguma vez
UPDATE "BusinessManager" b SET "firstSentAt" = s.first
FROM (
  SELECT w."businessId", MIN(r."sentAt") AS first
  FROM "CampaignRecipient" r JOIN "PhoneNumber" p ON p.id = r."senderId" JOIN "WhatsAppAccount" w ON w.id = p."wabaId"
  WHERE r."sentAt" IS NOT NULL GROUP BY w."businessId"
) s WHERE s."businessId" = b.id;
