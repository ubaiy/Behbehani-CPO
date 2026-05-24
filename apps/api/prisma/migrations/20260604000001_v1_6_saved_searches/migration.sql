-- v1.6 — SavedSearch model.
-- Stores customer browse-filter presets with optional new-match notification flag.
-- queryPayload is JSONB; every field inside is optional per SavedSearchQueryPayloadSchema.
--
-- NOTE: SavedSearch.id uses cuid() (TEXT, not UUID) — matches schema.prisma @id @default(cuid()).
-- User.id is UUID — FK column carries @db.Uuid but the PK side is UUID type.

-- 1. saved_search table (@@map("saved_search"))

CREATE TABLE "saved_search" (
  "id"                    TEXT            NOT NULL,
  "userId"                UUID            NOT NULL,
  "name"                  VARCHAR(120)    NOT NULL,
  "queryPayload"          JSONB           NOT NULL,
  "notifyOnMatch"         BOOLEAN         NOT NULL DEFAULT true,
  "lastNotifiedAt"        TIMESTAMP(3),
  "matchCountAtCreation"  INTEGER,
  "createdAt"             TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "saved_search_pkey" PRIMARY KEY ("id")
);

-- 2. Indexes

-- Composite index: userId + createdAt DESC — my-saved-searches page ordering.
CREATE INDEX "saved_search_userId_createdAt_idx" ON "saved_search" ("userId", "createdAt" DESC);

-- 3. FK: userId → User.id CASCADE (if user deleted, drop their saved searches)

ALTER TABLE "saved_search"
  ADD CONSTRAINT "saved_search_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
