-- v1.5.25 — Lead capture + admin Leads queue
-- Hand-authored to match schema.prisma Lead model + LeadStatus enum.
-- Apply with: npx prisma migrate deploy (lead will run this)

-- Create the LeadStatus enum
CREATE TYPE "LeadStatus" AS ENUM (
  'new',
  'contacted',
  'qualified',
  'converted',
  'dropped'
);

-- Create the Lead table
CREATE TABLE "Lead" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "listingId"      UUID,
  "customerName"   VARCHAR(120) NOT NULL,
  "customerPhone"  VARCHAR(20)  NOT NULL,
  "customerEmail"  VARCHAR(255),
  "message"        VARCHAR(500),
  "source"         VARCHAR(20)  NOT NULL DEFAULT 'vdp',
  "status"         "LeadStatus" NOT NULL DEFAULT 'new',
  "notes"          TEXT,
  "assignedToId"   UUID,
  "contactedAt"    TIMESTAMP(3),
  "resolvedAt"     TIMESTAMP(3),
  "ipAddress"      VARCHAR(45),
  "userAgent"      VARCHAR(500),
  "idempotencyKey" TEXT UNIQUE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- Foreign key: Lead → Listing (SET NULL on delete)
ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_listingId_fkey"
  FOREIGN KEY ("listingId")
  REFERENCES "Listing"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign key: Lead → User (assignedTo, SET NULL on delete)
ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_assignedToId_fkey"
  FOREIGN KEY ("assignedToId")
  REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX "Lead_listingId_idx"        ON "Lead"("listingId");

-- Trigger to keep updatedAt current
CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Lead_updatedAt_trigger"
  BEFORE UPDATE ON "Lead"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
