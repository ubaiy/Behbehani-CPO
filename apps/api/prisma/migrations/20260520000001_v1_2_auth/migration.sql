-- v1.2 Customer auth: OTP infrastructure + ghost-account reconciliation +
-- Google OAuth + SavedListing (favourites).
-- Depends on: User + Listing tables (already exist).
-- Hand-authored to match schema.prisma delta. Uses TIMESTAMP(3) +
-- CURRENT_TIMESTAMP per repo convention (init + inspection + offers
-- migrations). Prisma manages UUID id + updatedAt at the app layer — no
-- SQL-side defaults for those.
-- Contract refs: CONCIERGE_INSPECTION_API_CONTRACT.md v1.2.0 §1, §4, §5
-- and B's reply v1.2.1 §4.2.

-- ─── 1. OTP enums ───────────────────────────────────────────────────────────

CREATE TYPE "OtpPurpose" AS ENUM (
  'registration',
  'signin',
  'mobile_verify',
  'password_reset'
);

CREATE TYPE "OtpChannel" AS ENUM (
  'sms',
  'email'
);

-- ─── 2. OtpCode table ───────────────────────────────────────────────────────

CREATE TABLE "OtpCode" (
  "id"          UUID         NOT NULL,
  "identifier"  TEXT         NOT NULL,
  "channel"     "OtpChannel" NOT NULL,
  "purpose"     "OtpPurpose" NOT NULL,
  "codeHash"    TEXT         NOT NULL,
  "userId"      UUID,
  "ip"          TEXT,
  "userAgent"   TEXT,
  "attempts"    INTEGER      NOT NULL DEFAULT 0,
  "consumedAt"  TIMESTAMP(3),
  "lastSentAt"  TIMESTAMP(3),
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OtpCode_identifier_purpose_createdAt_idx"
  ON "OtpCode" ("identifier", "purpose", "createdAt");

CREATE INDEX "OtpCode_expiresAt_idx"
  ON "OtpCode" ("expiresAt");

ALTER TABLE "OtpCode"
  ADD CONSTRAINT "OtpCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 3. User.googleSub (OAuth Google `sub` claim) ───────────────────────────

ALTER TABLE "User" ADD COLUMN "googleSub" TEXT;
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- ─── 4. passwordHash nullability (ghost rows = NULL, not '') ───────────────
-- Contract v1.2.0 §1 Q2: switch from empty-string convention to nullable.
-- Existing ghost rows currently store '' (per inspections.repo
-- createGhostCustomer). Backfill in-place.

ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
UPDATE "User" SET "passwordHash" = NULL WHERE "passwordHash" = '';

-- ─── 5. SavedListing (customer favourites) ──────────────────────────────────

CREATE TABLE "SavedListing" (
  "customerId" UUID         NOT NULL,
  "listingId"  UUID         NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedListing_pkey" PRIMARY KEY ("customerId", "listingId")
);

CREATE INDEX "SavedListing_customerId_createdAt_idx"
  ON "SavedListing" ("customerId", "createdAt");

CREATE INDEX "SavedListing_listingId_idx"
  ON "SavedListing" ("listingId");

ALTER TABLE "SavedListing"
  ADD CONSTRAINT "SavedListing_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedListing"
  ADD CONSTRAINT "SavedListing_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
