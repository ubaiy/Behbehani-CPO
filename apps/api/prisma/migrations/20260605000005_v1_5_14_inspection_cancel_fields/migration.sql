-- v1.5.14: add cancellation fields to inspection_report
-- Closes [ASK A→B-3] (CONCIERGE_INSPECTION_API_CONTRACT.md v1.5-D10 §3)
-- Allows the customer to cancel their own concierge booking while in draft status.
-- cancelledAt is used for idempotency detection and DTO surfacing.
-- cancellationReason is optional free-text (max 200 chars) stored as VARCHAR(200).

ALTER TABLE "InspectionReport"
  ADD COLUMN "cancelledAt"        TIMESTAMP(3),
  ADD COLUMN "cancellationReason" VARCHAR(200);
