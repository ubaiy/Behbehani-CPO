# Sprint M2 Mobile Mockup — Revision Changes

**Date:** 2026-05-19
**Cycle:** Revision pass after scope audit + reviewer NO-GO.
**Sources used:** `docs/SRS_Car_Marketplace_Kuwait.txt`, `MOBILE_API_CONTRACT.md` v0.3, `CONCIERGE_INSPECTION_API_CONTRACT.md` v0.2, `ARCHITECTURE_PHASE_4_OFFER.md`, `V1_2_AUTH_PREP.md`, `mockups/web/sprint-3/*`.

This pass closes the consolidated punch list (cross-cutting constraints + 16 probable gaps from scope §14 + 2 reviewer P1 fails).

---

## Cross-cutting (every file)

| Constraint | Result |
|---|---|
| Plus Jakarta Sans font loaded + applied | ✅ all 9 screen files + 2 new files |
| Royal Blue palette only (50–900) + slate neutrals + red for destructive | ✅ zero amber/yellow/gold/emerald/green hex anywhere |
| Tajawal font reserved for RTL | ✅ loaded, `[dir="rtl"]` style block |
| KWD with 3 decimals format `KWD N.NNN` / `KWD N,NNN.NNN` | ✅ verified by grep — zero 2-decimal misses |
| VIN masked to last-6 on customer surfaces | ✅ `··· ··· A12345` style in VDP + offer |
| Tab bar = 5 visible + More sheet | ✅ Home / Browse / Sell / Services / Account + More |
| Touch targets ≥ 44 px | ✅ `min-h-[44px]` / `h-12` on all interactive elements |
| Role-gated UI hidden (not disabled) | ✅ pure customer surface; nothing rendered for unauthorized states |
| Safe-area top + bottom respected | ✅ status bar reserved, footer padded |
| 390×844 baseline viewport | ✅ `w-[375px] min-h-[812px]` wrapper |

---

## Reviewer NO-GO items (closed)

### P-DEPOSIT-WINDOW · `04-vdp.html`
Previously: sticky Reserve CTA showed `· KWD 100.000` only — missing 48-hour hold disclosure (Kuwait UX trust risk).
Now: Reserve copy reads `KWD 100.000 · refundable · 48-hour hold` with subcaption `Refundable hold — auto-expires in 48 hours` directly above the CTA. Source: FR-RES-001, FR-RES-002, FR-RES-003.

### P-PHOTO-CAPTURE · `08b-sell-photos.html` (NEW)
Previously: Step 2 of the sell wizard was missing entirely; `capture="environment"` could not be verified anywhere in the mockup set.
Now: New screen `08b-sell-photos.html` implements Step 2 with:
- 6 mandatory photo angles (Front · Rear · Driver side · Passenger side · Interior · Dashboard)
- Each slot is a `<label>` wrapping `<input type="file" accept="image/*" capture="environment">`
- 44×44 px+ tap targets (aspect-4/3 cards)
- Optional multi-photo input for extras (damage, features) — also `capture="environment"`
- Upload-progress meter (1 of 6) + sticky Back / Next footer
- Privacy reassurance card (Bahrain AWS region, encrypted in transit)

---

## Per-screen punch list

### `01-home.html` — FR-BUY-001..009
- Trust-badge strip: Inspected · Insured · Returnable · Delivered
- 6 rails: Featured · Inspected · Low-Mileage · Recently Added · Price Drops · Shop by Body Type / Price Range
- Full-width "Sell Your Car" CTA card
- Sticky search header with type-ahead placeholder
- "How It Works" 3-step explainer
- Canonical ListingCard pattern (aspect-16/10 photo, badges, KWD 3-dec, monthly est)
- Font swapped to Plus Jakarta Sans

### `02-browse.html` — FR-BUY-011..016, 020, 021
- Live count header (`47 cars match`)
- Grid / List view toggle
- Sort dropdown with API enum values: `featured | priceAsc | priceDesc | mileageAsc | newest`
- Filter chip rail (Brand / Body Type / Budget Max / Sort / More filters)
- Reserved-state overlay on card with countdown
- Empty-state / loading-skeleton / error-retry markup
- Pull-to-refresh affordance

### `03-filter-sheet.html` — FR-BUY-011, 015
- Full filter set (Brand · Body · Year range · Budget Max · Monthly Payment range · Mileage range · Transmission · Fuel · Colors · Cylinders · Drivetrain · Seats · Regional Specs · Seller Type · Inspection · Warranty)
- Unwired filters carry "Coming soon" badge so users see roadmap
- Sticky bottom "Show N cars" primary CTA (≥44px) — N updates live
- "Reset all" header link
- 88vh sheet height + drag handle

