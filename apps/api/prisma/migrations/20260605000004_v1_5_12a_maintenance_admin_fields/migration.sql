-- v1.5.12a — Admin maintenance queue: add cancellationReason column
-- Hand-authored to match schema.prisma MaintenanceRequest model.
-- DO NOT run prisma migrate — user applies migrations manually.

ALTER TABLE "maintenance_request"
  ADD COLUMN "cancellationReason" VARCHAR(500);
