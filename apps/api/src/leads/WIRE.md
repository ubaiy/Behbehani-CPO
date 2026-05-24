# Lead module — Wire-in instructions (v1.5.25)

## 1. Schema changes applied

`apps/api/prisma/schema.prisma` — changes made:

- New enum `LeadStatus { new contacted qualified converted dropped }`
- New model `Lead` (UUID PK, FK to Listing + User/assignedTo, idempotency unique)
- `Listing.leads Lead[]` back-relation added
- `User.leadsAssigned Lead[] @relation("LeadsAssigned")` back-relation added

## 2. Migration to apply

```
npx prisma migrate deploy
```

File: `apps/api/prisma/migrations/20260524000001_v1_5_25_leads/migration.sql`

Creates `LeadStatus` enum + `Lead` table + FK constraints + indexes.

## 3. Mount routers in apps/api/src/app.ts

Add these two import + mount statements (place alongside existing router mounts):

```typescript
// v1.5.25 — Lead capture
import { publicLeadsRouter }  from './leads/public-leads.controller.js';
import { adminLeadsRouter }   from './leads/admin-leads.controller.js';

// Inside the app setup, after existing router mounts:
app.use('/v1/public', publicLeadsRouter);   // POST /v1/public/leads
app.use('/v1/admin',  adminLeadsRouter);    // GET/PATCH /v1/admin/leads[/:id[/assign]]
```

## 4. Add barrel exports in libs/shared/types/src/index.ts

```typescript
export * from './lib/admin-lead.schemas.js';
```

## 5. Add barrel export in libs/data-access/src/index.ts

```typescript
export { AdminLeadsService } from './lib/admin-leads.service.js';
```

## 6. Roles gating

Admin endpoints accept: `operations_manager`, `general_manager`, `super_admin`, `customer_support`
Assign endpoint (narrower): `operations_manager`, `general_manager`, `super_admin`

## 7. Idempotency TTL note

The `idempotencyKey` unique constraint is permanent in the DB. The spec says
"5-min TTL handled in code" — the service returns the existing lead on collision
rather than a 409, making repeat submissions within any window idempotent.
A cleanup cron (clearing keys older than 5 min) can be added in a future sprint.
