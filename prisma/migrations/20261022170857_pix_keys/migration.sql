-- Várias chaves Pix por conta (a chave única vira a primeira da lista)
ALTER TABLE "Workspace" ADD COLUMN "pixKeys" JSONB;
UPDATE "Workspace"
SET "pixKeys" = jsonb_build_array(jsonb_build_object('id', 'k1', 'key', "pixKey", 'name', COALESCE("pixName", ''), 'bank', COALESCE("pixBank", '')))
WHERE "pixKey" IS NOT NULL AND "pixKey" <> '';
ALTER TABLE "Workspace" DROP COLUMN "pixKey", DROP COLUMN "pixName", DROP COLUMN "pixBank";

ALTER TABLE "Campaign" ADD COLUMN "reportPixKeyId" TEXT;
