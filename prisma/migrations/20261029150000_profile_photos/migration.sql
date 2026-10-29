-- AlterTable
ALTER TABLE "PhoneNumber" ADD COLUMN     "pendingPhoto" TEXT,
ADD COLUMN     "pendingPhotoAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SmsJob" ADD COLUMN     "photo" TEXT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "profilePhotoFemale" TEXT,
ADD COLUMN     "profilePhotoMale" TEXT;

