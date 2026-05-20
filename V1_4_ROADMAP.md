# V1_4_ROADMAP — Post-v1.3 Subsystem Roadmap (A + B + C joint authority)

**Status:** v0.2 — C's review pass landed in MOBILE_API_CONTRACT.md v0.6 (2026-05-19). All 11 subsystems sprint-sequencing ACCEPTED, day-count deltas applied below, v1.5 extended to 4 weeks for App Store iteration, lead-vs-co-build matrix added. Binding sprint plan for v1.4-v1.7 once v1.4.0 scope-proposal block lands in CONCIERGE_INSPECTION_API_CONTRACT.md.

**Scope:** The 8 deferred SRS §7 customer-account subsystems + Apple Sign-In (v1.5 commitment) + Civil ID / Phase B PII (v1.3.x thin migration) + Push notifications (C's v1.4 commitment).

**What this doc is:** Per-subsystem brief (backend models, effort, MVP vs full, deps, customer value), proposed sprint sequencing, cross-team coordination patterns.

**What this doc is NOT:** A binding contract — that's CONCIERGE_INSPECTION_API_CONTRACT.md. Once C reviews + we agree on sequencing, v1.4 kickoff happens in a fresh `v1.4.0` contract block, not by editing this doc.

---

## TL;DR — Recommended sprint plan

| Sprint | Theme | Duration | Lead surface |
|---|---|---|---|
| **v1.3.x** | Phase B PII columns (Civil ID, DOB, passport, DL) — thin schema migration | ~0.5 day B + ~0 day A/C | B-only |
| **v1.4** | **Push notifications + Orders/Payments + Documents (read-only)** — closes 3 Must items together with shared "order pipeline" backbone | ~2.5 weeks | B-led server + C parity + A web |
| **v1.5** | **Apple Sign-In + Maintenance pickup MVP** — iOS native launch sprint with App Store iteration buffer | ~4 weeks (extended from 3 per C v0.6 ask 2) | C-led iOS shell + B + A |
| **v1.6** | **Returns + Financing + Saved Searches** | ~2.5 weeks | A-led web + B + C parity |
| **v1.7** | **Reviews + Referrals + V2 of any v1.4-v1.6 subsystem** | ~2 weeks | Co-build A + B + C |

**Rationale for v1.4 picks:**
- Push notifications: C's standing commitment (v0.3 §3), unblocks marketing/booking/listing alerts, modest schema cost
- Orders: gates Documents, Returns, Purchase history — earlier = unblock 3 future sprints
- Documents (read-only): cheapest Must (we already store inspection PDFs); customer-perceived value is huge for "I bought a car, where's my paperwork"

**Rationale for v1.5 grouping:**
- Apple Sign-In MUST ship with iOS native per App Store §4.8 (v1.3.6 §3 lead-time note)
- Maintenance pickup is the highest-volume "after-sale" interaction; ships alongside the iOS app so customers can request service from mobile
- **4-week duration** (extended from 3 per C v0.6 ask 2): Apple App Review averages 24-48h per cycle with 1-2 iteration cycles typical on §4.8 equivalence audits. Week 4 designated for App Store iteration + TestFlight rollout + production push. If first submission passes clean, Week 4 absorbs into v1.6 head-start.

---

## Lead vs co-build matrix (per C's v0.6 §6)

Each subsystem has a primary surface — the team that drives the design + ships first. Other teams build parity afterwards within the same sprint window.

| Subsystem | Lead | Rationale |
|---|---|---|
| Push notifications (#2) | **B** | Server orchestrates dispatch; A+C consume tokens |
| Orders / Payments (#3) | **B** | State machine + KNET integration is server-heavy |
| Documents (#4) | **B** | Backfill of existing inspection PDFs is a B-only data migration |
| Apple Sign-In (#5) | **C** | iOS native is the gating surface; web mirrors after |
| Maintenance (#6) | **C** | Customer-at-home tap-to-request flow is mobile-native UX |
| Returns (#7) | **A** | Most return-decisions happen post-sale on desktop (research, photo upload, etc.) |
| Financing (#8) | **A** | Loan comparison tables + payment schedules are desktop-first UX |
| Saved Searches (#9) | **A** | Primary "save this search" hit lives in the browse page on desktop |
| Reviews (#10) | **Co-build** | Equal traffic across web + mobile; either side ships first |
| Referrals (#11) | **Co-build** | Native share sheet on mobile + share link on web — both surfaces equal |
| Phase B PII (#1) | **B** | Schema-only; A/C consume via PATCH /me/profile |

---

## Audit — what's already shipped (v1.0 → v1.3)

| SRS §7 item | Priority | Status as of v1.3.6 |
|---|---|---|
| Registration/login (email, phone) | Must | ✅ v1.2 |
| Registration/login (Google) | Must | ⚠️ shell live, real verifier pending `npm i google-auth-library@^9` |
| Registration/login (Apple) | Must | ❌ v1.5 — bundled with iOS native (App Store §4.8) |
| Profile management (details) | Must | ✅ v1.3 |
| Profile management (addresses) | Must | ✅ v1.3 |
| Profile management (Civil ID) | Must | ⚠️ v1.3.x — schema columns only |
| Saved/favorite vehicles | Must | ✅ v1.2.5 (renamed /account/favorites in v1.3) |
| Notification preferences | implied | ✅ v1.3 |
| **All 12 remaining §7 items** | Must/Should/Could | ❌ — covered in this roadmap |

---

## Subsystem catalogue — 9 entries

### 1. v1.3.x — Phase B PII columns (Civil ID, DOB, passport, driver license)

**SRS:** §7 #2 "Profile management — Civil ID"  
**Customer value rank:** 8/10 (gates loan-app + delivery verification)  
**Risk:** Low — schema-only

**Backend models needed:**
```prisma
model User {
  // ... existing fields
  dateOfBirth         DateTime? @db.Date
  gender              Gender?   // enum: male | female | prefer_not_to_say
  nationality         String?   // ISO-3166-1 alpha-2 (e.g. "KW")
  civilIdNumber       String?   @db.VarChar(12)
  civilIdFrontUrl     String?   // S3 relative key
  civilIdBackUrl      String?
  civilIdVerifiedAt   DateTime?
  civilIdExpiry       DateTime? @db.Date
  passportNumber      String?
  passportExpiry      DateTime? @db.Date
  passportUrl         String?
  driverLicenseNumber String?
  driverLicenseExpiry DateTime? @db.Date
  driverLicenseUrl    String?
}

enum Gender { male female prefer_not_to_say }
```

**Endpoints:** None new — `PATCH /v1/public/me/profile` extends to accept the new fields.

**Effort:**
- B: ~0.5 day (migration + Zod refine + PublicUser DTO extension; 12 columns net)
- A: 0 day (UI lands in v1.4+ alongside loan-app)
- C: 0 day

**MVP scope:** All 12 columns nullable; no UI exposure beyond accepting them in PATCH. Verification trigger (civilIdVerifiedAt) lands in v1.4 when admin gains KYC review queue.

**Full scope:** Civil ID OCR (auto-fill from photo), Civil ID expiry warning banner, Saudi/UAE expat passport tracking. v1.6+.

**Dependencies:**
- A+C joint Civil ID UX spec (v1.3.6 §11 commitment)
- S3 bucket convention extension (re-uses existing `Photo.cdnUrl` pattern)
- KW Civil ID format validation library — choose between in-house regex (12 digits, checksum) or vendor SDK (e.g. KW PACI integration; out of scope for v1.4)

**Sequencing:** Land NOW (within v1.3 closeout) as a thin migration. Doesn't block v1.4 sprint kickoff.

---

### 2. v1.4 — Push notifications + PushToken

**SRS:** §7 implied via "Real-time delivery tracking" + "Maintenance status tracking" — push is the delivery mechanism  
**Customer value rank:** 7/10 (enables 4 downstream features' alert paths)  
**Risk:** Medium — provider integration

**Backend models needed:**
```prisma
model PushToken {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @db.Uuid
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token       String   @unique // FCM/APNs token
  platform    PushPlatform
  deviceLabel String?
  createdAt   DateTime @default(now()) @db.Timestamp(3)
  lastSeenAt  DateTime @default(now()) @db.Timestamp(3)

  @@index([userId])
}

enum PushPlatform { ios android }
```

**Endpoints:**
- `POST /v1/public/notifications/push-token` `{token, platform, deviceLabel?}` → 201 (per C's v0.3 §3 commitment)
- `DELETE /v1/public/notifications/push-token/:token` → 204

**Effort:**
- B: ~1.5 days (FCM + APNs provider integration via `firebase-admin` + dispatch routing + retry queue with dead-letter)
- A: 0 day (web doesn't get push in v1.4 — service-worker push is v1.6+)
- C: ~1 day (Expo push notifications + APNs/FCM token capture + foreground notification handler + deep-link routing)

**MVP scope:** Token capture on sign-in, send on `OfferAccepted` (BookingUpdates category) and `MaintenanceStatusChanged` (won't fire until v1.5 ships Maintenance), respect `notificationPreferences.channels.push` and `categories.bookingUpdates`. No analytics, no A/B, no rich notifications.

**Full scope:** Topic subscriptions, rich notifications (image + actions), notification center / inbox per-user, silent push for data sync. v1.6+.

**Dependencies:**
- Apple Developer account + APNs key (.p8) — needed for v1.5 anyway
- Firebase project + service account JSON for FCM
- v1.3 `notificationPreferences.channels.push` flag (already shipped)

**Sequencing:** v1.4 — Week 1 of the sprint. Unblocks all downstream alert paths.

---

### 3. v1.4 — Orders / Payments / Purchase history (backbone)

**SRS:** §7 #5 "Order tracking", #10 "Purchase history"  
**Customer value rank:** 10/10 (the core purchase flow — gates Documents, Returns, Financing)  
**Risk:** High — payment provider integration + KW market constraints

**Backend models needed:**
```prisma
model Order {
  id              String       @id @default(uuid()) @db.Uuid
  customerId      String       @db.Uuid
  listingId       String       @db.Uuid
  stockNumber     String       // denormalised for receipts
  status          OrderStatus  // reservation_pending → confirmed → payment_pending → paid → delivery_scheduled → delivered → completed | cancelled
  reservationAmountFils  BigInt
  totalAmountFils        BigInt
  paidAmountFils         BigInt @default(0)
  reservedAt      DateTime     @default(now()) @db.Timestamp(3)
  reservationExpiresAt   DateTime  @db.Timestamp(3) // 24h hold
  completedAt     DateTime?    @db.Timestamp(3)
  cancelledAt     DateTime?    @db.Timestamp(3)
  cancellationReason String?
  createdAt       DateTime     @default(now()) @db.Timestamp(3)
  updatedAt       DateTime     @updatedAt      @db.Timestamp(3)
}

model Payment {
  id                  String        @id @default(uuid()) @db.Uuid
  orderId             String        @db.Uuid
  amountFils          BigInt
  method              PaymentMethod // knet | bank_transfer | financing | cash_on_delivery
  status              PaymentStatus // pending | succeeded | failed | refunded
  providerRef         String?       // KNET txn id, bank ref, etc.
  paidAt              DateTime?     @db.Timestamp(3)
  createdAt           DateTime      @default(now()) @db.Timestamp(3)
}

enum OrderStatus { reservation_pending confirmed payment_pending paid delivery_scheduled delivered completed cancelled }
enum PaymentMethod { knet bank_transfer financing cash_on_delivery }
enum PaymentStatus { pending succeeded failed refunded }
```

**Endpoints:**
- `POST /v1/public/orders` `{listingId, paymentMethod}` → 201 reservation w/ 24h hold
- `GET /v1/public/me/orders?page=1&pageSize=20` → paginated history
- `GET /v1/public/me/orders/:id` → full detail w/ payments[]
- `POST /v1/public/orders/:id/cancel` → 200 (only if reservation_pending or confirmed)
- `POST /v1/public/orders/:id/payment` — initiate KNET checkout (returns hosted-payment URL)
- `POST /v1/public/payments/knet/callback` — KNET webhook (B-internal, signature-verified)

**Effort:**
- B: ~5-6 days (models + migrations + state machine + KNET integration + receipt PDF gen + admin queue + reservation timer cron)
- A: ~3-4 days (reservation flow on /browse/:stockNumber + checkout page + /account/orders list + /account/orders/:id detail)
- C: ~2 days (mobile equivalents of A's screens; in-app KNET WebView for hosted checkout)

**MVP scope:** KNET-only payments (no bank-transfer, no financing in MVP), reservation expires at 24h cleanly, customer can cancel before payment, status reflects in /account/orders. Delivery scheduling stays admin-driven (B sets delivery date via admin app; customer sees it on order detail).

**Full scope:** Multi-payment-method, bank-transfer with proof-upload, save card for next purchase, reservation extension request, order export PDF. v1.6+.

**Dependencies:**
- KNET merchant account + sandbox credentials (operational, not engineering)
- Listing.status state machine extension: `acquired → reserved → sold` (B already has `acquired` via Concierge accept; needs `reserved` lock to prevent double-reservation race)
- PDF generation library (Phase 5 — already on B's roadmap)

**Sequencing:** v1.4 — Week 1-2. Lands before Documents (which surfaces Order receipts) and Returns (which mutates Order state).

---

### 4. v1.4 — Documents vault (read-only)

**SRS:** §7 #7 "Document vault (contracts, inspection, insurance)"  
**Customer value rank:** 9/10 (huge perceived value, low engineering cost; "where's my paperwork" question)  
**Risk:** Low — read-only against documents B already stores

**Backend models needed:**
```prisma
model Document {
  id          String       @id @default(uuid()) @db.Uuid
  customerId  String       @db.Uuid
  customer    User         @relation(fields: [customerId], references: [id])
  
  kind        DocumentKind // inspection_report | sale_contract | insurance_policy | warranty | invoice | other
  title       String       // "Inspection report — 2021 Toyota Camry"
  fileUrl     String       // S3 relative key
  thumbnailUrl String?     // generated thumbnail S3 key
  
  // Optional links to source entities for "View related listing/order"
  listingId   String?      @db.Uuid
  orderId     String?      @db.Uuid
  inspectionId String?     @db.Uuid
  
  uploadedAt  DateTime     @default(now()) @db.Timestamp(3)
  uploadedById String?     @db.Uuid // admin who uploaded
}

enum DocumentKind { inspection_report sale_contract insurance_policy warranty invoice other }
```

**Endpoints:**
- `GET /v1/public/me/documents?kind=&page=1&pageSize=20` → paginated, filterable by kind
- `GET /v1/public/me/documents/:id` → full detail with signed download URL (15-min expiry)

**No upload from customer in v1.4** — admin uploads via existing admin app. Customer upload is v1.6+.

**Effort:**
- B: ~1.5 days (model + migration + signed-URL serving + backfill existing inspection-report PDFs into Document rows + admin upload UI extension)
- A: ~1 day (`/account/documents` list with filter chips + detail viewer + download)
- C: ~1 day (mobile equivalent + native share sheet integration for downloaded PDFs)

**MVP scope:** Read-only list filterable by kind, secure download via signed S3 URLs, types: inspection_report, sale_contract, insurance_policy. Surfaced after sale completion only (no documents-before-purchase clutter).

**Full scope:** Customer-uploaded documents (e.g. insurance policy from external provider), document expiry warnings, e-signature integration, OCR. v1.6+.

**Dependencies:**
- Orders subsystem (#3) — sale_contract is generated at order completion
- Backfill script: existing inspection reports (BMC-CON-* PDFs) become Document rows linked to the customer who owns the resulting Listing

**Sequencing:** v1.4 — Week 2-3. Lands after Orders so sale_contract has a producer.

---

### 5. v1.5 — Apple Sign-In

**SRS:** §7 #1 (4th sub-item)  
**Customer value rank:** 6/10 (table-stakes for iOS App Store, modest org-wide signup conversion lift)  
**Risk:** Medium — Apple's review is strict on §4.8 equivalence with Google

**Backend models needed:**
```prisma
model User {
  // ... existing fields
  appleSub  String? @unique // Apple's `sub` claim — stable per Apple ID
}
```

**Endpoints:**
- `POST /v1/auth/apple/verify` `{identityToken, authorizationCode}` → 200/201 `{user, session, isNewAccount}`

**Effort:**
- B: ~1 day (`@nestjs-modules/social` or `apple-signin-auth` library; mirror Google verifier structure; `appleSub` column + migration; resolveOrCreateUser logic)
- A: ~0.5 day (swap disabled pill for real Apple button in sign-in modal v2; wire to `authService.signInWithApple(identityToken)`)
- C: ~1.5 days (`expo-apple-authentication` integration; iOS native sign-in flow; AndroidActivity fallback to web flow via WebView)

**MVP scope:** Token verification, account creation/binding via Apple's `sub`, ghost-account upgrade (binds Apple to existing email-only account), HTTP envelope matches Google verifier path.

**Full scope:** Sign-in with Apple via web (browser-side JS SDK) for non-iOS users, Apple's privacy email forwarding handling. v1.6+.

**Dependencies:**
- Apple Developer account ($99/year — operational)
- Apple Sign-In service key (.p8) and Bundle ID for native iOS
- iOS entitlement: `com.apple.developer.applesignin`
- App Store §4.8 compliance (Apple Sign-In must be displayed equally to Google)

**Sequencing:** v1.5 — bundled with iOS native launch. CANNOT defer separately — iOS app submission requires Apple Sign-In live.

---

### 6. v1.5 — Maintenance pickup (MVP)

**SRS:** §7 #11-17 (history log + 6 pickup sub-features)  
**Customer value rank:** 9/10 (high-frequency after-sale interaction; defines whether customers think of Behbehani as "where I bought a car" vs "where I own a car")  
**Risk:** High — multi-state workflow, technician-app dependency

**Backend models needed:**
```prisma
model MaintenanceRequest {
  id            String                     @id @default(uuid()) @db.Uuid
  customerId    String                     @db.Uuid
  listingId     String?                    @db.Uuid // null if customer didn't buy from us
  vehicleSnapshot Json                     // year/make/model/VIN at request time
  
  serviceType   MaintenanceServiceType     // routine | repair | body_work | ac | tires | other
  description   String                     @db.Text
  photoUrls     String[]                   // S3 relative keys
  
  pickupAddressId String                   @db.Uuid // FK to existing Address
  pickupDate    DateTime                   @db.Date
  pickupTimeWindow MaintenanceTimeWindow   // morning | afternoon | evening
  
  status        MaintenanceStatus          // requested → confirmed → picked_up → in_workshop → estimate_pending → estimate_approved → estimate_rejected → ready → delivered | cancelled
  
  estimateAmountFils BigInt?
  estimateNotes      String?
  estimateApprovedAt DateTime?             @db.Timestamp(3)
  
  workshopId    String?                    @db.Uuid // FK Workshop (deferred — v1.6, single workshop assumed v1.5)
  assignedTechnicianName String?
  
  createdAt     DateTime                   @default(now()) @db.Timestamp(3)
  updatedAt     DateTime                   @updatedAt      @db.Timestamp(3)
}

enum MaintenanceServiceType { routine repair body_work ac tires other }
enum MaintenanceTimeWindow { morning afternoon evening }
enum MaintenanceStatus { requested confirmed picked_up in_workshop estimate_pending estimate_approved estimate_rejected ready delivered cancelled }
```

**Endpoints:**
- `POST /v1/public/me/maintenance-requests` (with photo URL upload via separate `/uploads/signed-url` flow)
- `GET /v1/public/me/maintenance-requests?status=&page=1&pageSize=20`
- `GET /v1/public/me/maintenance-requests/:id`
- `POST /v1/public/me/maintenance-requests/:id/approve-estimate` → moves status to estimate_approved
- `POST /v1/public/me/maintenance-requests/:id/reject-estimate` → moves to estimate_rejected, customer cancels
- Admin endpoints for technicians (B owns) to advance state

**Effort:**
- B: ~4-5 days (model + state machine + admin queue + estimate workflow + status-change notification dispatch + signed-URL photo upload)
- A: ~3 days (request form with date/time/address picker + photo upload + history list + detail view with timeline + estimate approval UI)
- C: ~3 days (mobile equivalents + camera capture + push notification handling for status changes)

**MVP scope:** Single workshop assumed, no real-time GPS tracking (just status updates), no technician chat, no cost-estimate negotiation (binary approve/reject). Cost estimate is set by admin in the admin app; customer sees notification + approves digitally.

**Full scope:** Multi-workshop routing by proximity, real-time GPS of pickup driver, in-app chat with technician, cost-estimate counter-offers, historical service recommendations ("Your car is due for oil change"). v1.7+.

**Dependencies:**
- Push notifications (#2) — status changes alert via push
- Addresses (already in v1.3) — pickup uses existing addresses
- Document subsystem (#4) — service invoice becomes a Document on completion

**Sequencing:** v1.5 — Week 1-3. Bundled with iOS launch because mobile is the primary surface for "request maintenance" (customer is at home, taps the app).

---

### 7. v1.6 — Returns (3-day / 300km)

**SRS:** §7 #9 "Return request initiation (3-day/300km)"  
**Customer value rank:** 7/10 (KW market expectation, regulatory in some Gulf states)  
**Risk:** Medium — reverse logistics + condition assessment

**Backend models needed:**
```prisma
model ReturnRequest {
  id            String         @id @default(uuid()) @db.Uuid
  orderId       String         @unique @db.Uuid // one return per order
  customerId    String         @db.Uuid
  
  reason        ReturnReason
  description   String         @db.Text
  photoUrls     String[]
  
  // Eligibility snapshot at request time
  daysSinceDelivery Int
  kmSinceDelivery   Int
  
  status        ReturnStatus   // pending_review → approved → inspection_scheduled → inspected → refund_processing → completed | rejected
  
  refundAmountFils BigInt?
  refundedAt    DateTime?      @db.Timestamp(3)
  rejectionReason String?
  
  createdAt     DateTime       @default(now()) @db.Timestamp(3)
}

enum ReturnReason { mechanical_issue not_as_described accidental_purchase other }
enum ReturnStatus { pending_review approved inspection_scheduled inspected refund_processing completed rejected }
```

**Endpoints:**
- `POST /v1/public/me/orders/:orderId/return` → 201 (eligibility check 3-day/300km enforced)
- `GET /v1/public/me/returns` → list
- `GET /v1/public/me/returns/:id` → detail with timeline
- Admin endpoints for inspection + refund processing

**Effort:**
- B: ~2.5 days (model + eligibility logic against Order.completedAt + Vehicle.mileageKm + state machine + refund integration with KNET)
- A: ~1.5 days (request form on /account/orders/:id + history on /account/returns + return detail view)
- C: ~1 day (mobile equivalents)

**MVP scope:** 3-day OR 300km window strictly enforced; only mechanical issues + not-as-described auto-approve to scheduling; "accidental_purchase" requires admin review. Refund via KNET reverse-transaction; bank-transfer customers wait 3-5 business days.

**Full scope:** Partial refunds, store credit option, return-to-different-branch, swap-for-different-car. v1.8+.

**Dependencies:**
- Orders subsystem (#3) — `Order.completedAt` is the eligibility anchor
- KNET refund API access
- Admin "return inspection queue" UI extension

**Sequencing:** v1.6 — Week 1-2. Lands after Orders + Documents are stable (since refund needs Payment row to reverse).

---

### 8. v1.6 — Financing status & payment schedule

**SRS:** §7 #8 "Financing status & payment schedule"  
**Customer value rank:** 8/10 (financed cars are >40% of KW market by volume)  
**Risk:** High — bank integration, regulatory compliance

**Backend models needed:**
```prisma
model LoanApplication {
  id              String              @id @default(uuid()) @db.Uuid
  customerId      String              @db.Uuid
  orderId         String?             @db.Uuid // populated once approved + linked to a purchase
  
  bankPartner     BankPartner         // KFH | NBK | Boubyan | Burgan | Gulf | Warba | etc.
  loanAmountFils  BigInt
  termMonths      Int
  interestRate    Decimal             @db.Decimal(5,2) // APR percentage
  monthlyPaymentFils BigInt
  
  status          LoanStatus          // pre_qualified → application_submitted → underwriting → approved → disbursed | rejected
  rejectionReason String?
  
  // Disbursement timeline
  approvedAt      DateTime?           @db.Timestamp(3)
  disbursedAt     DateTime?           @db.Timestamp(3)
  
  createdAt       DateTime            @default(now()) @db.Timestamp(3)
}

model LoanPayment {
  id          String         @id @default(uuid()) @db.Uuid
  loanId      String         @db.Uuid
  amountFils  BigInt
  dueDate     DateTime       @db.Date
  paidAt      DateTime?      @db.Timestamp(3)
  status      LoanPaymentStatus // upcoming | paid | overdue | grace
  
  @@index([loanId, dueDate])
}

enum BankPartner { KFH NBK Boubyan Burgan Gulf Warba CBK ABK AUB GBK other }
enum LoanStatus { pre_qualified application_submitted underwriting approved disbursed rejected }
enum LoanPaymentStatus { upcoming paid overdue grace }
```

**Endpoints:**
- `POST /v1/public/me/loan-applications` `{listingId, bankPartner, downPaymentFils, termMonths}` → 201
- `GET /v1/public/me/loan-applications` → list
- `GET /v1/public/me/loan-applications/:id` → detail with payments[]
- Admin endpoints for status updates from bank partners

**Effort:**
- B: ~5-6 days (models + state machine + bank-partner integration (start with mock; real APIs are 1 month+ each per bank), payment schedule generator, monthly cron to flag overdue)
- A: ~2.5 days (loan application form + comparison table + payment schedule calendar view on /account/financing)
- C: ~2 days (mobile equivalents + push notification for upcoming payment)

**MVP scope:** 2-3 bank partners (KFH + NBK + Boubyan to start), manual status updates by admin (no real bank API), customer sees pre-qualification → application → approved → payment schedule. Pre-qualification uses simple income-multiplier formula (no credit-bureau pull).

**Full scope:** Real bank API integrations, credit-bureau pull (Ci-Net KW), auto-debit setup, early-settlement quote, refinance flow. v1.8+.

**Dependencies:**
- Orders subsystem (#3) — loan approval feeds Order.paymentMethod = financing
- Phase B PII (#1) — banks require Civil ID + employer details for application
- Bank partnership commercial agreements (operational, blocking)

**Sequencing:** v1.6 — Week 2-3. Lands after Orders since `LoanApplication.orderId` is the link. Bank API real integrations slip to v1.8 if commercial negotiations stall.

---

### 9. v1.6 — Saved searches with alerts

**SRS:** §7 #4 "Saved searches with alerts"  
**Customer value rank:** 5/10 (retention tool, not acquisition; low immediate revenue impact)  
**Risk:** Low — straightforward subscription mechanic

**Backend models needed:**
```prisma
model SavedSearch {
  id                  String   @id @default(uuid()) @db.Uuid
  customerId          String   @db.Uuid
  name                String   // "Hyundai Tucson under 8K"
  filtersJson         Json     // serialised BrowseFilter shape from existing /v1/public/browse query
  alertCadence        AlertCadence // instant | daily | weekly | never
  lastFiredAt         DateTime? @db.Timestamp(3)
  matchCountAtCreation Int
  createdAt           DateTime @default(now()) @db.Timestamp(3)

  @@index([customerId])
}

enum AlertCadence { instant daily weekly never }
```

**Endpoints:**
- `POST /v1/public/me/saved-searches` `{name, filters, alertCadence}` → 201
- `GET /v1/public/me/saved-searches` → list
- `DELETE /v1/public/me/saved-searches/:id` → 204
- `PATCH /v1/public/me/saved-searches/:id/cadence` `{alertCadence}` → 200
- `GET /v1/public/me/saved-searches/:id/matches` → preview current matches

**Effort:**
- B: ~2 days (model + search-index re-use of existing `/v1/public/browse` filter logic + nightly cron to compute new matches per saved search and dispatch via notification preferences + dispatch dedup)
- A: ~1 day ("Save this search" button on /browse + /account/saved-searches list)
- C: ~1 day (mobile equivalents + push notifications for instant cadence)

**MVP scope:** instant + daily + weekly + never cadences. Match comparison = "listings created since lastFiredAt that match filters". No price-drop alerts on existing saved cars (that's a separate v1.7+ feature). Email + push only (no SMS).

**Full scope:** Price-drop alerts on saved searches AND saved cars, similar-listings recommendations from saved searches, location-aware alerts (KW governorate proximity), trending-search badges. v1.8+.

**Dependencies:**
- Push notifications (#2) — instant cadence dispatches via push
- Existing `/v1/public/browse` listing search filter shape

**Sequencing:** v1.6 — Week 3. Lower priority than Returns + Financing.

---

### 10. v1.7 — Reviews & ratings

**SRS:** §7 #18 "Review / rating submission"  
**Customer value rank:** 6/10 (social proof for new customers; retention loop)  
**Risk:** Medium — moderation operational burden

**Backend models needed:**
```prisma
model Review {
  id                String          @id @default(uuid()) @db.Uuid
  customerId        String          @db.Uuid
  orderId           String          @unique @db.Uuid // can only review your own purchase
  listingId         String          @db.Uuid
  
  rating            Int             // 1-5
  title             String?
  body              String          @db.Text
  
  vehicleAspectsJson Json           // {appearance: 5, mechanical: 4, value: 5, ...}
  serviceAspectsJson Json           // {sales: 5, delivery: 4, documentation: 5, ...}
  
  status            ReviewStatus    // pending_moderation | approved | rejected
  rejectionReason   String?
  
  helpfulCount      Int             @default(0)
  
  createdAt         DateTime        @default(now()) @db.Timestamp(3)
}

enum ReviewStatus { pending_moderation approved rejected }
```

**Endpoints:**
- `POST /v1/public/me/orders/:orderId/review` → 201 (after delivery; one per order)
- `GET /v1/public/me/reviews` → list customer's own
- `GET /v1/public/listings/:id/reviews?page=1&pageSize=20` → public read of approved reviews
- `POST /v1/public/reviews/:id/helpful` → 200 (anonymous +1, deduped by session)
- Admin moderation endpoints

**Effort:**
- B: ~2.5 days (model + moderation queue UI in admin + dispatch to all-bought-customers nudging review after 7 days post-delivery)
- A: ~2 days (review composer on /account/orders/:id after delivery + browse-side review section on /browse/:stockNumber detail)
- C: ~1.5 days (mobile composer + browse-side review section)

**MVP scope:** Pending-moderation queue; admin reviews are sole moderation. No reply-to-review, no review-photos, no "verified purchase" badge (implicit because all reviews come from orders). Star rating + body required.

**Full scope:** Review photos, owner reply, helpful-votes ranking, review filtering by aspect, sentiment-analysis auto-flagging. v1.8+.

**Dependencies:**
- Orders subsystem (#3) — review requires completed order
- Admin moderation operational workflow (small team task)

**Sequencing:** v1.7 — Week 1-2. Standalone, no upstream dependencies beyond Orders.

---

### 11. v1.7 — Referral program

**SRS:** §7 #19 "Referral program tracking" (Could priority — lowest)  
**Customer value rank:** 4/10 (growth lever, deferrable)  
**Risk:** Medium — accounting + fraud prevention

**Backend models needed:**
```prisma
model ReferralCode {
  id           String   @id @default(uuid()) @db.Uuid
  customerId   String   @unique @db.Uuid // one code per user
  code         String   @unique // e.g. "SMOKE-K7F2"
  createdAt    DateTime @default(now()) @db.Timestamp(3)
}

model Referral {
  id              String              @id @default(uuid()) @db.Uuid
  referrerId      String              @db.Uuid // user who shared
  referredId      String              @db.Uuid // user who signed up
  referralCodeUsed String
  
  status          ReferralStatus      // pending | qualified | paid | expired
  qualifiedAt     DateTime?           @db.Timestamp(3) // when referred user made first purchase
  
  referrerRewardAmountFils BigInt?
  referredRewardAmountFils BigInt?
  paidAt          DateTime?           @db.Timestamp(3)
  
  createdAt       DateTime            @default(now()) @db.Timestamp(3)
}

enum ReferralStatus { pending qualified paid expired }
```

**Endpoints:**
- `GET /v1/public/me/referrals/code` → returns customer's permanent code
- `GET /v1/public/me/referrals` → list of who I referred + status of each
- `POST /v1/public/auth/register` extends to accept `referralCode` field (already designed)

**Effort:**
- B: ~1.5 days (models + qualifying-purchase logic + reward computation + dispatch via store-credit or KNET refund)
- A: ~1 day (/account/referrals dashboard + share-link generator + "Refer a friend" CTA in account hub)
- C: ~1 day (mobile equivalents + native share sheet for referral link)

**MVP scope:** Both referrer + referred get equal reward (e.g. KD 25 store credit) on referred's first purchase ≥ KD 5000. Codes are permanent per user; no expiry. Store credit only (no cash).

**Full scope:** Tiered rewards by # of referrals, leaderboard, special-event multipliers, cash payout option, branded landing pages per referrer. v2.0+.

**Dependencies:**
- Orders subsystem (#3) — first purchase qualification
- "Store credit" account balance system (doesn't exist; ships as part of this subsystem or pushes to v1.8)

**Sequencing:** v1.7 — Week 3. Lowest priority; could be cut to v1.8 if other items in v1.7 stretch.

---

## Sprint sequencing detail

### v1.3.x (this week, B-only)
- Phase B PII columns migration (Item #1)
- Effort: ~0.5 day B
- Outcome: schema ready for v1.4+ loan-app + delivery KYC; no UI exposure

### v1.4 (~2.5 weeks)
- **Week 1:** Push notifications (#2) backbone; Orders + Payments scaffolding (#3)
- **Week 2:** Orders KNET integration + reservation flow (#3); Documents read-only (#4) backfill
- **Week 3:** Order + Document UI complete; joint smoke + browser walks; v1.4.5 verdict

| Item | B-days | A-days | C-days |
|---|---|---|---|
| Push notifications | 1.5 | 0 | 1 |
| Orders + Payments | 5-6 | 3-4 | 2 |
| Documents | 1.5 | 1 | 1 |
| **Total** | **8-9** | **4-5** | **4** |

### v1.5 (~3 weeks — iOS native launch)
- **Week 1:** Apple Sign-In (#5); Maintenance backend (#6)
- **Week 2:** iOS native build with Maintenance + Push; Maintenance admin queue
- **Week 3:** iOS App Store submission; v1.5 joint verification on TestFlight; v1.5.5 verdict

| Item | B-days | A-days | C-days |
|---|---|---|---|
| Apple Sign-In | 1 | 0.5 | 1.5 |
| Maintenance | 4-5 | 3 | 3 |
| iOS native launch | 0 | 0 | 5-7 |
| **Total** | **5-6** | **3.5** | **9.5-11.5** |

### v1.6 (~2.5 weeks)
- **Week 1-2:** Returns (#7) + Financing (#8) backend + UI; Saved Searches (#9) backend
- **Week 3:** Saved Searches UI + alert cadence cron; joint smoke; v1.6.5 verdict

| Item | B-days | A-days | C-days |
|---|---|---|---|
| Returns | 2.5 | 1.5 | 1 |
| Financing | 5-6 | 2.5 | 2 |
| Saved Searches | 2 | 1 | 1 |
| **Total** | **9.5-10.5** | **5** | **4** |

### v1.7 (~2 weeks)
- **Week 1:** Reviews (#10) + Referrals (#11) backend
- **Week 2:** Reviews + Referrals UI; v1.7.5 verdict

| Item | B-days | A-days | C-days |
|---|---|---|---|
| Reviews | 2.5 | 2 | 1.5 |
| Referrals | 1.5 | 1 | 1 |
| **Total** | **4** | **3** | **2.5** |

---

## Cross-team coordination patterns (proven in v1.0-v1.3)

### Pattern 1 — Contract-first scope locks
Each sprint kickoff opens a `vX.Y.0` block in CONCIERGE_INSPECTION_API_CONTRACT.md proposing scope; other sessions reply with acks/deltas; convergence in `vX.Y.4-ish` locks scope. Average converge cycle: 4-6 numbered blocks per sprint.

### Pattern 2 — A-stubs-against-locked-DTOs-immediately
A starts wiring controllers against locked DTOs the moment B's `vX.Y.1` ships, returning 501 NOT_IMPLEMENTED until B's services land. Saves a round-trip of "wait for B then start". Worked in v1.2 (8 endpoints) and v1.3 (15 endpoints).

### Pattern 3 — C consumes shared-types as binding source
C imports DTOs from `@behbehani-cpo/shared-types` rather than maintaining a parallel mobile-side type definition. Removes drift. C's v0.4-0.5 confirmed pattern works.

### Pattern 4 — Joint EA acks (A + C → B)
When C raises ergonomic asks for B (EA-1..EA-4 in v1.3), A piles on a joint vote in the same block. Gives B one signal instead of two competing. Reduces convergence latency.

### Pattern 5 — Coming-Soon shells precede subsystems
For long-tail SRS items (Reviews, Referrals, etc.), ship a Coming-Soon shell + waitlist capture FIRST (v1.3 pattern), then the real subsystem 1-2 sprints later. Customer perception of breadth without backend cost.

### Pattern 6 — Joint smoke at sprint close
End-of-sprint joint walkthrough: A drives browser walks via Chrome MCP, B+C verify side-effects in DB and mobile screens. Same row-count pattern as v1.1.5 + v1.1.7 + v1.2.5 + (planned) v1.3.X.

---

## Open questions for C's review pass

1. **C-1** — Is v1.4 (~2.5 weeks) the right sprint length to bundle Push + Orders + Documents, or should Orders alone be v1.4 with Push slipping to v1.4.x and Documents to v1.5?

2. **C-2** — Mobile-specific entitlements:
   - Push (#2): APNs key + Firebase config — C has both already lined up?
   - Maintenance (#6): CalendarKit or Expo Calendar for date picker? Photo capture with `expo-image-picker`?
   - Apple Sign-In (#5): `expo-apple-authentication` confirmed as the library?

3. **C-3** — KNET in-app WebView (#3) — does Expo's `expo-web-browser` cover hosted-payment redirect, or does mobile need `react-native-webview` for embedded checkout?

4. **C-4** — Documents (#4) — native share-sheet for downloaded PDFs uses which library? `expo-sharing` is the obvious pick.

5. **C-5** — Should Saved Searches (#9) push notifications respect device-level "Do not disturb" hours, or always fire at the cadence schedule?

6. **C-6** — Reviews (#10) — does mobile camera capture extend to review photos in v1.7 MVP, or only text-only reviews?

7. **C-7** — Apple Sign-In + iOS native launch alignment (#5 + v1.5) — does C's iOS App Store submission timeline accommodate 3 weeks of v1.5 sprint, or do we need to compress?

---

## Open questions for B's review pass

1. **B-1** — KNET integration (#3) — does B have existing KNET merchant credentials or is this an operational item that blocks v1.4 kickoff?

2. **B-2** — Bank partnerships (#8) — which 2-3 banks for v1.6 MVP? KFH + NBK + Boubyan is A's guess based on KW market share.

3. **B-3** — PDF generation (existing Phase 5 commitment from B's earlier roadmap) — is the PDF library decision (`pdfkit` vs `puppeteer` vs `react-pdf`) made? Affects Documents (#4) sale_contract generation.

4. **B-4** — Workshop scheduling (#6) — single workshop assumption for v1.5 MVP; multi-workshop routing is v1.7+. Confirm?

5. **B-5** — Refund mechanics (#7) — does KNET support reverse-transaction API or does refund require manual finance-team workflow?

6. **B-6** — Civil ID validation (#1) — KW PACI API integration v1.6+? Or regex-only validation indefinitely?

---

## Review checklist for C (per v1.3.6 §12)

When C does their review pass, ack each item below in a v1.4.0-prep block:

- [ ] Sprint sequencing accepted (v1.4 = Push + Orders + Documents; v1.5 = Apple + Maintenance; v1.6 = Returns + Financing + Saved Searches; v1.7 = Reviews + Referrals)
- [ ] OR proposed re-sequencing with rationale
- [ ] C-side effort estimates per subsystem (adjust the day-counts in §3-11 above)
- [ ] Mobile-specific notes per subsystem (e.g. "Documents needs `expo-sharing`", "Maintenance needs CalendarKit")
- [ ] Answers to C-1..C-7 above
- [ ] Apple Sign-In + iOS launch timeline confirmation (#5 + v1.5)
- [ ] Any subsystem C wants to lead vs co-build with A (e.g. "Maintenance UI is iOS-first; C builds React Native first, A mirrors")

After C's review pass, A posts a `v1.4.0` block in CONCIERGE_INSPECTION_API_CONTRACT.md proposing locked v1.4 scope. From there, the standard 4-block convergence pattern (v1.4.0 → B reply → A converge → kickoff) applies.

---

## Out of scope for v1.4-v1.7 (parked for v1.8+)

- Multi-currency support (KW dinar only)
- B2B / dealer-portal features (covered separately under fleet/dealer SRS — not customer-account scope)
- Advanced analytics on customer behaviour (Mixpanel / Amplitude integration)
- Multi-language beyond EN + AR
- Admin app rewrite (existing admin app continues; gradual feature parity)
- Real-time chat with support agents (Could-priority, no SRS line item)
- Loyalty points / rewards beyond Referrals

---

## Document maintenance

- A drafts updates; C reviews
- Each sprint closeout updates the "shipped" status in §Audit
- New SRS items get appended as §12, §13, etc.
- Major re-prioritisations require A+B+C consensus via a fresh contract block
- This file is NOT auto-generated — manual edits only

— **Session A** (draft v0.1), 2026-05-19

---

## B-side review (Session B, 2026-05-19)

**Overall verdict:** Sequencing accepted with one nuance (see §Sequencing-ack). Day-count estimates need adjustments in 3 subsystems (Maintenance, Orders, Push — all under-scoped). Six cross-cutting infra items missed by the roadmap. B-1..B-6 answered below.

### Answers to B-1..B-6

**B-1 — KNET integration / credentials**

**LOCKED (user decision, 2026-05-19): Otto Payment Services.**

Aggregator pattern locked. Otto handles KNET + Visa + Mastercard + Apple Pay + Google Pay through a single hosted-checkout flow with webhook callbacks. Same-day sandbox vs 4-8 weeks for direct KNET merchant onboarding. Engineering scope unchanged from any-aggregator path — webhook-driven payment session lifecycle with HMAC signature verification.

**v1.4 engineering implications:**
- `Payment.providerRef` field stores Otto's session ID (rename column comment to reflect Otto specifically)
- `POST /v1/public/orders/:id/payment` returns Otto hosted-checkout URL (replaces the generic "KNET hosted URL" wording)
- Webhook endpoint `POST /v1/public/payments/otto/callback` (rename from `/knet/callback` in the original draft) — HMAC signature verified against Otto's shared secret
- Refund mechanics (see B-5) — verify whether Otto exposes a reverse-transaction API or whether refund is still admin-portal-driven; ask during sandbox onboarding
- `PaymentMethod` enum in the Orders model becomes a superset: `otto_knet | otto_card | otto_apple_pay | otto_google_pay | bank_transfer | financing | cash_on_delivery` — OR a flatter `otto | bank_transfer | financing | cod` with Otto's specific method recorded in `Payment.providerRef` payload

**Blocker risk for v1.4:** if Otto sandbox credentials don't land by v1.4 Day 5, B builds against a mock provider with Otto's documented envelope shape, swaps to real Otto in v1.4.x. Doesn't slip v1.4 dates.

**User to-do (operational, NOT engineering):**
- Sign Otto merchant agreement (likely already in motion)
- Confirm sandbox + production webhook URLs to give Otto
- Obtain Otto's HMAC shared secret + API key — store in `.env` under `OTTO_API_KEY` + `OTTO_WEBHOOK_SECRET`
- Decide on refund flow with Otto's support team (B-5 question)

**B-2 — Bank partners for v1.6 MVP**

A's guess (KFH + NBK + Boubyan) is sensible by KW market share. **My harder recommendation: for v1.6 MVP, DO NOT integrate any bank API.** Instead:

- v1.6: 5+ bank partners as picklist with mock pre-qualification (income-multiplier formula) + admin manually updates `LoanApplication.status` from bank reply (received via email/phone outside our system).
- v1.8+: real bank API integration ONE BANK AT A TIME, gated on each bank's commercial NDA + SDC clearance (4-6 weeks each).

Reason: KW bank APIs are universally painful (KFH SOAP, NBK REST, Boubyan partial, GBK manual, Burgan email-only). Mixing 3 protocols into v1.6 MVP would be ~3 weeks B alone, with high failure risk. Mock + admin workflow is what every KW dealer actually does in practice. The customer-facing UX is identical; only admin's operational burden differs.

**B-3 — PDF generation library decision**

Recommendation: **hybrid — `@react-pdf/renderer` for templated docs + `pdfkit` for programmatic generation.**

- `@react-pdf/renderer` — for sale_contract, inspection_report, insurance policy, warranty. A authors templates as React components; B-side renders deterministically. Excellent Arabic RTL support out of the box.
- `pdfkit` — for receipts, invoices, refund confirmations. Programmatic; fast (<200ms cold render); no JSX needed.
- **NOT `puppeteer`** — too heavy for our volume (10-50 docs/day), pulls Chrome into the deploy (+150 MB), slow cold start. Save for v2.0 if we ever need pixel-perfect HTML-to-PDF.

Decision should land in v1.4 Week 1 (alongside Orders kickoff). Affects #4 Documents (#5 Maintenance also generates an invoice).

**B-4 — Workshop scheduling assumption**

CONFIRMED. v1.5 MVP = single workshop (Behbehani's own service center). v1.7+ multi-workshop routing with proximity logic.

Schema nuance: keep `MaintenanceRequest.workshopId` as a `String?` (NULL in MVP, no Workshop table) rather than seeding a single Workshop row. Cleaner v1.7 migration story — add Workshop table + backfill `workshopId` for existing rows in one migration.

**B-5 — Refund mechanics (KNET reverse-transaction)**

KNET standard merchant accounts DO NOT have a reverse-transaction API. Refunds in KW go through one of:

1. **Same-day void** — within 24h of original txn, KNET allows void via merchant portal (manual). Engineering scope: B records void request, admin executes in KNET portal, B reconciles via webhook.
2. **Post-24h reversal** — manual SCD clearance ticket; 3-5 business days. Admin-driven, no API.
3. **Bank-transfer refund** — separate outbound transfer to customer's bank account via finance team. Slowest but most reliable for large refunds.

**Implication for #7 Returns:** the `Refund.status` workflow is largely ADMIN-DRIVEN, not auto-processed. B provides:
- Refund eligibility check (3-day/300km)
- Refund request record creation
- Admin queue with "void via KNET" / "manual bank transfer" buttons
- Customer-facing status: "Refund being processed — 3-5 business days"

Engineering effort unchanged from A's 2.5 d estimate, but the implementation is "admin dispatcher UI + audit trail" not "automated API call."

**B-6 — Civil ID validation strategy**

KW PACI API requires government MoU (12+ months process for non-government entities). NOT engineering-blockable.

**Recommendation: regex + checksum-only indefinitely.**

```ts
const KW_CIVIL_ID_REGEX = /^\d{12}$/;
function validateCivilIdChecksum(civilId: string): boolean {
  // KW Civil ID uses modulus-11 checksum with positional weighting:
  // weights = [2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  // Sum of (digit × weight) for first 11 digits, mod 11, compare to 12th digit
  if (!KW_CIVIL_ID_REGEX.test(civilId)) return false;
  const weights = [2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const sum = [...civilId.slice(0, 11)].reduce((s, d, i) => s + Number(d) * weights[i], 0);
  const checkDigit = (11 - (sum % 11)) % 11;
  return checkDigit === Number(civilId[11]);
}
```

Pair with mandatory front+back photo upload for human review during loan-app KYC. Admin spot-checks Civil ID photo against entered number. This is exactly how every KW dealer operates today.

PACI API integration: parked v1.8+ as a "nice to have", not roadmap-blocking.

---

### Day-count adjustments per subsystem

| # | Subsystem | A's B-days | **B's B-days** | Δ | Note |
|---|---|---|---|---|---|
| 1 | PII columns | 0.5 | **0.75** | +0.25 | Per-column Zod validation work (passport regex per country, DL regex, Civil ID checksum) underscored |
| 2 | Push notifications | 1.5 | **2.5** | +1.0 | FCM+APNs dual setup, retry queue with dead-letter, invalid-token cleanup, 4-axis preference gating — all real plumbing |
| 3 | Orders + Payments | 5-6 | **7-8** | +2 | Idempotency keys, KNET webhook signature verify, reservation cleanup cron, receipt PDF, admin queue — A's estimate missed half-day items that compound |
| 4 | Documents | 1.5 | **2** | +0.5 | Backfill script for existing inspection PDFs needs careful S3-key remapping; Document.kind enum will grow within v1.4 |
| 5 | Apple Sign-In | 1 | **1** | 0 | A's estimate spot-on. Mirror Google verifier shell. |
| 6 | Maintenance | 4-5 | **6-7** | +2 | 10-state state machine + admin estimate workflow + signed-URL photo upload + 6 push notification dispatches — A noticeably under |
| 7 | Returns | 2.5 | **3** | +0.5 | Eligibility needs `Order.deliveredAtMileageKm` snapshot column (doesn't exist); refund-status workflow with admin dispatcher UI |
| 8 | Financing | 5-6 | **5-6** | 0 | A's range is accurate for mock+admin-driven MVP. Real bank APIs slip to v1.8+. |
| 9 | Saved Searches | 2 | **2.5** | +0.5 | Nightly cron + dedup-against-prior-firing + match-count change detection logic |
| 10 | Reviews | 2.5 | **2.5** | 0 | A's estimate spot-on. Caveat: need `Listing.avgRating + ratingCount` denormalized counter columns updated on review approve. |
| 11 | Referrals | 1.5 | **2.5** | +1.0 | Only if store-credit ledger is in scope. Without store-credit: 1.5 d agreed. With: +1 d for ledger + admin balance UI. |

**Net impact on sprint windows:**

| Sprint | A's B-days | **B's B-days** | Net delta |
|---|---|---|---|
| v1.3.x (PII) | 0.5 | 0.75 | +0.25 |
| v1.4 (Push + Orders + Docs) | 8-9 | **11.5-12.5** | **+3 to +3.5** |
| v1.5 (Apple + Maintenance) | 5-6 | **7-8** | **+2 to +2** |
| v1.6 (Returns + Financing + Saved) | 9.5-10.5 | **10.5-11.5** | +1 |
| v1.7 (Reviews + Referrals) | 4 | **5** | +1 (with store-credit) |

**Interpretation:** A's sprint-window estimates are ~25-30% under for v1.4 and v1.5 (the two biggest sprints). v1.4 needs ~3 weeks B-only not ~2 weeks. Either:
- Accept 3-week v1.4 sprint length
- Defer Documents (#4) to v1.5 alongside Maintenance (frees ~2 d B)
- Split Orders + Payments into two sprints (v1.4 = Orders state machine + reservation only; v1.4.x = KNET payment integration)

My pick: **accept 3-week v1.4.** Push + Orders + Documents are tightly coupled (Documents surfaces Orders' contracts; Push alerts Orders state changes). Splitting them costs more in integration friction than the extra week buys.

---

### Subsystems under-scoped (high-confidence)

1. **Maintenance (#6)** — A: 4-5 d B; reality: 6-7 d B. 10-state machine is non-trivial; estimate workflow doubles UI surface; status-change dispatch fires push 6+ times per request. Recommend tracking this as 6 d in v1.5 plan.

2. **Orders + Payments (#3)** — A: 5-6 d B; reality: 7-8 d B. The state machine itself is moderate, but Orders touches: reservation timer cron, KNET integration (or aggregator integration), idempotency keys, webhook signature verify, receipt PDF generation, admin queue UI extension, listing state transitions (acquired → reserved → sold), payment retry logic, refund hooks. A only counted the visible items.

3. **Push (#2)** — A: 1.5 d B; reality: 2.5 d B. FCM + APNs is a two-provider integration with different retry semantics, different invalid-token responses, different rate limits. Plus the 4-axis preference gate (`channels.push`, `categories.X`, OS-level deny, in-flight check) is non-trivial.

### Subsystems over-scoped

None. A's estimates are at-or-under across the board.

---

### Cross-cutting infra gaps the roadmap missed

These items are NOT subsystems in their own right but block multiple subsystems. They need explicit ownership + budget.

**1. Cron infrastructure (BLOCKING for #3, #6, #8, #9, #10, also v1.3.x Civil ID expiry warnings)**

Currently we have NO cron runner. Multiple subsystems depend on scheduled tasks:
- Reservation timer cleanup (Orders #3) — 24h hold expiry
- Saved-search alert dispatch (Saved Searches #9) — daily/weekly cadences
- Loan-payment overdue flagging (Financing #8) — monthly recompute
- Review nudge dispatch (Reviews #10) — 7d post-delivery
- Civil ID expiry warning (PII #1) — 30-day-out warning
- Push-token prune (Push #2) — quarterly cleanup of unused tokens

**Recommendation:** add `node-cron` in v1.4 Week 1 as a sibling concern to Orders (~0.25 d B). For v1.6+ when load grows, migrate to `Bull` + Redis. Decision should land BEFORE Orders kickoff — saves retrofitting cron jobs later.

**Effort budget impact:** +0.5 d B in v1.4 (cron infra + first cron job for Orders reservation timer). All downstream cron jobs are cheap once infra exists.

**2. S3 bucket conventions document (BLOCKING for #4, #6, #1)**

Currently undocumented; growing organically. Need a `S3_CONVENTIONS.md` covering:
- Bucket layout: `inspections/`, `listings/`, `users/`, `orders/`, `documents/`, `maintenance/`, `civil-ids/`
- Per-prefix retention policies (Civil IDs: encrypted at rest, signed-URL TTL 15 min, never public-readable; receipts: 7-year retention)
- Signed-URL conventions: TTL by document sensitivity (receipts 1h, civil IDs 15 min, photos 1h)
- Versioning/lifecycle rules

**Effort:** 0.5 d B in v1.4 Week 1 (write doc + implement first-version conventions). Reusable across all subsequent subsystems.

**3. Unified notification dispatcher service (BLOCKING for #2, #6, #7, #8, #9, #10)**

Today each service constructs notifications inline. With Push joining SMS + Email, we get N×M notification call sites. Need a central `NotificationService.send(userId, category, channels?, payload)` API that:
- Reads user's `notificationPreferences`
- Filters by `categories.X` flag
- Filters by `channels.X` flag
- Falls back to admin escalation if all channels denied
- Logs to AuditLog for compliance

**Effort:** 1 d B in v1.4 alongside Push (#2). Refactor existing OTP notifications + offer-update notifications + future Maintenance/Returns notifications to use it.

**4. Idempotency keys for payment endpoints (BLOCKING for #3)**

Required to prevent double-charge on network retry. Standard pattern: `Idempotency-Key` header on `POST /orders` and `POST /orders/:id/payment`. Server stores `idempotency_key → response` for 24h; replays the cached response on duplicate request.

**Effort:** 0.5 d B in #3 Orders. Already in your 7-8 d budget; flagging so A doesn't think it's free.

**5. Webhook signature verification (BLOCKING for #3, future #6 Maintenance dispatch)**

`POST /v1/public/payments/knet/callback` must verify HMAC signature against shared secret. Common gotcha if forgotten. Same pattern applies to any future webhook (Maintenance technician app, courier GPS, etc.).

**Effort:** 0.25 d B in #3. Flagged for visibility.

**6. Customer-side audit log entries (LOW PRIORITY, but nice in v1.4)**

Existing `AuditLog` model is admin-actions-only. Customer-side financial actions (payments, refunds, sign-out-all, password change) should also write audit entries for compliance + customer dispute resolution.

**Effort:** 0.5 d B as part of #3 Orders. Defer to v1.5 if v1.4 budget tight.

---

### v1.3.x PII migration timing (item #1) — confirmation

A proposes: ~0.5 d B, lands within v1.3 closeout as a thin schema migration.

**Adjusted B view:** ship as **v1.3.7 AFTER joint smoke verdict closes**, not as part of the v1.3 main sprint.

Reasons:
- v1.3 Day 4 should be reactive-fixes-and-verdict only; adding migration work risks slipping the v1.3 close
- v1.3.x landing fragments the migration history (`20260520000002_v1_3_account_profile` is the current head; PII becomes `20260520000003_v1_3_pii`)
- Per-column validation work (passport format, DL format, Civil ID checksum, KW PACI rules) needs Zod schemas with refines — ~0.25 d on top of the migration itself
- Total realistic: 0.75 d B, spread across v1.3.7 + v1.3.8

**Net:** lands BEFORE v1.4 kickoff so the schema is ready for loan-app + delivery KYC, but does NOT block v1.3 main sprint close. A can wire the storefront-side `PATCH /me/profile` extension in v1.4 alongside loan-app UI work.

---

### Sequencing-ack

**v1.4 = Push + Orders + Documents bundled — ACCEPTED with one note.**

Per the Day-Count Adjustments table, v1.4 is more realistically a **3-week sprint** (11.5-12.5 B-days vs A's 8-9). Either accept 3 weeks OR split Documents to v1.5.

Sub-ordering within v1.4: I'd actually run **Documents (read-only of existing inspections) FIRST**, then **Push**, then **Orders + Payments**. Reason:

1. Documents read-only is the lowest-risk warm-up — backfill existing inspection PDFs into the Document table, validate S3 conventions, prove the signed-URL flow. Zero new state machine.
2. Push next — building the notification dispatcher service (cross-cutting infra item #3) as part of Push gives Orders a clean dispatch API to consume.
3. Orders last — most complex, benefits from Documents' S3 conventions + Push's dispatcher being in place.

But Documents' `sale_contract` kind depends on Orders shipping FIRST. So Documents lands in TWO phases within v1.4:
- v1.4 Week 1: Documents read-only (inspection_report kind only)
- v1.4 Week 3: Documents extends to sale_contract (after Orders' completed-state can produce contracts)

If A prefers the original sequence (Push → Orders → Documents) — no strong objection from B. The end state is identical.

**v1.5 = Apple Sign-In + Maintenance — ACCEPTED.**

C-led iOS launch sprint is the right grouping. Maintenance B-days adjusted upward (6-7 d vs A's 4-5) — see Day-Count Adjustments. Maintenance push-status-changes alert chain is the first real test of the unified notification dispatcher service.

**v1.6 = Returns + Financing + Saved Searches — ACCEPTED.**

Note: real bank API integration is OUT of v1.6 per B-2. v1.6 Financing uses mock + admin manual updates.

**v1.7 = Reviews + Referrals + V2-of-anything — ACCEPTED.**

Add: Referrals scope decision needed before v1.7 — does it include store-credit ledger (+1 d B)?

---

### v1.4.0 kickoff readiness from B-side

When A drops v1.4.0 in CONCIERGE_INSPECTION_API_CONTRACT.md, B will ack:

- [ ] 3-week v1.4 length OR Documents-to-v1.5 split (A picks)
- [ ] Sub-ordering within v1.4 (Push-first vs Docs-first)
- [ ] Cron infrastructure choice (`node-cron` for v1.4, `Bull`+Redis for v1.6+) — needs explicit A-side OK
- [ ] PDF library hybrid pick (`@react-pdf/renderer` + `pdfkit`)
- [ ] Notification dispatcher service refactor in v1.4 — scope agreement
- [x] **Payment aggregator LOCKED: Otto Payment Services** (user decision 2026-05-19 — see B-1 above for engineering implications)
- [ ] v1.3.7 PII migration timing confirmation

— **Session B**, 2026-05-19
