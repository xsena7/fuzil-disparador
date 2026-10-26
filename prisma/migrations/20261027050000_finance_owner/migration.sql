-- AlterTable
ALTER TABLE "User" ADD COLUMN     "financeOwner" BOOLEAN NOT NULL DEFAULT false;

-- Dono do financeiro = o sócio Guilherme (o mais antigo, se houver mais de um). Fica fixo: ninguém muda pela tela.
UPDATE "User" SET "financeOwner" = true
WHERE id = (SELECT id FROM "User" WHERE "financePartner" = true AND name ILIKE 'guilherme%' ORDER BY "createdAt" ASC LIMIT 1);