### `04-vdp.html` — FR-CAR-001..020 + FR-RES
- Photo gallery hero + thumbnail strip ("25 photos" counter)
- 360° View CTA stub
- Trust-bar icons (Inspected · Warranty · Returnable · Home Delivery)
- VIN masked `··· ··· A12345`
- Vehicle History card (previous owners / accident / service history)
- Monthly-payment calculator widget (down-payment slider + tenure chips + KWD 3-dec output)
- Indicative insurance quote stub
- Inspection report embed: 5 category groups (Exterior · Mechanical · Electronic · Interior · Test Drive) with overall score
- Similar Cars horizontal rail
- Share sheet trigger
- Sticky Reserve CTA: `KWD 100.000 · refundable · 48-hour hold`
- Secondary CTAs: Make an Offer / Book Test Drive / Apply for Loan / Contact Seller (Favorites hidden per M2 rules)

### `05-sign-in.html` — FR-AUTH-002..006
- Email + password active form
- Forgot Password link
- Account-lockout error copy block (hidden state)
- Sign-up companion w/ Kuwait mobile hint (+965 / regex) + password strength
- OTP / Google / Apple buttons visible + `disabled aria-disabled="true"` + "Coming soon" pill (already passing — preserved)
- EN/AR language toggle in header

### `06-account.html` — FR-MOB-002 + V1_2_AUTH_PREP §5
- Guest state: single "Sign in to view your account" CTA, everything else hidden
- Signed-in state: profile header (fullName, email/mobile, locale badge)
- My Reservations card (stub list with hold timer)
- My Bookings card (Concierge inspections — booking ref like `BMC-CON-001234`, status chips: Scheduled / In Progress / Awaiting Signature / Signed Off)
- My Offers card (links to 09-offer.html)
- Language toggle (EN / AR)
- Sign out button
- Delete account entry (CITRA 30-day grace copy)
- Favorites / Finance / Maintenance HIDDEN (live in More sheet per M2 rules)

### `07-more-sheet.html` — FR-MOB-007 + App Store
- WhatsApp Customer Service entry (FR-MOB-007 mandatory)
- Finance Calculator entry (active — pure client-side per FR-FIN-001)
- Privacy Policy + Terms of Service entries (App Store required)
- Favorites entry (hidden from main tab bar)
- Other entries (Saved Searches · Compare Cars · Deliveries · Returns · Document Vault · Help) present with "Coming soon" badges where unwired
- App version footer

### `08-sell-yourcar.html` — FR-SCN, FR-TRD, FR-SSS + CONCIERGE v0.2 §3a
- Three-path picker cards: Instant Online Valuation (primary) · Concierge Service (live) · Self-Service Classified (Coming soon)
- Stepper 1 of 4 (Car Details current)
- Concierge wizard fields per contract:
  - Year, brand, model, mileage, transmission (required)
  - VIN (optional with copy "Optional — we can verify on inspection")
  - Address + Governorate picker (6 KW governorates: Capital / Hawalli / Farwaniya / Mubarak Al-Kabeer / Ahmadi / Jahra)
  - Preferred window radio chips (Morning / Afternoon / Evening)
  - Customer notes textarea (max 500)
  - Name, mobile (KW +965 hint), email
- Submit produces `bookingRef BMC-CON-001234` confirmation with copy affordance
- Next button links forward to `08b-sell-photos.html`

### `08b-sell-photos.html` (NEW) — Step 2 of 4
See P-PHOTO-CAPTURE above.

### `09-offer.html` (NEW) — ARCHITECTURE_PHASE_4_OFFER
- Hero with offer amount in KWD 3-decimals (`KWD 4,850.000`)
- Valid-until copy + live countdown (`6d 14h left`, 7-day default)
- Booking reference echo (`BMC-CON-001234`)
- Inspection report link card (71 points, overall 88/100)
- Vehicle context card (year, model, mileage, VIN last-6, governorate)
- Sticky decision footer: **Decline** / **Counter** / **Accept**
- Counter inline form: KWD input + notes textarea + "One counter allowed" disclosure (Phase 4 §2)
- Sale terms link in body copy

### `00-index.html` — gallery
- Added thumbnail cards for `08b` (Step 2 — Photos) and `09` (Offer)
- Updated 08 description to reflect new scope (three-path picker + Concierge fields)
- Existing locked-rule summary preserved

---

## Intentionally deferred (P2/P3 or future sprint)

| Item | Reason |
|---|---|
| Recently Viewed rail on Home | Requires `/v1/me/recently-viewed` endpoint not yet in MOBILE_API_CONTRACT v0.3 — flagged for W3 |
| 360° viewer asset loading | Asset pipeline not yet ready; mockup shows stub CTA |
| Walkaround video HLS player | Same — stub card with player iconography |
| Features & Equipment grouped block on VDP | API surface TBD; stub "Coming soon" |
| Inspection-sign signature pad page | Owned by `apps/web` per Concierge contract — mobile only deep-links to it |
| Delivery tracking live GPS | FR-DEL-003 Sprint 5 |
| 7-step Purchase Wizard | FR-RES-004..011 Sprint 4 (M2 stops at Reserve confirmation) |
| First-launch CITRA consent modal | Will ship as standalone screen in W3 (cross-cutting concern, not per-screen) |
| Push permission prompt UX | Same — W3 first-launch flow |

