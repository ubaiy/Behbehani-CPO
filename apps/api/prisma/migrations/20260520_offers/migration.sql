-- Phase 4: Offer / Valuation module
-- Depends on: InspectionReport + User tables (already exist).
-- Hand-authored to match the Prisma schema delta in schema.prisma.
-- Uses TIMESTAMP(3) + CURRENT_TIMESTAMP per repo convention (see init +
-- inspection migrations). Prisma manages UUID id + updatedAt at the app
-- layer — no SQL-side defaults for those.

-- ─── 1. OfferStatus enum ─────────────────────────────────────────────────────

CREATE TYPE "OfferStatus" AS ENUM (
  'drafted',
  'sent',
  'countered_by_customer',
  'countered_by_admin',
  'accepted',
  'declined',
  'expired',
  'withdrawn'
);

-- ─── 2. Offer table ───────────────────────────────────────────────────────────

CREATE TABLE "Offer" (
  "id"                     UUID          NOT NULL,
  "inspectionId"           UUID          NOT NULL,
  "bookingRef"             TEXT          NOT NULL,
  "customerId"             UUID          NOT NULL,
  "offerAmountFils"        BIGINT        NOT NULL,
  "validUntil"             TIMESTAMP(3)  NOT NULL,
  "status"                 "OfferStatus" NOT NULL DEFAULT 'drafted',
  "notes"                  TEXT,
  "counterAmountFils"      BIGINT,
  "counterNotes"           TEXT,
  "adminCounterAmountFils" BIGINT,
  "adminCounterNotes"      TEXT,
  "publicToken"            TEXT          NOT NULL,
  "publicTokenExpiresAt"   TIMESTAMP(3)  NOT NULL,
  "createdById"            UUID          NOT NULL,
  "respondedAt"            TIMESTAMP(3),
  "respondedIp"            TEXT,
  "respondedUserAgent"     TEXT,
  "previousOfferId"        UUID,
  "createdAt"              TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- ─── 3. Foreign keys ─────────────────────────────────────────────────────────

ALTER TABLE "Offer" ADD CONSTRAINT "Offer_inspectionId_fkey"
  FOREIGN KEY ("inspectionId") REFERENCES "InspectionReport"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Offer" ADD CONSTRAINT "Offer_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Offer" ADD CONSTRAINT "Offer_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Offer" ADD CONSTRAINT "Offer_previousOfferId_fkey"
  FOREIGN KEY ("previousOfferId") REFERENCES "Offer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 4. Unique constraint + indexes ───────────────────────────────────────────

CREATE UNIQUE INDEX "Offer_publicToken_key" ON "Offer"("publicToken");

CREATE INDEX "Offer_inspectionId_idx"      ON "Offer"("inspectionId");
CREATE INDEX "Offer_customerId_status_idx" ON "Offer"("customerId", "status");
CREATE INDEX "Offer_status_validUntil_idx" ON "Offer"("status", "validUntil");
-- Schema declares @@index([publicToken]) explicitly in addition to @unique;
-- Prisma expects both indexes to exist or it generates a diff migration.
CREATE INDEX "Offer_publicToken_idx"       ON "Offer"("publicToken");

-- ─── 5. Listing.acquisitionSourceJson (§16 D5) ───────────────────────────────

ALTER TABLE "Listing" ADD COLUMN "acquisitionSourceJson" JSONB;
