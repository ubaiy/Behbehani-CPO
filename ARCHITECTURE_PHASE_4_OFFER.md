# Architecture Phase 4 — Concierge Offer Module + CPO Post-Signoff Hardening

> **Status:** Spec draft. Pending user approval before implementation begins.
> **Scope boundary:** B owns all backend + admin surfaces. A owns thin public controllers + storefront offer pages.
> **Contract version:** extends `CONCIERGE_INSPECTION_API_CONTRACT.md` v0.9.

---

## 1. Problem Statement

The Concierge flow today ends at `signed_off`. The customer signed an inspection report that authorises Behbehani to make an offer, and then nothing happens. The storefront promise — "We'll inspect your car at your location and make you a fair offer" — is half-fulfilled. The offer half has no data model, no service layer, no public surface, and no notification path. The customer is left waiting for an unspecified phone call that may never come.

The CPO flow has a matching gap on the back side. When an inspector signs off a CPO report, the listing stage remains at `inspection`. An admin must manually navigate to the listing and click through to `photoshoot` — a click that admins always perform, with no legitimate reason to skip it. The listing stage machine already permits `inspection → photoshoot` (see `listings.service.ts` line 296). Making this automatic at CPO signoff removes manual toil and closes the window where a listing sits stale in `inspection` for hours after the inspection is done. Additionally, `reportPdfKey` on `InspectionReport` is a stubbed TODO (`inspections.service.ts:386`); there is no PDF generation, and the public listing detail page cannot deliver the inspection report download that the storefront implies exists.

The goal of Phase 4 is: (1) build the offer module end-to-end for Concierge inspections — admin creates an offer, customer receives a token-gated link, customer accepts/declines/counters, audit trail is complete; (2) harden CPO post-signoff — auto-advance the listing stage and trigger PDF generation for both kinds; (3) expose a PDF URL on `PublicInspectionSummary` so the storefront can deliver the report download it has promised.

---

## 2. State Machine Extension

### Existing `InspectionStatus` (unchanged)

```
draft → in_progress → awaiting_inspector_signoff → [concierge] awaiting_customer_signature → signed_off
                                                 → [cpo] ──────────────────────────────────→ signed_off
```

`signed_off` is the terminal state for the inspection. The offer lifecycle is a **separate entity** — an `Offer` record that references the inspection. Do not extend `InspectionStatus`; doing so would couple the inspection sign-off path to offer negotiation outcomes, breaking the single-responsibility of the inspection state machine.

### New `OfferStatus` Enum

```
drafted → sent → countered_by_customer → accepted
                                       → declined
       → accepted
       → declined
       → expired
       → withdrawn
```

Full transition table:

| From                   | To                     | Trigger                                           | Actor         |
|------------------------|------------------------|---------------------------------------------------|---------------|
| `drafted`              | `sent`                 | Admin publishes the offer                         | Admin action  |
| `sent`                 | `accepted`             | Customer clicks Accept                            | Customer      |
| `sent`                 | `declined`             | Customer clicks Decline                           | Customer      |
| `sent`                 | `countered_by_customer`| Customer submits a counter amount                 | Customer      |
| `sent`                 | `expired`              | `validUntil` passes; daily sweep runs             | Time-based    |
| `sent`                 | `withdrawn`            | Admin retracts before customer responds           | Admin action  |
| `countered_by_customer`| `accepted`             | Admin accepts the counter                         | Admin action  |
| `countered_by_customer`| `declined`             | Admin declines the counter                        | Admin action  |
| `countered_by_customer`| `expired`              | `validUntil` passes during a pending counter      | Time-based    |
| `countered_by_customer`| `withdrawn`            | Admin withdraws while counter is unresolved       | Admin action  |

`drafted` exists to support multi-step offer creation (save-draft before publishing). An offer in `drafted` state is never visible to the customer. The `publicToken` is generated at creation but the notification is only dispatched when status moves to `sent`.

Terminal states: `accepted`, `declined`, `expired`, `withdrawn`. A new offer may be created after a terminal state (`inspectionId` FK is not unique, so re-issuance is allowed). The new offer chains to the previous via `previousOfferId`.

### Counter-offer round cap

**Recommendation: 1 counter-offer round only.** After a customer counter, admin must accept or decline — the customer cannot counter again. Rationale: unlimited rounds turn the offer page into a chat thread, require complex UI on both sides, and introduce prolonged indecision that delays the sales pipeline. One counter is commercially reasonable (customer states their price; admin decides). If admin declines the counter, the deal is dead; a fresh offer may be created but that resets the `publicToken` and the 7-day clock, which is a natural friction that keeps negotiations honest.

---

## 3. Prisma Schema Delta

Add a new enum and model. No existing models are modified; the only existing file change is adding two FK back-relations to `User` (inside `User {}` Prisma block) and one optional FK to `InspectionReport`.