---

## Verification snapshot

Run from project root:

```bash
# Banned colors (must return 0 hits in screen files)
grep -ciE "amber|yellow|gold|emerald|green" mockups/mobile/sprint-M2/0[1-9]*.html mockups/mobile/sprint-M2/08b*.html

# KWD format (must read "KWD N.NNN")
grep -c "KWD 100.000" mockups/mobile/sprint-M2/04-vdp.html
grep -c "48-hour" mockups/mobile/sprint-M2/04-vdp.html

# capture="environment"
grep -c "capture=\"environment\"" mockups/mobile/sprint-M2/08b-sell-photos.html
```

All mockups served at `http://localhost:8090/00-index.html` via `python -m http.server 8090` in `mockups/mobile/sprint-M2/`.

---

# Sprint M2+v1.3 — Account-hub expansion

**Date:** 2026-05-20
**Trigger:** Session B shipped CONCIERGE_INSPECTION_API_CONTRACT.md v1.3.0 (lines 2767–3018) extending the customer-account API surface — 14 new `/v1/public/me/*` endpoints + `PublicUser` DTO grown 7→14 fields + `UserDeviceSession` refresh-rotation merger + locked `NotificationPreferences` shape.

Mobile reply: `MOBILE_API_CONTRACT.md` v0.4 (lines 1117–1270), appended same day.

This revision adds the customer-facing mobile coverage for everything in v1.3.

## Files

| File | Status | Backs which v1.3 endpoint |
|---|---|---|
| `06-account.html` | EDITED | `GET /v1/public/me` (extended PublicUser) + entry points for all 6 below |
| `10a-edit-profile.html` | NEW | `PATCH /v1/public/me/profile {fullName?, locale?, avatarUrl?}` |
| `10b-change-email.html` | NEW | `POST /v1/public/me/email` + `/email/verify` (OTP purpose `email_change`) |
| `10c-change-mobile.html` | NEW | `POST /v1/public/me/mobile` + `/mobile/verify` (OTP purpose `mobile_change`) |
| `10d-change-password.html` | NEW | `POST /v1/public/me/password` (both `hasPassword=true` and `=false` variants) |
| `10e-addresses.html` | NEW | `GET/POST/PATCH/DELETE /v1/public/me/addresses[/:id]` + `POST /:id/default` |
| `10f-notifications.html` | NEW | `GET/PUT /v1/public/me/notification-preferences` |
| `00-index.html` | EDITED | new "Account hub additions · v1.3" cluster with 6 thumbnails |

## 06-account.html — what changed

- **Profile header rebuilt** on white card: 72px avatar circle with initials fallback (brand-900 bg, white text), brand-700 camera badge linking to `10a-edit-profile.html`
- **Verification pills row**: email = brand-50 + brand-700 "Email verified" (✓) when `emailVerifiedAt != null`; mobile = red-50 + red-700 "Verify mobile" link to `10c` when `mobileVerifiedAt == null`
- **Status pill** template (hidden when `status === 'active'`); renders "Pending verification" or "Suspended" for non-active states
- **Member-since caption**: "Member since May 2026 · Last sign-in 2 hours ago" backed by `createdAt + lastSignInAt`
- **New "Account & security" list** (each row `min-h-[56px]`):
  - Edit profile → `10a` (pencil icon)
  - Change email → `10b` (envelope)
  - Change mobile → `10c` (phone)
  - Change password → `10d` (lock)
  - Saved addresses → `10e` (map-pin)
  - Notifications → `10f` (bell)
- **"Sign out of all devices"** entry above the standard Sign out (shield icon, red-700 accent) — backs `POST /v1/public/me/sign-out-all` with confirmation modal pattern

## 10a-edit-profile.html

- Avatar editor (96px circle + initials fallback) with Take photo (`capture="environment"`) and Library (`accept="image/*"`) buttons
- Full name input (2–80 chars), Language segmented control (English / العربية)
- Save CTA goes from disabled to enabled when dirty
- Inline brand-50 note: "Email and mobile are changed separately for your security." with direct links to 10b/10c

## 10b-change-email.html

- Two-step single-page flow (step 2 hidden by default, JS toggle on Send code)
- **Step 1**: current email shown with verified pill, new email input (`type="email"`, `inputmode="email"`), Send code CTA
- **Step 2**: 6-cell OTP grid (`inputmode="numeric"` `maxlength="1"`, brand-700 focus ring, auto-advance + backspace, tabular-nums), countdown placeholder, Verify & save CTA, Resend cooldown

