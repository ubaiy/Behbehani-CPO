-- v1.3 Customer Account & Profile: UserStatus + KuwaitGovernorate enums,
-- OtpPurpose extension, User column additions, Address table, UserDeviceSession
-- table.
-- Depends on: User table (init migration) + OtpPurpose enum (v1.2 migration).
-- Hand-authored to match schema.prisma delta. Uses TIMESTAMP(3) +
-- CURRENT_TIMESTAMP per repo convention.
-- Contract refs: CONCIERGE_INSPECTION_API_CONTRACT.md v1.3.0 §3, §4, §5.

-- ─── 1. New enums ────────────────────────────────────────────────────────────

CREATE TYPE "UserStatus" AS ENUM (
  'active',
  'suspended',
  'pending_verification'
);

CREATE TYPE "KuwaitGovernorate" AS ENUM (
  'capital',
  'hawalli',
  'ahmadi',
  'jahra',
  'farwaniya',
  'mubarak_al_kabeer'
);

-- ─── 2. Extend OtpPurpose enum ───────────────────────────────────────────────
-- PostgreSQL requires each ADD VALUE in a separate statement.
-- LEGACY value mobile_verify is kept as-is per v1.3.0 §4.

ALTER TYPE "OtpPurpose" ADD VALUE 'mobile_change';
ALTER TYPE "OtpPurpose" ADD VALUE 'email_change';

-- ─── 3. Extend User table ────────────────────────────────────────────────────

ALTER TABLE "User"
  ADD COLUMN "avatarUrl"               TEXT,
  ADD COLUMN "status"                  "UserStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "notificationPreferences" JSONB;

-- ─── 4. Address table ────────────────────────────────────────────────────────
-- CONTRACT v1.3.0 §4 column shape: label, governorate, area, block, street,
-- building (REQUIRED), unit, lat, lng, isDefault.
-- line1 / line2 / postalCode are NOT in the spec and are excluded.

CREATE TABLE "Address" (
  "id"          UUID                NOT NULL,
  "userId"      UUID                NOT NULL,
  "label"       VARCHAR(80)         NOT NULL,
  "governorate" "KuwaitGovernorate" NOT NULL,
  "area"        VARCHAR(120)        NOT NULL,
  "block"       VARCHAR(40)         NOT NULL,
  "street"      VARCHAR(120)        NOT NULL,
  "building"    VARCHAR(120)        NOT NULL,
  "unit"        VARCHAR(40),
  "lat"         DOUBLE PRECISION,
  "lng"         DOUBLE PRECISION,
  "isDefault"   BOOLEAN             NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)        NOT NULL,
  CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Address_userId_idx"
  ON "Address" ("userId");

-- Partial unique: at most one default address per user.
CREATE UNIQUE INDEX "address_one_default_per_user"
  ON "Address" ("userId")
  WHERE "isDefault" = TRUE;

ALTER TABLE "Address"
  ADD CONSTRAINT "Address_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 5. UserDeviceSession table ──────────────────────────────────────────────
-- CONTRACT v1.3.0 §3 column shape: id, userId, refreshTokenJti (NULLABLE —
-- set to NULL when row is rotated out), revokedAt, deviceLabel, platform,
-- ipFirstSeen, ipLastSeen, createdAt, lastActiveAt.
-- userAgent and expiresAt are NOT in the spec and are excluded.

CREATE TABLE "UserDeviceSession" (
  "id"              UUID         NOT NULL,
  "userId"          UUID         NOT NULL,
  "refreshTokenJti" VARCHAR(128),
  "revokedAt"       TIMESTAMP(3),
  "deviceLabel"     VARCHAR(200),
  "platform"        VARCHAR(40),
  "ipFirstSeen"     VARCHAR(45),
  "ipLastSeen"      VARCHAR(45),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActiveAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserDeviceSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserDeviceSession_userId_idx"
  ON "UserDeviceSession" ("userId");

-- Unique index on refreshTokenJti (nullable — PostgreSQL NULLs are not
-- considered equal, so multiple NULL rows are permitted, which is correct
-- for revoked sessions).
CREATE UNIQUE INDEX "UserDeviceSession_refreshTokenJti_key"
  ON "UserDeviceSession" ("refreshTokenJti");

ALTER TABLE "UserDeviceSession"
  ADD CONSTRAINT "UserDeviceSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
