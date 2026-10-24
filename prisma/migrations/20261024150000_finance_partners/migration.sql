-- AlterTable
ALTER TABLE "User" ADD COLUMN     "financePartner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pixKey" TEXT;


-- Sócios = quem é administrador do Fuzil hoje (Guilherme e Eduardo). Administradores novos não entram na divisão.
UPDATE "User" SET "financePartner" = true WHERE "isSuperAdmin" = true;
