-- CreateTable
CREATE TABLE "MarketProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'TEMPLATE',
    "priceCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "businessId" TEXT,
    "bmName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "orderId" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketOrder" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "mpPaymentId" TEXT,
    "pixCode" TEXT,
    "pixQr" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "userId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketInvite" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "fromAddr" TEXT NOT NULL,
    "bmName" TEXT,
    "url" TEXT,
    "check" TEXT,
    "checkNote" TEXT,
    "checkedAt" TIMESTAMP(3),
    "itemId" TEXT,
    "usedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketItem_productId_status_idx" ON "MarketItem"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MarketOrder_token_key" ON "MarketOrder"("token");

-- CreateIndex
CREATE UNIQUE INDEX "MarketOrder_mpPaymentId_key" ON "MarketOrder"("mpPaymentId");

-- CreateIndex
CREATE INDEX "MarketOrder_status_expiresAt_idx" ON "MarketOrder"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketInvite_messageId_key" ON "MarketInvite"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketInvite_itemId_key" ON "MarketInvite"("itemId");

-- CreateIndex
CREATE INDEX "MarketInvite_receivedAt_idx" ON "MarketInvite"("receivedAt");

-- AddForeignKey
ALTER TABLE "MarketItem" ADD CONSTRAINT "MarketItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketItem" ADD CONSTRAINT "MarketItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessManager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketItem" ADD CONSTRAINT "MarketItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketOrder" ADD CONSTRAINT "MarketOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketInvite" ADD CONSTRAINT "MarketInvite_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MarketItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

