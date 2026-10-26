-- CreateTable
CREATE TABLE "SmsOrder" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "code" TEXT,
    "smsText" TEXT,
    "checkedAt" TIMESTAMP(3),
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsOrder_workspaceId_createdAt_idx" ON "SmsOrder"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "SmsOrder" ADD CONSTRAINT "SmsOrder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