## 10c-change-mobile.html

- Same 2-step pattern with KW mobile spec:
  - `+965` prefix chip + 8-digit input (`inputmode="tel"` `pattern="[569][0-9]{7}"`)
  - Hint: "Kuwait mobile starts with 5, 6 or 9 — 8 digits."
  - Step 2 SMS confirmation displays mobile in 4-4 split format

## 10d-change-password.html

- **Variant 1 (`hasPassword=true`)**: current + new + confirm, 4-bar strength meter (brand-300 → brand-700), eye-toggles, "Strong" state
- **Variant 2 (`hasPassword=false`, first-set)**: current-password field REMOVED per B v1.3 §6 endpoint 7 Zod refine; brand-50 banner "You signed in with Google. Set a password to enable email + password sign-in too."; CTA reads "Set password"
- Both variants stacked in same file under a divider banner for review

## 10e-addresses.html

- **List view**: Home (Default pill brand-700) + Office (Set-as-default text-button) cards with edit/delete icons
- **Empty state**: brand-50 icon card + CTA "Add your first address"
- **Add/Edit form**: Label, governorate picker (6 KW governorates EN + Arabic — Capital · Hawalli · Farwaniya · Mubarak Al-Kabeer · Ahmadi · Jahra), Area, compact Block/Street/Building, optional Unit ("Common in high-rises"), default-toggle switch
- All variants stacked in same file for review

## 10f-notifications.html

- 4 category sections × 3 channel toggles (Email / SMS / Push):
  - **Booking updates** — default ON for all 3
  - **Listing alerts** — Email + Push ON, SMS OFF, "Starts when you save your first search" caption
  - **Marketing** — default OFF (KW data-law caution), "We never share your details" caption
  - **Account security** — LOCKED (`z.literal(true)` per v1.3 §6.1), checks in `text-brand-700`, grey lock icon, "Locked" pill
- Footer note about iOS/Android push permission

## Cross-screen constraint audit

| Constraint | Result on new files |
|---|---|
| Banned colors (amber/yellow/gold/emerald/green classes or banned hex) | 0 hits across 10a/10b/10c/10d/10e/10f |
| Plus Jakarta Sans loaded | ✅ every file |
| Tajawal reserved for RTL | ✅ |
| Touch targets ≥ 44 px | ✅ (`min-h-[44px]` / `h-12` on all interactive) |
| Primary CTAs ≥ 48 px | ✅ |
| `capture="environment"` on customer photo capture | ✅ in 10a avatar Take photo button |
| RTL-safe Tailwind props (`ps-*`, `me-*`, `text-start`, `rtl:rotate-180`) | ✅ throughout |
| Red used only for destructive/warnings (Verify mobile pill, sign-out-all accent, Delete) | ✅ |
| Royal Blue scale 50–900 + slate neutrals only | ✅ |

## Intentionally deferred (post-v1.3 mockup cycle)

| Item | Reason |
|---|---|
| Sign-out-all confirmation modal | Standalone modal component will live in W3 interaction library; entry is in 06-account |
| Avatar crop/edit UX | S3 multipart upload UX deferred to W3 — current mockup just shows file pickers |
| Notification per-category granular timing controls | Out of v1.3 §6.1 schema; possible v1.5 normalisation per B note |
| Verified-pill OTP re-issue flow (`POST /me/email` against current verified email) | Edge case; current 10b assumes change to *new* email |
| Loan-app / Civil-ID / passport / driver-license panels | v1.3 §4 explicitly defers KYC PII columns to Phase B (`v1_3_x_kyc_columns` migration) |

## v0.4 contract reply highlights (for cross-reference)

`MOBILE_API_CONTRACT.md` v0.4 (lines 1117–1270) covers:
- Acks: Q-B-4 closed (refresh-rotation folded into UserDeviceSession), OTP-signin §3 closed (B picked Option 1), locale upsert subsumed by `PATCH /me/profile`
- 4 ergonomic asks for B before Day 2 EOD:
  - **EA-1**: does `POST /me/email` initiate return `{otpId, expiresAt}`?
  - **EA-2**: do `PATCH/DELETE /me/addresses/:id` return full `Address[]` or just the row?
  - **EA-3**: does `POST /me/sign-out-all` revoke caller's current session too?
  - **EA-4**: does `POST /me/password` (204) guarantee next `/me` has `hasPassword: true`?
- W2 sign-in coder scope now includes: custom UA `BehbehaniCPO/iOS/<version>`, TOKEN_REUSED 401 interceptor
- PushToken still in v1.4 (no change); `notificationPreferences.channels.push` will render muted until v1.4 lands

---

# Sprint M2+v1.3.2 — SRS §7 expansion (A↔C converged)