```prisma
enum OfferStatus {
  drafted
  sent
  countered_by_customer
  accepted
  declined
  expired
  withdrawn
}

model Offer {
  id                   String      @id @default(uuid()) @db.Uuid

  // ── Inspection link ──────────────────────────────────────────────────────
  // NOT unique — allows re-issuance after decline/expiry.
  inspectionId         String      @db.Uuid
  inspection           InspectionReport @relation(fields: [inspectionId], references: [id])

  // Denormalised for fast public lookup (avoids a join on the token-gated path).
  bookingRef           String      // mirrors InspectionReport.bookingRef at creation time

  // ── Customer ─────────────────────────────────────────────────────────────
  customerId           String      @db.Uuid
  customer             User        @relation("CustomerOffer", fields: [customerId], references: [id])

  // ── Offer amount (KWD stored as fils, 1 KWD = 1000 fils) ────────────────
  offerAmountFils      BigInt
  validUntil           DateTime

  // ── Status ───────────────────────────────────────────────────────────────
  status               OfferStatus @default(drafted)

  // ── Admin internal notes (never exposed via public endpoints) ────────────
  notes                String?     @db.Text

  // ── Customer counter ─────────────────────────────────────────────────────
  counterAmountFils    BigInt?     // populated when customer counters
  counterNotes         String?     @db.Text

  // ── Public token (customer-facing) ───────────────────────────────────────
  publicToken          String      @unique  // 64-char hex
  publicTokenExpiresAt DateTime

  // ── Actor + response metadata ────────────────────────────────────────────
  createdById          String      @db.Uuid
  createdBy            User        @relation("OfferCreatedBy", fields: [createdById], references: [id])

  respondedAt          DateTime?   // when customer responded (any response)
  respondedIp          String?
  respondedUserAgent   String?

  // ── Re-issuance chain ────────────────────────────────────────────────────
  // Self-FK: links a new offer back to the declined/expired offer it replaces.
  // Preserves full audit history without mutating the original row.
  previousOfferId      String?     @db.Uuid
  previousOffer        Offer?      @relation("OfferChain", fields: [previousOfferId], references: [id])
  subsequentOffers     Offer[]     @relation("OfferChain")

  // ── Timestamps ───────────────────────────────────────────────────────────
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt

  @@index([inspectionId])
  @@index([customerId, status])
  @@index([status, validUntil])   // used by daily expiry sweep
  @@index([publicToken])          // covered by @unique but explicit for clarity
}
```

Add to the `User` model block (additive only):

```prisma
// In model User { ... }
offers         Offer[]  @relation("CustomerOffer")
createdOffers  Offer[]  @relation("OfferCreatedBy")
```

Add to `InspectionReport` model block (additive only):

```prisma
// In model InspectionReport { ... }
offers  Offer[]
```

---

## 4. Migration Sketch

Migration directory: `apps/api/prisma/migrations/20260520_offers/migration.sql`

```sql
-- Create OfferStatus enum
CREATE TYPE "OfferStatus" AS ENUM (
  'drafted',
  'sent',
  'countered_by_customer',
  'accepted',
  'declined',
  'expired',
  'withdrawn'
);

-- Create Offer table
CREATE TABLE "Offer" (
  "id"                   UUID         NOT NULL DEFAULT gen_random_uuid(),
  "inspectionId"         UUID         NOT NULL,
  "bookingRef"           TEXT         NOT NULL,
  "customerId"           UUID         NOT NULL,
  "offerAmountFils"      BIGINT       NOT NULL,
  "validUntil"           TIMESTAMPTZ  NOT NULL,
  "status"               "OfferStatus" NOT NULL DEFAULT 'drafted',
  "notes"                TEXT,
  "counterAmountFils"    BIGINT,
  "counterNotes"         TEXT,
  "publicToken"          TEXT         NOT NULL,
  "publicTokenExpiresAt" TIMESTAMPTZ  NOT NULL,
  "createdById"          UUID         NOT NULL,
  "respondedAt"          TIMESTAMPTZ,
  "respondedIp"          TEXT,
  "respondedUserAgent"   TEXT,
  "previousOfferId"      UUID,
  "createdAt"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_inspectionId_fkey"
    FOREIGN KEY ("inspectionId") REFERENCES "InspectionReport"("id"),
  ADD CONSTRAINT "Offer_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "User"("id"),
  ADD CONSTRAINT "Offer_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id"),
  ADD CONSTRAINT "Offer_previousOfferId_fkey"
    FOREIGN KEY ("previousOfferId") REFERENCES "Offer"("id");

-- Unique constraint
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_publicToken_key" UNIQUE ("publicToken");

-- Indexes
CREATE INDEX "Offer_inspectionId_idx"      ON "Offer"("inspectionId");
CREATE INDEX "Offer_customerId_status_idx" ON "Offer"("customerId", "status");
CREATE INDEX "Offer_status_validUntil_idx" ON "Offer"("status", "validUntil");
```

This migration has no dependency on any migration after `20260519_self_service_waitlist`. The `InspectionReport` and `User` tables already exist. Hand-author this file in the Prisma migrations directory following the same convention as `20260519_self_service_waitlist/migration.sql`.

---

## 5. Zod Schemas

New file: `libs/shared/types/src/lib/offer.schemas.ts`

