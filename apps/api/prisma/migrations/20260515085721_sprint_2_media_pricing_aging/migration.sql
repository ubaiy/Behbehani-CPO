-- CreateEnum
CREATE TYPE "AgingRunStatus" AS ENUM ('running', 'success', 'skipped', 'error');

-- AlterTable
ALTER TABLE "ListingPhoto" ADD COLUMN     "bytes" INTEGER,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "uploadStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "uploadedById" UUID,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "ListingVideo" ADD COLUMN     "bytes" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "posterS3Key" TEXT,
ADD COLUMN     "uploadStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "uploadedById" UUID;

-- CreateTable
CREATE TABLE "Listing360" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "archiveS3Key" TEXT NOT NULL,
    "frameCount" INTEGER,
    "bytes" INTEGER,
    "mimeType" TEXT,
    "uploadStatus" TEXT NOT NULL DEFAULT 'pending',
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing360_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingTier" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "daysThresholdMin" INTEGER NOT NULL,
    "discountBps" INTEGER NOT NULL,
    "stagesAffected" JSONB NOT NULL,
    "autoApply" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgingEngineRun" (
    "id" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "AgingRunStatus" NOT NULL DEFAULT 'running',
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "totalReductionFils" BIGINT NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "triggeredById" UUID,

    CONSTRAINT "AgingEngineRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppliedDiscount" (
    "id" BIGSERIAL NOT NULL,
    "listingId" UUID NOT NULL,
    "tierId" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "fromFils" BIGINT NOT NULL,
    "toFils" BIGINT NOT NULL,
    "discountBps" INTEGER NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertedAt" TIMESTAMP(3),

    CONSTRAINT "AppliedDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing360_listingId_key" ON "Listing360"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingTier_name_key" ON "PricingTier"("name");

-- CreateIndex
CREATE INDEX "PricingTier_daysThresholdMin_idx" ON "PricingTier"("daysThresholdMin");

-- CreateIndex
CREATE INDEX "AgingEngineRun_startedAt_idx" ON "AgingEngineRun"("startedAt");

-- CreateIndex
CREATE INDEX "AppliedDiscount_listingId_appliedAt_idx" ON "AppliedDiscount"("listingId", "appliedAt");

-- CreateIndex
CREATE INDEX "AppliedDiscount_runId_idx" ON "AppliedDiscount"("runId");

-- AddForeignKey
ALTER TABLE "ListingPhoto" ADD CONSTRAINT "ListingPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingVideo" ADD CONSTRAINT "ListingVideo_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing360" ADD CONSTRAINT "Listing360_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing360" ADD CONSTRAINT "Listing360_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgingEngineRun" ADD CONSTRAINT "AgingEngineRun_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppliedDiscount" ADD CONSTRAINT "AppliedDiscount_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppliedDiscount" ADD CONSTRAINT "AppliedDiscount_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "PricingTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppliedDiscount" ADD CONSTRAINT "AppliedDiscount_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgingEngineRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
