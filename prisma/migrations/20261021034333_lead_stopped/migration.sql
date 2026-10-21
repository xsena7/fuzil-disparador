-- AlterEnum
ALTER TYPE "LeadStatus" ADD VALUE 'STOPPED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "stoppedAt" TIMESTAMP(3);