```ts
import { z } from 'zod';

// ─── Enum ────────────────────────────────────────────────────────────────────

export const OFFER_STATUSES = [
  'drafted', 'sent', 'countered_by_customer',
  'accepted', 'declined', 'expired', 'withdrawn',
] as const;
export const OfferStatusSchema = z.enum(OFFER_STATUSES);
export type OfferStatus = z.infer<typeof OfferStatusSchema>;

// ─── Admin POST body — create a new offer ────────────────────────────────────

export const CreateOfferSchema = z.object({
  offerAmountFils: z.number().int().positive(),
  // validUntil is a date string (ISO 8601); service converts to Date.
  // Validation: must be between 1 and 30 days from now; service enforces.
  validUntil: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  // If this is a re-issuance following a declined/expired offer, link it.
  previousOfferId: z.string().uuid().optional(),
});
export type CreateOfferDto = z.infer<typeof CreateOfferSchema>;

// ─── Admin GET list — offer summary row ──────────────────────────────────────

export const OfferSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  inspectionId: z.string().uuid(),
  bookingRef: z.string(),
  customerId: z.string().uuid(),
  customerFullName: z.string(),
  vehicleLabel: z.string(),        // e.g. "2021 Toyota Camry"
  offerAmountFils: z.number(),
  counterAmountFils: z.number().nullable(),
  validUntil: z.string().datetime(),
  status: OfferStatusSchema,
  createdAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
  ageMinutes: z.number(),          // time since creation — used in the admin queue
});
export type OfferSummaryDto = z.infer<typeof OfferSummaryDtoSchema>;

// ─── Admin GET single — full offer with re-issuance chain ────────────────────

export const OfferDetailDtoSchema = OfferSummaryDtoSchema.extend({
  notes: z.string().nullable(),
  counterNotes: z.string().nullable(),
  respondedIp: z.string().nullable(),
  respondedUserAgent: z.string().nullable(),
  publicToken: z.string(),
  publicTokenExpiresAt: z.string().datetime(),
  createdById: z.string().uuid(),
  createdByFullName: z.string(),
  // Full chain — ordered oldest-first; enables the admin "offer history" timeline.
  offerHistory: z.array(OfferSummaryDtoSchema),
});
export type OfferDetailDto = z.infer<typeof OfferDetailDtoSchema>;

// ─── Public GET — customer-facing offer view (sanitised) ─────────────────────

export const PublicOfferViewSchema = z.object({
  bookingRef: z.string(),
  vehicleLabel: z.string(),
  vehicleYear: z.number().nullable(),
  vehicleBrandName: z.string().nullable(),
  vehicleModelName: z.string().nullable(),
  offerAmountFils: z.number(),
  offerAmountKwd: z.string(),      // pre-formatted "KWD 1,500.000" for display
  validUntil: z.string().datetime(),
  status: OfferStatusSchema,
  // If status === 'countered_by_customer', echo the customer's own counter back.
  counterAmountFils: z.number().nullable(),
  // Whether customer action is currently possible (i.e. status === 'sent').
  canRespond: z.boolean(),
  // Token expiry — lets the UI show a countdown.
  publicTokenExpiresAt: z.string().datetime(),
});
export type PublicOfferView = z.infer<typeof PublicOfferViewSchema>;

// ─── Public POST — customer response ─────────────────────────────────────────

export const CustomerOfferResponseSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
  z.object({
    action: z.literal('decline'),
    reason: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('counter'),
    counterAmountFils: z.number().int().positive(),
    counterNotes: z.string().max(500).optional(),
  }),
]);
export type CustomerOfferResponseDto = z.infer<typeof CustomerOfferResponseSchema>;

// ─── Admin list filters ───────────────────────────────────────────────────────

export const OfferListFilterSchema = z.object({
  status: OfferStatusSchema.optional(),
  q: z.string().max(100).optional(),            // customer name / bookingRef / VIN search
  customerId: z.string().uuid().optional(),
  inspectionId: z.string().uuid().optional(),
  minAgeDays: z.coerce.number().int().nonnegative().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type OfferListFilter = z.infer<typeof OfferListFilterSchema>;

// ─── Admin list response ──────────────────────────────────────────────────────

export const OfferListResponseSchema = z.object({
  data: z.array(OfferSummaryDtoSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});
export type OfferListResponse = z.infer<typeof OfferListResponseSchema>;
```

Export from `libs/shared/types/src/index.ts` following the same additive barrel pattern as `notify.public.schemas.ts`.

---

## 6. Service Exports

New file: `apps/api/src/offers/offers.service.ts`

