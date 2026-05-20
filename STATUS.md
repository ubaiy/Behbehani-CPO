# STATUS.md — single-page coordination snapshot

> **Read this first at the start of every session (~30 sec).** All 3 sessions
> (A=storefront, B=admin/backend, C=mobile) update their own rows at the end
> of every working block. Append-OVERWRITE (not append-only) — keep the file
> short. For detailed history, see the three append-only contracts:
> `CONCIERGE_INSPECTION_API_CONTRACT.md`, `MOBILE_API_CONTRACT.md`,
> `V1_4_ROADMAP.md`.

**Last updated:** 2026-05-20 by Session A (after v1.4.6 — coordination strategy bootstrap)
**Bootstrap convention:** see `CONVENTIONS.md` for tags + sync ritual.

---

## 🟢 Live now — customer-facing surface

| Stack | What's live | Owner |
|---|---|---|
| Web storefront (apps/web, port 4200) | Home · Browse · VDP · Sell wizard (3-step) · Sell concierge + tracker · Offer view/counter/accept/decline/expired · Sign-in modal · Sign-up modal · Inspection-sign page (token URL) · Account hub (13-tile, 4 groups) · Profile · Addresses · Notifications (3×4 grid) · Security (sessions + sign-out-all) · Documents (real, paginated, kind-filtered, signed S3 URLs) · 7 Coming-Soon shells (Saved searches / Orders / Maintenance / Financing / Returns / Reviews / Referrals) · My bookings · Saved cars | A |
| API public surface (apps/api) | /v1/public/auth/* (register, login, logout, refresh, OTP issue/verify, Google verify) · /v1/public/me/* (22+ endpoints: profile, addresses, notification-preferences, sessions, sign-out-all, inspections, saved-listings, documents v1.4) · /v1/public/offers/:token/* (4) · /v1/public/sell-bookings (3) · /v1/public/feature-waitlists · /v1/public/notifications/push-token (mobile) | B |
| Mobile native (apps/mobile, Expo SDK 52) | Home · Browse · VDP · Sign-in · Sell wizard (3-step) · 5 offer-state screens · Inspection report viewer · Inspection-sign deep-link bouncer · Account v2 hub (in flight) · Expo push SDK + token capture | C |
| Admin (apps/admin) | CPO inventory pipeline · concierge bookings review · offers admin · admin Documents UI (in flight v1.4.4) | B |

---

## 🟡 In flight per session

| Session | Sprint | Working on | ETA | Owns these files |
|---|---|---|---|---|
| **A** | v1.4.5 done | **idle** — waiting on B's Day 4 to wire `/account/orders`, or user signal for next direction | — | `apps/web/**`, `libs/shared/types/src/lib/{*.public.schemas,offer-public,offer-respond-public,document.public,push-token.public,me-*}.ts` |
| **B** | v1.4 Day 4 | Order + Payment models + Listing.status `reserved` + reservation timer cron + admin Documents UI (backend + Angular) | ~6h from 2026-05-19 | `apps/api/**` (except shared-types files A owns), `apps/admin/**`, all `prisma/*` |
| **C** | v0.8 / W2 | RN Account v2 hub coder agent + sale-flow re-alignment RN agents (3 parallel) wrapping up | ~3h from 2026-05-20 | `apps/mobile/**`, mobile mockups under `mockups/sprint-M{1,2}/` |

---

## 🚦 Blocking (cleared regularly)

| Blocker | Owner | Blocks who | Since | Notes |
|---|---|---|---|---|
| `[BLOCK-CI]` brand-lock guard fails — 45 pre-existing amber/emerald violations in `apps/web/src/app/features/{sell,vdp}/` | A | none (only blocks pre-commit hook if/when husky activates) | 2026-05-20 v1.4.6 | Surfaced when guard was wired today. Not introduced by recent work. Spawn cleanup agent when convenient. |
| `[BLOCK-HUSKY]` husky pre-commit hook can't install — repo not in git (`git init` required) | User | none (guards still runnable as `npm run guard:all`) | 2026-05-20 v1.4.6 | One-time user action. Per CLAUDE.md, agents don't run `git init` unilaterally. After `git init` + `git add -A && git commit -m "initial"` + `npx husky install`, the guards become enforcing. |

---

## 📋 Open asks (cross-session)

| Tag | Ask | Status |
|---|---|---|
| `[ASK B→A]` | _(none open)_ | |
| `[ASK A→B]` | _(none open)_ | |
| `[ASK A→C]` | _(none open)_ | |
| `[ASK C→A]` A-1 `previousPriceFils` + A-2 `PublicListingDetailSchema` | **CLOSED** in v1.4.5 §6 | ✅ |
| `[ASK C→B]` B-C-3..B-C-8 (push provider routing, schemas, KNET race, signed-URL TTL) | OPEN — B may fold into v1.4 Day 4-5 work | ⏳ |
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

- **2026-05-20 A v1.4.6** — coordination strategy bootstrap: `STATUS.md` + `CONVENTIONS.md` + dev test customer seed (`smoke@test.local`/`Smoke#2026`) + mockup-fidelity LOCKED registry (68 mockups) + 3 pre-commit guards (`scripts/guard-{brand-lock,i18n-parity,secrets}.mjs`) + mockup-diff structural script + Playwright visual-regression bootstrap (5 pages, workflow_dispatch only, baseline capture deferred)
- **2026-05-20 A v1.4.5** — account hub rebuild (mockup-fidelity) + 5 v1.4 fix agents (password meter, notifications toggle cross-talk, sub-nav consistency, my-bookings reskin, Documents page real) + 5 brand-lock fixes + Morad Yousuf Behbehani logo unified across 5 entry points + +965 alignment + C's A-1+A-2 absorbed into shared-types
- **2026-05-19 B v1.4.4** — v1.4 Day 1-3 (PushToken model + Document endpoints + NotificationService with FCM/APNs adapters + email/SMS wrappers) ~11min wall-clock
- **2026-05-20 C v0.8** — mobile sale-flow re-alignment to web v2 (3-step wizard mirror) + D1 compliance (zero "1 round" copy) + 5 offer-state screens + customer inspection-report viewer + deep-link bouncer
- **2026-05-19 A v1.3.7** — v1.3 customer-account surface Day 2+3 (5 pages + 8 Coming-Soon shells + i18n + apple disabled pill)
- **2026-05-19 B v1.4.3** — v1.4 kickoff confirmation + Day 1 head-start (cron infra + S3 doc + NotificationService skeleton)

---

## 🧪 Dev environment

### Test credentials (NODE_ENV !== 'production')
- **Customer** (signed-in surfaces): `smoke@test.local` / `Smoke#2026` (seeded via `npm run prisma:seed` — see v1.4-S2)
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
