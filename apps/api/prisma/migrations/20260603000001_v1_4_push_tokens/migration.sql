-- v1.4 — Push tokens (FCM + APNs registry)
-- CONTRACT v1.4.2 §3 + §5 Day 1. Customer-owned device tokens for push dispatch.

CREATE TYPE "PushPlatform" AS ENUM ('ios', 'android');

CREATE TABLE "PushToken" (
  "id"          UUID         NOT NULL,
  "userId"      UUID         NOT NULL,
  "token"       VARCHAR(512) NOT NULL,
  "platform"    "PushPlatform" NOT NULL,
  "deviceLabel" VARCHAR(200),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushToken_token_key"
  ON "PushToken" ("token");

CREATE INDEX "PushToken_userId_idx"
  ON "PushToken" ("userId");

ALTER TABLE "PushToken"
  ADD CONSTRAINT "PushToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