```ts
// ─── Admin-owned exports ──────────────────────────────────────────────────────

/**
 * Create a new offer for a signed-off Concierge inspection.
 * Guards: inspection.status === 'signed_off' AND inspection.kind === 'concierge'.
 * Throws OfferError(422) if either guard fails.
 * Generates a 64-char hex publicToken. Emits audit 'offer.created'.
 */
export async function createOffer(
  inspectionId: string,
  dto: CreateOfferDto,
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<OfferDetailDto>;

/**
 * Return paginated list of offers matching filter. Admin-only.
 */
export async function listOffersForAdmin(
  filter: OfferListFilter,
): Promise<OfferListResponse>;

/**
 * Return full offer detail including chain history. Admin-only.
 * Throws OfferError(404) if not found.
 */
export async function getOfferForAdmin(id: string): Promise<OfferDetailDto>;

/**
 * Admin responds to a customer counter-offer.
 * Guards: offer.status === 'countered_by_customer'.
 * action 'accept' → status 'accepted'; 'decline' → status 'declined'.
 * Emits notification and audit. Throws OfferError(409) on wrong state.
 */
export async function respondToCounter(
  id: string,
  action: 'accept' | 'decline',
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<{ offerId: string; status: OfferStatus }>;

/**
 * Internal — called by the daily BullMQ sweep job.
 * Transitions offer from 'sent' or 'countered_by_customer' → 'expired'
 * if validUntil < now. Emits audit. No-ops if already terminal.
 */
export async function expireOffer(id: string): Promise<void>;

/**
 * Admin retracts an offer. Guard: status must be 'sent' or 'drafted'.
 * Status → 'withdrawn'. Emits audit and customer notification.
 * Throws OfferError(409) on wrong state.
 */
export async function withdrawOffer(
  id: string,
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<void>;

// ─── Public-shared exports (A's thin controllers call these) ─────────────────

/**
 * // public-shared
 * Validate publicToken, return sanitised offer view for the customer.
 * Throws OfferError with codes:
 *   'NOT_FOUND'         → 404 (token unknown)
 *   'TOKEN_EXPIRED'     → 410 (publicTokenExpiresAt < now)
 *   'OFFER_WITHDRAWN'   → 410 (status === 'withdrawn')
 *   'ALREADY_RESPONDED' → 409 (status is any terminal or countered_by_customer
 *                               where admin has already replied)
 */
export async function getOfferByToken(
  token: string,
): Promise<PublicOfferView>;

/**
 * // public-shared
 * Process a customer action (accept / decline / counter).
 * Guards: status === 'sent' (all actions); counter allowed only once.
 * Sets respondedAt, respondedIp, respondedUserAgent.
 * Emits notification to sales-handoff inbox on 'accept'.
 * Emits notification to admin on 'counter'.
 * Throws OfferError with same four codes as getOfferByToken.
 */
export async function submitCustomerResponse(
  token: string,
  dto: CustomerOfferResponseDto,
  ctx: { ip: string; userAgent: string },
): Promise<{ offerId: string; status: OfferStatus }>;
```

Companion file `apps/api/src/offers/offers.errors.ts` following the `InspectionError` pattern in `apps/api/src/inspections/inspections.errors.ts`. The same router-level error adapter handles `OfferError` → `{ error, code }` JSON.

---

## 7. Admin Endpoints

All routes under `/v1/admin/offers/*`. Role gating follows the existing pattern in `inspections.controller.ts` — middleware reads `req.user.adminRoles`.

| Method | Path | Roles | Request | Response |
|--------|------|-------|---------|----------|
| `POST` | `/v1/admin/inspections/:id/offer` | `sales_agent`, `operations_manager`, `general_manager` | `CreateOfferSchema` body | `201 OfferDetailDto` |
| `GET`  | `/v1/admin/offers` | `sales_agent`, `operations_manager`, `general_manager`, `finance_officer` | `OfferListFilterSchema` query | `200 OfferListResponse` |
| `GET`  | `/v1/admin/offers/:id` | same | — | `200 OfferDetailDto` |
| `POST` | `/v1/admin/offers/:id/send` | `sales_agent`, `operations_manager` | — | `200 { status: 'sent' }` |
| `POST` | `/v1/admin/offers/:id/respond-counter` | `sales_agent`, `operations_manager` | `{ action: 'accept' \| 'decline' }` | `200 { offerId, status }` |
| `POST` | `/v1/admin/offers/:id/withdraw` | `sales_agent`, `operations_manager` | — | `200 { ok: true }` |

The nested route `POST /v1/admin/inspections/:id/offer` is the creation entry point — it keeps the offer creation contextually tied to the inspection detail page in the admin UI, which is where the `sales_agent` will create the offer after reviewing the signed inspection. It delegates to `offersService.createOffer(req.params.id, dto, req.user.id, ctx)`.

`POST .../send` transitions status from `drafted` → `sent` and dispatches the customer notification. Separating creation from dispatch lets an admin draft, review, and adjust the amount before the customer is notified.

All endpoints emit an audit entry on state change via the existing `recordAudit()` helper.

---

## 8. Public Endpoints

A-owned thin controllers. B publishes the `getOfferByToken` and `submitCustomerResponse` service exports (see §6); A wires them identically to how A wired the four `inspections-public.controller.ts` pass-throughs in v0.9.

```
GET  /v1/public/concierge/offers/:token
POST /v1/public/concierge/offers/:token/respond
```

**Error code contract (locked):**

| HTTP | Code | Condition |
|------|------|-----------|
| 404 | `NOT_FOUND` | Token does not match any offer |
| 410 | `TOKEN_EXPIRED` | `publicTokenExpiresAt < now` |
| 410 | `OFFER_WITHDRAWN` | Admin withdrew before customer responded |
| 409 | `ALREADY_RESPONDED` | Customer already accepted/declined/countered |

These parallel the four inspection-sign codes from v0.8 §1 to keep A's error-handling adapter uniform.

A's storefront route: `/{locale}/sell/concierge/offer/:token` (mirrors `/{locale}/inspection-sign/:token` structure). Page renders `PublicOfferView` — vehicle summary, offer amount in KWD, validity countdown, and the three action buttons (Accept / Decline / Counter). A owns this Angular component; B owns the service and DTO.

---

## 9. PDF Generation Strategy

**Recommendation: Puppeteer headless Chrome with BullMQ job queue.**

