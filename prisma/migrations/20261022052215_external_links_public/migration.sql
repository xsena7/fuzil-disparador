-- AlterTable
ALTER TABLE "ExternalLink" ADD COLUMN     "creatorIp" TEXT,
ADD COLUMN     "editKeyHash" TEXT,
ALTER COLUMN "workspaceId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ExternalLink_editKeyHash_key" ON "ExternalLink"("editKeyHash");

