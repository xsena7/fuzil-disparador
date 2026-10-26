-- AlterTable
ALTER TABLE "MailBox" ADD COLUMN     "productId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MailBox_productId_key" ON "MailBox"("productId");

-- AddForeignKey
ALTER TABLE "MailBox" ADD CONSTRAINT "MailBox_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

