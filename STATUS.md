# STATUS.md — single-page coordination snapshot

> **Read this first at the start of every session (~30 sec).** All 3 sessions
> (A=storefront, B=admin/backend, C=mobile) update their own rows at the end
> of every working block. Append-OVERWRITE (not append-only) — keep the file
> short. For detailed history, see the three append-only contracts:
> `CONCIERGE_INSPECTION_API_CONTRACT.md`, `MOBILE_API_CONTRACT.md`,
> `V1_4_ROADMAP.md`.

**Last updated:** 2026-05-20 by Session C (after **W2 closeout + #64 + #65 + #69 i18n Phase 2 — ALL mobile tasks done**. #64 push tap → deep-link router wired (foreground + background + cold-start). #65 Orders flow shipped (3 routes + 13 sub-components + `useOrderPolling` 3s/10s/stop hook + 409 cancel-race handler). #69 i18n Phase 2 added 4 namespaces (`offers.*` 72 keys, `inspection.*` 38 keys, `sell.*` ~69 keys, `account.*` 54 keys) via 4 parallel chunked agents → final EN: 568 / AR: 568 symmetric across 14 namespaces; locales 63 → 676 lines (10.7x). TSC clean throughout. **Mobile session has no open tasks.** Note: prior Session B "Last updated" stamp preserved in v1.5 scope context below.)
**Bootstrap convention:** see `CONVENTIONS.md` for tags + sync ritual.

---

## 🟢 Live now — customer-facing surface

| Stack | What's live | Owner |
|---|---|---|
| Web storefront (apps/web, port 4200) | Home · Browse · VDP · Sell wizard (3-step) · Sell concierge + tracker · Offer view/counter/accept/decline/expired · Sign-in modal · Sign-up modal · Inspection-sign page (token URL) · Account hub (13-tile, 4 groups) · Profile · Addresses · Notifications (3×4 grid) · Security (sessions + sign-out-all) · Documents (real, paginated, kind-filtered, signed S3 URLs) · 7 Coming-Soon shells (Saved searches / Orders / Maintenance / Financing / Returns / Reviews / Referrals) · My bookings · Saved cars | A |
| API public surface (apps/api) | /v1/public/auth/* (register, login, logout, refresh, OTP issue/verify, Google verify) · /v1/public/me/* (22+ endpoints: profile, addresses, notification-preferences, sessions, sign-out-all, inspections, saved-listings, documents v1.4) · /v1/public/offers/:token/* (4) · /v1/public/sell-bookings (3) · /v1/public/feature-waitlists · /v1/public/notifications/push-token (mobile) · /v1/public/orders (create/cancel/payment-init) · /v1/public/me/orders (list/detail) · /v1/public/payments/otto/callback (Otto webhook, HMAC-verified, mock-fallback) | B |
| Mobile native (apps/mobile, Expo SDK 52) | Home · Browse · VDP · Sign-in · Sell wizard (3-step) · 5 offer-state screens · Inspection report viewer · Inspection-sign deep-link bouncer · Account v2 hub (in flight) · Expo push SDK + token capture | C |
| Admin (apps/admin) | CPO inventory pipeline · concierge bookings review · offers admin · admin Documents UI (live — /customers/:id/documents, list+filter+upload via 3-step pre-signed S3 flow) · admin Orders queue (live — /orders list+filter, /orders/:id detail with status-update + cancel panels) | B |

---

## 🟡 In flight per session

| Session | Sprint | Working on | ETA | Owns these files |
|---|---|---|---|---|
| **A** | v1.4.9 done | **idle** — signed-in smoke walk 6/10 PASS (sign-in/hub/profile/notifications/documents/orders); 1 P1 fixed inline (addresses effect cycle → `untracked()` wrap); 3 follow-ups for v1.4.10 (notifications.dirtyHint i18n key, profile hero reshape, audit 9 other allowSignalWrites effects). Awaiting user hard-refresh + re-walk surfaces 7/8/9 OR signal for next direction. | — | `apps/web/**`, `libs/shared/types/src/lib/{*.public.schemas,offer-public,offer-respond-public,document.public,push-token.public,me-*}.ts` |
| **B** | v1.5 scope decided | **idle — v1.5 admin scope locked: KYC DEFERRED (PACI), Documents DROPPED, Payments IN SCOPE.** Payments mockup at `apps/admin/.mockups/v1.5-payment-reconciliation.html` awaiting approval. Audit fix-swarm shipped 2 HIGH; build GREEN. Awaiting `[GATE]` Otto creds (user) + Payments mockup approval before spawning Angular + backend swarm. v1.3.7 PII still 🚦 GREEN. New refs: `docs/SRS_EXTENSIONS_v1.5.md` + `apps/admin/.mockups/DESIGN-BASELINE.md`. | standby | `apps/api/**` (except `*.public.schemas.ts` A owns), `apps/admin/**`, all `prisma/**`, `libs/shared/types/src/lib/admin-*.ts` |
| **C** | All mobile tasks done → idle | **Full W2 follow-up + v1.4 mobile + i18n closure** (post-v0.13): W2 debt zeroed (#40 svg icons, #42-49 splits & wires, #62) · **#64 push tap → deep-link router** built: `src/notifications/notificationRouter.ts` (setupNotificationRouter / extractDeepLink / routeToDeepLink) + scheme guard `isValidCustomSchemeUrl` (rejects non-`behbehani-motors://` URLs) + cold-start handler via `getLastNotificationResponseAsync` in `_layout.tsx` · **#65 Orders flow** shipped (opus): 3 routes (`/orders`, `/orders/[id]`, `/orders/[id]/payment-return`) + 13 sub-components under `src/components/orders/*` + `useOrderPolling` hook (3s first 60s / 10s next 5min / stop at 6min or terminal status) + 409 cancel-race handler (`ORDER_NOT_CANCELLABLE` → alert + force-refetch) + `OrdersPublicApiClient` in data-access-mobile · **#69 i18n Phase 2** sweep via 4 parallel chunked agents (offers/inspection/sell/account namespaces) → final EN/AR 568 keys each, 14 namespaces total. Local-file growth 63 → 676 lines (10.7x). TSC clean. **Standing by** — only inbound gates are Otto creds + APNs/Firebase from user, both unlock end-to-end smoke testing of code that is already shipped. | idle | `apps/mobile/**`, mobile mockups under `mockups/sprint-M{1,2}/` |

---

## 🚦 Blocking (cleared regularly)

| Blocker | Owner | Blocks who | Since | Notes |
|---|---|---|---|---|
| ~~`[BLOCK-API]` API on :3000 returns 500 on /auth/login + 2 pending Prisma migrations~~ | ~~User~~ | ~~A's smoke walk~~ | ~~2026-05-20 v1.4.8~~ | **CLEARED 2026-05-20 v1.4.9** — user ran migrations + started API (`/v1/auth/login` works, returns JWT). Smoke walk done. |
| `[BLOCK-HUSKY]` husky pre-commit hook can't install — repo not in git (`git init` required) | User | none (guards still runnable as `npm run guard:all`) | 2026-05-20 v1.4.6 | One-time user action. Per CLAUDE.md, agents don't run `git init` unilaterally. After `git init` + `git add -A && git commit -m "initial"` + `npx husky install`, the guards become enforcing. |
| ~~`[BLOCK-CI]` brand-lock guard fails — 45 pre-existing amber/emerald violations~~ | ~~A~~ | ~~none~~ | ~~2026-05-20 v1.4.6~~ | **CLEARED 2026-05-20 v1.4.8 — 0 violations** (v1.4-A10 fixed 29 in sell+vdp; v1.4-A12 fixed remaining 16 in auth+inspection-sign+home+sell/concierge). `npm run guard:brand-lock` → ✔ exits 0. |

---

## 📋 Open asks (cross-session)

| Tag | Ask | Status |
|---|---|---|
| `[ASK B→A]` B-A-1: Add "agent ship checklist — menu wiring required" rule to CONVENTIONS.md | **CLOSED** in v1.4.8 — CONVENTIONS.md §13 "Agent ship-checklist" added with explicit menu-wiring + route-table + nav-shell-update requirements for every new feature surface. Both A and B agents are now bound by the same checklist. | ✅ |
| `[ASK A→B]` | _(none open)_ | |
| `[ASK A→C]` | _(none open)_ | |
| `[ASK C→A]` A-1 `previousPriceFils` + A-2 `PublicListingDetailSchema` | **CLOSED** in v1.4.5 §6; **WIRED in C v0.10** (ListingCard + listings-public.client + vdp.types) | ✅ |
| `[ASK C→B]` B-C-3..B-C-8 (push provider routing, schemas, Otto race, signed-URL TTL) | **CLOSED** in MOBILE v0.10-B-reply (2026-05-20). B-C-3 APNs direct confirmed · B-C-4 `[ACK-REJECT]` 9-category enum (use deep-link routing instead) · B-C-5 use `push-token.public.schemas.ts` (**WIRED in C v0.11**) · B-C-6 polling pattern (deferred to Day 5+) · B-C-7 409 confirmed (deferred to Day 8+) · B-C-8 15-min initiation TTL only | ✅ |
| `[ASK C→A]` schema-3: delete orphan `device-token.public.schemas.ts` | **CLOSED** in v1.4.8 — file deleted, barrel re-export removed, dist artifacts purged, `nx build {shared-types,web}` GREEN. | ✅ |
| `[ASK B→C]` _(none open)_ | | |

---

## 🚪 Gates (must verify before crossing)

| Gate | Verifier | Status |
|---|---|---|
| `[GATE]` v1.3 customer-account smoke walk | A (Chrome MCP + screenshots) | ✅ structural verified in v1.4.5; signed-in walk still pending test creds |
| `[GATE]` v1.4 Otto integration (sandbox creds + merchant portal config) | User → B | ⏳ pending user action |
| `[GATE]` Apple Sign-In v1.5 (Apple Developer + App Store §4.8 lead time) | User → C → A | ⏳ pending user (App Store §4.8 = 6-week lead) |
| `[GATE]` APNs `.p8` + Firebase server key for push (Day 5) | User → B | ⏳ Day 5 hard deadline |

---

## 🎯 Recently shipped (last 7 days)

- **2026-05-20 C v1.4 mobile + #69 closeout** `[SHIPPED 2026-05-20 C]` — **all mobile tasks done**: (1) **#64** push notification tap → deep-link routing wired. New `src/notifications/notificationRouter.ts` (3 exports + foreground/background listener) + scheme guard `isValidCustomSchemeUrl` in `services/deeplinks.ts` (rejects any URL not starting with `behbehani-motors://`) + cold-start handler in `_layout.tsx` via `getLastNotificationResponseAsync` with `cancelled` unmount guard. Two `useEffect` blocks added to RootLayout. (2) **#65** Orders flow shipped via opus: 3 new routes (`/orders`, `/orders/[id]`, `/orders/[id]/payment-return`), 10 sub-components under `src/components/orders/*` (StatusPill, OrderListItem, OrderListStates, OrderDetailHeader, OrderSummaryCard, PaymentSummaryCard, StatusTimeline, VehicleCard, CancelConfirmModal, OrderActionRow) + utilities (formatKwd, maskVin, formatDate, status pill style, newIdempotencyKey) + `useOrderPolling` hook with staged cadence (3s for first 60s, 10s for next 5min, stop at 6min OR terminal status) + 409 cancel-race handler (`onError` checks `axios.isAxiosError && response?.status === 409 && error.code === 'ORDER_NOT_CANCELLABLE'`, awaits refetch, shows Alert, OrderActionRow re-renders with cancellable=false). New `OrdersPublicApiClient` in `libs/data-access-mobile`, instantiated on httpClient (intercepted, auth + 401-refresh). Every file < 500 lines. (3) **#69** i18n Phase 2 sweep via **4 parallel chunked agents** (after Phase 2's initial single-agent stream-timeout): `offers.*` 72 keys (5 screens, 72 t() calls), `inspection.*` 38 keys (11 components + bouncer, 38 t() calls), `sell.*` ~69 keys (~10 components + 6 KW governorates with formal civic Arabic "محافظة العاصمة" etc. + 3 time windows), `account.*` 54 keys (8 components, 4-group hub IA). Final state: **EN 568 / AR 568 keys symmetric across 14 namespaces** (account, app, auth, browse, common, filter, home, inspection, listings, nav, offers, sell, sort, vdp). Locales 63 → 676 lines each. Arabic quality preserved (formal customer register, proper diacritics). All Phase 1 keys sacred — no regressions. **TSC clean across all 3 closeouts**. Mobile session has zero open tasks; only inbound gates are Otto sandbox creds + APNs/Firebase from user (both unlock end-to-end smoke testing of code that already exists).
- **2026-05-20 B v1.5.0-scope** `[SHIPPED 2026-05-20 B v1.5.0]` — v1.5 admin scope decisions + 3 mockups + audit fix-swarm + governance doc. Stakeholder-confirmed scope cuts: **(1) KYC review queue DEFERRED** pending PACI (Public Authority for Civil Information) integration channel selection — stakeholder pursuing direct PACI lookup to auto-populate 14 PII fields instead of manual admin review; queue reframes as exception-only fallback once PACI channel selected. **(2) Documents approval queue DROPPED from v1.5** — KYC docs PACI-sourced later + system-generated PDFs (receipt/sale_contract from v1.4.7) don't need approval; revisit in v1.6+ alongside Loan (§3.7 bank statements) or Dealer (§3.9 business licenses) modules when there is actual content to approve. **(3) Payments reconciliation IN SCOPE v1.5** — fully covered by SRS §3.21 + §6.3, Otto Payment Services as v1.4 aggregator, mock-mode until Day 5 creds. Portal-aligned mockup at `apps/admin/.mockups/v1.5-payment-reconciliation.html` (Tailwind CDN with brand palette injected, full admin shell + sidebar with Payments highlighted under Finance + topbar + 4 summary tiles + reconciliation banner + status chips + filters + 8-row payments table + detail drawer with Otto webhook timeline + refund modal with amber mock-mode warning banner). **Design baseline shipped** at `apps/admin/.mockups/DESIGN-BASELINE.md` — 15 sections of copy-pasteable Tailwind patterns extracted from actual shipped admin (orders-list, users-list, admin-shell) so future mockups visually match production. **Governance doc** at `docs/SRS_EXTENSIONS_v1.5.md` — 9 sections, 20+ SRS line citations across §1.3 / §3.7 / §3.9 / §3.12 / §3.17 / §3.21 / §4.3 / §4.4 / §6.3 / §6.4, records Extensions A+B as deferred and C as in-scope with approval ledger. **Audit fix-swarm**: 2 HIGH shipped — Customer Documents got route-level `adminRoleGuard(['super_admin','general_manager','customer_support'])` in `app.routes.ts` + `admin-auth.guard.ts` (was previously accessible to any authenticated admin); Save Draft button on `listing-edit.component.html:423` now checks `form.pristine` (was firing no-op saves). 4 MEDIUM deferred with rationale. `npx nx build admin` GREEN 17.6s. **3 open Payments-product decisions** before backend implementation: (a) partial-refund modeling — recommend negative-amount Payment row for §6.3 double-entry ledger compliance vs `refundedAmountFils` column, (b) reconciliation cadence — manual button + 15min cron (both, mockup shows both), (c) KWD partial-refund rounding — banker's rounding (round-half-even) default. **A+C impact** see CONCIERGE v1.5.0 + MOBILE v0.14 blocks.
- **2026-05-20 C #68 i18n Phase 1** `[SHIPPED 2026-05-20 C]` — large i18n sweep on the 4 customer-entry surfaces (sign-in / home / browse + filter / VDP) + shared `ListingCard`. **41 files modified, ~265 `t()` calls added across these subtotals**: auth ~54 (sign-in + 7 auth components), home ~30 (8 home components), browse + filter ~75 (browse screen + 6 browse components + FilterSheet + 9 filter pickers), VDP ~100 ([slug] + 13 vdp components), ListingCard 8. **267 new keys** across 5 new top-level namespaces (`browse.*`, `filter.*`, `home.*`, `sort.*`, `vdp.*`) plus extensions to `auth.*` (17→60 keys), `common.*` (11→17), `listings.*` (richer badge subtree). en.json + ar.json grew 63→357 lines each. **EN↔AR parity verified**: 331 leaf keys in each file, 0 missing, 0 extra (via `node -e` parity script from project root). Arabic translations are natural with proper diacritics (e.g. `مرحبًا بعودتك`, `جارٍ التحميل…`, `نسيت كلمة المرور؟`) — not transliterated. `npx tsc --noEmit -p apps/mobile/tsconfig.json` exits 0. **Phase 2 deferred to #69** (offers/inspections/sell/account screens — not blocking B's firebase work). Closes the §13.3 ship-checklist gap on the primary entry flows pre-v1.5 iOS.
- **2026-05-20 C #40 svg icons** `[SHIPPED 2026-05-20 C]` — `react-native-svg@15.8.0` installed (Expo SDK 52 compatible, version picked by `npx expo install`). Replaced placeholder text-glyph/emoji icons across three explicitly-TODO'd files: (1) **`vdp.icons.tsx`** — 15 exports rewritten as Feather-style react-native-svg icons (24x24 viewBox, stroke-width 2, round caps/joins): ShareIcon (was ↗), HeartIcon (♥/♡, filled prop preserved), PlayIcon (▶), ShieldIcon (🛡), WarrantyIcon (🔒), ReturnIcon (↩), TruckIcon (🚚), CheckIcon (✓, size/color preserved), CreditCardIcon (💳), OfferIcon ($ glyph), CalendarIcon (📅), LoanIcon (🏦), ChatIcon (💬), PhoneIcon (📞), CarSilhouette (🚗). All 15 exports keep identical names + signatures — callers across `app/listings/[slug].tsx` + 8 `vdp/*` components unaffected. (2) **`OverallScoreCard.tsx`** — 112x112 border-ring placeholder replaced with `Svg` + 2x `Circle` arc (strokeDasharray/strokeDashoffset). Track slate[200], progress brand[700] when score≥80 (CPO threshold) else brand[600]. (3) **`InspectionReportEmbed.tsx`** — 56x56 border + rotated-arc trick replaced with same `Svg` + 2x `Circle` pattern; track brand[100], progress brand[800]. Removed stale TODOs + unused gauge styles. `npx tsc --noEmit -p apps/mobile/tsconfig.json` exits 0. **Out of scope** (intentional): LanguageToggle 🇰🇼/🇬🇧 flags, SignInForm 🔒/👁, ListingCard ♥/♡, sell/account/offers/browse/home decorative emoji — those are skin choices, not placeholders.
- **2026-05-20 C W2 closeout** `[SHIPPED 2026-05-20 C]` — 5 W2 follow-up debts cleared in one pass post-v0.13: (1) **#62** `inspections/[id].tsx` split 1158→107 lines via 13 `src/components/inspections/*` components (mirrors vdp/sell pattern; VIN last-6 mask + KWD 3-decimal + RED_500-only-on-fail + ≥44px touch targets all preserved). (2) **#44** `handleSignIn` rewritten: real `AuthService.signIn({ type: 'email', ... })` call, double-submit guard via `loading` state, `router.replace('/(tabs)')` on success, error envelope parsed for `ACCOUNT_LOCKED` vs `INVALID_CREDENTIALS`. SignInForm gains `loading?: boolean` → button disabled + label swaps to "Signing in…". (3) **#43** queryClient singleton extracted to `apps/mobile/src/services/queryClient.ts` — http.ts + _layout.tsx now share the same instance, so the TOKEN_REUSED `clear()` actually evicts cache entries the UI reads (was silent no-op pre-fix). (4) **#47** canonical `ListingCard` wired in browse grid/list (replaces local `ListingCardPlaceholder` — price-drop strikethrough + favorite heart behavior consistent home↔browse). (5) **#49** `as const` typed-route cast on `ListingCard.tsx:153` normalized to `as any` matching the 8 other dynamic router.push sites. `npx tsc --noEmit -p apps/mobile/tsconfig.json` exits 0. Mobile idle pending operational gates — only #40 (svg cosmetic) + #68 (i18n sweep pre-v1.5 iOS) remain non-blocked.
- **2026-05-20 A v1.4.9** `[SHIPPED 2026-05-20 A v1.4.9]` — signed-in smoke walk: 6/10 surfaces PASS (sign-in modal w/ logo+965, hub 13-tile, profile cards + **password meter FIX confirmed live (4 bars→Strong, Update btn enabled)**, notifications **toggle cross-talk FIX confirmed live (only clicked cell flipped)**, documents real page, orders real page). **1 P1 fixed inline**: `addresses.component.ts` effect cycle (read+write `pageState` in same effect → renderer freeze) → wrapped read in `untracked()`. **1 P2**: `account.notifications.dirtyHint` i18n key missing. **1 P3**: profile hero still full-bleed vs other sub-pages rounded-card. 3 surfaces (security/my-bookings/saved-cars) deferred — re-walk after dev-server hot-reload. `nx build web` GREEN.
- **2026-05-20 B v0.13-B-reply** `[SHIPPED 2026-05-20 B v0.13-B-reply]` — parallel server-side scheme parity audit after C's v0.13 §13.3 mobile audit. Caught matching B-side bug: `order.service.ts:466` was emitting web-relative `/account/orders/${id}` for push `deepLink` instead of full `behbehani-motors://orders/${id}` mobile URL (per MOBILE_API_CONTRACT.md §4). Push routing would have failed to open order detail on tap — same blast radius as C's app.json scheme bug. Fixed; nx build api GREEN. Convention locked for future v1.4 Day 8+ push emissions. CONVENTIONS §13.2 self-audit on Days 1-7 done — only the deepLink gap found.
- **2026-05-20 C v0.13** `[SHIPPED 2026-05-20 C v0.13]` — `[ACK]` A's v0.12 (schema-3 closed via shared-types delete; OrderDTOs noted ready for task #65). §13.3 mobile audit caught 2 real bugs: (1) CRITICAL `app.json` scheme `behbehani-cpo` mismatched `behbehani-motors://*` deep-link URLs in MOBILE_API_CONTRACT §4 → push notifications would fail to route. FIXED across 5 files (app.json + deeplinks.ts code+docs + listing/[id] + inspections-public.client + ARCHITECTURE.md). Zero `behbehani-cpo://` references remain. (2) i18n EN+AR gap on recent screens (sell partial, offers/inspections 0 hits) — task #68 tracking retrospective sweep before v1.5 iOS. Mobile commits to §13.3 forward-compliance for every future agent spawn. TS clean.
- **2026-05-20 A v1.4.8** `[SHIPPED 2026-05-20 A v1.4.8]` — `/account/orders` real page wired against B's `GET /v1/public/me/orders` (replaces OrdersShellComponent; service + 374-line page with 6 states + ~30 i18n keys EN+AR symmetric). Brand-lock cleanup complete: 45 pre-existing violations across 9 files → 0 (`npm run guard:brand-lock` ✔). `[ASK C→A] schema-3` closed (orphan `device-token.public.schemas.ts` deleted + barrel cleaned + dist purged). `[ASK B→A] B-A-1` closed (CONVENTIONS.md §13 "Agent ship-checklist — menu wiring required" added). All `nx build {shared-types,web}` GREEN.
- **2026-05-20 C v0.11** `[SHIPPED 2026-05-20 C v0.11]` — `[ACK]` v0.10-B-reply (all 6 B-C asks answered). B-C-5 wired: `notifications.client.ts` now imports canonical `PushTokenInputSchema` (`.min(20).max(512)`) from `@behbehani-cpo/shared-types`; dropped inline `RegisterPushTokenSchema`. B-C-3 + B-C-8 confirmed no-op. B-C-4 (deep-link routing) + B-C-6 (Otto callback polling) + B-C-7 (409 cancel race) deferred to v1.4 mobile Day 2+ / Day 5+ / Day 8+ — tracked in tasks #64/#65 with full code patterns in v0.11 §2/§4/§5. New `[ASK C→A] schema-3` posted to delete orphan `device-token.public.schemas.ts`. TS clean.
- **2026-05-20 C v0.10** `[SHIPPED 2026-05-20 C v0.10]` — coordination spine adopted (STATUS.md row updated · tags glossary internalised · pre-emptive stub pattern accepted) · A-1 `previousPriceFils` wired in `ListingCard.tsx` (price-drop strikethrough now shows actual original price) · A-2 `PublicListingDetailDto` wired in `listings-public.client.ts` (dropped local `ListingDetail` interface · `vdp.types.ts` now aliases canonical DTO · 4 spec field renames absorbed: `photoUrls→photos[]`, `drivetrain→driveTrain`, `accidentFlag→accidentHistory`, `inspectionScore/Date/Categories→inspectionReport`). `npx tsc --noEmit -p apps/mobile/tsconfig.json` clean.
- **2026-05-20 C W2 refactor sweep (6/7 done)** `[SHIPPED 2026-05-20 C]` — 6 of 7 oversize files split: home/(tabs)/index 1009→204 (7 components + unified ListingRail) · sign-in 951→167 (8 components) · listings/[slug] 1885→240 (13 vdp/* components + types + helpers + icons) · browse 1135→280 + FilterSheet 853→245 (7 browse/* + 10 filter/* components) · account 945→270 (8 components + `expo-linear-gradient` hero) · sell 1306→215 (9 sell/* components + types + dateHelpers). `inspections/[id].tsx` (1158) refactor still in flight.
- **2026-05-20 B v1.4.7** `[SHIPPED 2026-05-20 B v1.4.7]` — v1.4.6 coordination spine adopted (STATUS.md + CONVENTIONS.md tags) + v1.4 Day 4 (Order + Payment + reservation cron + Listing.stage `reserved` was already-an-enum-value + admin Documents backend + admin Documents Angular UI at `/customers/:id/documents`) + v1.4 Day 6 (auto-receipt PDF via `pdfkit` wired into Otto callback success → Document `kind:'invoice'` + admin Orders backend 4 endpoints + admin Orders Angular UI at `/orders` + `/orders/:id`) + v1.4 Day 7 (sale_contract templated PDF via `@react-pdf/renderer` no-JSX, wired into admin updateOrderStatus `completed` → Document `kind:'sale_contract'`). All `nx build {shared-types,api,admin}` GREEN. 7 swarm agents + 1 stream-timeout fix-cycle + 1 TS narrow fix in-thread, ~31 min wall-clock total
- **2026-05-20 A v1.4.6** — coordination strategy bootstrap: `STATUS.md` + `CONVENTIONS.md` + dev test customer seed (`smoke@test.local`/`Smoke#2026`) + mockup-fidelity LOCKED registry (68 mockups) + 3 pre-commit guards (`scripts/guard-{brand-lock,i18n-parity,secrets}.mjs`) + mockup-diff structural script + Playwright visual-regression bootstrap (5 pages, workflow_dispatch only, baseline capture deferred)
- **2026-05-20 A v1.4.5** — account hub rebuild (mockup-fidelity) + 5 v1.4 fix agents (password meter, notifications toggle cross-talk, sub-nav consistency, my-bookings reskin, Documents page real) + 5 brand-lock fixes + Morad Yousuf Behbehani logo unified across 5 entry points + +965 alignment + C's A-1+A-2 absorbed into shared-types
- **2026-05-19 B v1.4.4** — v1.4 Day 1-3 (PushToken model + Document endpoints + NotificationService with FCM/APNs adapters + email/SMS wrappers) ~11min wall-clock
- **2026-05-20 C v0.8** — mobile sale-flow re-alignment to web v2 (3-step wizard mirror) + D1 compliance (zero "1 round" copy) + 5 offer-state screens + customer inspection-report viewer + deep-link bouncer
- **2026-05-19 A v1.3.7** — v1.3 customer-account surface Day 2+3 (5 pages + 8 Coming-Soon shells + i18n + apple disabled pill)
- **2026-05-19 B v1.4.3** — v1.4 kickoff confirmation + Day 1 head-start (cron infra + S3 doc + NotificationService skeleton)

---

## 🧪 Dev environment

### Test credentials (NODE_ENV !== 'production')
- **Customer** (signed-in surfaces): `smoke@test.local` / `Smoke#2026` (seeded via `npm run db:seed` — the package.json script name is `db:seed`, not `prisma:seed`)
- **Admin (CPO)**: `admin@test.local` / `Admin#2026` (existing seed)

### Local servers
- Web storefront: `npx nx serve web` → http://localhost:4200
- API: `npx nx serve api` → http://localhost:3000/v1/*
- Admin: `npx nx serve admin` → http://localhost:4201
- Mobile: `cd apps/mobile && npx expo start` (Expo Go on iOS/Android)

### Migration command
- `npm run prisma:migrate` (covers v1.3 + v1_3_feature_waitlist + v1.3.7 PII + v1.4 push-tokens + v1.4 documents + Day 4 orders-payments when shipped)

---

## 📁 Source-of-truth files (when STATUS.md is too compact)

- `CONCIERGE_INSPECTION_API_CONTRACT.md` (A↔B coordination, ~4500 lines, append-only versioned blocks)
- `MOBILE_API_CONTRACT.md` (C-side coordination, ~2000 lines, append-only)
- `V1_4_ROADMAP.md` (v1.4-v1.7 sprint planning, 11 subsystems catalogued)
- `mockups/LOCKED.md` (approved mockup registry — see v1.4-S3)
- `CONVENTIONS.md` (tag glossary + sync ritual — read this first)

---

## 🔄 Update protocol

End of every session block (~5 min):
1. Update **In flight** row for your session (working on / ETA)
2. Add anything you shipped to **Recently shipped**
3. Add/close items in **Open asks** + **Blocking**
4. Bump **Last updated** line at top
5. Commit STATUS.md changes alongside your code commit (no separate PR)

If you skip the update, the next session reading STATUS.md gets a stale picture. Treat it like a daily standup — short, current, true.
