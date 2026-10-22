-- AlterTable
ALTER TABLE "BusinessManager" ADD COLUMN     "problemFromSend" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "problemKind" TEXT;


-- BMs que já estavam em "BMs com problema" ficam como problema desconhecido (a próxima sincronização reclassifica)
UPDATE "BusinessManager" SET "problemKind" = 'UNKNOWN' WHERE "problemAt" IS NOT NULL AND "problemKind" IS NULL;
UPDATE "BmGroup" SET "color" = 'black' WHERE "system" = 'PROBLEMS';
