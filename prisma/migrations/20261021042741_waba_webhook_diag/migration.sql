-- AlterTable
ALTER TABLE "WhatsAppAccount" ADD COLUMN     "webhookLastAt" TIMESTAMP(3),
ADD COLUMN     "webhookRejectedAt" TIMESTAMP(3);

