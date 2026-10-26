-- AlterTable
ALTER TABLE "SmsJob" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'smsbear';

-- AlterTable
ALTER TABLE "SmsOrder" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'smsbear';

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "sms24hKeyEnc" TEXT;

