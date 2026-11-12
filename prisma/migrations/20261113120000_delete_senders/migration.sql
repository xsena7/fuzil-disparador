-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "deleteSendersAfterHours" INTEGER,
ADD COLUMN     "sendersDeletedAt" TIMESTAMP(3);

