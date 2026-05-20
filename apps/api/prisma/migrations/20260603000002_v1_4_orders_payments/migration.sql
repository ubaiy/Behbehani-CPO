-- v1.4 — Order + Payment models, reservation-expiry support.
-- CONTRACT v1.4.2 §3 + §4.
--
-- NOTE: ListingStage already contains 'reserved' from the initial schema.
-- No ALTER TYPE needed for ListingStage.
--
-- Day 2 migration (20260603000003_v1_4_documents) left Document.orderId without
-- a FK — this migration adds that constraint once the Order table exists.

-- 1. Enums

CREATE TYPE "OrderStatus" AS ENUM (
  'reservation_pending',
  'confirmed',
  'payment_pending',
  'paid',
  'delivery_scheduled',
  'delivered',
  'completed',
  'cancelled'
);

CREATE TYPE "PaymentMethod" AS ENUM (
  'knet',
  'card',
  'apple_pay',
  'google_pay',
  'bank_transfer',
  'financing',
  'cash_on_delivery'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'pending',
  'succeeded',
  'failed',
  'refunded'
);

-- 2. Order table

CREATE TABLE "Order" (
  "id"                    UUID            NOT NULL,
  "customerId"            UUID            NOT NULL,
  "listingId"             UUID            NOT NULL,
  "stockNumber"           VARCHAR(40)     NOT NULL,
  "status"                "OrderStatus"   NOT NULL DEFAULT 'reservation_pending',
  "reservationAmountFils" BIGINT          NOT NULL,
  "totalAmountFils"       BIGINT          NOT NULL,
  "paidAmountFils"        BIGINT          NOT NULL DEFAULT 0,
  "reservedAt"            TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reservationExpiresAt"  TIMESTAMP(3)    NOT NULL,
  "completedAt"           TIMESTAMP(3),
  "cancelledAt"           TIMESTAMP(3),
  "cancellationReason"    VARCHAR(500),
  "idempotencyKey"        VARCHAR(80)     NOT NULL,
  "createdAt"             TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- Unique idempotency key on Order
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order" ("idempotencyKey");

-- Indexes on Order
CREATE INDEX "Order_customerId_idx"           ON "Order" ("customerId");
CREATE INDEX "Order_listingId_idx"            ON "Order" ("listingId");
CREATE INDEX "Order_status_idx"               ON "Order" ("status");
CREATE INDEX "Order_reservationExpiresAt_idx" ON "Order" ("reservationExpiresAt");

-- FKs on Order: RESTRICT delete — orders are permanent records even if user/listing is removed.
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Payment table

CREATE TABLE "Payment" (
  "id"              UUID            NOT NULL,
  "orderId"         UUID            NOT NULL,
  "amountFils"      BIGINT          NOT NULL,
  "method"          "PaymentMethod" NOT NULL,
  "status"          "PaymentStatus" NOT NULL DEFAULT 'pending',
  "providerRef"     JSONB,
  "idempotencyKey"  VARCHAR(80),
  "initiatedAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt"          TIMESTAMP(3),
  "failedAt"        TIMESTAMP(3),
  "refundedAt"      TIMESTAMP(3),
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- Partial unique index: idempotencyKey IS NOT NULL (idempotencyKey is optional on Payment)
CREATE UNIQUE INDEX "Payment_idempotencyKey_key"
  ON "Payment" ("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

-- Indexes on Payment
CREATE INDEX "Payment_orderId_idx" ON "Payment" ("orderId");
CREATE INDEX "Payment_status_idx"  ON "Payment" ("status");

-- FK on Payment: CASCADE — payments are meaningless without their order.
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Backfill: add FK from Document.orderId → Order (deferred from Day 2 migration).
ALTER TABLE "Document"
  ADD CONSTRAINT "Document_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
