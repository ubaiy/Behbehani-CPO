# v1.5.29 — Test Drive Bookings WIRE

## Schema additions (apps/api/prisma/schema.prisma)

Three new enums and one new model added:
- `TestDriveWindow` { morning, afternoon, evening }
- `TestDriveLocation` { showroom, customer_address }
- `TestDriveStatus` { requested, scheduled, confirmed, completed, no_show, cancelled }
- `TestDriveBooking` model (UUID PK, idempotencyKey unique, FK to Listing + User)

Back-relations added to existing models:
- `User.testDrivesAssigned TestDriveBooking[] @relation("TestDrivesAssigned")`
- `Listing.testDriveBookings TestDriveBooking[]`

## Migration to apply

Run (do NOT run in this session — lead applies):
```bash
npx prisma migrate deploy
```
Or to create a named migration from the schema diff:
```bash
npx prisma migrate dev --name v1_5_29_test_drive_bookings
```
The hand-authored SQL is at:
`apps/api/prisma/migrations/20260524000002_v1_5_29_test_drive_bookings/migration.sql`

## app.ts mount lines (apps/api/src/app.ts)

Add two imports and two mount calls. The lead session handles this:

```typescript
// Near the other public-router imports:
import { publicTestDriveRouter } from './test-drive-bookings/public-test-drive.controller.js';

// Near the other admin-router imports:
import { adminTestDriveRouter } from './test-drive-bookings/admin-test-drive.controller.js';

// Mount public route (same prefix as other public routes):
app.use('/v1/public', publicTestDriveRouter);

// Mount admin route (same prefix as other admin routes):
app.use('/v1/admin', adminTestDriveRouter);
```

## Endpoints summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /v1/public/test-drive-bookings | None (rate-limited 5/min/IP) | Create booking (requires Idempotency-Key header) |
| GET | /v1/admin/test-drive-bookings | Admin role | Paginated list with status counts |
| GET | /v1/admin/test-drive-bookings/:id | Admin role | Single booking detail |
| PATCH | /v1/admin/test-drive-bookings/:id | Admin role | Update status / scheduledAt / adminNotes |
| POST | /v1/admin/test-drive-bookings/:id/assign | Admin role | Assign to staff user |

Allowed admin roles: `operations_manager`, `general_manager`, `super_admin`, `customer_support`

## State machine

```
requested  →  scheduled   (requires scheduledAt in body)
           →  cancelled

scheduled  →  confirmed
           →  cancelled

confirmed  →  completed   (auto-sets completedAt = now())
           →  no_show
           →  cancelled

completed / no_show / cancelled  →  (terminal — no further transitions)
```

Illegal transition → HTTP 409 with code `TEST_DRIVE_INVALID_STATUS_TRANSITION`.
