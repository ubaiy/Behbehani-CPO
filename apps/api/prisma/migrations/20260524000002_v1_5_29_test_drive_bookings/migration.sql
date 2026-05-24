-- v1.5.29 — Test Drive Bookings
-- Creates: TestDriveWindow enum, TestDriveLocation enum, TestDriveStatus enum,
--          TestDriveBooking table, FKs, and indexes.

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "TestDriveWindow" AS ENUM ('morning', 'afternoon', 'evening');

CREATE TYPE "TestDriveLocation" AS ENUM ('showroom', 'customer_address');

CREATE TYPE "TestDriveStatus" AS ENUM (
  'requested',
  'scheduled',
  'confirmed',
  'completed',
  'no_show',
  'cancelled'
);

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE "TestDriveBooking" (
  "id"              UUID              NOT NULL DEFAULT gen_random_uuid(),
  "listingId"       UUID,
  "customerName"    VARCHAR(120)      NOT NULL,
  "customerPhone"   VARCHAR(20)       NOT NULL,
  "customerEmail"   VARCHAR(255),
  "preferredDate"   DATE              NOT NULL,
  "preferredWindow" "TestDriveWindow" NOT NULL,
  "location"        "TestDriveLocation" NOT NULL,
  "addressLine"     VARCHAR(500),
  "customerNotes"   VARCHAR(1000),
  "status"          "TestDriveStatus" NOT NULL DEFAULT 'requested',
  "scheduledAt"     TIMESTAMP(3),
  "completedAt"     TIMESTAMP(3),
  "adminNotes"      TEXT,
  "assignedToId"    UUID,
  "ipAddress"       VARCHAR(45),
  "userAgent"       VARCHAR(500),
  "idempotencyKey"  TEXT              UNIQUE,
  "createdAt"       TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)      NOT NULL,

  CONSTRAINT "TestDriveBooking_pkey" PRIMARY KEY ("id")
);

-- ─── Foreign keys ─────────────────────────────────────────────────────────────

ALTER TABLE "TestDriveBooking"
  ADD CONSTRAINT "TestDriveBooking_listingId_fkey"
  FOREIGN KEY ("listingId")
  REFERENCES "Listing"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TestDriveBooking"
  ADD CONSTRAINT "TestDriveBooking_assignedToId_fkey"
  FOREIGN KEY ("assignedToId")
  REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX "TestDriveBooking_status_preferredDate_idx"
  ON "TestDriveBooking"("status", "preferredDate");

CREATE INDEX "TestDriveBooking_listingId_idx"
  ON "TestDriveBooking"("listingId");
