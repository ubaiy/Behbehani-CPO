/*
  Warnings:

  - A unique constraint covering the columns `[bookingRef]` on the table `InspectionReport` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[customerSignToken]` on the table `InspectionReport` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InspectionKind" AS ENUM ('cpo', 'concierge');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('draft', 'in_progress', 'awaiting_inspector_signoff', 'awaiting_customer_signature', 'signed_off');

-- CreateEnum
CREATE TYPE "CustomerSignatureMethod" AS ENUM ('in_person', 'remote_link');

-- CreateEnum
CREATE TYPE "PreferredWindow" AS ENUM ('morning', 'afternoon', 'evening');

-- AlterTable
ALTER TABLE "InspectionReport" ADD COLUMN     "bookingRef" TEXT,
ADD COLUMN     "customerCivilIdLast4" TEXT,
ADD COLUMN     "customerDeclaredJson" JSONB,
ADD COLUMN     "customerId" UUID,
ADD COLUMN     "customerNotes" TEXT,
ADD COLUMN     "customerPreferredDate" DATE,
ADD COLUMN     "customerPreferredWindow" "PreferredWindow",
ADD COLUMN     "customerSignToken" TEXT,
ADD COLUMN     "customerSignTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "customerSignTokenLastSentAt" TIMESTAMP(3),
ADD COLUMN     "customerSignatureDrawnKey" TEXT,
ADD COLUMN     "customerSignatureMethod" "CustomerSignatureMethod",
ADD COLUMN     "customerSignatureTypedName" TEXT,
ADD COLUMN     "customerSignedAt" TIMESTAMP(3),
ADD COLUMN     "customerSignedIp" TEXT,
ADD COLUMN     "customerSignedUserAgent" TEXT,
ADD COLUMN     "inspectorId" UUID,
ADD COLUMN     "inspectorSignedAt" TIMESTAMP(3),
ADD COLUMN     "inspectorSignedById" UUID,
ADD COLUMN     "kind" "InspectionKind" NOT NULL DEFAULT 'cpo',
ADD COLUMN     "locationAddress" TEXT,
ADD COLUMN     "locationGovernorate" TEXT,
ADD COLUMN     "locationLat" DOUBLE PRECISION,
ADD COLUMN     "locationLng" DOUBLE PRECISION,
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "status" "InspectionStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN     "vehicleBrandName" TEXT,
ADD COLUMN     "vehicleMileageKm" INTEGER,
ADD COLUMN     "vehicleModelName" TEXT,
ADD COLUMN     "vehicleTransmission" TEXT,
ADD COLUMN     "vehicleVin" TEXT,
ADD COLUMN     "vehicleYear" INTEGER,
ALTER COLUMN "listingId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "InspectionReport_bookingRef_key" ON "InspectionReport"("bookingRef");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionReport_customerSignToken_key" ON "InspectionReport"("customerSignToken");

-- CreateIndex
CREATE INDEX "InspectionReport_kind_status_idx" ON "InspectionReport"("kind", "status");

-- CreateIndex
CREATE INDEX "InspectionReport_customerId_idx" ON "InspectionReport"("customerId");

-- CreateIndex
CREATE INDEX "InspectionReport_inspectorId_idx" ON "InspectionReport"("inspectorId");

-- CreateIndex
CREATE INDEX "InspectionReport_scheduledFor_idx" ON "InspectionReport"("scheduledFor");

-- CreateIndex
CREATE INDEX "InspectionReport_customerPreferredDate_idx" ON "InspectionReport"("customerPreferredDate");

-- AddForeignKey
ALTER TABLE "InspectionReport" ADD CONSTRAINT "InspectionReport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionReport" ADD CONSTRAINT "InspectionReport_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
