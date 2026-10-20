-- CreateIndex
CREATE INDEX "Alert_workspaceId_readAt_idx" ON "Alert"("workspaceId", "readAt");

-- CreateIndex
CREATE INDEX "CampaignRecipient_sentAt_idx" ON "CampaignRecipient"("sentAt");

-- CreateIndex
CREATE INDEX "CampaignRecipient_status_queuedAt_idx" ON "CampaignRecipient"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "InboundMessage_recipientId_idx" ON "InboundMessage"("recipientId");

-- CreateIndex
CREATE INDEX "LinkClick_recipientId_idx" ON "LinkClick"("recipientId");


-- Conversas com mensagens não lidas (contador do menu e do Chat)
CREATE INDEX "Conversation_unread_idx" ON "Conversation"("workspaceId", "phoneId") WHERE "unread" > 0;
