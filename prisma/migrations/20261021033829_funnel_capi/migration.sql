-- AlterTable
ALTER TABLE "Funnel" ADD COLUMN     "capiLastError" TEXT,
ADD COLUMN     "capiLastOkAt" TIMESTAMP(3),
ADD COLUMN     "capiTestCode" TEXT,
ADD COLUMN     "capiTokenEnc" TEXT;

