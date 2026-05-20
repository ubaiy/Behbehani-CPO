# v1.2 Preparation — Customer Auth + My-Bookings + Saved Cars

**Status:** B-side design exploration ahead of A's full v1.2 coordination prompt. **Nothing is committed in code yet** — this is a proposal A reviews when v1.1 ships, then we converge on final signatures + I implement.

**Scope:** the 5 B-side items A flagged in the v1.1 reply, plus open questions.

— **Session B**, 2026-05-19, in parallel with A's v1.1 wiring.

---

## 1. OTP infrastructure

### Proposed `OtpCode` Prisma model

```prisma
enum OtpPurpose {
  registration       // first-time signup OTP
  signin             // passwordless login
  mobile_verify      // verify mobile change on an existing account
  password_reset     // forgot-password flow (out of v1.2 scope, schema-ready)
}

enum OtpChannel {
  sms
  email
}

model OtpCode {
  id          String     @id @default(uuid()) @db.Uuid
  // Identifier OTP was sent to — normalised mobile (E.164 KW format) OR email
  identifier  String
  channel     OtpChannel
  purpose     OtpPurpose
  // BCrypt hash of the 6-digit code; raw code never stored
  codeHash    String
  // Optional FK — populated when OTP is bound to an existing User (e.g. signin
  // for a known mobile, password_reset). Null for first-time registration
  // since the User doesn't exist yet — we resolve on verify.
  userId      String?    @db.Uuid
  user        User?      @relation("UserOtpCodes", fields: [userId], references: [id], onDelete: Cascade)
  // Audit metadata
  ip          String?
  userAgent   String?
  // Lifecycle
  attempts    Int        @default(0)  // increments on every verify; block at 5
  consumedAt  DateTime?
  expiresAt   DateTime
  createdAt   DateTime   @default(now())

  @@index([identifier, purpose, createdAt])
  @@index([expiresAt])   // sweep job
}
```

### Key decisions baked in

- **Code hash, not plaintext.** Same `bcrypt` dep already in the API. Hash with rounds=8 (cheap, since OTPs expire in 5 min) so verify under 50 ms even on a tablet.
- **5-minute TTL** by default; configurable via `env.OTP_TTL_MINUTES`.
- **5-attempt cap** before invalidation. A 6th attempt rejects with `OTP_LOCKED` even if the code is right — forces a resend.
- **Resend cooldown** = 60 s, same pattern as the existing `customerSignTokenLastSentAt` on inspections. Tracked in-memory or via a new `lastSentAt` column? Recommend in-memory (Redis) since OTP traffic is bursty — but Redis isn't a v1.2 dep. **Open question for A: prefer a `lastSentAt` column or punt to a future Redis-backed rate limiter?**
- **Multiple concurrent OTPs per identifier** — supported. On resend, the older code is left active until natural expiry; the newer code is also accepted. Avoids the UX trap of "you typed the code from the first SMS but we silently invalidated it".

### Service signatures (proposed)

```ts
// apps/api/src/auth/otp.service.ts (NEW)
export async function issueOtp(
  identifier: string,         // raw mobile or email
  channel: OtpChannel,
  purpose: OtpPurpose,
  ctx: { ip?: string | null; userAgent?: string | null; userId?: string },
): Promise<{ otpId: string; expiresAt: string }>;
// Throws OtpError(429, 'RATE_LIMITED') if last issuance < 60s

export async function verifyOtp(
  identifier: string,
  channel: OtpChannel,
  purpose: OtpPurpose,
  code: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<{ otpId: string; userId: string | null }>;
// Throws OtpError with code in:
//   'NOT_FOUND' (404)   — no live OTP for this identifier/purpose
//   'EXPIRED' (410)
//   'LOCKED' (429)      — 5+ attempts
//   'INCORRECT' (401)   — increments attempts, still allows retry
//   'ALREADY_USED' (409)
```

### Notification dispatch

Reuse the existing `notifications.service.ts` provider pattern. Two new template entries in a new `otp-notifications.service.ts` to honour the 500-line cap on the parent file:

- `otp.sms` — bilingual: "Your Behbehani Motors verification code is {code}. Valid for 5 minutes."
- `otp.email` — bilingual HTML template with the code in a large display + footer disclaimer

Same `UnifonicSmsProvider` + `SendGridEmailProvider` adapters already in use.

---

## 2. Ghost-account reconciliation

### Problem statement

When a customer books a Concierge inspection via the storefront, `createConciergeInspection` calls `findCustomerByMobileOrEmail` → if not found, `createGhostCustomer` creates a User row with empty `passwordHash` and `role='customer'`. This ghost account is unclaimed — the customer has no credentials.