Puppeteer renders an internal HTML page `GET /internal/inspection-report/:id` (authenticated by service-to-service secret header, never exposed publicly). The HTML template is a standard NestJS/Express server-side rendered page — straightforward to maintain, produces pixel-perfect output, and future Arabic localisation simply requires adding a `?locale=ar` toggle and RTL CSS.

The alternatives are ruled out as follows. PDFKit requires laying out every element in code — acceptable for invoices, but the inspection report has 71 scored items across six sections with per-item photo evidence references; maintaining that layout in a programmatic API is a maintenance burden. wkhtmltopdf is lighter than Puppeteer but is deprecated upstream (last release 2020) and would require a binary vendored in the Docker image with no update path.

Puppeteer adds approximately 250MB to the Docker image. Mitigate this by running the PDF worker in a separate Docker container (or a separate Node.js worker process) so it does not inflate the main API image. BullMQ is already in the project dependencies.

**Job flow:**

```
inspector signoff (CPO or Concierge) → service calls offersService? no →
  → signoff() enqueues job: { queue: 'pdf', name: 'pdf.inspection-report', data: { inspectionId } }
  → worker picks up job, spins up Puppeteer
  → renders GET /internal/inspection-report/:id
  → saves PDF to S3, updates InspectionReport.reportPdfKey
  → on success, emits audit 'inspection.pdf.generated'
  → on failure, retries up to 3 times with exponential backoff
```

New file: `apps/api/src/jobs/pdf-worker.ts` (B owns).

The admin signoff page polls `GET /v1/admin/inspections/:id` (which already returns `reportPdfKey`) every 5 seconds until `reportPdfKey` is non-null, then shows the download link. Maximum wait is typically 10–20 seconds.

Once `reportPdfKey` is populated, B adds `pdfUrl: string | null` to `PublicInspectionSummarySchema` (the additive change deferred from v0.7 §2 item 2). The value is a pre-signed S3 URL with TTL matching `publicTokenExpiresAt`. A's existing "report will be emailed" placeholder swaps to a real download link — per the plan A documented in v0.9 §1.

---

## 10. Notification Templates

New template additions to `apps/api/src/notifications/notifications.service.ts`. All templates follow the existing en + ar `NotificationsProvider` interface from v0.3 §Q2.

| Event | Channel | Template key | Recipient | Trigger |
|-------|---------|-------------|-----------|---------|
| Offer sent to customer | SMS + Email | `offer.sent` | Customer | Status transitions `drafted → sent` |
| Offer expires in 24h | SMS + Email | `offer.expiry_warning` | Customer | Daily cron, `validUntil - 24h` |
| Customer accepted offer | Email | `offer.accepted_internal` | Sales-handoff inbox (`SALES_HANDOFF_EMAIL` env var) | Customer action `accept` |
| Customer countered offer | SMS + Email | `offer.countered` | Customer (acknowledgement) + Admin (notification email) | Customer action `counter` |
| Admin accepted counter | SMS + Email | `offer.counter_accepted` | Customer | `respondToCounter(action='accept')` |
| Admin declined counter | SMS + Email | `offer.counter_declined` | Customer | `respondToCounter(action='decline')` |
| Offer withdrawn | SMS + Email | `offer.withdrawn` | Customer | `withdrawOffer()` |

Template body placeholders (all templates):
- `{{customerName}}` — first name
- `{{vehicleLabel}}` — "2021 Toyota Camry"
- `{{bookingRef}}` — "BMC-CON-000042"
- `{{offerAmountKwd}}` — "KWD 1,500.000"
- `{{validUntil}}` — formatted date
- `{{offerLink}}` — `https://behbehanimotors.com/sell/concierge/offer/:token`

The `offer.accepted_internal` template adds `{{counterAmountKwd}}` (the accepted counter amount, if the acceptance was of a counter-offer) and `{{customerMobile}}` for the sales team to initiate the handoff call.

---

## 11. CPO Post-Signoff Hardening

### Auto-Advance Listing Stage

In `apps/api/src/inspections/inspections.service.ts`, the `signoff()` function at line 657 (CPO path) currently transitions `InspectionReport.status` to `signed_off` and stops. Add the following immediately after `await repo.updateInspection(...)` succeeds for the CPO path:

```
assert: before.listing.stage === 'inspection'
  → call listingsService.advanceStage(before.listingId, 'photoshoot', systemActorId, ctx)
  → emit audit 'listing.stage.auto_advanced' with { from: 'inspection', to: 'photoshoot', reason: 'cpo_signoff' }
```

The assertion `stage === 'inspection'` is defensive only — the listing pipeline requires the listing to be in `inspection` before an inspection can be active. The allowed-transitions matrix (`listings.service.ts` line 296) already permits `inspection → photoshoot`. If the assertion fails (edge case: listing was manually diverted to `reconditioning` before signoff), log a warning and skip the auto-advance without rolling back the inspection signoff. The admin can manually advance the stage from the listing detail page.

This removes a manual step that admins always perform. The admin can still manually transition to `reconditioning` instead of `photoshoot` by doing so on the listing page before triggering inspector signoff — the auto-advance fires only after signoff is committed.

### PDF Generation for CPO

The Puppeteer worker described in §9 covers both CPO and Concierge signoffs. The `signoff()` function enqueues the `pdf.inspection-report` job identically for both kinds. No structural difference.

