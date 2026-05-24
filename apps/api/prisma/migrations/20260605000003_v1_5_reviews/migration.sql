-- Migration: 20260605000003_v1_5_reviews
-- v1.5.8 — Customer reviews (polymorphic target: Listing or Service)
-- Hand-authored to match Prisma schema decorators exactly.

-- ─── Enum types ──────────────────────────────────────────────────────────────

CREATE TYPE "review_target_kind" AS ENUM ('listing', 'service');
CREATE TYPE "review_service_kind" AS ENUM ('inspection', 'maintenance');

-- ─── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE "review" (
    "id"                TEXT          NOT NULL,
    "userId"            UUID          NOT NULL,
    "targetKind"        "review_target_kind" NOT NULL,
    "targetListingId"   UUID,
    "targetServiceKind" "review_service_kind",
    "targetServiceId"   TEXT,
    "rating"            INTEGER       NOT NULL,
    "title"             VARCHAR(80)   NOT NULL,
    "body"              VARCHAR(1000) NOT NULL,
    "idempotencyKey"    VARCHAR(80),
    "createdAt"         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)  NOT NULL,

    -- DB-level rating guard (1-5)
    CONSTRAINT "review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5),

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- ─── Foreign keys ─────────────────────────────────────────────────────────────

-- User FK (Cascade — deleting a user removes their reviews)
ALTER TABLE "review"
    ADD CONSTRAINT "review_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Listing FK (Cascade — deleting a listing removes its reviews)
ALTER TABLE "review"
    ADD CONSTRAINT "review_targetListingId_fkey"
    FOREIGN KEY ("targetListingId") REFERENCES "Listing"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- NOTE: targetServiceId has NO FK constraint — it is a free-form ID
-- that can reference either InspectionReport.id or MaintenanceRequest.id.

-- ─── Unique constraints ───────────────────────────────────────────────────────

-- One review per customer per listing target
ALTER TABLE "review"
    ADD CONSTRAINT "review_userId_targetListingId_key"
    UNIQUE ("userId", "targetListingId");

-- One review per customer per service target
ALTER TABLE "review"
    ADD CONSTRAINT "review_userId_targetServiceKind_targetServiceId_key"
    UNIQUE ("userId", "targetServiceKind", "targetServiceId");

-- Idempotency key uniqueness
ALTER TABLE "review"
    ADD CONSTRAINT "review_idempotencyKey_key"
    UNIQUE ("idempotencyKey");

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Customer's own reviews — newest first
CREATE INDEX "review_userId_createdAt_idx"
    ON "review" ("userId", "createdAt" DESC);

-- Listing reviews — newest first (VDP use-case)
CREATE INDEX "review_targetListingId_createdAt_idx"
    ON "review" ("targetListingId", "createdAt" DESC);

-- Service target lookup (reviewability guard + admin queries)
CREATE INDEX "review_targetKind_targetServiceKind_targetServiceId_idx"
    ON "review" ("targetKind", "targetServiceKind", "targetServiceId");
