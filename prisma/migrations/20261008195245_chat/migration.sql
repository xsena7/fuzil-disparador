-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'ATTENDING', 'CLOSED');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoReplyMediaName" TEXT,
ADD COLUMN     "autoReplyMediaType" TEXT,
ADD COLUMN     "autoReplyMediaUrl" TEXT,
ADD COLUMN     "autoReplyText" TEXT;

-- AlterTable
ALTER TABLE "CampaignRecipient" ADD COLUMN     "autoReplySentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "phoneId" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactName" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "unread" INTEGER NOT NULL DEFAULT 0,
    "hasInbound" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageText" TEXT,
    "lastDirection" TEXT,
    "lastInboundAt" TIMESTAMP(3),
    "assignedUserId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT,
    "mediaId" TEXT,
    "mediaUrl" TEXT,
    "mediaMime" TEXT,
    "mediaName" TEXT,
    "wamid" TEXT,
    "status" TEXT,
    "error" TEXT,
    "source" TEXT NOT NULL,
    "campaignId" TEXT,
    "senderUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickReply" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuickReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_lastMessageAt_idx" ON "Conversation"("workspaceId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_hasInbound_lastMessageAt_idx" ON "Conversation"("workspaceId", "hasInbound", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_phoneId_contactPhone_key" ON "Conversation"("phoneId", "contactPhone");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_wamid_key" ON "ChatMessage"("wamid");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuickReply_workspaceId_shortcut_key" ON "QuickReply"("workspaceId", "shortcut");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_phoneId_fkey" FOREIGN KEY ("phoneId") REFERENCES "PhoneNumber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickReply" ADD CONSTRAINT "QuickReply_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
