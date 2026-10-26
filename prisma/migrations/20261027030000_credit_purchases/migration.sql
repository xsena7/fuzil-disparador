-- CreateTable
CREATE TABLE "CreditPurchase" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "mpPaymentId" TEXT,
    "pixCode" TEXT,
    "pixQr" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_token_key" ON "CreditPurchase"("token");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_mpPaymentId_key" ON "CreditPurchase"("mpPaymentId");

-- CreateIndex
CREATE INDEX "CreditPurchase_workspaceId_createdAt_idx" ON "CreditPurchase"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditPurchase_status_expiresAt_idx" ON "CreditPurchase"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