**Date:** 2026-05-20
**Trigger:** Session A posted v1.3.2 to CONCIERGE_INSPECTION_API_CONTRACT.md (lines 3115-3247) — SRS §7 coverage audit (4/20 covered, 15 unplanned). Proposes 4-group account hub IA + 7-8 Coming-Soon shells + `NotificationSubscription` opt-in capture endpoint + Apple Sign-In defer-to-v1.5.

Mobile replies: `MOBILE_API_CONTRACT.md` v0.5 (lines 1271-~1370) + v0.5.1 sync note (~lines 1370-1410).

## Files

| File | Status | Backs which surface |
|---|---|---|
| `06-account.html` | **REVERTED PLAN** — currently holds the superseded Hybrid IA from `account-ia-architect` (Opus); HOLD until A's `account-v2.html` lands, then mobile mirrors A's 4-group structure | Joint authority — A owns the IA shape; mobile mirrors |
| `11-favorites.html` | NEW (live) | Backs `GET /v1/public/me/saved-listings` (V1_2_AUTH_PREP §4) — Favourites is a live tile per A v1.3.2 audit (v1.2.5 backed) |
| `14-coming-soon.html` | NEW (template ×8 stacked variants ×3 for review) | Mobile sibling of A's Angular `ComingSoonPageComponent`; serves 8 routes per A's v1.3.2 §2 table (saved-searches · orders · documents · maintenance · financing · returns · reviews · referrals) |
| `00-index.html` | EDITED | Added "SRS §7 expansion · v1.3.2" divider + 2 thumbnail cards (11 + 14) |

## 11-favorites.html

- Sticky header: back arrow + "Favourites" + "8 saved" count pill (brand-50 / brand-700)
- Filter chip rail: `All (8)` active · `Inspected (5)` · `Price drops (2)` · `Recently viewed (3)` (horizontal scroll, no scrollbar)
- Sort dropdown inline: Recent first / Price low→high / Price high→low / Mileage low→high
- 4 example ListingCards using canonical `aspect-[16/10]` pattern: Camry LE / Lexus ES 350 / Land Cruiser (Reserved overlay w/ countdown) / Honda Accord
- Tap-to-remove **filled red-500 heart** (44×44 px) — destructive intent convention
- Inline help bar (slate-50): "Tap ♥ to remove from favourites. Removed items appear in Recently viewed for 7 days."
- Empty state stacked below w/ "Browse cars" CTA → 02-browse
- Skeleton state stacked below empty (3 `animate-pulse` cards)
- Bottom tab bar mirrors 06-account

## 14-coming-soon.html

- Single parametrisable template per A's v1.3.2 §2; mobile renders 3 stacked variants for review
- Variants:
  1. **Maintenance pickup** — `/account/maintenance` · Coming Q3 2026 · wrench+car+clipboard SVG · 3 teaser bullets
  2. **Document vault** — `/account/documents` · Coming Q3 2026 · folders+shield SVG · 3 teaser bullets
  3. **Referral program** — `/account/referrals` · Coming 2027 · people+arrow+gift SVG · 2 teaser bullets