### Public Listing Report Preview (A side)

`InspectionReport.reportPdfKey` is already included in the public listing controller's join (`apps/api/src/listings/listings-public.controller.ts` — per the grep evidence cited in the project brief). When B adds `pdfUrl` to `PublicInspectionSummarySchema`, A's VDP (Vehicle Detail Page) can render an inline report badge + PDF download link without any new backend changes. This is entirely A's UI work.

---

## 12. File Ownership Matrix Delta

Extends the v0.6 §7 matrix with the following new rows:

| Path | A | B |
|------|:-:|:-:|
| `apps/api/src/offers/offers.service.ts` | ❌ | ✅ |
| `apps/api/src/offers/offers.repository.ts` | ❌ | ✅ |
| `apps/api/src/offers/offers.errors.ts` | ❌ | ✅ |
| `apps/api/src/offers/offers.controller.ts` (admin) | ❌ | ✅ |
| `apps/api/src/offers/offers-public.controller.ts` | ✅ thin | ❌ |
| `apps/api/src/jobs/pdf-worker.ts` | ❌ | ✅ |
| `apps/api/src/jobs/pdf-queue.ts` (BullMQ queue def) | ❌ | ✅ |
| `apps/admin/src/app/features/offers/**` | ❌ | ✅ |
| `apps/web/src/app/features/sell/offer/**` | ✅ | ❌ |
| `libs/shared/types/src/lib/offer.schemas.ts` | ❌ read-only | ✅ |
| `apps/api/prisma/migrations/20260520_offers/**` | ❌ | ✅ |
| `apps/api/prisma/schema.prisma` (Offer model + enum) | ❌ | ✅ |
| `apps/api/src/notifications/notifications.service.ts` (new offer templates) | ❌ | ✅ |
| `apps/api/src/app.ts` (mount public offers router) | ✅ | ❌ |

Same coordination rule as before: B publishes service export signatures in a contract reply first; A wires the public controller in the following sprint. No simultaneous edits to `offer.schemas.ts`.

---

## 13. Test Coverage Outline

File: `apps/api/src/offers/offers.service.spec.ts`

10 required specs:

1. **`createOffer` — happy path**: creates a `drafted` offer linked to a `signed_off` concierge inspection; `publicToken` is 64 hex chars; `inspectionId` FK is set; `bookingRef` is denormalised correctly.
2. **`createOffer` — rejects when inspection is not concierge**: throws `OfferError(422)` when `inspection.kind === 'cpo'`.
3. **`createOffer` — rejects when inspection is not signed_off**: throws `OfferError(422)` when `inspection.status !== 'signed_off'`.
4. **`submitCustomerResponse accept` — transitions to `accepted`**: `status === 'accepted'`, `respondedAt` set, notification dispatched to sales-handoff inbox.
5. **`submitCustomerResponse counter` — transitions to `countered_by_customer`**: `counterAmountFils` + `counterNotes` stored; admin notification dispatched; counter is only permitted once (second counter attempt on same offer throws `ALREADY_RESPONDED`).
6. **`expireOffer` — expires offer past validUntil**: `status === 'expired'` when `validUntil < now`; no-ops if already terminal.
7. **`counter-offer chain via previousOfferId`**: re-issuance after decline creates new `Offer` with `previousOfferId` referencing the declined row; `getOfferForAdmin` returns `offerHistory` with both rows.
8. **`getOfferByToken` — throws TOKEN_EXPIRED**: `publicTokenExpiresAt < now` → `OfferError(410, 'TOKEN_EXPIRED')`.
9. **`getOfferByToken` — throws OFFER_WITHDRAWN**: `status === 'withdrawn'` → `OfferError(410, 'OFFER_WITHDRAWN')`.
10. **`withdrawOffer` — rejects when offer is already terminal**: throws `OfferError(409)` when `status === 'accepted'`; also throws when `status === 'sent'` and `validUntil` has passed (expired — cannot withdraw what has already expired).

---

## 14. Open Questions for the User

The following decisions must be made before the implementation swarm starts. Recommendations are provided; override where business requirements differ.

**Q1. Counter-offer round cap.**
This spec recommends 1 round: customer counters once; admin accepts or declines; no further customer counter on the same offer. A fresh offer (via re-issuance with `previousOfferId`) resets the round count. If you want unlimited rounds, the `submitCustomerResponse` guard that blocks a counter on `status === 'countered_by_customer'` is removed — but this requires additional UI work on both sides and is not recommended for v1.

**Q2. Default validity window.**
This spec assumes 7 days from offer creation. Admin can override `validUntil` per-offer at creation time. The 24-hour expiry-warning notification fires at `validUntil - 24h`. Recommendation: 7 days. Alternatives: 5 days (creates urgency) or 14 days (more relaxed, reduces pressure on the customer). Please confirm before implementation.

**Q3. Public token TTL vs offer expiry.**
After `validUntil` passes and the offer expires, should `/{locale}/sell/concierge/offer/:token` continue to render the offer in a read-only "expired" state, or return `410 TOKEN_EXPIRED` immediately? Recommendation: keep the page readable for 30 days post-expiry (set `publicTokenExpiresAt = validUntil + 30 days`). This lets the customer see what they missed and provides a clear "call us to discuss" CTA. If you prefer hard expiry (410 immediately at `validUntil`), set `publicTokenExpiresAt = validUntil`.

