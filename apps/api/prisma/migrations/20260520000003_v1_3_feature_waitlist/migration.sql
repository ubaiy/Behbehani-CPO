-- v1.3 — Feature waitlist (Coming-Soon shell opt-in capture)
-- CONTRACT v1.4.1 §5. Guest-allowed; idempotent on (featurePath, email).

CREATE TABLE "FeatureWaitlist" (
  "id"          UUID         NOT NULL,
  "userId"      UUID,
  "featurePath" VARCHAR(120) NOT NULL,
  "email"       VARCHAR(254) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeatureWaitlist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeatureWaitlist_featurePath_email_key"
  ON "FeatureWaitlist" ("featurePath", "email");

CREATE INDEX "FeatureWaitlist_userId_idx"
  ON "FeatureWaitlist" ("userId");

ALTER TABLE "FeatureWaitlist"
  ADD CONSTRAINT "FeatureWaitlist_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
