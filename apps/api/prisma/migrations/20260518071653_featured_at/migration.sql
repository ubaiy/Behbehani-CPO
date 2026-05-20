-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "featuredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Listing_featuredAt_idx" ON "Listing"("featuredAt");