- Per variant: sticky header / hero SVG on `bg-brand-50 rounded-3xl` at 40% opacity / **ETA pill option (c)** `bg-slate-100 text-brand-700 border border-brand-200` (NOT amber — see v0.5 §2 below) / teaser bullets card / Notify-me email form / success state below (banner-divided)
- Notify-me form: `placeholder=user.email` for signed-in (auto-fill semantic per A's C4 lock); empty for guests
- Submit: `POST /v1/public/feature-waitlists` per A's v1.3.6 §6 D-NAMING rename (idempotent on `(featurePath, email)`, guest-friendly; model `FeatureWaitlist`)
- Success state preview: brand-100 card "✓ You're on the list. We'll email <email> when this launches."
- Footer: "← Back to account" link to 06-account

## 00-index.html

- New section "SRS §7 expansion · v1.3.2 (A↔C converged)" divider added below the v1.3 cluster
- 2 new thumbnail cards: `11 · v1.3.2 · live` (Favourites) and `14 · v1.3.2 · template ×8` (Coming-Soon shell)

## Cross-screen audit (11 + 14)

| Constraint | Result |
|---|---|
| Banned colors (amber/yellow/gold/emerald/green classes) | 0 hits |
| ETA pill = option (c) | ✅ 3 hits in 14-coming-soon (one per variant) |
| Plus Jakarta Sans loaded | ✅ both files |
| Touch targets ≥ 44 px / CTAs ≥ 48 px | ✅ |
| Red used only for destructive (tap-to-remove heart) | ✅ |
| Royal Blue 50-900 + slate neutrals only | ✅ |
| Email-capture placeholder semantics per C4 | ✅ |

## Contract footprint after this cycle

`MOBILE_API_CONTRACT.md`: 1113 → 1409 lines

- **v0.4** (lines 1117-1270, 157 lines) — Session C reply to B's v1.3.0
- **v0.5** (lines 1271-~1370, ~100 lines) — Session C reply to A's v1.3.2: all 8 C-items + 4 EAs accepted; 2 deltas (amber→option-c, keep Apple "Coming soon" pill on 05); Civil ID handshake deferred to v1.4
- **v0.5.1** (lines ~1370-1409, ~40 lines) — Session C sync note to A: 7-vs-8 Coming-Soon count clarification; mobile in-flight notice (11 + 14 drawn, 06 on hold for A's `account-v2.html`)

## What's NOT in this revision (per A's v1.3.2 plan)

| Item | Why deferred |
|---|---|
| 12-order-detail.html standalone | Folded into Coming-Soon template per A's §2 (`/account/orders` is Coming Q3 2026) |
| 13-documents.html standalone | Folded into Coming-Soon template per A's §2 (`/account/documents` is Coming Q3 2026) |
| 06-account.html redo to 4-group IA | Waiting for A's `account-v2.html` joint-authority mockup |
| Apple Sign-In active button | Defer to v1.5 when iOS native ships (Apple Sign-In MUST land same release as Google per App Store §4.8) |
| Civil ID upload UX | Deferred to v1.4 alongside `v1_3_x_kyc_columns` migration; joint A↔C handshake at that time |
| `accountSecurity` channel toggle on 10f | Already locked TRUE (read-only) per B v1.3.0 §6.1 |
| Maintenance / Delivery / Document pending-actions cards | Hidden until respective subsystems ship in v1.4+ (matching A) |
| `/account/saved-searches`, `/account/reviews` as standalone screens | Folded into Coming-Soon template; only the template ships |

---

# Sprint M2+v1.3.6 — Account v2 + V1_4_ROADMAP review

**Date:** 2026-05-20
**Trigger:** Session A landed `mockups/sprint-5-account/account-v2.html` (440 lines, joint authority for 4-group hub IA) + `V1_4_ROADMAP.md` at repo root (806 lines, 11-subsystem catalogue for v1.4 through v1.7). User asks mobile to mirror A's structural authority and complete the roadmap review pass.

Mobile reply: `MOBILE_API_CONTRACT.md` v0.6 (lines 1411-1594, 184 lines).

## Files

| File | Status | Backs which surface |
|---|---|---|
| `06-account.html` | REWRITTEN (Hybrid v1 → 4-group v2) | Mirrors A's `account-v2.html` joint-authority IA; compacted for 375×844 |
| `00-index.html` | EDITED | 06 thumbnail description updated to "4-group IA per A's account-v2" |

## 06-account.html v2 rewrite

Hybrid IA (2×3 activity tile grid + grouped settings + Danger zone) from earlier `account-ia-architect` Opus pass is SUPERSEDED. Clean rewrite to A's 4-group structure compacted for mobile:

1. **Status bar** (preserved) — top 11 px reserved
2. **Sticky header** — "Account" title + EN/AR language toggle
3. **Hero card** — brand gradient + 72 px avatar + fullName + email + mobile + "Member since…"
4. **Status banner** (hidden template; renders when `status !== 'active'`) — brand-50 + "Verify email" CTA
5. **Pending-actions strip** (horizontally scrollable):
   - Card 1 — "Respond to offer · KWD 7.000 — expires in 2 days" → `09-offer.html`
   - Card 2 — "Maintenance due" (HIDDEN until v1.5 per A's v1.3.2 §5; annotated in comment)
6. **Group 1 — Profile & Settings** (2-col grid of 4 tiles):
   - Profile → `10a-edit-profile.html`
   - Addresses → `10e-addresses.html` (with "2 saved" pill)
   - Notifications → `10f-notifications.html`
   - Security → `10a-edit-profile.html#security` (placeholder; no dedicated screen yet)
7. **Group 2 — Buying** (2-col grid, 2 live + 2 Coming-Soon):
   - Favourites → `11-favorites.html` (with "8 saved" pill)
   - Saved searches → `14-coming-soon.html?feature=saved-searches` (Coming Q3 2026)
   - Inspections → `09-offer.html` (Inspections proxy; LIVE)
   - Purchase history → `14-coming-soon.html?feature=orders` (Coming Q3 2026)
8. **Group 3 — Owning** (2-col grid, ALL Coming-Soon):
   - Documents → `14-coming-soon.html?feature=documents` (Q3 2026)
   - Maintenance → `14-coming-soon.html?feature=maintenance` (Q3 2026)
   - Financing → `14-coming-soon.html?feature=financing` (Q4 2026)
   - Returns → `14-coming-soon.html?feature=returns` (Q4 2026)
9. **Group 4 — Engagement** (2-col grid, 2 Coming-Soon):
   - Reviews → `14-coming-soon.html?feature=reviews` (Q4 2026)
   - Referrals → `14-coming-soon.html?feature=referrals` (2027)
10. **Danger zone** (red-200 border, red-700 accent): Sign out · Sign out of all devices · Delete account (30-day grace)
11. **Bottom tab bar** (preserved) — 5 visible Home/Browse/Sell/Services/Account + More, Account active in brand-700

## Audit (06-account v2)

| Check | Result |
|---|---|
| Line count | 460 lines, ~18 KB |
| Banned colors (amber/yellow/gold/emerald/green Tailwind classes) | 0 hits |
| Option (c) pill class on all 8 Coming-Soon tiles | ✅ 8 hits |
| Status bar SVG preserved | ✅ lines 41-48 |
| Bottom tab bar preserved | ✅ lines 429-455, Account active in brand-700 |
| All link destinations correct | ✅ 10a, 10a#security, 10e, 10f, 11, 09, 14?feature=×8, tab-bar links |

## Contract footprint after v1.3.6

`MOBILE_API_CONTRACT.md`: 1113 → 1595 lines

- **v0.4** (lines 1117-1270, 157 lines) — Session C reply to B's v1.3.0
- **v0.5** (lines 1271-~1370, ~100 lines) — Session C reply to A's v1.3.2
- **v0.5.1** (lines ~1370-1409, ~40 lines) — Sync note to A (7-vs-8 count + mobile in-flight)
- **v0.6** (lines 1411-1594, 184 lines) — Session C reply to A's V1_4_ROADMAP.md (sprint sequencing accept, C-1..C-7 answered, per-subsystem C-day adjustments, mobile entitlement notes, Apple+iOS Week-4 buffer, lead/co-build matrix, account-v2 confirmation w/ D-COLOR resolved as option (c))

## v0.6 highlights

- Sprint sequencing **ACCEPT as-shipped**: v1.4 Push+Orders+Documents / v1.5 Apple+Maintenance+iOS / v1.6 Returns+Financing+Saved Searches / v1.7 Reviews+Referrals
- C-day adjustments: v1.4 +1d, v1.5 +1d, v1.6 +0d, v1.7 -0.5d → **net +1.5d across v1.4-v1.7**
- Apple+iOS launch: ask explicit Week-4 buffer in v1.5 for App Store rejection iteration
- Mobile-led: Apple Sign-In (#5), Maintenance (#6)
- Server-led: Push (#2 by B), Orders/KNET (#3 by B), Documents backfill (#4 by B)
- Web-led: Returns (#7), Financing (#8), Saved Searches (#9) (mobile mirrors)
- Co-build: Reviews (#10), Referrals (#11)

## D-COLOR resolved

A's `account-v2.html` `.cs-pill` class: `bg: #F1F5F9; color: #1D4ED8; border: 1px solid #BFDBFE` — **option (c)**, exactly what mobile recommended. Mobile aligned in 06-account v2 (8 Coming-Soon tiles) and 14-coming-soon (3 variants). Cross-surface parity holds.

## Still-open after this cycle

| Item | Awaiting |
|---|---|
| D-COUNT 7 vs 8 Coming-Soon shells | A's v1.3.7 explicit confirm |
| Annotation strip-before-production | A's confirm (mockup uses amber `.annot` class for dev-notes only) |
| Maintenance-due pending card hidden until v1.5 | A's confirm matches v1.3.2 §5 wording |
| Apple Sign-In Week-4 buffer | A's sprint-length decision in v1.4.0 block |
| Operational pre-v1.4 items (APNs .p8 + Firebase config + App Store Connect + TestFlight) | User action; mobile surfaces in v0.6 §5 |

## What's NOT in this revision

| Item | Why deferred |
|---|---|
| Mobile-side reservation endpoint stub UI | A's `/me/reservations` endpoint not yet shipped; pending-actions card 2 placeholder waits |
| Civil ID UX spec | Per v0.5 §6, deferred to v1.4 alongside `v1_3_x_kyc_columns` migration |
| Inspections dedicated screen | Account v2 links to `09-offer.html` as proxy; full inspections list waits on subsystem clarity |
| Security dedicated screen | Account v2 links to `10a-edit-profile.html#security` as placeholder; full Security panel is part of v1.4+ Apple Sign-In bundle |

---

# Sprint M2+sale-flow re-alignment (Phase 1 mockups)

**Date:** 2026-05-20
**Trigger:** User flagged that mobile sale flow diverged from A's locked web design + ARCHITECTURE_PHASE_4_OFFER §D1 override. Mobile catches up.

## Divergences identified

1. **Wizard step count**: web v2 sell-concierge has 3 steps (Where+When / Contact / Review); mobile had 4 (Car details / Photos / Inspection / Offer)
2. **Customer photo upload**: web doesn't collect — inspector handles at visit; mobile had `08b-sell-photos.html` (conceptually wrong)
3. **"1 round only" counter copy**: violated ARCHITECTURE_PHASE_4_OFFER §16 D1 override — counter rounds are UNLIMITED; canonical neutral copy is "BMC will review and respond within 24 hours"
4. **Counter as separate page**: per DQ1 lock, `/offer/:token/counter` is its own page; mobile inlined it
5. **Missing terminal-state mockups**: accepted / declined / expired all missing
6. **Missing inspection report viewer**: Account v2 "Inspections" tile pointed to `09-offer.html` as proxy

## Files

### Deleted (2)
- `08b-sell-photos.html` — customer photo upload step removed (inspector handles at visit per CONCIERGE data flow)
- `09-offer.html` — inline-counter version superseded by 5-state split

### Added (6 — wizard rewrite + 4 new offer-state mockups + inspection report viewer)

| File | Lines | Purpose |
|---|---|---|
| `08-sell-yourcar.html` (REWRITTEN) | 576 | 3-step wizard mirroring `sell-concierge-v2.html` — Where+When (Address + Schedule cards w/ horizontal date strip + time-window pills) / Contact (KW mobile format + privacy) / Review (Edit-back links + what-happens-next + T&Cs + bookingRef confirmation) |
| `09-offer-view.html` | 137 | Pre-decision view: Accept (brand-800) / Counter → 09b (white + border) / Decline (text-only). Footer disclaimer reads ONLY "Offer expires in 6d 14h" — no "One counter allowed" anywhere |
| `09b-offer-counter.html` | 122 | Separate counter form per DQ1. **D1-compliant**: neutral info card "BMC will review and respond within 24 hours" — ZERO "1 round" / "One counter" / "only counter" copy verified by grep |
| `09c-offer-accepted.html` | 124 | Terminal accepted: brand-700 checkmark hero + 3-step next-steps list (Pickup scheduled / Vehicle handover / Payment via Otto) + booking ref link |
| `09d-offer-declined.html` | 85 | Terminal declined: slate X hero + re-issue note + WhatsApp CTA "Contact Customer Service" |
| `09e-offer-expired.html` | 85 | Terminal expired: slate clock hero + "Request new inspection" + "Contact Customer Service" CTAs |
| `15-inspection-report.html` | 588 | 71-point breakdown × 5 categories (Exterior 92 / Mechanical 85 / Electronic 90 / Interior 88 / Test Drive 86) + overall score gauge (88/100) + photo gallery + inspector notes + customer signature confirmation states + Download PDF / Share / View offer CTAs |

### Updated (1)
- `00-index.html` — removed 08b card; updated 08 description; renamed 09 card to "09 · Offer view"; added 4 new offer-state cards (09b/c/d/e) and one inspection-report card (15) with new section divider "Sale flow · v1.4 (inspection report viewer)"

## Audit (new + rewritten files)

| Check | Result |
|---|---|
| Banned colors (amber/yellow/gold/emerald/green Tailwind classes) | 0 hits across all 7 new/rewritten files |
| D1 compliance — zero "1 round" / "One counter" / "only counter" in 09 family | ✅ verified by grep |
| D1 neutral copy "BMC will review and respond within 24 hours" in 09b | ✅ line 102 (cites ARCHITECTURE_PHASE_4_OFFER §16 D1) |
| Trust strip checks use brand-300 (NOT emerald-300 like web) | ✅ mobile customer-brand-lock strict |
| Plus Jakarta Sans + Tajawal RTL fallback | ✅ all 7 files |
| KWD 3-decimal format | ✅ `KWD 4,850.000` / `KWD 100.000` |
| VIN last-6 mask on inspection report | ✅ `··· ··· A12345` |
| Touch targets ≥ 44 px; CTAs ≥ 48 px | ✅ |

## Sprint M2 mockup totals
**19 → 23 files** (net +4 after deletions: -08b -09; +08(rewrite) +09-view +09b +09c +09d +09e +15)

## Phase 2 — RN re-implementation (running now in 3 parallel agents)

1. `rn-sell-3step-rewriter` — rewrites `apps/mobile/app/(tabs)/sell.tsx` to 3-step state machine + deletes `apps/mobile/app/sell/photos.tsx` + unregisters Stack.Screen
2. `rn-offer-states-creator` — creates 5 RN screens at `apps/mobile/app/offers/[token]/{view,counter,accepted,declined,expired}.tsx` + registers routes
3. `rn-inspection-report-creator` — creates `apps/mobile/app/inspections/[id].tsx` + `apps/mobile/app/inspection-sign/[token].tsx` (deep-link bouncer to apps/web) + updates Account v2 "Inspections" tile destination

## Contract trail

- Mobile contract: `MOBILE_API_CONTRACT.md` v0.8 appended same day flagging the alignment + D1 compliance + Account v2 Inspections rewire + inspection-sign deep-link wiring
- Mockups served at `http://localhost:8090/00-index.html` via `python -m http.server 8090` in `mockups/mobile/sprint-M2/`