When the same customer later hits `/v1/auth/register` (A's signup page), the existing logic rejects with 409 because the mobile/email already exists.

### Proposed behaviour

`registerCustomer(dto, ctx)` becomes ghost-aware:

```ts
1. Lookup user by mobile-or-email.
2a. If user exists AND passwordHash is empty (ghost): UPGRADE in place
    — set passwordHash, set fullName if missing/placeholder, set
      mobileVerifiedAt (since the registration is OTP-gated by A).
    — Emit audit 'user.ghost_upgraded'.
    — Return 200 (not 201) with `{ kind: 'upgraded' }`.
2b. If user exists AND passwordHash is set (claimed): reject 409 as today.
3. If no user exists: create fresh, emit 'user.created', return 201.
```

The discriminator at the response layer lets A's UX message switch between "Welcome to BMC" (fresh) and "Welcome back — we've linked your existing booking" (upgrade), which is a much better experience than 409.

### Schema change

None — the `passwordHash String` column is currently non-nullable but ghost rows store an empty string `''` (per `createGhostCustomer` in `inspections.repo.ts`). My recommendation: keep the empty-string convention. **Open question for A: prefer to change the column to `String?` for semantic clarity?** Migration cost is one column-nullability change; back-compat is fine since existing reads tolerate both.

---

## 3. Google OAuth verifier

### Library choice

`google-auth-library@^9.x` — official, maintained by Google, audited. Already widely used in production Node apps. Adds ~700 KB to deps. Alternative `jose` is lighter but requires hand-rolling JWKS rotation; not worth the savings.

```bash
npm install --workspace=apps/api google-auth-library
```

### Proposed endpoint

```
POST /v1/auth/google/verify
Body: { idToken: string }
Response:
  200 { sessionToken: string, refreshToken: string, user: PublicUserView }
       — fresh login or returning user
  201 { sessionToken: string, refreshToken: string, user: PublicUserView, isNewAccount: true }
       — new account created from Google profile

Errors:
  401 INVALID_TOKEN              — Google didn't sign this, or audience mismatch
  410 TOKEN_EXPIRED              — `exp` claim past
  409 EMAIL_TAKEN_NON_GOOGLE     — email exists on a password-auth account; reject
                                    rather than overwrite (security boundary)
```

### Service signature

```ts
// apps/api/src/auth/google.service.ts (NEW)
export async function verifyGoogleIdToken(
  idToken: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<{ user: User; isNewAccount: boolean }>;
// Throws GoogleAuthError per codes above
```

Internal logic:
1. `OAuth2Client.verifyIdToken({ idToken, audience: env.GOOGLE_OAUTH_CLIENT_ID })`
2. Read payload `email`, `email_verified`, `sub` (google user id), `name`, `picture`, `locale`
3. Reject if `email_verified !== true` (Google said the address isn't verified — don't trust)
4. Lookup user by `googleSub` first (new field, see below), then by email:
   - Found by googleSub → log in
   - Found by email, no googleSub → bind the googleSub to the existing account ONLY if it's a ghost; else 409
   - Not found → create fresh user with `passwordHash=''`, `googleSub`, `emailVerifiedAt=now()`
5. Issue session + refresh tokens via the existing auth service's `issueSession` helper

### Schema addition

Single new column on `User`:

```prisma
model User {
  // ... existing fields
  googleSub        String?     @unique   // Google's `sub` claim — stable per Google account
  // ...
}
```

Migration: `ALTER TABLE "User" ADD COLUMN "googleSub" TEXT; CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");`

### Environment variable

`GOOGLE_OAUTH_CLIENT_ID` — single value, both web + native iOS+Android need their own client IDs if A's storefront ever goes mobile-native, but for v1.2 web-only, one is enough.

---

## 4. SavedListing (favourites)

### Proposed Prisma model

```prisma
model SavedListing {
  // Composite PK: a customer can save a listing exactly once
  customerId String   @db.Uuid
  customer   User     @relation("CustomerSavedListings", fields: [customerId], references: [id], onDelete: Cascade)
  listingId  String   @db.Uuid
  listing    Listing  @relation("ListingSavedBy", fields: [listingId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@id([customerId, listingId])
  @@index([customerId, createdAt])     // queue ordering for the my-favourites page
  @@index([listingId])                  // count badge on listing card
}
```

### Service exports (3, per A's brief)

```ts
// apps/api/src/saved-listings/saved-listings.service.ts (NEW)
// All three are `// public-shared` — A wires thin controllers.

export async function getSavedListingsForCustomer(
  customerId: string,
  filter: { page: number; pageSize: number },
): Promise<SavedListingListResponse>;

export async function saveListing(
  customerId: string,
  listingId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<{ saved: boolean; createdAt: string }>;
// Idempotent: re-saving an already-saved listing returns `{ saved: false }`
// without throwing. saved===true only on first save.

export async function unsaveListing(
  customerId: string,
  listingId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<{ removed: boolean }>;
// Idempotent: removing a non-existent saved row returns `{ removed: false }`.
```

### Zod schemas (proposed)

```ts
// libs/shared/types/src/lib/saved-listings.public.schemas.ts (NEW)
export const SavedListingSummarySchema = z.object({
  listingId: z.string().uuid(),
  stockNumber: z.string(),
  titleEn: z.string(),
  titleAr: z.string().nullable(),
  priceFils: z.bigint(),
  heroPhotoUrl: z.string().url().nullable(),
  savedAt: z.string().datetime(),
});

export const SavedListingListResponseSchema = z.object({
  items: z.array(SavedListingSummarySchema),
  total: z.number().int(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});

export const SavedListingActionResponseSchema = z.object({
  saved: z.boolean().optional(),
  removed: z.boolean().optional(),
  createdAt: z.string().datetime().optional(),
});
```

### Public endpoints A wires

```
GET    /v1/public/me/saved-listings          (requires session)
POST   /v1/public/me/saved-listings/:listingId  → saveListing
DELETE /v1/public/me/saved-listings/:listingId  → unsaveListing
```

Authenticated routes need a new middleware `requireCustomerSession` (or whatever A's auth interceptor convention is). **Open question for A: does the existing public router infrastructure already gate per-customer auth, or is v1.2 adding that as a separate piece?**

---

## 5. `getInspectionsByCustomerId` export

### Signature

```ts
// apps/api/src/inspections/inspections.service.ts
// NEW public-shared export

export async function getInspectionsByCustomerId(
  customerId: string,
  filter: { page: number; pageSize: number },
): Promise<{ items: CustomerInspectionView[]; total: number; page: number; pageSize: number }>;
```

### `CustomerInspectionView` schema (proposed)

Sanitised — no admin notes, no full VIN, no internal scoring breakdowns. Just what the customer needs to see in their "my bookings" list.

```ts
// libs/shared/types/src/lib/inspection.schemas.ts — ADDITIVE
export const CustomerInspectionViewSchema = z.object({
  id: z.string().uuid(),
  bookingRef: z.string(),
  kind: z.literal('concierge'),  // CPO inspections are admin-only; customer never sees them
  status: z.enum(INSPECTION_STATUSES),
  vehicle: PublicVehicleSnapshotSchema,
  scheduledFor: z.string().datetime().nullable(),
  inspectedAt: z.string().datetime().nullable(),
  // Offer summary if one has been issued — peek at the latest open offer
  latestOffer: z.object({
    publicToken: z.string(),    // so the customer can re-open the offer page
    status: z.enum(OFFER_STATUSES),
    amountFils: z.bigint(),
    validUntil: z.string().datetime(),
  }).nullable(),
});

export const CustomerInspectionListResponseSchema = z.object({
  items: z.array(CustomerInspectionViewSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
```

The `latestOffer` is a join optimisation so A's "my bookings" UI doesn't need to call two endpoints per row. Reuses the same `groupOfferCountByStatus` repo pattern shipped in Phase 4.

### Public endpoint A wires

```
GET /v1/public/me/inspections   (requires session)
```

---

## Aggregate prep — implementation effort estimate

If A signs off on the above as-is, B-side implementation breakdown:

| Item | Files | Effort |
|---|---|---|
| OtpCode + service + 2 notification templates | 4 files | 0.5 day |
| Ghost-account reconciliation in register flow | 1 file edit + 2 spec additions | 0.25 day |
| Google OAuth verifier + User.googleSub migration | 3 files + 1 migration + npm install | 0.5 day |
| SavedListing model + service + schemas | 3 files + 1 migration | 0.5 day |
| getInspectionsByCustomerId + CustomerInspectionView | 1 file edit + schema additions + 1 spec | 0.25 day |
| **Total** | | **~2 days** ✅ matches A's estimate |

---

## Open questions for A (resolve in v1.2 kickoff)

1. **OTP resend cooldown tracking** — `lastSentAt` column on `OtpCode`, or punt to Redis when we add it?
2. **`User.passwordHash` nullability** — keep empty-string ghost convention, or migrate to `String?` for semantic clarity?
3. **Per-customer auth middleware** — does A's public router infrastructure already provide session-gated routes, or is `requireCustomerSession` a v1.2 add (and if so, who owns it — A's middleware lib, or B's)?
4. **`SavedListing` count badge** — should the public listing detail endpoint include `savedCount` (cheap join) for "1.2K saved" social-proof badge? Or out of scope?
5. **Mobile-only OTP vs email-fallback** — Kuwait market is mobile-first, but should the OTP service support email as a fallback when mobile fails? My proposal supports both via the `channel` enum, but A may want to lock to SMS only for v1.2 UX simplicity.

---

## Out of scope for v1.2 (B's view)

- Password reset (schema-ready via OtpPurpose.password_reset, but no flow yet)
- Multi-factor auth beyond OTP
- Social logins beyond Google (Apple Sign-In would be the natural Phase 6 add)
- Account deletion / GDPR-style "delete my data" flow
- Per-device session management (sign out of all devices)
- Mobile push notifications

---

**B is ready to start v1.2 implementation the moment A posts their full v1.2 prompt.** No code committed from this prep — schemas and signatures above are proposals, not implementations. Adjust freely in the v1.2 prompt and B converges.