**Q4. Currency storage.**
This spec stores all amounts as `BigInt` fils (1 KWD = 1000 fils), consistent with `Listing.priceFils` and `Listing.costFils` in `schema.prisma` lines 231–234. Please confirm this is correct; if you prefer KWD stored as a decimal string or a separate table for currency, the migration changes significantly.

**Q5. Customer acceptance → sales pipeline.**
When a customer accepts an offer, should the service auto-create a follow-up `Reservation` row (Phase 2 entity, currently reserved in the schema comments at `schema.prisma` line — `Reservation, Order, LoanApplication` noted as future entities), or simply notify the sales team via `offer.accepted_internal` email and leave the pipeline step manual? Recommendation: notify only for v1; auto-create the `Reservation` once that entity ships in Phase 2. Please confirm.

**Q6. Token format.**
`customerSignToken` on `InspectionReport` uses a 64-char hex (32 random bytes). Recommendation: use the same format for `Offer.publicToken` — no new dependency, same security margin, consistent with the inspection signing pattern. If you want a shorter URL-friendly format (e.g. base62 encoded 12 chars), name that preference and the token-generation function changes accordingly.

---

## 15. Out of Scope

The following are explicitly not part of Phase 4:

- **Finance/CRM integration.** The `offer.accepted_internal` email notifies the sales team; no API call to an external CRM or finance system is made. Deferred to a future sprint once the integration target is known.
- **Multi-currency support.** KWD only. The `offerAmountFils` BigInt pattern is sufficient. No currency conversion, no multi-currency display.
- **Offer comparison across multiple Concierge bookings for the same VIN.** A customer may book a Concierge inspection for the same vehicle twice (e.g. after a missed appointment or a declined offer). Phase 4 does not de-duplicate these or surface an offer-history view tied to a VIN. Each `InspectionReport` is its own inspection; each `Offer` chains to its parent inspection only.
- **Arabic PDF localisation.** Phase 4 ships an English-only PDF. A future sprint adds RTL layout + Arabic type; the `GET /internal/inspection-report/:id?locale=ar` route is left as a placeholder. The Puppeteer template should use `dir="ltr"` for now with no Arabic font dependency.
- **Customer-initiated offer request.** Phase 4 does not expose a "request an offer" button on the customer status tracker. Offers are admin-initiated only, after inspecting the signed report in the admin queue.
- **Offer amount negotiation beyond the 1-round cap.** See §2 (counter-offer round cap rationale). *(Note: superseded by §16 D1 override — multiple rounds are now supported.)*
```

---

## 16. User-Decision Overrides (post-spec)

The user reviewed the architect's recommendations (§14 Q1–Q6) and the designer's open questions (mockups/phase-4-offer/README.md DQ1–DQ6) on 2026-05-19. **8 of 11 decisions accepted as recommended**; the two below are overridden. The implementer swarm must treat this section as authoritative when the recommendation in §14 conflicts.

### D1 (overrides Q1 / DQ4) — Unlimited counter-offer rounds + full history

- **Rule:** counter-offers are not capped. Either party can counter as many times as the negotiation requires. The state machine in §2 stays as-written, but no guard rejects a subsequent counter on a previously-countered chain. The `customer-offer-counter.html` mockup's "this is your only counter-offer round" warning chip must be replaced with neutral copy ("BMC will respond within 24 hours") — the warning chip is REMOVED.
- **History:** every round is a discrete `Offer` row, chained via the existing `previousOfferId` self-FK. The admin detail page (`admin-offer-detail.html`) already renders the multi-round timeline correctly; that mockup is now the canonical reference for the history UI.
- **Implementer notes:**
  - In `OfferStatus`, the terminal states (`accepted`, `declined`, `expired`, `withdrawn`) still close their own row. A "decline" by either party can be followed by a new offer in the chain — admin clicks "Re-issue at different price" on the declined row, which creates a new `Offer` with `previousOfferId` pointing at the declined one.
  - When the customer counters, the customer's number must be visible in the *next* admin-issued offer's history view — the timeline reads as a continuous conversation, even though it's a chain of `Offer` rows.
  - Listing/Filter: when displaying "the current offer" for a given inspection, return the most recent row in the chain that isn't yet terminal, or the most recent terminal row if none are open.
  - Test specs: add at least one spec exercising a 3-round chain (Offer #1 sent → customer counters → admin counters → customer accepts) to verify the timeline + queue resolution logic.
- **State machine clarification (extends §2):**

```
[OFFER #N: drafted] -> [sent]
[sent] -> [accepted]     terminal
[sent] -> [declined]     terminal -> admin may re-issue as OFFER #N+1
[sent] -> [expired]      terminal -> admin may re-issue as OFFER #N+1
[sent] -> [withdrawn]    terminal (admin pulled it back)
[sent] -> [countered_by_customer]  customer sent a new number
[countered_by_customer] -> [admin accepted]    OFFER #N transitions to accepted, chain ends
[countered_by_customer] -> [admin declined]    OFFER #N transitions to declined; admin may re-issue
[countered_by_customer] -> [countered_by_admin]  admin sends back a new number — same Offer row,
                                                 not a new chain entry, since this is a continuation
[countered_by_admin] -> [accepted_by_customer]  -> terminal
[countered_by_admin] -> [declined_by_customer]  -> terminal -> admin may re-issue
[countered_by_admin] -> [countered_by_customer] -> back to the loop
```

The `countered_by_admin` is a new status value not in the architect's original §2 enum — implementer must add it. The discriminated union `CustomerOfferResponseSchema` likewise extends with an admin-side counter action handled by a separate admin-only endpoint (`PATCH /v1/admin/offers/:id/counter` with body `{ counterAmountFils, counterNotes? }`).

### D5 (overrides Q5) — Customer acceptance creates a draft Listing for authorised review

When a Concierge offer reaches the terminal `accepted` state (either customer accepts an admin offer, or admin accepts a customer counter), the service **must atomically**:

1. **Create a new Listing row** with:
   - `stage = 'acquired'` (per the existing `ALLOWED_TRANSITIONS` matrix, `acquired` is the entry stage).
   - `costFils = acceptedOfferAmount` (in fils; the offer's `offerAmountFils` for an admin-accepted offer, or the `counterAmountFils` for an admin accepting a customer's counter).
   - `priceFils = null` initially — the authorised reviewer sets the asking price during their review.
   - `brandId`, `modelId`, `bodyTypeId` resolved from the Concierge inspection's `vehicleBrandName` + `vehicleModelName` (look up `Brand.slug` / `Model.slug` by normalised name; fall back to creating a placeholder if no match — emit a warning in the audit log if so).
   - `vin = inspection.vehicleVin` (may be null — Concierge VIN is optional).
   - `year`, `mileageKm`, `transmission`, `exteriorColor`/`interiorColor` (from `customerDeclaredJson`) populated where possible.
   - `stockNumber` auto-generated using the existing sequence pattern (BMC-2026-NNNN) — implementer must check the existing listings repo for the generator.
   - `acquisitionSourceJson` (new optional JSONB column on Listing, or stored as audit metadata) carrying `{ source: 'concierge', inspectionId, offerId, customerId, bookingRef }` so the lineage is queryable.
2. **Link the Concierge inspection to the new listing** by setting `InspectionReport.listingId = newListing.id`. This previously-null FK now becomes populated for Concierge inspections that converted to a purchase.
3. **Audit** with action `offer.accepted_to_listing` carrying before/after snapshots of both the offer status flip and the listing creation.
4. **Notify the operations team** with template `offer.accepted_internal` — payload should include the new draft listing's stock number + a deep link to the admin listing edit page so the reviewer can act in one click.
5. **Do NOT auto-advance the listing past `acquired`** — that's the "authorised person" handoff the user explicitly called out. The operations/pricing manager reviews the draft, sets `priceFils`, fills any missing vehicle facts, then manually advances the listing through the pipeline (`acquired → inbound → inspection → photoshoot → ...`). They may choose to skip re-inspection by jumping `inspection → photoshoot` if the existing Concierge inspection report is deemed sufficient — that's policy, not enforcement.

**Role gating for the manual stage advance:** only `operations_manager`, `pricing_manager`, or `general_manager` may move a Concierge-sourced listing past `acquired`. The acceptance-triggered creation runs under the system role, so no actor check is needed on the create — but the audit entry attributes the creating action to the offer accepter (admin user for an admin-accepted counter, or the customer for a customer acceptance, with `actorId = null` and `actorKind = 'customer'`).

**Schema deltas this triggers (implementer to confirm during Prisma work):**
- `Listing.acquisitionSourceJson Json?` — new column, additive migration on top of `20260520_offers`.
- A migration index on `Listing.acquisitionSourceJson->>'inspectionId'` would help future reporting but is not required for v1.

**Idempotency:** `acceptOffer` must be transactional — the offer state flip and the listing creation either both succeed or neither does. If listing creation fails (e.g. duplicate stockNumber race), the whole acceptance rolls back so the customer can retry. The customer-facing response on success returns `{ status: 'accepted', acceptedAt, listingStockNumber }` so the confirmation page can name the resulting stock entry.

### Decisions accepted as-recommended (no override)

| ID | Decision | Spec reference |
|---|---|---|
| Q2 / D2 | Validity window = 7 days default, admin-overridable | §14 Q2 |
| Q3 / D3 | Public token readable for +30 days post-expiry, then 410 | §14 Q3 |
| Q4 / D4 | Currency stored as `BigInt fils` (1 KWD = 1000 fils) | §14 Q4 |
| Q6 / D6 | Token format = 64-char hex (32 random bytes) | §14 Q6 |
| DQ1 / D11 | Counter as separate page at `/sell/concierge/offer/:token/counter` | mockups README DQ1 |
| DQ2 / D7 | "Accepted" chip = slate-100 / slate-700 (resolved/neutral) | mockups README DQ2 |
| DQ3 / D9 | Market-estimate panel = stubbed with "Beta" badge for v1 | mockups README DQ3 |
| DQ5 / D10 | CPO signoff modal replaces the "type SIGN OFF" gate | mockups README DQ5 |
| DQ6 / D8 | Customer report uses slate for advisory (amber stays admin-only) | mockups README DQ6 |

— **User decisions captured by Session B**, 2026-05-19.
