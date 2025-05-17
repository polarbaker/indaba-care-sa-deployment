-- AlterTable
ALTER TABLE "NannyProfile" ADD COLUMN "coverImageUrl" TEXT;
ALTER TABLE "NannyProfile" ADD COLUMN "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "NannyProfile" ADD COLUMN "yearsOfExperience" INTEGER;
ALTER TABLE "NannyProfile" ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
