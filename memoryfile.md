# Behbehani CPO — Work Status & Pending Tasks

> Rebuilt 2026-05-14 from README, SRS, the master plan file, and a fresh scan of the source tree.
> Source of truth for scope: [`C:\Users\UBAIY\.claude\plans\c-users-ubaiy-downloads-behbehani-cpo-p-wondrous-frog.md`](file:///C:/Users/UBAIY/.claude/plans/c-users-ubaiy-downloads-behbehani-cpo-p-wondrous-frog.md)

---

## 🟢 RESUME HERE (2026-05-18, post-pagination-and-featured)

### Build state — all green at last verification

- `npx nx build admin` ✅
- `npx nx build api` ✅ (webpack)
- `npx nx typecheck api` ✅
- **235 tests passing** across the codebase: api 142 (+5 setFeatured) · shared-utils 10 · shared-types 64 · data-access 12 · admin 7

### ⚠️ Coordination note — parallel storefront session

A parallel Claude Code session is actively working on **Sprint 3 customer storefront** (apps/web pages + `/v1/public/*` API). Do NOT touch:
- `apps/web/src/app/**` pages/routing/components
- `apps/api/src/listings/listings-public.controller.ts`
- `libs/shared/types/src/lib/listings-public.schemas.ts`
- Other `/v1/public/*` route handlers

Admin-side files (`apps/admin/**`, admin controllers, admin schemas) are this session's scope. Shared libs (`libs/shared/utils`, `libs/data-access`) — additive-only changes safe.

**🤝 Concierge inspection — joint contract:** see [CONCIERGE_INSPECTION_API_CONTRACT.md](CONCIERGE_INSPECTION_API_CONTRACT.md) at the project root. Both sessions need to honor the schema + endpoint ownership defined there. Session B (admin) drafted v0.1; session A (storefront) please review + reply by appending to that doc.

### What's shipped so far

| Phase | Status | Where |
|---|---|---|
| Sprint 0 — Scaffold | ✅ done | §"Sprint 0" below |
| Sprint 1 — Foundation (Prisma + auth + listings + RBAC + admin shell) | ✅ done | §"Sprint 1" below |
| Sprint 2 — S3 uploads + aging engine + pricing rules + pipeline tracker + reusable confirm modal | ✅ done | §"Sprint 2" below |
| Sprint 3 — Customer storefront | ⏸ **PAUSED** — 5 mockups exist under `mockups/web/sprint-3/`, no Angular code | §"Sprint 3 PAUSED" below |
| Admin pass — User/RBAC mgmt + audit log + 1-day JWT + 401 redirect + `pricing_manager` role | ✅ done 2026-05-17 | §"Admin pass" below |
| Admin: Real KPI Dashboard | ✅ done 2026-05-17 | §"Real KPI Dashboard" below |
| Brand identity (logo + favicon) | ✅ applied 2026-05-17 | §"Brand identity" below |
| Cleanup pass — role-groups + env caps + empty-PATCH UX + audit dedup + 11 file splits | ✅ done 2026-05-17 | §"Cleanup pass" below |
| Smoke-test bug fixes — specs toggles + inspection blank + S3 public-read + accident textarea | ✅ done 2026-05-17 | §"Cleanup pass" below |
| **Sprint 2.6 — Brands & Models admin module (catalog CRUD)** | ✅ done 2026-05-18 | §"Sprint 2.6" below |
| Typecheck fix — `listings-public.controller.ts` titleAr null + 3 spec files | ✅ done 2026-05-18 | §"Typecheck fix" below |
| Admin logout fix + catalog list pagination + Featured-listing feature | ✅ done 2026-05-18 | §"2026-05-18 pickup" below |
| Featured polish — list filter chip + listing-edit header toggle + dashboard KPI tile | ✅ done 2026-05-18 | §"2026-05-18 pickup" below |
| Inspection module — W1 foundation (Prisma + 71-item rubric + Zod schemas + 20 tests) | ✅ done 2026-05-18 | §"Sprint 4 Inspection" below |
| Inspection module — W2 backend (notifications + repo + service + controller + 25 specs) | ✅ done 2026-05-18 | §"Sprint 4 Inspection" below |
| Inspection module — W3 admin frontend (queue + edit/scoring + signoff + signature pad) | ✅ done 2026-05-18 | §"Sprint 4 Inspection · W3" below |
| Inspection module — W3 rebuild (mockup fidelity + dashboard-redirect bug fix, agent-delegated) | ✅ done 2026-05-18 | §"Sprint 4 Inspection · W3 rebuild" below |

### Typecheck fix (2026-05-18)

Restored green `npx nx typecheck api`. Two real type errors were hiding behind a `noEmitOnError: true` cascade — once the app build had any error, tsc skipped emitting `.d.ts` files and the spec project lit up with 20+ TS6305 errors. Fixing the two real errors made the cascade evaporate.

**Real errors fixed:**

1. **[listings-public.controller.ts:63](apps/api/src/listings/listings-public.controller.ts:63)** — `titleAr: row.titleAr` was assigning `string | null` (Prisma `Listing.titleAr` is `String?`) to a non-null DTO field. Made the public DTO field nullable to align with the admin DTO (which already typed `titleAr: string | null`) and the underlying Prisma schema. Web consumer at [public-catalog.service.ts:109](apps/web/src/app/data/public-catalog.service.ts:109) only uses `titleEn` — safe ripple. Schema change: [listings-public.schemas.ts:42](libs/shared/types/src/lib/listings-public.schemas.ts:42) `titleAr: z.string()` → `z.string().nullable()`.

2. **[catalog-admin.service.spec.ts](apps/api/src/catalog/catalog-admin.service.spec.ts)** — 7 spec call sites passed partial create DTOs without `isActive`, but the inferred output types of `BrandCreate`/`ModelCreate`/`TrimCreate` require it (Zod's `.default(true)` makes it required in `z.infer`). Per the Sprint 2.6 memory note "Frontend explicitly sends `isActive: true` on create", the spec was the lagging consumer. Added `isActive: true` to all 7 sites; renamed two test descriptions that referenced "defaulting when omitted" since the type now prevents that case.

**Note on the earlier memory note**: it described the error as `inspectionReportId` on the model + slug mismatch. By the time this session ran typecheck, the `inspectionReportId` references had already been corrected to use the `inspectionReport` relation (see file). The remaining real mismatch was `titleAr`, not `slug` — `Listing.slug` is non-null in the Prisma schema.

### 2026-05-18 pickup — what shipped this session

**1. Admin logout fix** ([admin-shell.component.ts:450](apps/admin/src/app/layout/admin-shell.component.ts:450))
- `AuthService.signOut()` cleared localStorage but never navigated, so the user stayed on the current route. Role-gated sidebar items reactively vanished (signal-driven) → user reported "side menu changes". Refresh re-ran the auth guard which then redirected.
- Fix: inject `Router`, call `router.navigateByUrl('/auth/sign-in', { replaceUrl: true })` after `auth.signOut()` completes.

**2. Catalog list pagination** — added to Brands, Body Types, Brand→Models (Listings/Users/Audit-log already had it).
- Shared types: extended `BrandListResponseSchema`/`ModelListResponseSchema`/`BodyTypeListResponseSchema` with `page`+`pageSize`. New `CatalogListQuerySchema` (page default 1, pageSize default 25, max 100) — used by the controller. [catalog.schemas.ts](libs/shared/types/src/lib/catalog.schemas.ts).
- Backend repo: `listBrands` / `listBodyTypes` / `listModelsByBrand` switched from raw array to `{ items, total }` via `prisma.$transaction([findMany skip/take, count])`. [catalog-admin.repo.ts](apps/api/src/catalog/catalog-admin.repo.ts).
- Backend service: passes through `page`+`pageSize`, returns full paginated response. [catalog-admin.service.ts](apps/api/src/catalog/catalog-admin.service.ts).
- Backend controller: swapped local `ListQuerySchema` for shared `CatalogListQuerySchema`. [catalog-admin.controller.ts](apps/api/src/catalog/catalog-admin.controller.ts).
- Data-access client: `listBrands`/`listBodyTypes`/`listModelsByBrand` now accept `page`+`pageSize`; scrub helper handles numbers.
- Admin UI: each list got a footer with Rows-per-page selector (10/25/50/100) + page-number buttons (with ellipses for >7 pages) + prev/next arrows. Filter/status changes reset to page 1. Pattern matches existing listings/users pagination footer exactly.

**3. Featured-listing feature** — backend foundation + admin row-menu toggle.
- **Prisma migration**: added `featuredAt DateTime?` to `Listing` + `@@index([featuredAt])`. Migration created and applied by the user on 2026-05-18 after a stop-API → `prisma:generate` → `prisma:migrate` → restart sequence (DLL was locked by the running API initially).
- **Shared types**: `ListingSummary.featuredAt: string | null`, new `SetFeaturedSchema` (`{ featured: boolean }`), and `featured?: boolean` filter on `ListingFilterSchema` (accepts query-string booleans).
- **Backend service**: new `setFeatured(id, featured)` — idempotent (re-featuring a featured listing preserves the original timestamp and returns `changed: false` so the controller can skip the audit emit). [listings.service.ts](apps/api/src/listings/listings.service.ts).
- **Backend repo**: `buildWhere` honors the `featured` filter via `featuredAt: { not: null }` or `featuredAt: null`. `toSummary`/`toDetail` map `featuredAt` to ISO string. [listings.repo.ts](apps/api/src/listings/listings.repo.ts).
- **Backend controller**: new `POST /v1/admin/listings/:id/featured` endpoint, gated by `LISTINGS_WRITE_ROLES`, emits `listing.feature` / `listing.unfeature` audit entries on actual change. [listings.controller.ts](apps/api/src/listings/listings.controller.ts).
- **Data-access**: `AdminListingsService.setFeatured(id, featured)` thin wrapper.
- **Admin UI**: star badge ★ next to titleEn for featured rows, plus a "Feature" / "Unfeature" menu item in the row-actions dropdown (between "Move stage" and "Archive"). Role-gated to `operations_manager, sales_agent, content_editor, general_manager`. Refetches the current page after toggle (no confirm modal — low-risk reversible action). [listing-list.component.ts](apps/admin/src/app/features/listings/list/listing-list.component.ts).
- **Tests**: 5 new specs in `listings.service.spec.ts` covering feature/unfeature, both idempotent no-ops, and 404. Added `featuredAt: null` to the `buildRow` fixture.
- **NOT shipped this session** (in parallel session's scope): public `/v1/public/listings/featured` ordering by `featuredAt` and the web mock swap. The parallel session can pick up the new field naturally; `ListingSummary` (admin) and the public summary remain separate types.

**Featured polish (3 follow-up items, same session)**:
- **Filter chip on listings list** — tri-state (All / Featured / Not featured) in the body-type chip row. URL-synced via `featured=true|false` query param. Wired through `ListingFilterSchema.featured` (already accepts query-string booleans). [listing-filters.component.ts](apps/admin/src/app/features/listings/list/listing-filters.component.ts), [listing-list.component.ts](apps/admin/src/app/features/listings/list/listing-list.component.ts).
- **Header toggle on listing-edit page** — Feature/Unfeature button in the title row, role-gated to `LISTINGS_WRITE_ROLES`. Updates `listingDetail` signal in place so the star icon + status chip refresh without a reload. No confirm modal (low-risk reversible). [listing-edit.component.html](apps/admin/src/app/features/listings/edit/listing-edit.component.html), [listing-edit.component.ts](apps/admin/src/app/features/listings/edit/listing-edit.component.ts).
- **Featured KPI tile on dashboard** — added `featuredListings: DashboardKpiTileSchema` to `topKpis` (5 tiles total, grid widened from `lg:grid-cols-4` to `lg:grid-cols-5`). New `getFeaturedListingsCount` repo. Tile is clickable → routes to `/inventory/listings?featured=true`. New spec covers the tile value + caption. [dashboard.schemas.ts](libs/shared/types/src/lib/dashboard.schemas.ts), [dashboard.repo.ts](apps/api/src/dashboard/dashboard.repo.ts), [dashboard.service.ts](apps/api/src/dashboard/dashboard.service.ts), [dashboard.component.html](apps/admin/src/app/features/dashboard/dashboard.component.html).

### What's NEXT

**Inspection module status (post W2):**

- ✅ W1 (Prisma + 71-item rubric + Zod schemas + 20 tests)
- ✅ W2 (notifications service stub + inspections repo/service/controller + 25 service specs)
- ⏳ **User to apply Prisma migration** — stop API → `npm run prisma:migrate` (name: `add_inspection_concierge_signature_fields`) → restart. New columns: `bookingRef`, `customerPreferredDate`, `customerPreferredWindow`, `customerNotes`, `customerDeclaredJson`, `customerSignTokenLastSentAt`, kind/status/signature-method/preferred-window enums.
- ⏳ **Session A's parallel work** — they're scaffolding `apps/web` Sell-Concierge wizard + `/inspection-sign/:token` page. Schema deltas they requested are landed (v0.3 in contract). They can now wire public controllers calling into the `public-shared` functions in `inspections.service.ts`.
- ⏸ **W3 (admin frontend)** — admin queue page + edit form + sign-off page. Tablet-responsive + camera-capture on photo upload. NEXT.

**Parallel options while waiting:**

1. **Maintenance Pickup admin** (Sprint 8 admin side, mockups-first under `mockups/admin/sprint-8-maintenance/`). Scope: maintenance_coordinator views — incoming work orders, schedule physical pickup, cost-estimate composer + customer approval state machine (FR-MNT-001..010).
2. **Reservations + Holds admin** (Sprint 5 backend, storefront-create stub TBD until Sprint 3 resumes).
3. **Smaller polish picks** — Featured filter chip already exists; could add a "Featured" badge on listing-detail public view (storefront's scope, skip), or implement the "Re-inspect" flow on the listing-edit Inspection tab (mockup 04 has a button but it's stubbed).
4. **Something else** — user's call.

### How to run locally (smoke-test before/after any change)

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d redis minio   # MinIO + Redis only
npm run db:seed       # picks up the pricing_manager seed user too
npm run serve:api     # http://localhost:3333
npm run serve:admin   # http://localhost:4201
# Web (Sprint 3 paused — only sign-in form + home placeholder render):
# npm run serve:web   # http://localhost:4200
```

**Postgres runs natively on Windows port 5433** (NOT the docker-compose 5432). `.env` already points to 5433. Only MinIO + Redis come from docker.

**Demo accounts (after `db:seed`):**
- `admin@behbehani-cpo.com` / `Admin!Pass8` — super_admin (sees everything)
- `pricing@behbehani-cpo.com` / `Pricing!Pass8` — finance_officer + pricing_manager (NEW Admin pass)
- `ops@behbehani-cpo.com` / `Ops!Pass8` — operations_manager + sales_agent
- `demo@behbehani-cpo.com` / `Demo!Pass8` — customer (not for admin)

### Locked design rules (apply to EVERY new page)

1. **White + blue palette only** — custom `brand-*` Tailwind config block (see `mockups/admin/sprint-1/02-shell.html`). **No amber/yellow/gold/emerald/green** — use red-50/red-700 for warnings, slate-100/slate-600 for neutral/placeholder, brand-* for everything else.
2. **Role-gated UI is HIDDEN** (not disabled). Use `*adminRole="['role1','role2']"`. `super_admin` is implicit via the middleware bypass — don't list it.
3. **Mockups FIRST** under `mockups/admin/sprint-X-name/` (or `mockups/web/sprint-X/`). User approves before any Angular code is written.
4. **KWD 3 decimals** everywhere money shows. Money stored as **fils BigInt** server-side, transported as **string** in JSON DTOs, parsed via `Number(str)/1000` on the frontend (safe up to ~9 quadrillion KWD).
5. **Percentages as basis points Int** (`-200` = `-2.00%`).
6. **VIN masking on customer-facing surfaces** (last 6 only). Admin sees full VIN. `costFils` is admin-only — never in public DTO.
7. **Stage transitions** ALWAYS go through `StageTransitionModalComponent`. Sensitive actions (archive, lock, delete) go through shared `ConfirmModalService` (host mounted in admin shell).
8. **NG0203 trap**: `toObservable(signal)` must be called in injection context. Either field-initialize OR pass `{ injector: this.injector }` (inject `Injector` as a class field).
9. **Logical Tailwind props** in any UI destined for AR/RTL (`ps/pe/ms/me`, `text-start/end`). Sprint 3 mockups prove the storefront flips with only `<html dir="rtl">` + Tajawal font + one `rotate-180` on directional SVG chevrons.

### Active architectural decisions

- **Single-agent or fan-out implementation pattern** per CLAUDE.md: spawn parallel agents in ONE message with `run_in_background: true`. Then wait for completion notifications, don't poll.
- **4-wave standard** for any non-trivial module: W1 foundation (types + infra) → W2 backend → W3 frontend → W4 QA (tester + reviewer).
- **Reviewer punch-list cycle**: spawn reviewer agent → consolidate findings into Critical/Notable/Carry-over → apply criticals immediately → document carry-overs in memory file.
- **Test count growth as a health signal**: every module's QA wave nets +30-80 specs. Total trajectory: 0 → 59 (Sprint 2) → 128 (admin pass) → 205 (dashboard).

---

## Project at a glance

- **Product**: Certified pre-owned vehicle e-commerce platform for Kuwait (operator-owned inventory only — not a marketplace).
- **Phase 1 scope**: B2C web + Admin back office. Phase 2 (Dealer auction portal, mobile apps) is deferred.
- **Stack**: Nx monorepo · Angular 21 (SSR web + admin SPA) · Node 22 + Express 4 (TypeScript) · PostgreSQL 16 · Redis · S3-compatible storage · Hosting on AWS `me-south-1`.
- **Languages**: EN + AR with full RTL, locale-prefixed URLs (`/en/...`, `/ar/...`).
- **Doc precedence**: Checklist (`Behbehani_CPO.pdf`) authoritative; SRS refines only.
- **Repo**: Not yet initialised as git (`git init` pending).

---

## ✅ Sprint 0 — Scaffold (COMPLETE)

### Monorepo
- Nx 22.7 workspace with workspaces `apps/*`, `libs/shared/*`, `libs/domain/*`, `libs/data-access`.
- Apps present: [`apps/api`](apps/api), [`apps/web`](apps/web), [`apps/admin`](apps/admin), `apps/api-e2e`, `apps/web-e2e`.
- Libs present: [`libs/shared/types`](libs/shared/types), [`libs/shared/i18n`](libs/shared/i18n), [`libs/shared/utils`](libs/shared/utils), [`libs/shared/ui`](libs/shared/ui), [`libs/data-access`](libs/data-access).
- Build/lint/test/typecheck via Nx targets; Jest + Playwright + ESLint + Prettier wired.

### API ([`apps/api`](apps/api/src))
- Express bootstrap in [app.ts](apps/api/src/app.ts) with `helmet`, `cors`, `compression`, `cookie-parser`, `pino-http`, `express-rate-limit`.
- `GET /health` and `/v1/auth/*` mounted; structured error handler.
- Env validated by Zod in [config/env.ts](apps/api/src/config/env.ts) (PORT, JWT secrets/TTLs, DATABASE_URL, REDIS_URL, CORS_ORIGINS). `.env.example` committed.
- **Auth (FR-AUTH-001..007 partial)**:
  - JWT 15-min access + 30-day refresh ([jwt.ts](apps/api/src/auth/jwt.ts)).
  - bcrypt(12) password hashing; 5-failure lockout for 10 min ([users.repo.ts](apps/api/src/auth/users.repo.ts)).
  - **In-memory user store** with seeded demo user (`demo@behbehani-cpo.com` / `Demo!Pass8`). Replaced by Prisma + Postgres in Sprint 1.
  - Routes: `POST /v1/auth/register`, `POST /v1/auth/login` (email **or** mobile), `POST /v1/auth/refresh`, `GET /v1/me`.
  - Zod-validated DTOs from `@behbehani-cpo/shared-types`; Kuwait mobile regex `^(?:\+?965)?[569]\d{7}$`.
  - **Stubs** (501/202): `POST /v1/auth/otp/request`, `POST /v1/auth/otp/verify`, `GET /v1/auth/google`, `GET /v1/auth/apple`.
- Middleware: [`requireAuth`](apps/api/src/middleware/auth.ts), `requireRole(...)`, `validateBody`, `generalLimiter` + `authLimiter`, structured error handler.

### Web ([`apps/web`](apps/web/src))
- Angular 21 standalone + SSR + client hydration with event replay.
- Locale-prefixed routes `/:locale/...` guarded by `localeGuard` ([app.routes.ts](apps/web/src/app/app.routes.ts)).
- Features scaffolded: [Home](apps/web/src/app/features/home/home.component.ts), [Sign-In](apps/web/src/app/features/auth/sign-in.component.ts) (reactive form, Google/Apple buttons are stubs).
- `ShellComponent` layout, Tailwind 3, `@ngx-translate` loading from `apps/web/public/assets/i18n/{en,ar}.json`.
- Dev proxy from `/api/*` → API on `:3333`.

### Admin ([`apps/admin`](apps/admin/src))
- Angular 21 SPA shell with stub `DashboardComponent`. RBAC + real screens land Sprint 1–2.

### Shared libraries
- [`libs/shared/types`](libs/shared/types/src/lib/auth.schemas.ts) — Zod auth schemas + inferred TS types.
- [`libs/shared/i18n`](libs/shared/i18n/src/lib) — `provideI18n()`, `LanguageService`, `localeGuard`, locale constants. RTL flip ready.
- [`libs/shared/utils`](libs/shared/utils/src/lib) — `kwd.ts` (3-decimal formatter), `date.ts` (DD/MM/YYYY).
- [`libs/shared/ui`](libs/shared/ui/src/lib) — placeholder component only.
- [`libs/data-access`](libs/data-access/src/lib) — `AuthService` (signals + localStorage persistence), `auth.guard`, `auth.interceptor`, `API_CONFIG` token, `provideDataAccess({ baseUrl })`.

### Infra & tooling
- [`infrastructure/docker/docker-compose.yml`](infrastructure/docker/docker-compose.yml) — local Postgres 16, Redis 7, MinIO, MailHog with healthchecks.
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — Nx-affected `lint test build typecheck e2e-ci`, distributed on Nx Cloud (will need `NX_CLOUD_ACCESS_TOKEN`).
- `.env.example`, `.gitignore`, `.prettierrc`, `eslint.config.mjs`, `tsconfig.base.json` all in place.

---

---

## ✅ Sprint 1 — Foundation half (CODE COMPLETE, RUNNING LOCALLY)

Scope agreed: **Foundation half** of plan §"Sprints 1–2". S3 uploads, full pipeline-tracker UI, and the aging-discount engine roll into Sprint 2.

### Backend ✅
| Area | Files |
|---|---|
| Prisma schema (Sprint 1 entities) | [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma) — User+`AdminRole[]`, AuditLog, Brand/Model/Trim/BodyType, Listing (10-stage pipeline), ListingPhoto/Video, PriceHistory, InspectionReport skeleton |
| Seed (15 brands, 50+ models, 8 body types, demo users) | [apps/api/prisma/seed.ts](apps/api/prisma/seed.ts) |
| Prisma client + graceful shutdown | [apps/api/src/db/prisma.ts](apps/api/src/db/prisma.ts), [main.ts](apps/api/src/main.ts) |
| Users repo Prisma-backed; lockout still 5/10min | [apps/api/src/auth/users.repo.ts](apps/api/src/auth/users.repo.ts) |
| Auth async; admin roles in JWT payload | [auth.service.ts](apps/api/src/auth/auth.service.ts), [auth.controller.ts](apps/api/src/auth/auth.controller.ts), [jwt.ts](apps/api/src/auth/jwt.ts) |
| 12 admin sub-roles + labels | [libs/shared/types/src/lib/roles.ts](libs/shared/types/src/lib/roles.ts) |
| `requireAdminRole` (super_admin bypass) | [middleware/auth.ts](apps/api/src/middleware/auth.ts) |
| Audit log middleware (`auditMutation`, `recordAudit`) | [middleware/audit.ts](apps/api/src/middleware/audit.ts) |
| Listings Zod DTOs + filter + VIN regex + stage enum + maskVin | [libs/shared/types/src/lib/listings.schemas.ts](libs/shared/types/src/lib/listings.schemas.ts) |
| Listings repo/service/controller + 10-stage transition guard + price history | [apps/api/src/listings/](apps/api/src/listings) |
| Catalog `/v1/catalog/brands\|brands/:id/models\|body-types` | [apps/api/src/catalog/catalog.controller.ts](apps/api/src/catalog/catalog.controller.ts) |
| Routes mounted | [apps/api/src/app.ts](apps/api/src/app.ts) |

Endpoints under `/v1/admin/listings`:
- `GET /` — paginated list (filters via Zod-validated query)
- `GET /:id` — full detail (admin sees full VIN; customer DTO later sprints will mask)
- `POST /` — create (always starts in `acquired` — never `listed`)
- `PATCH /:id` — partial update (never accepts `stage`; use the stage endpoint)
- `POST /:id/stage` — pipeline transition with server-side allowed-transition matrix
- `DELETE /:id` — soft archive (sets `deletedAt`)

### Admin frontend ✅ (English-only, white+blue, RBAC-aware)

| Area | Files |
|---|---|
| App shell + routes + i18n strip + animations | [apps/admin/src/app/app.config.ts](apps/admin/src/app/app.config.ts), [app.ts](apps/admin/src/app/app.ts), [app.routes.ts](apps/admin/src/app/app.routes.ts) |
| Auth guard + RBAC structural directive `*adminRole` (reactive via `effect()`) | [core/admin-auth.guard.ts](apps/admin/src/app/core/admin-auth.guard.ts), [core/admin-role.directive.ts](apps/admin/src/app/core/admin-role.directive.ts) |
| Stage label/chip + aging chip utils (20d blue / 45d red) | [core/listing-stage.util.ts](apps/admin/src/app/core/listing-stage.util.ts) |
| Sidebar+topbar layout, RBAC-gated nav, env badge (blue Staging / red Production swap noted) | [layout/admin-shell.component.ts](apps/admin/src/app/layout/admin-shell.component.ts) |
| Dashboard with 4 KPI cards (real data lands Sprint 11) | [features/dashboard/dashboard.component.ts](apps/admin/src/app/features/dashboard/dashboard.component.ts) |
| Admin sign-in (a11y, non-admin sign-out guard) | [features/auth/sign-in.component.ts](apps/admin/src/app/features/auth/sign-in.component.ts) |
| Vehicle list (debounced search, URL-synced filters, KWD↔fils, RBAC-gated row actions) | [features/listings/list/listing-list.component.ts](apps/admin/src/app/features/listings/list/listing-list.component.ts), [listing-filters.component.ts](apps/admin/src/app/features/listings/list/listing-filters.component.ts) |
| Vehicle edit + stage modal (Save Draft NEVER publishes, Publish→stage modal chain) | [features/listings/edit/listing-edit.component.ts](apps/admin/src/app/features/listings/edit/listing-edit.component.ts), [stage-transition-modal.component.ts](apps/admin/src/app/features/listings/edit/stage-transition-modal.component.ts) |
| Admin HTTP services | [libs/data-access/src/lib/admin-listings.service.ts](libs/data-access/src/lib/admin-listings.service.ts), [admin-catalog.service.ts](libs/data-access/src/lib/admin-catalog.service.ts) |
| Mockups (white+blue final, hide role-gated, stage modal + Save Draft caption documented) | [mockups/admin/sprint-1/](mockups/admin/sprint-1) |

### Locked design rules (apply to all future admin pages)

1. White + blue palette only (no amber/yellow/gold).
2. Role-gated nav items are hidden (no lock icons / disabled rows).
3. **Save Draft must never publish** — server defaults new listings to `acquired`, `PATCH` never accepts `stage`. Only `POST /:id/stage` with explicit `'listed'` makes a car public.
4. Stage transitions require a confirmation modal (`StageTransitionModalComponent`).
5. Aging chips: 20d → blue tint, 45d → red tint.

### Local environment (this dev machine — 2026-05-14)

- **No Docker.** User runs **Postgres 18 natively on Windows, port 5433** (not the docker-compose default 5432). `.env` `DATABASE_URL` reflects this.
- Database user `cpo` / password `cpo` was created in pgAdmin with these SQL statements (against `postgres` then against `cpo`):
  ```sql
  -- in postgres DB:
  CREATE ROLE cpo WITH LOGIN CREATEDB PASSWORD 'cpo';
  ALTER DATABASE cpo OWNER TO cpo;
  GRANT ALL PRIVILEGES ON DATABASE cpo TO cpo;
  -- in cpo DB (PG 15+ schema lockdown):
  ALTER SCHEMA public OWNER TO cpo;
  GRANT ALL ON SCHEMA public TO cpo;
  ```
- `.env` is present at project root (gitignored). `.env.example` still shows the docker-compose port 5432; **don't** copy it blindly — adjust to 5433 on this machine.
- Docker Desktop will be needed for **Sprint 2** (MinIO for S3 presigned uploads). When Docker comes online, keep `.env` pointing at native Postgres on 5433; only Redis/MinIO/MailHog run via docker-compose.

### Run (verified working)

```bash
npm install
npm run prisma:migrate -- --name init    # creates init migration + applies
npm run db:seed                          # 15 brands, 50+ models, 8 body types, 3 demo users
npm run serve:api                        # http://localhost:3333 — currently UP
npm run serve:admin                      # http://localhost:4201 — currently UP after patches below
```

Demo logins after seed:
- Customer: `demo@behbehani-cpo.com` / `Demo!Pass8`
- Super admin: `admin@behbehani-cpo.com` / `Admin!Pass8`
- Ops + Sales (operations_manager + sales_agent): `ops@behbehani-cpo.com` / `Ops!Pass8`

### Patches applied during local smoke-test (post-agent code)

These six fixes landed on top of the parallel-team output. The next session inherits the patched state — don't redo any of them:

1. **`db:seed` runner**: was `ts-node --transpile-only ...` which failed with `ERR_UNKNOWN_FILE_EXTENSION` because tsconfig emits ESM. Switched to `node -r @swc-node/register apps/api/prisma/seed.ts` in [package.json](package.json).
2. **bcrypt import in seed**: was `import bcrypt from 'bcrypt'` which evaluated to `undefined` under SWC register (no `esModuleInterop` injection). Now `import * as bcrypt from 'bcrypt'` in [apps/api/prisma/seed.ts](apps/api/prisma/seed.ts).
3. **Edit component HTTP layer**: edit agent had rolled its own `inject(HttpClient) + inject(API_CONFIG)` with 4 functional bugs (wrong catalog/archive endpoints, missing `{items:[]}` envelope unwrap, masked-VIN in form). Refactored to use `AdminListingsService` + `AdminCatalogService` per the foundation contract. Models load lazily on brand change.
4. **`ListingDetail.vin`**: added a full unmasked `vin: string` field to the admin DTO ([listings.schemas.ts](libs/shared/types/src/lib/listings.schemas.ts)) and populated it in [listings.service.ts](apps/api/src/listings/listings.service.ts) `toDetail`. Customer-facing DTO (later sprints) will mask. Edit form patches from `d.vin`, list table still uses `d.vinMasked`.
5. **Template `as any` cast**: Angular template parser rejects `setTab(tab.id as any)`. Now `setTab($any(tab.id))` in [listing-edit.component.html](apps/admin/src/app/features/listings/edit/listing-edit.component.html).
6. **`logoUrl` type**: catalog service returns `string | null`, two local Brand interfaces had it as `string`. Fixed in [listing-list.component.ts](apps/admin/src/app/features/listings/list/listing-list.component.ts) and [listing-filters.component.ts](apps/admin/src/app/features/listings/list/listing-filters.component.ts).
7. **`provideAnimations()` removed**: foundation added it but the `@angular/animations` peer package isn't installed. The stage modal uses a native `<dialog>` and doesn't need it. Removed from [app.config.ts](apps/admin/src/app/app.config.ts); a note in the file explains how to add it back when needed.

### Sprint 1 remaining

- [x] First specs landed in Sprint 2 — see "Sprint 2 ✅ Testing" below (`listings.service` stage matrix, `users.repo` lockout, `AdminRoleDirective` reactivity, etc.). 59 tests passing.
- [ ] Smoke-test the full admin flow in the browser end-to-end (carry-over — user will run during Sprint 2 UI smoke).
- [ ] Address the CJS→ESM warning: `libs/shared/types/dist/index.js` is built as ESM, the API loads it via `require()`. Either add `"type": "module"` to the API or set the lib's `package.json` `exports` to dual-publish. Harmless until Node makes it an error.
- [ ] "Verify VIN" button on edit form is visual-only — deferred (no VIN-decoder partner agreed yet).

---

## ✅ Sprint 2 — Inventory + Admin shell (second half) (CODE COMPLETE 2026-05-15)

11 agents across 4 waves. Mockups under [mockups/admin/sprint-2/](mockups/admin/sprint-2/) (5 files) approved before any code was written, per the design-html-first feedback memory.

### Backend ✅

| Area | Files |
|---|---|
| Prisma migration `20260515085721_sprint_2_media_pricing_aging` | new models: `Listing360`, `PricingTier`, `AgingEngineRun`, `AppliedDiscount`, enum `AgingRunStatus`; extended `ListingPhoto` + `ListingVideo` with `bytes`, `mimeType`, `width/height`, `uploadStatus`, `uploadedById` |
| Env additions (Zod-validated) | `apps/api/src/config/env.ts` — S3 (endpoint/bucket/keys/TTL/path-style), `MAX_PHOTO_BYTES`/`MAX_360_BYTES`/`MAX_VIDEO_BYTES`, `AGING_ENGINE_CRON`/`_TZ`/`_ENABLED` |
| Infra helpers | [apps/api/src/lib/s3.ts](apps/api/src/lib/s3.ts) (`s3Client`, `presignPutUrl`, `publicUrl`, `ensureBucket` idempotent on boot), [redis.ts](apps/api/src/lib/redis.ts) (ioredis singleton + graceful shutdown), [queues.ts](apps/api/src/lib/queues.ts) (`agingQueue`, `makeAgingWorker`, `closeQueues`) |
| Media module | [apps/api/src/media/](apps/api/src/media) — 15 endpoints under `/v1/admin/listings/:listingId/media/{photos,media-360,video}/*` (presign + confirm + reorder + setPrimary + delete; one-primary invariant in transaction; presign reserves a DB row in `uploadStatus=pending`) |
| Pricing module | [apps/api/src/pricing/](apps/api/src/pricing) — CRUD on `/v1/admin/pricing-tiers` + `POST /preview` (returns qualifying-listing count + total reduction in fils-string). Write roles: `super_admin` (implicit) + `finance_officer`. |
| Aging engine | [apps/api/src/aging/](apps/api/src/aging) — `runEngine(triggeredById, dryRun)` picks highest-qualifying tier, idempotency check (skip if same tier already applied + not reverted), per-listing transactions, dry-run via intentional rollback. BullMQ scheduler registers `nightly` repeatable at `AGING_ENGINE_CRON` (default `0 2 * * *` `Asia/Kuwait`). Worker rejects non-`nightly` job names defensively. |
| Aging endpoints | `GET /v1/admin/aging/{status,runs,active-discounts,distribution}` (READ: super_admin, general_manager, operations_manager, finance_officer); `POST /v1/admin/aging/{run-now,pause}` (WRITE: super_admin, finance_officer). `runNow` is synchronous (no queue.add), `dryRun` honored. |
| Boot wiring | [apps/api/src/main.ts](apps/api/src/main.ts) — `ensureBucket()` → `startAgingScheduler()` → server.listen(); shutdown calls `closeQueues()` + `disconnectRedis()` + `prisma.$disconnect()`. |
| Routers mounted in app.ts | `/v1/admin/listings` (existing + media nested), `/v1/admin/pricing-tiers`, `/v1/admin/aging` |

### Frontend ✅

| Area | Files |
|---|---|
| Pipeline board | [apps/admin/src/app/features/listings/pipeline/](apps/admin/src/app/features/listings/pipeline) — kanban over the 10-stage enum, HTML5 native drag-drop, drop opens existing `StageTransitionModalComponent`. Loads up to 200 listings with a "showing 200 of N" banner if more. Nav item gated by listings READ_ROLES. |
| Media gallery on edit page | [apps/admin/src/app/features/listings/edit/media/](apps/admin/src/app/features/listings/edit/media) — 3 sub-tabs (Photos / 360° / Video). Direct-to-S3 PUT via `HttpClient` with `reportProgress: true`. Image dimensions read in parallel with upload. Auth interceptor skips Bearer on non-API URLs. Tab hidden for unsaved drafts. |
| Pricing rules page | [apps/admin/src/app/features/pricing-rules/](apps/admin/src/app/features/pricing-rules) at `/settings/pricing-rules` — tier table + side drawer with debounced preview-impact. |
| Aging overview page | [apps/admin/src/app/features/reports/aging-overview.component.ts](apps/admin/src/app/features/reports/aging-overview.component.ts) at `/reports/inventory-aging` — engine status banner, 4 KPI cards, CSS distribution chart, active-discounts table (filterable, paginated), run history. Reports nav GROUP wrapped in `*adminRole`. |
| Shared confirm modal | [libs/shared/ui/src/lib/confirm-modal/](libs/shared/ui/src/lib/confirm-modal) — `ConfirmModalService.open({...})` returns `Promise<boolean>`. Native `<dialog>`, 3 variants (standard/destructive/severe), optional `requireTyped`, optional async `onConfirm` for loading state. Host `<sui-confirm-modal-host />` mounted in admin shell. 7 `window.confirm` call sites replaced (archive listing on list + edit, plus 5 media-gallery deletes/replaces). |
| Services | [libs/data-access/src/lib/](libs/data-access/src/lib) — `admin-media.service.ts` (14 methods + `uploadToS3()` progress stream), `admin-pricing.service.ts`, `admin-aging.service.ts`. Auth interceptor guard: `if (!req.url.startsWith(config.baseUrl)) return next(req);` |
| Shared Zod schemas | [libs/shared/types/src/lib/](libs/shared/types/src/lib) — `media.schemas.ts`, `pricing.schemas.ts`, `aging.schemas.ts`. Money in **fils as string** (BigInt → string in JSON), percentages as **basis points Int**. |

### Testing ✅ (first real specs in this codebase)

59 tests across 6 files, **all passing on `nx test api` + `nx test admin`** in ~9s combined:

| Spec | Coverage |
|---|---|
| `apps/api/src/listings/listings.service.spec.ts` | 24 cases — stage-transition matrix + `listedAt`/`reservedAt`/`soldAt` side effects + 404/422 errors |
| `apps/api/src/auth/users.repo.spec.ts` | 5-strike lockout window, reset on success, fake-timer based expiry |
| `apps/api/src/aging/aging.engine.spec.ts` | Paused state, highest-tier pick, stage filter, autoApply filter, idempotency, dry-run rollback |
| `apps/api/src/pricing/pricing.service.spec.ts` | Preview-impact math, stage/autoApply filtering, sample cap of 5, abs(bps) |
| `apps/api/src/media/media.service.spec.ts` | `setPrimaryPhoto` one-primary invariant, `reorderPhotoList` foreign-id rejection + sortOrder mapping |
| `apps/admin/src/app/core/admin-role.directive.spec.ts` | Null user, missing role, matching role, `super_admin` bypass, sign-in/sign-out reactivity |

The pre-existing `tsconfig.spec.json moduleResolution: node10` worry turned out to be a non-issue for `ts-jest` + `jest-preset-angular` (they resolve via Node runtime, not bundler). No config changes were needed.

### Wave 4 review punch list — fixed in place

| ID | Issue | Fix |
|---|---|---|
| C1 | `triggerRunNow` enqueued a BullMQ `run-now` job AND called `runEngine` synchronously; the worker ignored `job.data`, so `dryRun=true` from the queued path actually applied real discounts. | Dropped `agingQueue.add('run-now', ...)`; sync call only. Worker now ignores non-`nightly` job names. |
| C3 | "Pipeline" + "Inventory Aging" nav items rendered for every authenticated admin, including roles that 403 on click. | Pipeline wrapped in `*adminRole` (listings READ roles); Reports group wrapped (aging read roles). |
| C4 | Duplicate dead-link "Pricing Rules" entry in Inventory group (`routerLink="."`). | Deleted; Settings group keeps the real one. |
| C2 | `aging.repo` q-search did unbounded `contains` on `vin` — fingerprinting / perf risk. | Added `q.length ≥ 3` guard; VIN match changed to `endsWith` (matches the last-6 we show in the UI). |
| N1 | Days-on-lot filter applied post-DB → inconsistent `total` + paging. | Pushed `daysMin`/`daysMax` into SQL via `listedAt` cutoffs. |
| N2 | `confirmVideoUpload` trusted caller-supplied `posterS3Key` (key forgery). | Now must start with `listings/{listingId}/video/` or 422. |

### Sprint 2 carry-overs (defer, document, don't fix now)

| ID | Where | Action |
|---|---|---|
| N3 | 6 files exceed the 500-line cap: `aging-overview.component.ts` (920), `listing-edit.component.html` (745), `media-gallery.component.ts` (673), `media-gallery.component.html` (588), `listing-edit.component.ts` (524), `pricing-rules.component.html` (502). | Split into sub-components in a future refactor pass. Not blocking. |
| N4 | `MAX_PHOTO_BYTES` etc. exposed in env but `media.schemas.ts` hardcodes `10_485_760` / `262_144_000` / `104_857_600`. Env changes have no effect. | Move size checks from schema refines to service-layer guards using `env.*`. |
| N5 | `JWT_ACCESS_SECRET` has a dev fallback in `env.ts`. If `NODE_ENV=production` is set with the var missing, the app boots with a public secret. Pre-existing. | Add a Zod `.refine` requiring non-default secrets when `NODE_ENV==='production'`. |
| D1 | `pricing.repo` does an N+1 `findUnique` per tier to populate `updatedByName` because `PricingTier.updatedBy` has no Prisma relation. Fine for ≤20 tiers. | Add an explicit relation in a future migration, then `include: { updatedBy: { select: { fullName: true } } }`. |
| D2 | `aging.scheduler` re-registers the repeatable job on every boot. BullMQ dedupes by `(name, pattern, tz, endDate)` so it doesn't multiply, but worth tightening. | Add an explicit `removeRepeatable` on shutdown + a spec asserting only one repeatable after two boots. |
| D3 | Frontend `pricing-rules.component.ts` uses `['super_admin','finance_officer']` for write gating; backend uses `['finance_officer']` with super_admin implicit via `requireAdminRole`. Matches in practice but easy to drift. | When `pricing_manager` lands in the `AdminRole` enum, update both lists in lockstep. |
| D4 | Aging engine dry-run runs all listings inside ONE Postgres transaction (so it can rollback). At ~10k+ listings this holds locks for a while. | Break the dry-run into smaller chunked transactions OR run estimation in-memory without writing `AppliedDiscount` rows. |
| — | `pricing_manager` role not in `AdminRole` enum. Mockups referenced it; we used `finance_officer` as the closest existing role. | Add to enum + seed when the org wants finer-grained pricing access. |

### Local services for Sprint 2 (this dev machine)

User runs **Postgres natively on Windows port 5433** — docker-compose's Postgres on 5432 is unused. Only **MinIO + Redis** from compose are needed.

```powershell
# Skip the unused docker Postgres; start only what Sprint 2 needs:
docker compose -f infrastructure/docker/docker-compose.yml up -d redis minio
# OR full set (Postgres on 5432 will idle alongside native 5433):
npm run dev:services

# Then:
npm run serve:api      # http://localhost:3333 — auto-creates `cpo-media` bucket on boot, registers BullMQ nightly job
npm run serve:admin    # http://localhost:4201
# MinIO console:        http://localhost:9001  login cpo-local / cpo-local-secret
```

Sprint 1 demo users still apply (`admin@behbehani-cpo.com` / `Admin!Pass8` etc.). Aging engine cron is `0 2 * * *` Asia/Kuwait — for ad-hoc test use the "Run now" button on the aging page (synchronous, returns the AgingRunDto immediately).

### Sprint 2 UI smoke-test checklist (carry over from Sprint 1)

The user runs this in the browser before declaring Sprint 2 fully done:

- [ ] Start services + API + admin, sign in as `super_admin`.
- [ ] `/inventory/listings` still works (Sprint 1 regression check).
- [ ] `/inventory/pipeline` renders 10 stage columns; drag a card → stage-transition modal opens; confirm → card moves and listing stage updates.
- [ ] Open a listing → Media tab → drop 2 photos → progress bars → primary star → reorder → delete (shared confirm modal opens).
- [ ] Media tab → 360° → upload a `.zip` or `.mp4` → confirm appears.
- [ ] Media tab → Video → upload `.mp4` ≤ 100 MB.
- [ ] `/settings/pricing-rules` → "+ Add tier" → fill fields → preview-impact populates → Save. Edit + Delete go through the shared confirm modal.
- [ ] `/reports/inventory-aging` → KPI cards populated → "Run now" → run completes → row appears in run history → active-discounts table updates.
- [ ] Sign out, sign in as `ops@behbehani-cpo.com` (operations_manager + sales_agent) → Settings and Reports nav groups must NOT appear; Pipeline must appear.
- [ ] Open browser DevTools Network tab on a photo upload → confirm the PUT to `localhost:9000` has NO `Authorization` header (the interceptor skip-guard works).

### 🐞 Bugs from smoke-test (2026-05-15) — RESOLVED

Three bugs surfaced during the first UI smoke-test pass and were diagnosed + fixed:

**B1. Pipeline board → 500 from `/api/v1/admin/listings?pageSize=200` (root cause of the user-visible failure)**
- `ListingFilterSchema.pageSize` is capped at `.max(100)` in `libs/shared/types/src/lib/listings.schemas.ts:104`.
- Wave-2 `pipeline-frontend` agent set `BOARD_PAGE_SIZE = 200`, blowing past the cap on every load.
- Global `errorHandler` (`apps/api/src/middleware/error.ts`) was converting the `ZodError` to **500** instead of 422 — so the validation problem looked like a server crash and was hard to diagnose.
- **Fixes:**
  - `apps/admin/src/app/features/listings/pipeline/pipeline-board.component.ts` — `BOARD_PAGE_SIZE` lowered to **100** with a comment pointing to the validator cap so future maintainers bump both together.
  - `apps/admin/src/app/features/listings/pipeline/pipeline-board.component.html` — banner text updated to "Showing 100 of N".
  - `apps/api/src/middleware/error.ts` — added a `ZodError` branch that returns **422** with `{ error: 'validation_error', issues: [{path, message, code}] }`. Future validation bugs will now surface as the correct status with field-level detail instead of an opaque 500.

**B2. `saveDraft()` silent exit on a brand-new vehicle form**
- For a new listing, every required field starts empty → `form.invalid` is true → the bare `if (form.invalid) return;` guard exited with zero side effects. No field highlighting, no error pill, no console log.
- **Fix:** `apps/admin/src/app/features/listings/edit/listing-edit.component.ts` — guard now calls `form.markAllAsTouched()` and `showSaveStatus('error', 'Please fill in all required fields before saving.')` so the user sees red field outlines + the error pill.

**B3. Catalog dropdown loads swallow errors**
- `loadCatalog()` on both list and edit components did `.subscribe(b => ...)` with no error handler (or `error: () => {}`), so a 401/500 from `/v1/catalog/brands` or `/body-types` left dropdowns silently empty.
- **Fix:** Both pages now have `error: (err) => console.error('[catalog load failed]', err)` handlers.

**B4. NG0203 — `toObservable()` outside injection context**
- `apps/admin/src/app/features/listings/list/listing-list.component.ts:512` (orig) called `toObservable(this.filter)` inside `ngOnInit`. That runtime is OUTSIDE Angular's constructor-time injection context, so the conversion threw NG0203 — which crashed the rest of `ngOnInit` (debounce subscription, catalog loads, search wiring), explaining why brands + body-types + the list itself were all empty/broken.
- **Fix:** captured `Injector` as a class field via `inject(Injector)` (constructor-time) and passed it explicitly: `toObservable(this.filter, { injector: this.injector })`. Other Wave-2 Wave-3 components were checked; this was the only call site.

**B5. 18 dead-link placeholder nav items (`routerLink="."` everywhere)**
- The shell had 18 nav items pointing at `routerLink="."` for sprints that haven't shipped (Brands & Models, Reservations, Orders, Trade-Ins, Deliveries, Maintenance, Returns, Users, Reviews, Support, Financing Applications, Invoices, Refunds, Analytics, Reports-in-Insights, Roles & Permissions, Audit Log, Settings). Clicking went to the current route (so always Dashboard), and the one that also had `routerLinkActive` stayed permanently highlighted regardless of the actual URL.
- **Fix:** converted all 18 anchors to `<span aria-disabled="true" title="Coming in a later sprint" class="... text-slate-500 cursor-not-allowed">`. No `routerLink`, no `routerLinkActive`, dimmed styling, tooltip. The five real anchors (Dashboard, Listings, Pipeline, Pricing Rules, Inventory Aging) remain functional. Tag count: 5 `<a>` / 5 `</a>` confirmed balanced after the change.

**Build / typecheck / 52 API specs all green after every patch.** Sprint 2 is closed.

Carry the new validation-error response shape (`{ error: 'validation_error', issues: [...] }`) into the storefront DTOs when Sprint 3 starts (consumers should branch on `error === 'validation_error'`).

### Local services for Sprint 2 — Docker readiness note (2026-05-15)

User has Docker CLI installed (v29.2.0) but Docker Desktop service was NOT running at last check (`docker info` failed with named-pipe error). Until Desktop is launched, MinIO + Redis are unreachable, which means:
- Media uploads will 5xx on presign (S3 client can't reach MinIO).
- API boot will log a structured error from `ensureBucket()` but continues (helper does not crash the server on bucket-create failure — verify this is true; if not, fix to be tolerant).
- Aging engine scheduler `startAgingScheduler()` requires Redis — boot will likely fail hard here. Possible cause of "listing not working" if user is testing without Docker.

## ✅ Brand identity applied (2026-05-17)

Source assets from the user's separate project at `C:\Users\UBAIY\Back\MYB\myb-web-front-end\src\`:

- **Favicon** copied to BOTH `apps/admin/public/favicon.ico` + `apps/web/public/favicon.ico` (15 KB).
- **Full lockup PNG** (`myb_blue.png`, 267 KB) copied as `brand-logo.png` to BOTH apps' `public/` dirs. Used on the admin sign-in page header (`<img src="/brand-logo.png" class="h-12 w-auto">`). Reserved for the web storefront sign-in when Sprint 3 resumes.
- **Sidebar mark** (admin `admin-shell.component.ts`): hand-crafted inline SVG of the twin-peaks lockup mark — two interlocking triangles in brand-700 on a white-rounded-square 36×36 tile. Replaces the previous generic shield icon. Wordmark text remains "Behbehani CPO / Back Office" (CPO is the product, MYB is the parent brand).
- **Sign-in page header**: full lockup PNG + subtitle "Certified Pre-Owned — Back Office".
- **Sprint 1/2/2.5 mockups** still show the old shield SVG — they're historical reference. Optional retro-brand pass deferred.

If branding ever changes:
- The sidebar mark is inline SVG (paths) — edit `admin-shell.component.ts` directly.
- The sign-in image is referenced by relative path `/brand-logo.png` — replace the file in both `apps/*/public/`.

---

## ✅ Admin: Real KPI Dashboard (CODE COMPLETE 2026-05-17)

4 agents across mockup + W1 + W2 + W3. Replaces the placeholder dashboard (hardcoded "142 / 8" numbers) with a role-aware, single-call, live-data home page. **205 tests passing** across the codebase (api 122 / shared-types 64 / data-access 12 / admin 7), up from 128 baseline.

### Backend ✅
| Area | Files |
|---|---|
| New endpoint | `GET /v1/admin/dashboard/kpis` — single aggregation call. Returns ALL dashboard data in one round trip via `Promise.all` batching ~12 parallel queries. |
| Module | [apps/api/src/dashboard/](apps/api/src/dashboard) — `dashboard.controller.ts`, `dashboard.service.ts` (role-conditional projection), `dashboard.repo.ts` (pipeline groupBy + stuck-stage + media counts + user-status counts + prev-month discount), `dashboard.errors.ts` |
| Reused logic | Calls existing `aging.repo.getStatusTotals()` + `getLastRun()` + `audit-log.repo.listAuditLogs()` — no duplication. |
| Role gating | Single `requireAdminRole(general_manager, operations_manager, sales_agent, inspection_officer, finance_officer, customer_support, content_editor, technical_support, delivery_dispatcher, maintenance_coordinator, pricing_manager)` — super_admin implicit. `auction_operator` excluded (Phase 2). |
| Role-conditional projection in service | `agingEngine: null` for roles outside super_admin / general_manager / operations_manager / finance_officer / pricing_manager. `systemHealth.users: null` for roles outside super_admin / general_manager. `recentActivity: []` for roles outside super_admin / general_manager (matches audit-log read-access — reviewer N12 security fix). `quickActions` filtered per-role with explicit `super_admin` membership check on `create_user` (does NOT use middleware bypass — reviewer-verified). |
| "Most stuck stage" | Computed across `inspection / photoshoot / reconditioning` using `createdAt` as the proxy (listedAt is null pre-listing). Threshold ≥ 14 days. Returns null when no stage qualifies. |

### Frontend ✅
| Area | Files |
|---|---|
| Service | [libs/data-access/src/lib/admin-dashboard.service.ts](libs/data-access/src/lib/admin-dashboard.service.ts) — single `kpis(): Observable<DashboardKpisDto>` method. |
| Page | [apps/admin/src/app/features/dashboard/dashboard.component.ts](apps/admin/src/app/features/dashboard/dashboard.component.ts) (202 lines, controller-only) + [dashboard.component.html](apps/admin/src/app/features/dashboard/dashboard.component.html) (563-line template extracted per reviewer C3). Replaces the placeholder. OnPush, standalone. |
| Layout (matches mockup) | 5 rows: header strip (time-of-day greeting + last-refreshed + refresh button) / daily-value strip (4 dashed-border placeholders for Sprint 5/6/7/9 modules) / top KPI cards (active listings · aging 20-44 · aging 45+ · monthly discount) / pipeline at-a-glance (CSS stacked bar, brand-800→brand-200 for active stages, slate for sold/delivered/closed, "most stuck stage" callout) / aging engine + quick actions (3+2 grid, agingEngine card hides entirely when null) / recent activity + system health (3+2 grid). |
| Race-safe refresh | `reload$` Subject piped through `switchMap` so an in-flight `kpis()` is cancelled by the next refresh — late response can never overwrite fresh data (reviewer C2 fix). |
| Money | `monthlyDiscountAppliedFils` arrives as fils-as-string; converted via `Number(str) / 1000` + `formatKwd()` to 3-decimal KWD. Safe up to ~9 quadrillion KWD. |

### Schemas
- `libs/shared/types/src/lib/dashboard.schemas.ts` (167 lines): `DashboardKpisDtoSchema`, `DashboardKpiTileSchema` (value: int|string for money tiles), `DeltaSchema` (`pct` enforces `.multipleOf(0.01)`), `DailyValueTileSchema`, `PipelineSnapshotSchema` (stages length=10), `DashboardAgingStatusSchema`, `DashboardSystemHealthSchema`, `DashboardActivityEntrySchema` (slim audit projection — no before/after blobs), `DashboardQuickActionSchema`.

### Testing ✅ (W3 tester)
| Suite | New tests | Coverage |
|---|---|---|
| `apps/api/src/dashboard/dashboard.service.spec.ts` | **33** | `agingEngine` visibility across 5 visible + 4 hidden roles; `systemHealth.users` super_admin+general_manager only; `quickActions` filtering per-role; `create_user` explicit-membership check (NOT bypass); variant assignment; money-tile shape (string vs int); `greetingName` first-token + 'Admin' fallback |
| `libs/shared/types/src/lib/dashboard.schemas.spec.ts` | **44** | DeltaSchema pct decimals + sign enum; KpiTile number|string union; Pipeline length(10); DailyValue/QuickAction key enums; ActivityEntry outcome enum + nullables |

### Reviewer punch list — applied
| ID | Was | Now |
|---|---|---|
| **C1** | `resolveFirstName` used `prisma.user.findFirst({where: {id}})` — works but `findUnique` is the idiomatic call on a PK | Changed to `findUnique` + comment |
| **C2** | `reload()` fired a fresh `kpis()` while a previous one was in-flight → late response could overwrite fresh data | Introduced `reload$ = new Subject<void>()`; piped through `switchMap` so previous in-flight request is auto-cancelled. Wired once in `ngOnInit`. |
| **C3** | Component was 766 lines (inline 564-line template) — over the 500-line cap | Template extracted to `dashboard.component.html` (563 lines). Controller is now 202 lines. |
| **N12** | `recentActivity` slice surfaced audit entries to ALL dashboard-allowed roles — leaks `aging.pause`, `user.lock`, etc. to customer_support / technical_support / delivery_dispatcher | Gated to `super_admin + general_manager` (matches audit-log controller's read access). Non-privileged roles get `recentActivity: []`. |

### Carry-overs (defer, document)
| ID | Where | Action |
|---|---|---|
| N2 | Role-list divergence: dashboard read-roles include `delivery_dispatcher + maintenance_coordinator`, but `listings.READ_ROLES` doesn't — those roles can see the pipeline bar but can't drill into a listing | Either add them to listings.READ_ROLES (read-only) or remove from dashboard. Defer the architectural call. |
| N3 | Role-lists hand-maintained in 4 controllers (`listings`, `aging`, `audit-log`, `dashboard`) — divergence-prone | Extract to `apps/api/src/auth/role-groups.ts` with named constants (`ADMIN_READ_ROLES_DASHBOARD`, etc.) |
| N4 | `computeDiscountDelta` returns null when prev=0 but current>0 (swallows "first month of discounts" case) | Return `{ sign: 'up', pct: 100, vsPeriod: 'new' }` sentinel instead |
| N6 | Pipeline bar renders an empty 28px grey strip when ALL stages are 0 (fresh DB) | Add `@if (pipelineTotal() === 0) { <empty-state> }` branch |
| N7 | `activeDiscount` distinct query loads full `listingId` set into memory then `.length`s — wasteful for large tables | Switch to raw `COUNT(DISTINCT)` or `groupBy({by:['listingId']})` |
| N9 | `getMostStuckStage` uses `createdAt` not stage-entry time (a listing acquired 60d ago but currently 2d in reconditioning shows as 60d stuck) | When a `StageHistory` table or `stageEnteredAt` column lands, swap |
| N11 | Error banner copy is generic — 401/403/5xx all read the same | Inspect `catchError` payload + distinct messages |
| N13 | Mixed bypass strategy: `create_user` uses explicit `adminRoles.includes('super_admin')` while `view_audit_log` uses `hasAnyRole` (which bypasses) | Pick one convention codebase-wide |
| N14 | `dailyValues` placeholders hardcode `'Sprint 5'`/`'Sprint 6'`/etc. in the service | Move to a feature-flag / config service |
| X1 | `Number(filsString) / 1000` precision — fine for any KWD value < 9 quadrillion fils | Add `// safe for sub-MAX_SAFE_INTEGER fils` comment |
| X2 | `timeOfDayGreeting()` uses `new Date().getHours()` (client local hour) — wrong for ops staff on non-Kuwait laptops | Use `Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', hour: 'numeric' })` |
| X3 | Auto-refresh (30s polling) TODO'd in the template tail | Wire `interval(30_000).pipe(takeUntil(destroy$))` |
| X4 | `nextScheduledAt` silently swallows `parseExpression` throw | Log via `req.log.warn` |
| X5 | `STUCK_THRESHOLD_DAYS = 14` hardcoded | Move to `business_rules.ts` alongside aging 20/45 thresholds |
| — | Schema gap: `User` has no `createdById` column — affects this AND admin-users `AdminUserDetailDto.createdByName` (both always null) | Migration to add it + relation, then populate |

### UI smoke-test for the dashboard (user runs)

Sign in as `admin@behbehani-cpo.com` / `Admin!Pass8` (super_admin):

- [ ] `/` (dashboard) renders without skeleton stuck — all 5 rows populate.
- [ ] Daily-value strip is on top (4 dashed cards with `—` value + Sprint pill).
- [ ] Top KPI row shows real `Total Active Listings` count from the DB (not 142).
- [ ] Pipeline-at-a-glance bar reflects actual listings by stage. Color key under the bar.
- [ ] Aging engine card visible (super_admin sees it). Status pill ACTIVE/PAUSED/INACTIVE based on engine state.
- [ ] Quick Actions card shows all 4 entries for super_admin (New vehicle, Run aging now, Create user, View audit log). Click "Create user" → drawer opens in `/admin/users`.
- [ ] Recent activity table shows last 10 audit-log entries with outcome chips. Footer link "View full audit log →" present (super_admin).
- [ ] System health right column shows: Media counts, Admin users counts (active/locked/disabled), Pricing tiers count.
- [ ] Click the Refresh icon while data is loading — no race condition, no flash, the late call is cancelled.
- [ ] Sign out, sign in as `pricing@behbehani-cpo.com` / `Pricing!Pass8` (finance_officer + pricing_manager):
  - Dashboard loads.
  - Top KPIs visible, aging engine card visible.
  - Quick Actions: only "Run aging now" (no New vehicle, no Create user, no View audit log).
  - **Recent activity table is empty** (the new N12 fix — pricing_manager doesn't get the audit slice).
  - System health → Admin users tile is hidden (only super_admin + general_manager see it).
- [ ] Sign out, sign in as `ops@behbehani-cpo.com` / `Ops!Pass8` (operations_manager + sales_agent):
  - Dashboard loads.
  - Quick Actions: "New vehicle" only.
  - Aging engine visible (operations_manager has aging read).
  - Recent activity empty (not general_manager).
  - System health → Admin users hidden.

---

## ✅ Admin pass — User & RBAC management (CODE COMPLETE 2026-05-17)

10 agents across 4 waves. **128 tests passing** (api 89 / admin 7 / shared-types 20 / data-access 12).

### Backend ✅
| Area | Files |
|---|---|
| New role `pricing_manager` | enum in `apps/api/prisma/schema.prisma`, migration `20260517062401_add_pricing_manager_role`, `libs/shared/types/src/lib/roles.ts` (constant + `'Pricing Manager'` label), seed user `pricing@behbehani-cpo.com` / `Pricing!Pass8` (Sara Al-Khalifa, roles: finance_officer + pricing_manager) |
| Admin Users CRUD | [apps/api/src/admin-users/](apps/api/src/admin-users) — 10 endpoints under `/v1/admin/users` (list/get/create/update/assignRoles/lock/unlock/disable/enable/resetPassword). Self-protection blocks super_admin from locking/disabling/role-stripping themselves. Idempotent state mutations. Password generation via `crypto.randomBytes(9).toString('base64url')` (12 URL-safe chars). bcrypt cost 12 throughout. |
| Audit log read API | [apps/api/src/audit-log/](apps/api/src/audit-log) — `GET /v1/admin/audit-log` (filter + paginate + `total` + `filteredFrom`), `/actions` and `/resources` vocab endpoints, `/export` (synchronous CSV via HttpClient blob, 413 above 10k rows). NO `auditMutation` middleware on this router (recursion safety). Outcome derived from action: `.failed` → denied, `error.*` or `.error` → error, else success. SQL filter mirrors the JS derivation. |
| Cross-module RBAC update | `pricing.controller.ts` adds `pricing_manager` to BOTH READ + WRITE roles (Sprint 2 reviewer D3 finally closed). `aging.controller.ts` WRITE_ROLES = `['finance_officer', 'pricing_manager']` (super_admin implicit via middleware bypass — convention now consistent across pricing + aging). |
| Auth interceptor | [libs/data-access/src/lib/auth.interceptor.ts](libs/data-access/src/lib/auth.interceptor.ts) — on 401, calls `authService.signOut()` + `router.navigateByUrl(signInPath + '?returnUrl=...')`. Skips for credential endpoints (`/auth/login`, `/auth/otp/request`, `/auth/otp/verify`). SSR-safe via `isPlatformBrowser`. Loop-guarded (skips if already on a sign-in page). |
| ApiConfig.signInPath | `ApiConfig.signInPath` accepts string OR `(currentPathname) => string`. Admin app passes `/auth/sign-in`; web app passes a fn that derives `/${locale}/auth/sign-in` from the path. `returnTo` → `returnUrl` unified across both guards. |
| JWT TTL | `JWT_ACCESS_TTL_SEC` default 900 → **86400** (1 day). Refresh stays 30 days. Refresh-token flow remains dormant in practice (track for Phase 2 sessions module). |
| `AuthService.patchUser(partial)` | New method to merge profile updates into the cached current-user signal + localStorage. Called from `user-edit.saveProfile` when `isSelf()` so the sidebar refreshes immediately without sign-out. |

### Frontend ✅
| Area | Files |
|---|---|
| Users list page | [apps/admin/src/app/features/admin-users/users-list.component.ts](apps/admin/src/app/features/admin-users/users-list.component.ts) (+ .html) at `/admin/users` — table + filter strip (search/role/status) + create-user drawer with generate-vs-manual password toggle + generated-password alert (30s auto-dismiss + copy). Self-protection hides lock/disable on the actor's own row. |
| User edit page | [apps/admin/src/app/features/admin-users/user-edit.component.ts](apps/admin/src/app/features/admin-users/user-edit.component.ts) (+ .html) at `/admin/users/:id` — Profile / Roles & access (with permission preview computed locally) / Security (lockout state + reset password + sessions placeholder) / inline Audit log via `AdminAuditLogService`. |
| Audit log viewer | [apps/admin/src/app/features/admin-audit-log/audit-log.component.ts](apps/admin/src/app/features/admin-audit-log/audit-log.component.ts) at `/admin/audit-log` — filter strip (deep-linkable via Router queryParams; honors `?actorId=` from users-list ⋯ menu jump), live count + sort, table with inline before→after diff expansion (pure-TS line walk, brand-50 for additions / red-50 for removals), CSV export via blob+anchor click (Bearer attached). |
| Data-access services | `AdminUsersService` (10 methods), `AdminAuditLogService` (4 methods: list / listActions / listResources / exportCsv → Blob, plus static `downloadBlob(blob, filename)` helper). |
| Nav rewire | Admin shell sidebar's previously-placeholder "Users" + "Audit Log" entries are now real routes, gated to `['super_admin','general_manager']`. "Roles & Permissions" + "Settings" stay disabled spans for now. Reports group + Settings group continue to gate to roles that include `pricing_manager` where appropriate. |

### Testing ✅ (W4)
| Suite | New tests | Coverage |
|---|---|---|
| `apps/api/src/admin-users/admin-users.service.spec.ts` | 26 | Status derivation, self-protection guards (lock/disable/role-strip self → 422), super_admin-on-super_admin allowed, idempotency for all lifecycle mutations, password generate (12-char base64url) vs manual, status filter where-clauses, passwordHash never leaks, uniqueness 409s |
| `libs/shared/types/src/lib/admin-users.schemas.spec.ts` | 20 | Every `.refine`: email-or-mobile, password-when-manual, role-when-admin, empty-body update, password-when-manual on reset. Enum + regex contract checks |
| `libs/data-access/src/lib/auth.interceptor.spec.ts` | 12 | Bearer attachment, login/OTP 401 ignored, other-401 signOut + navigate w/ returnUrl, external-URL bypass, signInPath string/function/default resolution, SSR safety, loop guard, no-token short-circuit |

### Reviewer punch list — applied in-place
| ID | Was | Now |
|---|---|---|
| C1 | Lock/unlock/disable/enable controllers returned `{ user }`, service typed for unwrapped → frontend `this.user.set()` would assign a wrapper → blank UI | Controllers unwrapped: `res.json(user)` |
| C2 | CSV export used `window.open(url)` — Bearer not attached → 401 → forced sign-out on a separate tab | `HttpClient.get({responseType: 'blob'})` + `AdminAuditLogService.downloadBlob()` static helper |
| C3 | Self-update saveProfile didn't refresh `AuthService._user` — sidebar stale until sign-out | New `AuthService.patchUser(partial)`; called when `isSelf()` |
| C4 | `pricing_manager` had WRITE but no READ on pricing tiers — couldn't see what they were editing | Added to `READ_ROLES` |
| C5 | Concern: forbidden role → 401 → forced sign-out cascade | **Verified non-issue**: `requireAdminRole` returns **403**, interceptor only catches 401. Documented as carry-over since the empty-page UX is still suboptimal |
| N6 | Wrong OTP at `/auth/otp/verify` → 401 → forced sign-out mid-flow | Interceptor `isCredentialEndpoint()` helper skips login + OTP endpoints |
| N8 | Aging `WRITE_ROLES` listed `super_admin` redundantly (middleware bypasses it) | Dropped — matches pricing convention |

### Carry-overs (defer, document)
| ID | Where | Action |
|---|---|---|
| C5b | `adminAuthGuard` only checks `role === 'admin'`, not sub-roles. User with mismatched sub-role lands on a half-rendered page and sees an empty data table (API returns 403). | Add per-route role-data guards OR a smarter shell-level empty-state. Non-blocking. |
| N7 | 4 files over the 500-line cap: `audit-log.component.ts` (1176), `users-list.component.html` (726), `user-edit.component.html` (599), `users-list.component.ts` (556) | Split into sub-components in a future refactor pass |
| N9 | Empty-PATCH 422 surfaces as generic "Save failed" toast | Detect empty diff client-side; show "No changes to save" inline |
| N10 | `AdminUserDetailDto.createdByName/createdById` are permanently null (no `createdById` column on User) | Add the column + relation in a migration, then populate via include |
| N11 | `findFirst` → `findUnique` for PK lookups in `admin-users.repo.ts` | Minor optimization, semantic clarity |
| D1 | 1-day access TTL leaves refresh-token flow effectively dormant | Track for Phase 2 sessions module |
| D2 | `adminUsersRouter.use(auditMutation('admin.users'))` double-audits — service emits fine-grained entries AND middleware emits coarse method+path entries | Pick one path; remove the duplicate |
| D3 | `resetPassword` doesn't block self-reset | Benign but consider blocking; track |
| — | Future supertest-driven `admin-users.controller` integration spec to lock in RBAC + local error handler 422/409/404 mapping | Track for a follow-up testing pass |
| — | Admin app smoke spec for the new `/admin/users` page + nav role-gating | Same |

### UI smoke-test checklist for the admin pass (user runs)

Sign in as `admin@behbehani-cpo.com` / `Admin!Pass8` (super_admin):

- [ ] Sidebar shows new **Admin → Users** + **Admin → Audit Log** items.
- [ ] `/admin/users` table renders with all seeded demo users including new `pricing@behbehani-cpo.com` (Sara, finance_officer + pricing_manager).
- [ ] Filter by role `pricing_manager` returns just Sara.
- [ ] "+ Create user" drawer: fill in name/email + Staff + 1 role + Generate password → Save → new row appears, generated password shown in the dismissible alert.
- [ ] Open a user → roles tab → toggle a role → Save roles. Audit log section at the bottom shows the `user.roles.assigned` entry.
- [ ] Edit your OWN profile (super_admin) → change full name → Save → the sidebar avatar/name updates immediately (no sign-out needed).
- [ ] Try to lock yourself from the ⋯ menu → the menu item is hidden (frontend self-protection); also try the API directly → 422 (backend self-protection).
- [ ] `/admin/audit-log`: filter strip works, table populated, click a row to expand inline before→after diff. Click "Export CSV" → file downloads (no forced sign-out tab opens).
- [ ] Sign out, sign in as `pricing@behbehani-cpo.com` / `Pricing!Pass8`: should see Settings (Pricing Rules) AND Reports (Inventory Aging) groups; should NOT see Admin group; can view AND edit pricing tiers; can trigger aging run-now.
- [ ] Sign out, sign in as `ops@behbehani-cpo.com` / `Ops!Pass8`: NO Admin group, NO Settings group, NO Reports group; can browse Listings + Pipeline only.
- [ ] Open DevTools → Application → localStorage → clear `cpo.auth.access` key → reload any admin page → should land on `/auth/sign-in?returnUrl=...` (the 401 redirect path).

---



**Why now:** Sprint 3 storefront paused per user pivot. The admin app currently has no UI to create staff users (only seed/SQL), to assign/edit admin roles, or to view the global audit log. This pass fills that gap before resuming storefront work.

**Mockups (approved 2026-05-17) under [mockups/admin/sprint-2.5-users/](mockups/admin/sprint-2.5-users):**
- `01-users-list.html` — users table + filter strip + create-user drawer with generate-vs-manual password toggle
- `02-user-edit.html` — Profile / Roles & access / Security (lockout + reset pwd + sessions placeholder) / Audit log
- `03-audit-log.html` — global `/admin/audit-log` viewer with filter strip + inline before→after diff expansion + CSV export

**Two ancillary requests bundled in (from user 2026-05-17):**
1. **JWT access TTL → 1 day** (was 15 min). Refresh TTL stays 30 days.
2. **401 from API → redirect to `/sign-in`** (admin + web). Currently silent failure. Auth interceptor needs a response handler that clears the AuthService state and `router.navigateByUrl('/sign-in', { queryParams: { returnUrl } })`.

**Implementation waves:**
- W1 — Foundation (3 parallel): `infra-users` (`pricing_manager` enum + migration + seed), `users-types` (Zod DTOs), `auth-fixes` (1-day TTL + 401 redirect interceptor)
- W2 — Backend (2 parallel): `users-backend` (`/v1/admin/users` CRUD + lock/unlock/reset + role assignment; also extend pricing/aging RBAC to include `pricing_manager` where it makes sense), `audit-backend` (`/v1/admin/audit-log` read + CSV export)
- W3 — Frontend (3 parallel): `users-frontend` (list + create drawer + rewire nav), `user-edit-frontend`, `audit-log-frontend`
- W4 — QA: `tester` + `reviewer`

### ⏸ Sprint 3 — Browse + VDP — PAUSED 2026-05-17

Decision: customer-facing storefront work is parked. Resume after the current admin pass closes.

**State at pause:**
- All 5 storefront mockups produced under [mockups/web/sprint-3/](mockups/web/sprint-3/) and pending user approval (no Angular code written yet):
  - `01-home-en.html` — public homepage EN (hero+search, body-type rail, featured + new arrivals rails, value props, brand strip, footer)
  - `02-home-ar.html` — Arabic RTL mirror; proves layout flips with only `<html dir="rtl">` + Tajawal font + a single `rotate-180` on directional SVG chevrons. Zero physical-direction Tailwind classes anywhere.
  - `03-listings-grid.html` — `/browse` grid view with 9 collapsible filter sections, active-chip strip, sticky sort bar with grid/list toggle, 3/2/1 responsive grid, mobile bottom-sheet filters, FR-BUY-015 Socket.IO live-count annotation
  - `04-listings-list.html` — horizontal-row variant; 240px photo + thumb strip / dual 2×4 spec table / 180px sticky price block; Reserved + Best-deal state cards
  - `05-vdp.html` — Vehicle Detail Page with gallery + sticky buy block + Behbehani 200-pt inspection grid + monthly calculator + JSON-LD comment + related-cars rail. Carries explicit deferral annotations: 360° viewer (Sprint 4), reservation flow KWD 100 + 48-hr hold (Sprint 5), real Al Ahli pre-qual (Sprint 7).

**Carry-forward decisions locked into the mockups (apply when work resumes):**
- Card photo hard-pin **16:10 aspect ratio** on the `<img>` container to prevent CLS during SSR hydration (Sprint 12 target: CLS ≤ 0.1).
- Monthly finance figure stays a placeholder string with an "Estimate only — final terms from Al Ahli (Sprint 7)" disclaimer until Sprint 7 ships the real pre-qual.
- "Schedule a test drive" CTA on the VDP is **rendered disabled + greyed** with an inline "Out of scope Phase 1" badge (Test Drive booking is explicitly OUT of scope per master plan).
- Storefront uses logical Tailwind utilities **exclusively** (`ps/pe/ms/me`, `text-start/end`). One known manual override: `rotate-180` on directional SVG chevrons.
- Customer-facing DTO must mask VIN (last 6 only) and strip `costFils` entirely before Sprint 3 implementation starts.

**Sprint 3 implementation wave plan (when resumed):**
1. **W1 — Foundation**: customer DTO mapper (mask VIN, strip costFils), public API endpoints `/v1/listings`, `/v1/listings/:slug`, `/v1/catalog/public`. Socket.IO server attached to existing Express. AR translation strings for new keys.
2. **W2 — Storefront shell + browse + VDP**: Angular components for the 5 mockups. Locale-prefixed routes `/:locale/...` already exist; extend.
3. **W3 — i18n hardening + a11y pass + QA**: full AR walkthrough, axe-core checks, Lighthouse smoke.

---

## ✅ Cleanup pass + smoke-test bug fixes (CODE COMPLETE 2026-05-17)

Hygiene pass closing the Sprint 2 + Admin-pass + Dashboard carry-overs. No new features — quality only. **205 tests still passing** (api 122 / admin 7 / shared-types 64 / data-access 12); admin build + api typecheck green.

### Non-split items (all 4 closed)

| Item | Files | What changed |
|---|---|---|
| **Role-list consolidation** (Dashboard reviewer N3) | NEW: [apps/api/src/auth/role-groups.ts](apps/api/src/auth/role-groups.ts). Edited: 7 controllers (listings, aging, pricing, media, dashboard, audit-log, admin-users) | 7 named groups: `LISTINGS_READ/WRITE_ROLES`, `MEDIA_VIEW/MANAGE_ROLES`, `PRICING_READ/WRITE_ROLES`, `AGING_READ/WRITE_ROLES`, `DASHBOARD_READ_ROLES`, `AUDIT_LOG_READ_ROLES`, `ADMIN_USERS_READ_ROLES`. **No `ADMIN_USERS_WRITE_ROLES` symbol** — admin-users write routes call `requireAdminRole('super_admin')` literally; spreading an empty group through the middleware would short-circuit to "any admin" via the `allowed.length === 0` check (auth.ts line 59), which is a real footgun. The role-groups file documents this. |
| **Env caps wired to service** (Sprint 2 carry-over N4) | [libs/shared/types/src/lib/media.schemas.ts](libs/shared/types/src/lib/media.schemas.ts), [apps/api/src/media/media.service.ts](apps/api/src/media/media.service.ts) | Dropped hardcoded `.max(N)` from `byteSize` on `PhotoPresignRequestSchema` / `Media360PresignRequestSchema` / `VideoPresignRequestSchema`. Added `assertPhotoSize` / `assertMedia360Size` / `assertVideoSize` in `media.service` using `env.MAX_PHOTO_BYTES` / `MAX_360_BYTES` / `MAX_VIDEO_BYTES`. Operators tune via env without redeploying shared-types. Throws `MediaError(413, ...)`. |
| **Empty-PATCH UX** (Admin-pass carry-over N9) | [apps/admin/src/app/features/admin-users/user-edit.component.ts](apps/admin/src/app/features/admin-users/user-edit.component.ts) `saveProfile()` + [user-edit.component.html](apps/admin/src/app/features/admin-users/user-edit.component.html) | Diff-only DTO build — only include fields whose form value differs from currently-loaded user. If dto empty → slate "No changes to save" pill (new `noop` status). Kills the generic "Save failed" 422 path that surfaced as misleading. |
| **Double-audit dedup** (Admin-pass carry-over D2) | [apps/api/src/admin-users/admin-users.controller.ts](apps/api/src/admin-users/admin-users.controller.ts) | Removed `adminUsersRouter.use(auditMutation('admin.users'))` middleware. Service-level `user.*` audits with before/after snapshots remain authoritative. |

### File-split items (all 11 closed — under 500-line cap)

| File | Before → After | Strategy |
|---|---|---|
| `audit-log.component.ts` | 1200 → 441 | Inline template → `.html` file; pure helpers + types extracted to [audit-log.helpers.ts](apps/admin/src/app/features/admin-audit-log/audit-log.helpers.ts) |
| `aging-overview.component.ts` | 920 → 356 | Inline template → `.html` file |
| `listing-edit.component.html` | 745 → 414 | Overview tab → [listing-overview-tab.component](apps/admin/src/app/features/listings/edit/tabs/listing-overview-tab.component.ts); Specifications tab → [listing-specifications-tab.component](apps/admin/src/app/features/listings/edit/tabs/listing-specifications-tab.component.ts) |
| `users-list.component.html` | 726 → 499 | Create-user drawer → [create-user-drawer.component](apps/admin/src/app/features/admin-users/create-user-drawer.component.ts) (drawer owns `pwMode`/`pwValue`/`pwStrength` getters + `isRoleSelected` form-readback) |
| `media-gallery.component.ts` | 673 → 472 | Helpers + types + constants → [media-gallery.helpers.ts](apps/admin/src/app/features/listings/edit/media/media-gallery.helpers.ts); **360 sub-tab fully extracted** → [media-360-tab.component](apps/admin/src/app/features/listings/edit/media/media-360-tab.component.ts) (owns its own state + service calls; lazy-loads on first sub-tab click) |
| `user-edit.component.html` | 605 → 495 | Audit log section → [user-audit-section.component](apps/admin/src/app/features/admin-users/user-audit-section.component.ts); lockout history card → [user-lockout-history.component](apps/admin/src/app/features/admin-users/user-lockout-history.component.ts) |
| `media-gallery.component.html` | 588 → 456 | 360 sub-tab block replaced with `<admin-media-360-tab [listingId]>` |
| `users-list.component.ts` | 556 → 487 | Helpers + `StatusFilter`/`PAGE_SIZES`/`initials`/`relativeTime`/`defaultFilter` → [users-list.helpers.ts](apps/admin/src/app/features/admin-users/users-list.helpers.ts); collapsed 5 `onX → handleX` wrapper pairs into single `async onX` methods |
| `listing-edit.component.ts` | 534 → 495 | `Brand`/`ModelItem`/`BodyType`/`ActiveTab`/`DescLang` types + `buildListingEditForm()` factory → [listing-edit.types.ts](apps/admin/src/app/features/listings/edit/listing-edit.types.ts) |
| `user-edit.component.ts` | 508 → 469 | `CAPABILITIES` matrix + `Capability` interface → [user-edit-capabilities.ts](apps/admin/src/app/features/admin-users/user-edit-capabilities.ts) |
| `pricing-rules.component.html` | 502 → 307 | Drawer fully extracted → [pricing-tier-drawer.component](apps/admin/src/app/features/pricing-rules/pricing-tier-drawer.component.ts) (parent owns form + `saveTier`; child takes `[form]` + emits `save`/`closed`/`toggleStage`) |

### Smoke-test bug fixes (during user's UI walkthrough, all 4 closed)

| Bug | Root cause | Fix |
|---|---|---|
| **Specs-tab toggles** (GCC, Service history, Accident history): color flipped but circle didn't slide | Pre-existing CSS bug — `peer-checked:translate-x-4` on a div **nested inside** the colored bg div (not a direct sibling of the `<input class="peer">`). Tailwind's `peer-*` only works on direct siblings, so the translate class never applied. | [listing-specifications-tab.component.html](apps/admin/src/app/features/listings/edit/tabs/listing-specifications-tab.component.html) — replaced checkbox+label+nested-div pattern with `<button role="switch">` + `[class.translate-x-4]="form.get('xxx')?.value"` direct binding (same pattern pricing-rules + user-edit already used). |
| **Inspection tab blank** when listing has no inspection report | Pre-existing logic bug — condition `listingDetail()?.inspectionReport?.overallScore !== null` evaluates TRUE when `inspectionReport` is null (because `undefined !== null` is true), so it entered the "show score" branch with no data. | [listing-edit.component.html](apps/admin/src/app/features/listings/edit/listing-edit.component.html) Inspection tab — restructured to `@if (listingDetail()?.inspectionReport; as report) { @if (report.overallScore != null) {...} @else {...} } @else { No inspection report yet }`. |
| **Broken photo thumbnails** after upload (presigned PUT succeeded, `<img src="cdnUrl">` showed broken-image icon) | MinIO bucket created by `ensureBucket()` had no policy. Presigned PUTs work because they carry their own signature; unsigned GETs (from `<img>`) returned 403. | [apps/api/src/lib/s3.ts](apps/api/src/lib/s3.ts) — added `applyPublicReadPolicy(bucket)` that PUTs a policy granting anonymous `s3:GetObject` to `cpo-media/*`. Called on both bucket-exists and bucket-created paths in `ensureBucket()` (idempotent — existing local environments pick up the fix on next API restart). Policy errors logged + swallowed so uploads keep working. Production sits behind CloudFront — this policy is dev/local only. **User needs to restart API** for the fix to apply to existing bucket. |
| **Accident details textarea didn't appear** when Accident history toggled on | `protected readonly showAccidentNotes = computed(() => !!this.form.get('accidentHistory')?.value)` — `computed()` only re-runs when *signals* it reads change. A FormControl's `.value` is an Observable, not a signal, so the computed returned `false` once at construction and never updated. | Dropped the computed + the `[showAccidentNotes]` input entirely. In [listing-specifications-tab.component.html](apps/admin/src/app/features/listings/edit/tabs/listing-specifications-tab.component.html) replaced `@if (showAccidentNotes)` with `@if (form.get('accidentHistory')?.value)`. The toggle button lives in the child, so its click handler marks the child dirty under OnPush and the `@if` re-evaluates. |

### Behavior changes worth knowing

- **Media gallery 360°-tab nav badge ("1" when 360 asset complete) removed.** It depended on `media360()` state that moved into the child component; the parent template can't see it without ViewChild gymnastics or a shared service. Tab content itself still shows status. Photos count badge + video "1" badge still work (their state stayed on the parent). If a stakeholder asks for the badge back, the cleanest path is a small `MediaCountsService` or `output()` from the child.

### Carry-overs (not addressed by this pass)

- `ADMIN_USERS_WRITE_ROLES` intentionally NOT a symbol — write routes use literal `requireAdminRole('super_admin')`. If a delegated admin role lands later, add the symbol and broaden the literal call sites in lockstep. The role-groups.ts header comment warns about the empty-group footgun.
- `auth.ts requireAdminRole` middleware still has `allowed.length === 0 || ...` short-circuit (any admin passes). Pre-existing — no current call site triggers it, but ideally tighten to require at least one allowed role. Defer.
- Sprint 2 carry-over D4 (dry-run aging engine holds locks on ~10k listings): still open. Defer until lot size makes it a real problem.
- The deferred N5 production secret-fallback hardening (`JWT_ACCESS_SECRET` dev fallback) — still open.

---

## ✅ Sprint 2.6 — Brands & Models catalog admin (CODE COMPLETE 2026-05-18)

Full catalog CRUD: Brand / Model / Trim / BodyType. Soft-delete only (isActive toggle), bilingual EN+AR, slug auto-gen from EN with override, brand logo via S3 presigned upload. **230 tests passing** (api 137 / shared-utils 10 / shared-types 64 / data-access 12 / admin 7). Built via Ruflo swarm `swarm-1779020187450-jsp0kp` (4-wave hierarchical).

### Design decisions (locked, stored in Ruflo `patterns/brands-models-design-decisions`)

| Decision | Value |
|---|---|
| Layout | 3 separate pages: `/inventory/brands`, `/inventory/brands/:id/models`, `/inventory/body-types` |
| Delete | Soft only — toggle `isActive`. No hard-delete button anywhere. |
| Slug | Auto-gen from EN name via `slugify()`. Manual override + "Regenerate" button. Live uniqueness check (server enforces). |
| Brand logo | S3 presigned PUT, PNG or SVG, ≤200 KB. Letter-tile fallback when null. Reuses media flow. |
| Trims | Managed inline as chips on the model row (× to deactivate, ↺ to reactivate, "+ Add trim" inline input). |
| Body types | Inline-row-edit (no drawer) — body types are 4 flat fields with no children. |
| RBAC read | `CATALOG_READ_ROLES` mirrors `LISTINGS_READ_ROLES` (most staff need catalog visibility). |
| RBAC write | `CATALOG_WRITE_ROLES = ['content_editor','general_manager']` (super_admin implicit via middleware bypass). |
| Toggle Active → Inactive with refs | Destructive `ConfirmModalService.open()` listing the reference count. Confirmed deactivation hides from dropdowns + customer browse, but existing referencing listings keep working. |

### Mockups (approved before code, mockups-first rule)

`mockups/admin/sprint-2.6-catalog/` — 4 files + shell README, ~2,574 lines total:
- `01-brands-list.html` — page with filter strip, table of all 15 seeded brands (Toyota → Infiniti), status toggle, ref count link
- `02-brand-edit-drawer.html` — edit-Toyota drawer (logo upload + preview, EN/AR/slug/status, validation states)
- `03-models-list.html` — `/inventory/brands/toyota/models` with brand header card + inline trim chips
- `04-body-types.html` — flat list with one SUV row in "inline-edit expanded" state

### W1 Foundation

| File | What |
|---|---|
| [libs/shared/utils/src/lib/slugify.ts](libs/shared/utils/src/lib/slugify.ts) | `slugify(input)` — NFKD-decompose + strip combining marks + drop non-ASCII + collapse dashes. `isValidSlug(input)` — round-trip validator. EN-only by design (Arabic is not transliterated). |
| [libs/shared/types/src/lib/catalog.schemas.ts](libs/shared/types/src/lib/catalog.schemas.ts) | Brand/Model/Trim/BodyType `Dto` + `Create` + `Update` + `ListResponse` schemas. `BrandLogoPresignRequest/Response`. Shared slug regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` matches what `slugify()` produces. All Update schemas have `.refine(d => Object.keys(d).length > 0, ...)` so empty PATCH = 422. |
| [apps/api/src/auth/role-groups.ts](apps/api/src/auth/role-groups.ts) | Added `CATALOG_READ_ROLES` (mirrors listings READ) + `CATALOG_WRITE_ROLES = ['content_editor','general_manager']`. |

### W2 Backend — `/v1/admin/catalog/*`

`apps/api/src/catalog/catalog-admin.{errors,repo,service,controller}.ts`. 18 endpoints:

**Brand:** `GET /brands` (q + status filters) · `GET /brands/:id` · `POST /brands` · `PATCH /brands/:id` · `POST /brands/:id/active` (idempotent + returns referencingListings) · `POST /brands/:id/logo/presign` (200 KB cap, PNG/SVG only) · `DELETE /brands/:id/logo`

**Model:** `GET /brands/:brandId/models` (returns brand + items) · `POST /models` (404 if brand missing, 409 on per-brand slug collision) · `PATCH /models/:id` · `POST /models/:id/active`

**Trim:** `POST /trims` (404 if model missing, 409 on duplicate name) · `PATCH /trims/:id` · `POST /trims/:id/active`

**BodyType:** `GET /body-types` · `POST /body-types` · `PATCH /body-types/:id` · `POST /body-types/:id/active`

Audit logged: `catalog.{brand,model,trim,body-type}.{create,update,activate,deactivate,logo.remove}` via `recordAudit`. Coarse `auditMutation('admin.catalog')` middleware on top per established pattern.

Slug uniqueness 409s use a `code: 'slug_taken'` discriminator so the frontend can render a specific message. Same-brand idempotent re-save (writing the same slug back to the same brand) is allowed.

### W3 Frontend

| File | Purpose |
|---|---|
| [libs/data-access/src/lib/admin-catalog-admin.service.ts](libs/data-access/src/lib/admin-catalog-admin.service.ts) | `AdminCatalogAdminService` — full client. `uploadBrandLogo()` chains presign → S3 PUT → updateBrand into one Observable. |
| [apps/admin/src/app/features/catalog/brands-list.component.ts](apps/admin/src/app/features/catalog/brands-list.component.ts) | Search + status filter + table + open drawer. Toggle-with-refs prompts destructive Confirm. |
| [apps/admin/src/app/features/catalog/brand-edit-drawer.component.ts](apps/admin/src/app/features/catalog/brand-edit-drawer.component.ts) | Create/edit drawer. Auto-slug on EN-name typing while `slugManuallyEdited === false`. Logo upload only enabled in edit mode (needs an ID for the S3 path). |
| [apps/admin/src/app/features/catalog/brand-models-list.component.ts](apps/admin/src/app/features/catalog/brand-models-list.component.ts) | Per-brand models page. Inline create row + per-row inline edit. Trim chips: × deactivates (Confirm if referenced), ↺ reactivates, inline `<input>` for "+ Add trim". |
| [apps/admin/src/app/features/catalog/body-types-list.component.ts](apps/admin/src/app/features/catalog/body-types-list.component.ts) | Flat list with inline-row create + edit (no drawer). |

Routes added in [app.routes.ts](apps/admin/src/app/app.routes.ts): `/inventory/brands`, `/inventory/brands/:brandId/models`, `/inventory/body-types`.

Sidebar nav: the previously-disabled `<span>` placeholder for "Brands & Models" → real `<a routerLink="/inventory/brands">`. New "Body Types" link added beside it. Both gated to `LISTINGS_READ_ROLES` (READ tier — write controls inside the page are gated further).

### W4 QA

- [libs/shared/utils/src/lib/slugify.spec.ts](libs/shared/utils/src/lib/slugify.spec.ts) — **10 tests.** Covers space → dash, run collapse, leading/trailing dash trim, non-ASCII drop, NFKD decomposition (Citroën → citroen, Škoda → skoda — the diacritic strips, not the whole letter), empty input, digit preservation, and `isValidSlug` round-trip with `slugify()`.
- [apps/api/src/catalog/catalog-admin.service.spec.ts](apps/api/src/catalog/catalog-admin.service.spec.ts) — **15 tests.** Brand: 409 `slug_taken`, isActive default true, idempotent re-save, deactivation returns referencingListings, logo size cap 413. Model: 404 on missing brand, 409 on per-brand collision, same-slug allowed across different brands. Trim: 409 `name_taken`, default isActive, idempotent toggle. BodyType: deactivation transition with listing count.

### Behavior notes / carry-overs

- **Audit on PATCH brand:** logs the full before/after for `nameEn / nameAr / slug / logoUrl / isActive`. The logoUrl audit entries can get noisy when admins are uploading — fine for now, consider filtering if the audit log gets spammy.
- **Logo S3 cleanup on `DELETE /brands/:id/logo`:** best-effort `DeleteObjectCommand` derived from the public URL by stripping `S3_PUBLIC_BASE_URL`. If the URL doesn't match (CDN rewrite, custom domain), the object is orphaned silently. Fine for dev; production likely runs CloudFront with explicit cleanup elsewhere.
- **Trim "delete" UX:** the chip × calls `setTrimActive(id, false)`. There's no hard-delete endpoint on trims either. Inactive trims show greyed/strikethrough with a ↺ reactivate button.
- **Slug input on Edit mode:** `slugManuallyEdited` is initialised to `true` when editing an existing brand so we don't auto-rewrite the user's existing slug on first nameEn focus. Click "Regenerate" to opt back into auto-slug.
- **The "model create" inline row** doesn't expose isActive — it always creates `isActive: true`. Toggle off after creation if needed.
- **`BodyTypeCreate.isActive` is required** (Zod `.default(true)` makes it required in the inferred OUTPUT type). Frontend explicitly sends `isActive: true` on create. Same for `ModelCreate` and `TrimCreate`.

---

## ⏳ Known gaps (immediate carry-over from Sprint 0)

| Gap | Where | Action |
|---|---|---|
| Not a git repository | project root | `git init` + initial commit. CI workflow assumes a `main` branch. |
| `libs/domain/*` directories planned but empty | [`libs/domain`](libs/domain) | Generate Nx libs for `vehicles`, `reservations`, `orders`, `financing`, `insurance`, `trade-in`, `deliveries`, `returns`, `maintenance` as their sprints start. |
| No Prisma schema | `apps/api/prisma/` missing | Land with Sprint 1; defines Phase 1 entities (see Plan §"Database — Phase 1 entities"). |
| No Terraform | `infrastructure/terraform/` missing | Module skeleton (VPC, RDS, ElastiCache, S3, ECS) is a Sprint 0 acceptance item — still pending. |
| No unit/e2e specs | `*.test.ts` / `*.spec.ts` not written | Test scaffolding exists; first specs land alongside Sprint 1 features. |
| No real OTP, Google, Apple auth | API stubs return 501/202 | Wired in Sprint 7 (Twilio/Unifonic) + Passport strategies. |
| No real-time, no queues | no Socket.IO, no BullMQ wiring | Socket.IO arrives Sprint 3 (live filter count) + Sprint 10 (GPS); BullMQ arrives Sprint 5 (48-hr hold). |
| Demo user is in-memory only | `apps/api/src/auth/users.repo.ts` lines 33–34 | Replace map with Prisma `User` table in Sprint 1. |

---

## 🛣 Pending sprints (from master plan)

> Two-week sprints, 12 total. Sprint 0 done; everything below is pending.

| Sprint | Theme | Headline deliverables |
|---|---|---|
| **1–2** | Inventory + Admin shell | Prisma schema + migrations, vehicle CRUD, S3 presigned uploads (photos, 360, video), admin shell with RBAC for 12 roles (FR-ADM-002), 10-stage pipeline tracker (FR-ADM-005), aging-discount engine (FR-ADM-006). |
| **3–4** | Browse + VDP | Homepage rails, search/filters/sort with live count <300 ms (FR-BUY-015), listings grid+list, VDP with Pannellum 360 viewer + hotspots, monthly calc, price-band classifier, Behbehani inspection embed, `schema.org/Vehicle` JSON-LD, p95 search <800 ms (FR-BUY-023). |
| **5** | Reservation + KNET | KWD 100 deposit, 48-hr hold timer, BullMQ expiry → auto-refund + listing release, KNET hosted-page integration + callback handler. |
| **6** | 7-step purchase wizard | Exact step order from FR-RES-004: Payment → Trade-in → Add-ons → Documents (Civil ID front/back, license, salary cert if financing) → Digital contract → Delivery slot → Confirmation. Pause/resume within hold. |
| **7** | Financing + Insurance | Al Ahli adapter (calc + pre-qual soft check + application + status webhooks → state machine FR-FIN-010), Kuwait Insurance adapter (quote + bind on delivery, renewal reminders 30d/7d). Document vault with KMS encryption. |
| **8** | Customer dashboard + Maintenance | Profile, addresses, favourites, saved searches with alerts, recently viewed, document vault, order timeline, financing schedule, **full Maintenance Pickup state machine + cost-estimate approval** (FR-MNT-001..010). |
| **9** | Trade-in / Sell Your Car | Instant valuation engine (<5 s), optional photo refinement, schedule physical inspection, final offer (7-day validity), apply-to-purchase, sell-only path. **No concierge, no self-service classified.** |
| **10** | Delivery + Returns | Slot scheduling, driver assignment in admin, live GPS via Socket.IO + MapLibre map, digital handover checklist + POD signature + photos, 3-day/300 km return one-click, refund state machine (FR-RET-006). |
| **11** | Notifications + Analytics + i18n hardening | Email (SES) / SMS (Twilio or Unifonic) / WhatsApp Business templates EN+AR for all FR-NOT-003 events, behavioural alerts, GA4 + GTM, real-time admin KPI dashboard, conversion funnel, inventory aging report. |
| **12** | Perf + SEO + Security + UAT | Lighthouse LCP ≤2.5 s / INP ≤200 ms / CLS ≤0.1 / TTFB ≤600 ms, sitemap + hreflang + OG, OWASP ASVS v4 review, 500-concurrent-browser + 50-concurrent-reservation load test, PITR drill, UAT, launch. |

**Calendar**: ~6 months with 6–8 engineers running backend + frontend streams in parallel.

---

## 🔓 Open business / procurement items (run in parallel)

These are non-blockers for Sprint 0 but gate later sprints:

1. **Vendor agreements / API access** — KNET, Al Ahli Bank, Kuwait Insurance, e-signature provider. Start procurement immediately. (Inspection is in-house — Behbehani's own team, no third-party vendor.)
2. **WhatsApp Business + SMS sender ID** — Meta business verification + Kuwait sender ID approval lead times can run weeks.
3. **360° photography process** — who shoots, what rig, storage path, hotspot tagging workflow. Need owner + SOP.
4. **Delivery fleet** — own drivers vs 3rd-party; GPS device or driver PWA?
5. **In-house inspection report format** — PDF + structured JSON, schema versioning, tablet capture → admin sync flow.
6. **Maintenance workshop integration** — in-house workshop? How does status flow back?
7. **Civil ID / KYC residency** — confirm CITRA Reg 26/2024 permits AWS `me-south-1` for Kuwait PII.
8. **Payment milestones** — internal budgeting tied to sprint plan.

---

## 🚫 Explicitly out of scope (do not let scope creep)

Per the reconciliation in the master plan, **dropped from both phases**:

- Marketplace model (third-party listings)
- §3.4 Concierge Sell Service
- §3.5 Self-Service Classified Listings
- §3.6 (historical scope note — superseded; inspection capture is now in-house per project_inspection_internal.md)
- §3.8 Car Services Marketplace
- §3.9 Consumer-facing dealer/showroom module
- §3.11 In-app chat / masked-number calls / leads CRM (CS uses WhatsApp Business only)
- Test Drive booking
- Make-an-Offer on consumer listings (B2B-auction only, Phase 2)
- Multiple-bank fan-out (Al Ahli only Phase 1; adapter pattern preserved)
- Huawei AppGallery / HMS Push Kit
- MOI Traffic Department integration
- Automated Civil ID OCR / KYC provider
- Data warehouse (BigQuery/Snowflake/Redshift)
- OBD-II diagnostic readers
- Value Tracker monthly emails, Referral program, App-exclusive deals (all `Could` priority — defer)

Any future ask to add one of these requires re-opening the plan.

---

## 🚀 How to run locally

```bash
npm install
cp .env.example .env
npm run dev:services           # docker compose up -d postgres redis minio mailhog
npm run serve:api              # http://localhost:3333
npm run serve:web              # http://localhost:4200
npm run serve:admin            # http://localhost:4201
```

Demo login (in-memory until Sprint 1): `demo@behbehani-cpo.com` / `Demo!Pass8`.

---

## ✅ Sprint 0 acceptance checklist (from plan)

- [x] `npx nx serve api && nx serve web && nx serve admin` all start.
- [x] Locale toggle flips `dir="rtl"` and URL prefix (`/ar/...`).
- [x] Bad JWT → 401; valid JWT passes `requireAuth`; missing role → 403.
- [x] CI workflow defined (`.github/workflows/ci.yml`).
- [ ] **Terraform plan succeeds against AWS `me-south-1`** — still pending; Terraform skeleton not written.
- [ ] **Repo initialised in git** — pending.

Closing these two items finishes Sprint 0 cleanly before kicking off Sprint 1.

---

## Sprint 4 Inspection · W3 — Admin frontend (2026-05-18)

**Goal:** Wire the W2 backend into a tablet-responsive admin UI matching the
approved mockups in `mockups/admin/sprint-4-inspection/`. Inspection officers
work in the field on tablets — touch targets ≥ 44 px, photo upload uses
`capture="environment"` for the back camera, signature pad uses pointer events
(not mouse-only).

### Files added

- **[libs/data-access/src/lib/admin-inspections.service.ts](libs/data-access/src/lib/admin-inspections.service.ts)** — `AdminInspectionsService` with `list`, `get`, `create`, `saveProgress`, `presignPhoto`, `signoff`, `resendSignLink`, `revokeSignLink`. Detail type re-exported as `InspectionDetailDto`.
- **[apps/admin/src/app/features/inspections/shared/inspection-labels.ts](apps/admin/src/app/features/inspections/shared/inspection-labels.ts)** — `KIND_LABELS`, `STATUS_LABELS`, chip class maps. ADVISORY amber on admin (per project_admin_design_decisions memory).
- **[apps/admin/src/app/features/inspections/list/inspection-list.component.ts](apps/admin/src/app/features/inspections/list/inspection-list.component.ts)** — Queue page: URL-synced filters, kind/status chip filters, server pagination, status-driven "Start / Resume / Review & sign" row action label.
- **[apps/admin/src/app/features/inspections/edit/inspection-edit.component.ts](apps/admin/src/app/features/inspections/edit/inspection-edit.component.ts)** — Full 71-item rubric scoring page. Sticky section nav chips. Debounced auto-save (800 ms). "Proceed to sign-off" disabled until all 71 items scored AND every FAIL has notes.
- **[apps/admin/src/app/features/inspections/edit/inspection-item-row.component.ts](apps/admin/src/app/features/inspections/edit/inspection-item-row.component.ts)** — Per-item PASS/ADVISORY/FAIL pills + notes textarea + photo strip. `capture="environment"` on the file input opens the back camera on tablets.
- **[apps/admin/src/app/features/inspections/signoff/signature-pad.component.ts](apps/admin/src/app/features/inspections/signoff/signature-pad.component.ts)** — Drawn signature pad using `pointerdown/move/up` (not `mousedown` → works for finger + stylus). Emits inline SVG string. Supports clear + redraw on resize.
- **[apps/admin/src/app/features/inspections/signoff/inspection-signoff.component.ts](apps/admin/src/app/features/inspections/signoff/inspection-signoff.component.ts)** — Score circle + counts + items-needing-attention. Branches by kind: CPO → 1-step inspector sign-off; Concierge → 2-step inspector + customer with `in_person` (pad + typed name + 3 acks) or `remote_link` (server SMS+email). Type-to-confirm "SIGN OFF" gate. Resend/revoke for awaiting-customer-sig state.

### Files modified

- **[libs/data-access/src/index.ts](libs/data-access/src/index.ts)** — exported `admin-inspections.service`.
- **[apps/admin/src/app/app.routes.ts](apps/admin/src/app/app.routes.ts)** — added `/operations/inspections`, `/:id`, and `/:id/signoff` lazy routes.
- **[apps/admin/src/app/layout/admin-shell.component.ts](apps/admin/src/app/layout/admin-shell.component.ts)** — added Inspections nav entry under Operations, gated to `inspection_officer | operations_manager | general_manager`.

### Design notes / decisions

- **No mockup-vs-impl drift:** mockup amber ADVISORY pill kept on admin; customer-facing storefront uses slate scale (per project_brand_split memory).
- **Photo upload flow:** click "Take/upload" → presign → PUT to S3 → patch `photoKeys[]` via the next autosave. Spinner state lifted to the parent so a single global "uploading" indicator works regardless of which row is active.
- **Signature persistence:** drawn signature is serialized to inline SVG `<svg viewBox=...><path d="..."/></svg>` and sent as `drawnSignatureSvg` in the signoff payload. Server stores to S3.
- **State-driven UI:** signed-off and awaiting-customer-signature inspections are read-only. The edit page hides item action buttons; the signoff page hides the form and shows the link panel.
- **Stale schema migration:** the user still needs to run `npm run prisma:migrate` (name suggested: `add_inspection_concierge_signature_fields`) to materialize W1's schema delta. Frontend works against the schema today via type-only generation; runtime needs the migration applied before the API can serve real requests.

### Verification

- `npx nx run-many -t build --projects=admin,api,shared-types,data-access` — all green, no warnings.
- `npx nx run-many -t test --projects=shared-types,data-access,admin` — all green. Admin: 7 tests. Data-access: 12. Shared-types: 84.
- API tests (167) and shared-utils (10) remain green from W2.

### Pending

- DB migration (`prisma:migrate`) so the API can serve `/v1/admin/inspections` against the new columns.
- W4 — QA pass: tester (manual smoke test on a tablet + 2-3 e2e specs), reviewer (security + accessibility), then attach generated PDFs to listings on sign-off (PDF generator is currently a stub in the service).

---

## Sprint 4 Inspection · W3 rebuild (2026-05-18)

**Why a rebuild:** User pushed back on the original W3 saying "the UI is too poor compare to what you have proposed" and reported a redirect-to-dashboard bug when clicking filter chips. Also flagged that the main thread had done all the work instead of delegating to ruflo-style named agents.

**How it was done this time:** spawned a 4-agent pipeline (researcher → architect → coder → reviewer) in one message with `run_in_background: true` and `name: ...`, then kicked off via `SendMessage` to `researcher`. Known limitation: spawned agents do NOT have `SendMessage` in their tool registry, so inter-agent comm via SendMessage didn't work — the orchestrator (main thread) acted as the message relay between coder ← architect plan and post-coder verification.

### Dashboard-redirect bug — root cause + fix

**File**: [inspection-list.component.ts:286-297](apps/admin/src/app/features/inspections/list/inspection-list.component.ts)

Old code:
```ts
this.router.navigate([], {
  relativeTo: this.route,
  queryParams,
  replaceUrl: true,
  queryParamsHandling: '',
});
```

Two bugs combined:
1. `relativeTo: this.route` + empty commands array, when called from inside a `switchMap` on a lazy-loaded route under the admin shell, re-anchors to the shell's parent outlet — so the URL collapses to `/`. Wildcard route `{ path: '**', redirectTo: '' }` lands on the dashboard.
2. `queryParamsHandling: ''` is not a valid value (valid: `'merge' | 'preserve'` or omit). Empty string is coerced unpredictably.

Fix:
```ts
this.router.navigate(['/operations/inspections'], { queryParams, replaceUrl: true });
```

Absolute path + no `relativeTo` + no `queryParamsHandling`. Same pattern applied to the post-signoff redirect in [inspection-signoff.component.ts](apps/admin/src/app/features/inspections/signoff/inspection-signoff.component.ts).

### Files changed / added

3 rewrites:
- [list/inspection-list.component.ts](apps/admin/src/app/features/inspections/list/inspection-list.component.ts) — 299 lines. KPI strip, action buttons, chip filters, signal-driven filter + bug fix.
- [edit/inspection-edit.component.ts](apps/admin/src/app/features/inspections/edit/inspection-edit.component.ts) — 493 lines. Concierge prelude, autosave badge, sticky section nav, signal-driven collapsibles, proceed-to-signoff guard.
- [signoff/inspection-signoff.component.ts](apps/admin/src/app/features/inspections/signoff/inspection-signoff.component.ts) — 432 lines. Stepper, score banner, dual-column report summary, dual-mode customer signature, finalize gate.

9 new sub-components (all standalone, OnPush, Tailwind-only):
- [list/inspection-kpi-strip.component.ts](apps/admin/src/app/features/inspections/list/inspection-kpi-strip.component.ts) — 4-tile dashboard
- [list/inspection-table.component.ts](apps/admin/src/app/features/inspections/list/inspection-table.component.ts) — presentational table
- [edit/concierge-prelude.component.ts](apps/admin/src/app/features/inspections/edit/concierge-prelude.component.ts) — Vehicle/Customer/Location 3-card grid for Concierge
- [edit/inspection-section-nav.component.ts](apps/admin/src/app/features/inspections/edit/inspection-section-nav.component.ts) — sticky chip rail
- [edit/inspection-section-card.component.ts](apps/admin/src/app/features/inspections/edit/inspection-section-card.component.ts) — signal-driven collapsible section
- [signoff/score-circle.component.ts](apps/admin/src/app/features/inspections/signoff/score-circle.component.ts) — SVG ring score viz
- [signoff/signoff-stepper.component.ts](apps/admin/src/app/features/inspections/signoff/signoff-stepper.component.ts) — 4-step (Concierge) / 3-step (CPO)
- [signoff/customer-signature-mode.component.ts](apps/admin/src/app/features/inspections/signoff/customer-signature-mode.component.ts) — in_person ↔ remote_link toggle
- [signoff/signoff-report-summary.component.ts](apps/admin/src/app/features/inspections/signoff/signoff-report-summary.component.ts) — section scores + attention items

Unchanged: `inspection-item-row.component.ts` (capture="environment" preserved), `signature-pad.component.ts` (pointer events preserved), `shared/inspection-labels.ts`.

### Verification

- `npx nx run-many -t build --projects=admin,data-access,shared-types,api --skip-nx-cache` — green, zero warnings, 17.3s admin bundle.
- `npx nx run-many -t test --projects=admin,data-access,shared-types` — green: 84 + 12 + 7 = 103 tests.
- Bug fix grep-verified at file:line.

### Coordination lessons learned

- The CLAUDE.md SendMessage-first pattern works for ORCHESTRATOR → AGENT but not AGENT → AGENT (spawned agents lack SendMessage in their tool registry).
- Practical pattern: spawn the team in one message with `run_in_background: true`, then the orchestrator relays each completion notification to the next agent via SendMessage.
- Reviewer should be spawned AFTER the coder reports done — spawning it upfront causes it to run against pre-rebuild code.

---

## Sprint 4 Inspection · W3 polish phase (2026-05-18)

**Why a polish phase:** even after the W3 rebuild matched mockup *structure*, the user still said "the UI is very bad — spinout ruflo agents to improve". Trigger: user-perceived polish gap, not functional bug.

**Pipeline used:** ui-designer (Heroicons-pattern visual auditor) → orchestrator (relay) → frontend-developer (polisher). Single hand-off, no parallel review — leaner than the full 4-agent pipeline used for the rebuild.

**ui-designer output:** 50-item polish punch list with file:line + before/after class shapes + 8 SVG icon paths. Covers typography, spacing rhythm, icon usage, card chrome, interactive states, color tones, micro-animations, tablet density.

**Polisher result:** 37 items applied / 0 skipped / 1 conflict resolved correctly (item 35 reverted an earlier pre-punch-list color drift back to bg-slate-300 customer avatar per the explicit "no change" instruction) / 4 deferred (need DTO additions — rendered as `—` placeholders, no build breakage).

### Files changed (15 total)

- `apps/admin/src/index.html` — Inter font preconnect + stylesheet
- `apps/admin/src/app/features/inspections/shared/inspection-labels.ts` — status chip tones tightened
- All 12 inspection components touched (KPI tile rounding, chip icons, customer glyphs, sun-icon status badge, skeleton shimmer loaders, FAIL row tint, pill touch targets, photo upload polish, not-yet-scored hint, score circle circumference math, PDF preview h-56 + dashed, inspector identity polish, validation message recolored red, remote-link `<details>` preview, customer-method emoji prefixes)

### Deferred items — require DTO field additions on `InspectionDetailDto`

| Item | Fields needed | Renders as |
|---|---|---|
| 16 | `vehicleYear`, `vehicleMake`, `vehicleModel`, `vehicleMileage`, `vehicleTransmission` | `—` placeholders; Make/Model uses `vehicleLabel` proxy |
| 17 | `customer.email` | `—` in dl row |
| 20 | `locationAddress`, `locationGovernorateName` | `—` italic |
| 31 | `inspector.employeeNumber`, `startedAt` | "employee #—" and "Started —" |

These fields exist in the Prisma schema (W1 added them) but aren't surfaced through the admin API DTO yet. Backend work to expose them is a small W2-followup ticket.

### Verification

- `nx build admin,data-access,shared-types,api --skip-nx-cache` → green, zero warnings, 14s admin bundle
- `nx test admin,data-access,shared-types --skip-nx-cache` → 84 + 12 + 7 = 103 tests passing
- Visual verification: NOT done — green build ≠ rendered page (per `feedback_visual_verification_required` memory)

---

## Sprint 4 Inspection · parallel-swarm phase (2026-05-18)

**Trigger:** user asked to run two follow-ups in parallel via ruflo agents — (1) surface the deferred DTO fields so the `—` placeholders disappear, (2) visually verify the polished UI.

**Pipeline:** 2 agents spawned in one message, both `run_in_background: true`:
- `backend-fields-surfacer` (subagent_type: backend-dev) — DTO additions
- `ui-verifier` (subagent_type: ui-ux-tester) — verification

### backend-fields-surfacer result (✅ landed)

Added to `InspectionSummaryDtoSchema`: `customer.email`, `vehicleYear`, `vehicleBrandName`, `vehicleModelName`, `vehicleMileageKm`, `vehicleTransmission`, `locationAddress`, `locationGovernorate`, `startedAt`. All concierge-gated except `customer.email` (always when present) and `startedAt` (uses `scheduledFor ?? createdAt`). `inspector.employeeNumber` genuinely skipped — `User` model lacks the column; adding it would require a separate Prisma migration. Concierge prelude and inspector identity card now render real data with `—` fallbacks only on null. Files touched: [shared-types/inspection.schemas.ts:263](libs/shared/types/src/lib/inspection.schemas.ts:263), [api/inspections.service.ts:113](apps/api/src/inspections/inspections.service.ts:113), [concierge-prelude.component.ts](apps/admin/src/app/features/inspections/edit/concierge-prelude.component.ts), [inspection-signoff.component.ts:181](apps/admin/src/app/features/inspections/signoff/inspection-signoff.component.ts:181).

### ui-verifier result (✅ produced 12 defects)

Did code inspection (not browser rendering — sub-agents don't have preview tools). Identified 12 defects across the 3 pages.

### Defect batch — applied on main thread

| ID | Sev | Fix |
|---|---|---|
| DEF-02 | HIGH | Tailwind safelist for `bg-blue-50/40`, `bg-red-50/40`, `bg-brand-50/40` ([apps/admin/tailwind.config.js](apps/admin/tailwind.config.js)) — prevents JIT purging of opacity tints in production builds. |
| DEF-06 | LOW | Stepper step 1 active flag now tied to status (only active while review/scoring; complete-only afterward). [signoff-stepper.component.ts](apps/admin/src/app/features/inspections/signoff/signoff-stepper.component.ts) |
| DEF-07 | LOW | PDF preview inner container border: `border-dashed` → solid. |
| DEF-09 | LOW | Customer signature mode card uses `bg-brand-50/40` (40% opacity) on selected option. |
| DEF-10 | MED | `canEditSignoff()` now requires `awaiting_inspector_signoff` (not `in_progress`). Added `notReadyForSignoff` computed + banner UI directing user back to the form. |
| DEF-11 | LOW | Concierge queue rows now show `· 📍 {locationGovernorate}` when present. |
| DEF-05 | — | False positive — rubric keys match `engine_drivetrain`. |
| DEF-03/04/08 | — | Resolved by backend-fields-surfacer's prelude rewrite. |
| DEF-01/12 | LOW | Deferred — inspector filter dropdown + advisoryCountThisWeek deferred to follow-up (require user list endpoint + reportJson aggregation). |

### Verification

- `nx build admin,api,data-access,shared-types --skip-nx-cache` → green, zero warnings
- `nx test admin,data-access,shared-types,api --skip-nx-cache` → all green: api 167 + shared-types 84 + data-access 12 + admin 7 = 270 tests
- Browser preview: attempted via `mcp__Claude_Preview__preview_start admin`; the underlying nx serve responds 200 on :4201, but the preview tool's Chrome instance closes the target between start and screenshot (infra flake, not a code issue). Visual verification stopped at code-level diff.

### Remaining follow-ups (non-blocking)

- DEF-01 — inspector filter dropdown on queue (needs admin-user-list endpoint)
- DEF-12 — advisoryCountThisWeek in KPI strip (needs `signed_off_count` + advisory aggregation on the API)
- Optional — add `User.employeeNumber` (Prisma migration) to restore the "employee #INS-04" identity sub-line
- Pending from W2 — `npm run prisma:migrate` so the API can serve the new InspectionReport columns at runtime

---

## Sprint 4 Inspection · iteration-3 swarm (2026-05-18)

**Trigger:** user said UI still didn't match mockups, photo evidence preview was broken, asked for ruflo swarm to verify everything + update UX/UI + optimize the process.

**Pipeline:** orchestrator drove this round more aggressively — rendered the live admin in Chrome FIRST to capture concrete evidence, then dispatched two parallel agents with that evidence in hand.

### What the orchestrator caught from the actual rendered DOM

1. **Photo evidence thumbnails broken** — `uploadAndAttach` was pushing `presign.s3Key` (raw S3 key) into `photoKeys`, but `photoUrlFor(key)` returned `/${key}` — a useless relative path. Fixed at [inspection-edit.component.ts](apps/admin/src/app/features/inspections/edit/inspection-edit.component.ts) by storing `presign.publicUrl` instead.
2. **PASS/ADVISORY/FAIL pills rendering as huge circles** — `min-h-[44px] min-w-[44px]` + `rounded-full` on short text = circle. Fixed by removing `min-w` and adding `px-4` so the pill is oblong while the touch target stays ≥ 44px tall.
3. **Score column showing `92` for "Awaiting start" rows with `0/71` progress** — seed data has overallScore set even for unstarted reports. Defensive frontend fix: hide score when `scoredCount === 0`. Fixed at [inspection-table.component.ts](apps/admin/src/app/features/inspections/list/inspection-table.component.ts).

### Lane A — ux-overhaul agent (frontend-developer)

8 defects identified, 8 fixed across 4 files:
- [shared/inspection-labels.ts](apps/admin/src/app/features/inspections/shared/inspection-labels.ts) — STATUS_CHIP_CLASS corrected (in_progress → slate, awaiting_inspector_signoff → brand-50/700 lighter)
- [edit/inspection-section-nav.component.ts](apps/admin/src/app/features/inspections/edit/inspection-section-nav.component.ts) — removed `min-h-[44px]` from scroll-anchor chips so they render tight
- [signoff/score-circle.component.ts](apps/admin/src/app/features/inspections/signoff/score-circle.component.ts) — `stroke-dashoffset` corrected to 25 and circumference back to 100 (the radius 15.9155 was chosen specifically so 2π × r ≈ 100, making dasharray map 1:1 to score)
- [apps/admin/tailwind.config.js](apps/admin/tailwind.config.js) — added `hover:bg-blue-50`, `hover:bg-slate-50`, `hover:bg-brand-100`, `hover:bg-brand-700`, `bg-brand-50`, `text-brand-700`, `bg-amber-50/40` to safelist AND added missing `brand-200`/`brand-800` colour tokens (these were silently failing in the rendered CSS)

### Lane B — photo-migrator agent (backend-dev)

Chose Option A — server-side hydration on read.
- [apps/api/src/inspections/inspections.service.ts](apps/api/src/inspections/inspections.service.ts) — `hydrateReportPhotoUrls(report)` helper walks `reportJson.items[].photoKeys[]` and rewrites any non-http entry to `publicUrl(key)`. Idempotent.
- [apps/api/src/inspections/inspections.controller.ts](apps/api/src/inspections/inspections.controller.ts) — `GET /v1/admin/inspections/:id` and `PATCH /v1/admin/inspections/:id` both wrap their `readReportJson(row)` calls in the hydrator.
- 2 new specs added in inspections.service.spec.ts covering legacy key rewriting + idempotency

### Browser verification (the new norm)

Rendered all 3 pages in Chrome via `mcp__Claude_in_Chrome` tools (preview tool was flaky earlier — this connector is stable):
- **Queue page** ✅ Score column shows `—` for awaiting-start rows, `92` only for the in_progress row. Status pills look proper. KPI strip clean.
- **Edit page** ✅ Pills now correctly oblong (PASS gray, ADVISORY gray, FAIL red) on the Hood row with FAIL active. Section nav chips compact. Notes textareas with red borders for FAIL items. ⚠ ONE legacy photo thumbnail still shows broken — that's a data issue (seed data references a file that was never uploaded to the dev S3/MinIO bucket); backfill is returning a valid http URL but the file 404s.
- **Sign-off page** ✅ Score circle 92/100 with proper arc fill, stepper with connecting lines, "Not ready for sign-off" amber banner showing (DEF-10 guard working), section scores grid + items needing attention 2-col, PDF preview with solid border + document icon, Inspector form correctly hidden because canEditSignoff is false for in_progress.

### Verification

- `nx build admin,api,data-access,shared-types --skip-nx-cache` → green
- `nx test admin,api,data-access,shared-types --skip-nx-cache` → 272 tests passing (api 169 + shared-types 84 + data-access 12 + admin 7)
- Browser screenshots captured for all 3 pages

### Remaining (deferred, non-blocking)

- KPI subtitle counts are page-1-only — needs a `GET /v1/admin/inspections/kpi` endpoint returning per-status totals for the full dataset. Pure backend ticket.
- DEF-01 — inspector filter dropdown on queue (needs admin-user-list endpoint)
- The one legacy photo's underlying S3 file doesn't exist. Either re-upload via the form (new uploads use the publicUrl path) or seed the dev bucket with actual files.
- Pending from W2 — `npm run prisma:migrate`

