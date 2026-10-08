-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'RECATEGORIZED_DELETED', 'ERROR');

-- CreateTable
CREATE TABLE "TemplateBlueprint" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "groupId" TEXT,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "components" JSONB NOT NULL,
    "headerSamplePath" TEXT,
    "headerSampleMime" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateDeployment" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "status" "DeploymentStatus" NOT NULL,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateBlueprint_workspaceId_name_language_key" ON "TemplateBlueprint"("workspaceId", "name", "language");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateDeployment_blueprintId_wabaId_key" ON "TemplateDeployment"("blueprintId", "wabaId");

-- AddForeignKey
ALTER TABLE "TemplateBlueprint" ADD CONSTRAINT "TemplateBlueprint_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateBlueprint" ADD CONSTRAINT "TemplateBlueprint_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "BmGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateDeployment" ADD CONSTRAINT "TemplateDeployment_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "TemplateBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateDeployment" ADD CONSTRAINT "TemplateDeployment_wabaId_fkey" FOREIGN KEY ("wabaId") REFERENCES "WhatsAppAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
