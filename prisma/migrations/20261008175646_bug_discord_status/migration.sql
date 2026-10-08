-- AlterTable
ALTER TABLE "BugReport" ADD COLUMN     "discordError" TEXT,
ADD COLUMN     "discordSent" BOOLEAN NOT NULL DEFAULT false;
