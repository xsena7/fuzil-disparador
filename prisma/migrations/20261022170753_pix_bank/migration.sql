-- Cidade do recebedor sai; entra o banco da chave Pix
ALTER TABLE "Workspace" RENAME COLUMN "pixCity" TO "pixBank";
UPDATE "Workspace" SET "pixBank" = NULL;

-- Links do relatório criados antes do prazo de 12h: ganham 12h a partir de agora
UPDATE "Campaign" SET "shareExpiresAt" = NOW() + INTERVAL '12 hours' WHERE "shareToken" IS NOT NULL AND "shareExpiresAt" IS NULL;
