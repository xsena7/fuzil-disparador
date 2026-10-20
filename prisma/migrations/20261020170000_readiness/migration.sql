ALTER TABLE "WhatsAppAccount" ADD COLUMN "hasPaymentMethod" BOOLEAN, ADD COLUMN "healthIssues" JSONB;
ALTER TABLE "PhoneNumber" ADD COLUMN "invalidReason" TEXT;
