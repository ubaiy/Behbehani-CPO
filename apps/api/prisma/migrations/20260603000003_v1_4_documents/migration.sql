-- v1.4 — Customer document vault + backfill of existing inspection PDFs
-- CONTRACT v1.4.2 §3 + §5 Day 2.

-- 1. Enum
CREATE TYPE "DocumentKind" AS ENUM (
  'inspection_report',
  'sale_contract',
  'insurance_policy',
  'warranty',
  'invoice',
  'other'
);

-- 2. Table
CREATE TABLE "Document" (
  "id"            UUID         NOT NULL,
  "customerId"    UUID         NOT NULL,
  "kind"          "DocumentKind" NOT NULL,
  "title"         VARCHAR(200) NOT NULL,
  "fileKey"       VARCHAR(500) NOT NULL,
  "thumbnailKey"  VARCHAR(500),
  "mimeType"      VARCHAR(80)  NOT NULL,
  "fileSizeBytes" INTEGER      NOT NULL,
  "listingId"     UUID,
  "orderId"       UUID,
  "inspectionId"  UUID,
  "uploadedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedById"  UUID,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- 3. Indexes
CREATE INDEX "Document_customerId_idx"      ON "Document" ("customerId");
CREATE INDEX "Document_customerId_kind_idx" ON "Document" ("customerId", "kind");
CREATE INDEX "Document_orderId_idx"         ON "Document" ("orderId");
CREATE INDEX "Document_inspectionId_idx"    ON "Document" ("inspectionId");

-- 4. FKs
ALTER TABLE "Document"
  ADD CONSTRAINT "Document_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- InspectionReport exists; add FK with SET NULL so dropping an inspection
-- does not cascade-delete the document.
ALTER TABLE "Document"
  ADD CONSTRAINT "Document_inspectionId_fkey"
  FOREIGN KEY ("inspectionId") REFERENCES "InspectionReport"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- orderId has no FK in v1.4 — Order model lands in Day 4.
-- Day 4 migration adds: ALTER TABLE "Document" ADD CONSTRAINT "Document_orderId_fkey" ...

-- 5. Backfill — every existing inspection PDF becomes a Document row.
-- Column confirmed from schema.prisma: InspectionReport."reportPdfKey" (String?),
-- InspectionReport."customerId" (String? @db.Uuid),
-- InspectionReport."bookingRef"  (String?),
-- InspectionReport."createdAt"   (DateTime).
-- Only rows where reportPdfKey is non-null and customerId is non-null are included.
INSERT INTO "Document" (
  "id",
  "customerId",
  "kind",
  "title",
  "fileKey",
  "mimeType",
  "fileSizeBytes",
  "inspectionId",
  "uploadedAt",
  "uploadedById"
)
SELECT
  gen_random_uuid()                                       AS "id",
  i."customerId"                                          AS "customerId",
  'inspection_report'::"DocumentKind"                     AS "kind",
  COALESCE(
    CONCAT('Inspection report ', i."bookingRef"),
    'Inspection report'
  )                                                       AS "title",
  i."reportPdfKey"                                        AS "fileKey",
  'application/pdf'                                       AS "mimeType",
  0                                                       AS "fileSizeBytes",
  i."id"                                                  AS "inspectionId",
  i."createdAt"                                           AS "uploadedAt",
  NULL                                                    AS "uploadedById"
FROM "InspectionReport" i
WHERE i."customerId"   IS NOT NULL
  AND i."reportPdfKey" IS NOT NULL
  AND i."reportPdfKey" != '';
