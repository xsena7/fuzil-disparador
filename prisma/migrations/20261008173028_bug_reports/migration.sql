-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "BugReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "workspaceId" TEXT,
    "workspaceName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "pagePath" TEXT,
    "userAgent" TEXT,
    "screenshotUrl" TEXT,
    "status" "BugStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BugReport_status_createdAt_idx" ON "BugReport"("status", "createdAt");
