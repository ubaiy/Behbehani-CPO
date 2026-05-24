-- v1.5.7 — Maintenance pickup requests
-- Hand-authored to match schema.prisma MaintenanceRequest model exactly.
-- Reuses existing "KuwaitGovernorate" and "PreferredWindow" types (created in
-- prior migrations). Only the two new enum types are created here.
-- DO NOT run prisma migrate — user applies migrations manually.

-- ─── New enum types ───────────────────────────────────────────────────────────

CREATE TYPE "maintenance_concern_category" AS ENUM (
  'oil_change',
  'brakes',
  'tires',
  'electrical',
  'engine',
  'other'
);

CREATE TYPE "maintenance_request_status" AS ENUM (
  'pending_review',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE "maintenance_request" (
  "id"               TEXT                              NOT NULL,
  "userId"           UUID                              NOT NULL,
  "vehicleListingId" UUID,
  "vehicleFreeText"  TEXT,
  "governorate"      "KuwaitGovernorate"               NOT NULL,
  "pickupAddressLine" TEXT                             NOT NULL,
  "preferredWindow"  "PreferredWindow"                 NOT NULL,
  "preferredDate"    DATE                              NOT NULL,
  "concernCategory"  "maintenance_concern_category"    NOT NULL,
  "concernNotes"     TEXT                              NOT NULL,
  "status"           "maintenance_request_status"      NOT NULL DEFAULT 'pending_review',
  "adminNotes"       TEXT,
  "scheduledFor"     TIMESTAMP(3),
  "idempotencyKey"   VARCHAR(80),
  "createdAt"        TIMESTAMP(3)                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)                      NOT NULL,

  CONSTRAINT "maintenance_request_pkey" PRIMARY KEY ("id")
);

-- ─── Unique constraint ────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "maintenance_request_idempotencyKey_key"
  ON "maintenance_request" ("idempotencyKey");

-- ─── Foreign keys ─────────────────────────────────────────────────────────────

ALTER TABLE "maintenance_request"
  ADD CONSTRAINT "maintenance_request_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "maintenance_request"
  ADD CONSTRAINT "maintenance_request_vehicleListingId_fkey"
  FOREIGN KEY ("vehicleListingId") REFERENCES "Listing"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Customer's own list, newest first.
CREATE INDEX "maintenance_request_userId_createdAt_idx"
  ON "maintenance_request" ("userId", "createdAt" DESC);

-- Admin queue: filter by status, newest first.
CREATE INDEX "maintenance_request_status_createdAt_idx"
  ON "maintenance_request" ("status", "createdAt" DESC);
