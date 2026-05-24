-- v1.5 — Notifications inbox
-- Hand-authored to match schema.prisma Notification model exactly.
-- DO NOT run prisma migrate — user applies migrations manually.

-- ─── Enum types ───────────────────────────────────────────────────────────────

CREATE TYPE "notification_channel" AS ENUM (
  'push',
  'email',
  'sms',
  'inApp'
);

CREATE TYPE "notification_category" AS ENUM (
  'order',
  'offer',
  'inspection',
  'document',
  'maintenance',
  'system',
  'marketing'
);

CREATE TYPE "notification_icon_hint" AS ENUM (
  'order',
  'offer',
  'inspection',
  'doc',
  'system'
);

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE "notification" (
  "id"        TEXT                     NOT NULL,
  "userId"    UUID                     NOT NULL,
  "channel"   "notification_channel"   NOT NULL,
  "category"  "notification_category"  NOT NULL,
  "titleEn"   TEXT                     NOT NULL,
  "titleAr"   TEXT                     NOT NULL,
  "bodyEn"    TEXT                     NOT NULL,
  "bodyAr"    TEXT                     NOT NULL,
  "deepLink"  TEXT,
  "iconHint"  "notification_icon_hint",
  "readAt"    TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- ─── Foreign key ─────────────────────────────────────────────────────────────

ALTER TABLE "notification"
  ADD CONSTRAINT "notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

-- Primary list query: all notifications for a user, newest first.
CREATE INDEX "notification_userId_createdAt_idx"
  ON "notification" ("userId", "createdAt" DESC);

-- Unread filter + mark-as-read ownership check.
CREATE INDEX "notification_userId_readAt_idx"
  ON "notification" ("userId", "readAt");
