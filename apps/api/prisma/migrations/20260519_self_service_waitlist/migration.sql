-- CreateTable
CREATE TABLE "SelfServiceWaitlist" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "locale" VARCHAR(8),
    "referrer" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelfServiceWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SelfServiceWaitlist_email_key" ON "SelfServiceWaitlist"("email");

-- CreateIndex
CREATE INDEX "SelfServiceWaitlist_createdAt_idx" ON "SelfServiceWaitlist"("createdAt");
