-- v1.3.7 Phase B — PII columns on User
-- CONTRACT: V1_4_ROADMAP.md §1 + §B-6.
-- All columns nullable. No backfill — existing users have NULL PII until they
-- choose to fill it via v1.4.x loan-app / KYC workflows.
-- Civil ID storage tier: SENSITIVE (S3_CONVENTIONS.md Tier 3) — encrypted at rest,
-- 5-min signed-URL TTL. Validation: regex + KW mod-11 checksum (in-app, no PACI API).

CREATE TYPE "Gender" AS ENUM ('male', 'female', 'prefer_not_to_say');

ALTER TABLE "User"
  ADD COLUMN "dateOfBirth"           DATE,
  ADD COLUMN "gender"                "Gender",
  ADD COLUMN "nationality"           VARCHAR(2),
  ADD COLUMN "civilIdNumber"         VARCHAR(12),
  ADD COLUMN "civilIdFrontUrl"       VARCHAR(500),
  ADD COLUMN "civilIdBackUrl"        VARCHAR(500),
  ADD COLUMN "civilIdVerifiedAt"     TIMESTAMP(3),
  ADD COLUMN "civilIdExpiry"         DATE,
  ADD COLUMN "passportNumber"        VARCHAR(40),
  ADD COLUMN "passportExpiry"        DATE,
  ADD COLUMN "passportUrl"           VARCHAR(500),
  ADD COLUMN "driverLicenseNumber"   VARCHAR(40),
  ADD COLUMN "driverLicenseExpiry"   DATE,
  ADD COLUMN "driverLicenseUrl"      VARCHAR(500);
