-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "smsbearTokenEnc" TEXT;

-- CreateTable
CREATE TABLE "SmsJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "verifiedName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "step" TEXT NOT NULL DEFAULT 'BUY',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "orderId" TEXT,
    "number" TEXT,
    "phoneNumberId" TEXT,
    "stepAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "spentCents" INTEGER NOT NULL DEFAULT 0,
    "toCancel" JSONB NOT NULL DEFAULT '[]',
    "log" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SmsJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsJob_status_idx" ON "SmsJob"("status");

-- CreateIndex
CREATE INDEX "SmsJob_workspaceId_createdAt_idx" ON "SmsJob"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "SmsJob" ADD CONSTRAINT "SmsJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsJob" ADD CONSTRAINT "SmsJob_wabaId_fkey" FOREIGN KEY ("wabaId") REFERENCES "WhatsAppAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

