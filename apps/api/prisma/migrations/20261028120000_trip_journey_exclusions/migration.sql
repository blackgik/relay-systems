-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "journeyStage" TEXT NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "excludedItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "excludedFeePerKg" INTEGER;
