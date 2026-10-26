-- CreateTable
CREATE TABLE "MailBox" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailMessage" (
    "id" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'IN',
    "messageId" TEXT,
    "fromAddr" TEXT NOT NULL,
    "fromName" TEXT,
    "toAddr" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT,
    "html" TEXT,
    "attachments" JSONB,
    "size" INTEGER NOT NULL DEFAULT 0,
    "readAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailBox_address_key" ON "MailBox"("address");

-- CreateIndex
CREATE INDEX "MailMessage_mailboxId_receivedAt_idx" ON "MailMessage"("mailboxId", "receivedAt");

-- CreateIndex
CREATE INDEX "MailMessage_mailboxId_readAt_idx" ON "MailMessage"("mailboxId", "readAt");

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "MailBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

