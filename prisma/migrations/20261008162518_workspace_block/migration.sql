-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockedReason" TEXT;
