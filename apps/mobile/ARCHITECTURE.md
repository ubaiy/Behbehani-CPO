# Behbehani CPO Mobile — Architecture (W1 Foundation)

> **Owner:** Session C (mobile) · **Status:** v0.2 — rewritten 2026-05-19 to cover the full W1 scope brief
> **Stack (locked):** Expo SDK 52+ · React Native 0.76 · TypeScript · expo-router v4 · iOS App Store + Google Play (Huawei dropped per locked plan)
> **Brand (locked):** Royal Blue `#1E3A8A` + Plus Jakarta Sans — matches `apps/web` customer site, NOT the admin CPO brand.
>
> This document is the architectural source of truth for the **W1 foundation wave only**. W2 (auth + listings screens), W3 (sell/services/finance), W4 (release pipeline) will each extend, not replace, this doc. Reviewer enforces the constraints in §10.

---

## 0. Snapshot — what already exists in `apps/mobile/`

A previous foundation pass landed scaffolding before this architecture doc was rewritten. The architecture must accommodate the following (changing them is in scope only if this doc justifies it):

| File | Status | Notes |
|---|---|---|
| `apps/mobile/package.json` | exists | Expo SDK 52, expo-router 4, secure-store, local-authentication, localization, axios, i18next, react-i18next. Workspace dep on `@behbehani-cpo/shared-types`. Embeds an `nx` block registering `typecheck`/`lint`/`test` as command targets. |
| `apps/mobile/app.json` | exists | scheme `behbehani-cpo`, bundle id `com.behbehani.cpo`, splash background `#1E3A8A`, plugins for router/font/secure-store/local-authentication. |
| `apps/mobile/tsconfig.json` | exists | `jsx: react-native`, `moduleResolution: bundler`, path alias `@behbehani-cpo/shared-types` → `libs/shared/types/src/index.ts`. |
| `apps/mobile/babel.config.js` | exists | `babel-preset-expo` + `react-native-reanimated/plugin`. Order is correct — do not reorder. |
| `apps/mobile/.env.example` | exists | `EXPO_PUBLIC_API_URL=http://localhost:3000`. |
| `apps/mobile/src/theme/theme.ts` | exists, complete | Palette + typography + spacing + RTL helpers — already satisfies §7. **Do not modify in W1.** |
| `apps/mobile/src/i18n/locales/{en,ar}.json` | exists, sparse | Covers `app.title`, `nav.*`, `common.*` only. Mobile-scaffold expands these. |
| Earlier ARCHITECTURE.md (v0.1) | superseded | Captured a narrower 4-tab plan. v0.2 (this doc) replaces it. |

**Missing pieces W1 scaffold must add** (mobile-scaffold agent owns this work):

- `apps/mobile/src/app/` — expo-router file tree (`_layout.tsx`, `(tabs)/_layout.tsx`, 8 tab routes, hidden routes).
- `apps/mobile/src/services/{http,auth,storage,biometrics,deeplinks}.ts`.
- `apps/mobile/src/hooks/`, `apps/mobile/src/components/`, `apps/mobile/src/screens/`, `apps/mobile/src/native/`.
- `apps/mobile/src/i18n/index.ts` — i18next init + RTL bootstrap.
- `apps/mobile/metro.config.js` — `watchFolders` for shared libs (see §1).
- `apps/mobile/eas.json` — stub (real content is W4).
- `apps/mobile/assets/fonts/PlusJakartaSans-{Regular,Medium,SemiBold,Bold}.ttf`.
- `libs/data-access-mobile/` — new sibling lib (see §3).

---

## 1. Nx integration — `@nx/expo` vs command-target shim

### Decision: **stay on command-target shims (status quo), file a follow-up to evaluate `@nx/expo` in W4**

Current `apps/mobile/package.json` declares Nx targets via inline `nx.targets` that shell out to `tsc --noEmit`, `eslint`, and `jest`. This works *today* (`nx typecheck mobile`, `nx lint mobile`, `nx test mobile` all run) but there is no first-class `nx serve mobile` or `nx build mobile`.

| Option | Pros | Cons |
|---|---|---|
| **A. Install `@nx/expo` plugin** | First-class `nx serve mobile` / `nx build mobile`; caches Metro bundles; integrates with Nx affected/release; auto-detects EAS configs. | Bumps several peer deps (Metro, `@nx/react`, `@nx/js`); requires `react-native` peer install; v22.7 has reported compatibility friction with Expo SDK 52 new arch; adds ~120 MB to `node_modules`. |
| **B. Custom command targets only (status quo)** | Zero new deps; no risk to the Angular/Express builds. The `nx` block already works. | `nx serve mobile` and `nx build mobile` are NOT available — devs must `cd apps/mobile && expo start`. No Metro bundle caching by Nx. |
| **C. Hybrid — keep command targets, add two thin wrappers** ★ | Restores `nx serve mobile` (→ `expo start`) and `nx build mobile` (→ `eas build --non-interactive`) without pulling `@nx/expo`. Affected graph still gets wired via `implicitDependencies`. | Wrappers don't cache the Metro output; that's a W4 follow-up. |

**Pick: Option C for W1.** Extend the existing `nx.targets` block to add `serve` and `build` command targets and declare implicit deps on shared libs:

```jsonc
"nx": {
  "name": "mobile",
  "targets": {
    "serve":     { "command": "expo start",                "options": { "cwd": "{projectRoot}" } },
    "build":     { "command": "eas build --non-interactive","options": { "cwd": "{projectRoot}" } },
    "typecheck": { "command": "tsc --noEmit",              "options": { "cwd": "{projectRoot}" } },
    "lint":      { "command": "eslint . --ext .ts,.tsx",   "options": { "cwd": "{projectRoot}" } },
    "test":      { "command": "jest --passWithNoTests",    "options": { "cwd": "{projectRoot}" } }
  },
  "implicitDependencies": ["shared-types", "data-access-mobile"]
}
```

In W4 we re-evaluate `@nx/expo` once Nx 23 ships. Until then, the shim gives us all five verbs the user asked for (`serve`, `build`, `typecheck`, `lint`, `test`) without touching the existing Angular/Express toolchain.

### `nx.json` — DO NOT MODIFY in W1

The root `nx.json` registers `@nx/webpack/plugin`, `@nx/js/typescript`, `@nx/jest/plugin`, `@nx/eslint/plugin`, `@nx/playwright/plugin`. We are NOT adding `@nx/expo/plugin`. Mobile advertises targets via its inline `nx` block — Nx 22 picks these up via the project-graph inference path. Risk: zero, as verified by `nx test mobile` already running today.

### Metro vs Webpack node_modules conflict — watch list

Expo Metro hoists its own `metro`, `metro-config`, `metro-resolver`, `@expo/metro-config`, and a `react-native` install that Nx's `@nx/webpack/plugin` does NOT need but WILL scan when computing the project graph. Three concrete traps:

1. **Hoisting collisions on `react`.** npm workspaces hoist `react`/`react-dom`. Root currently pins only `react-refresh: ^0.10.0` (devDep) and has no `react` runtime dep. Metro needs `react@18.3.2` from mobile's own dep list. **Keep the workspace `package.json` for mobile as the ONLY `react` runtime dep declarator** — adding `react` to root will silently bind Metro to the root copy and produce "Invalid hook call" errors.
2. **Webpack plugin scanning mobile.** `@nx/webpack/plugin` walks the workspace for `webpack.config.js`. The mobile app has none, so it's skipped. **DO NOT add `webpack.config.js` under `apps/mobile/`** — even a stub triggers Nx to webpack-build it, which fails on RN-only imports. Metro is the sole bundler.
3. **Reanimated babel plugin order.** `babel-preset-expo` MUST precede `react-native-reanimated/plugin` (already correct in `babel.config.js`). Reordering silently breaks animations in release builds only — a field-debugging nightmare.

A follow-up `metro.config.js` (mobile-scaffold to add) will set `watchFolders` to `libs/shared/types` and `libs/data-access-mobile` so Metro's file scan stays tight.

---

## 2. Folder layout under `apps/mobile/src/`

```
apps/mobile/
├── app.json                 (exists)
├── package.json             (exists — nx.targets extended per §1)
├── tsconfig.json            (exists)
├── babel.config.js          (exists)
├── metro.config.js          NEW — watchFolders for shared-types + data-access-mobile
├── eas.json                 NEW — stub only (W4 owns real content)
├── .env.example             (exists)
├── assets/
│   ├── fonts/               NEW — PlusJakartaSans-*.ttf (4 weights)
│   ├── icon.png             NEW — 1024×1024 (or use shared brand icon)
│   ├── adaptive-icon.png    NEW — 1024×1024 Android adaptive foreground
│   └── splash.png           NEW — Royal Blue background per app.json
└── src/
    ├── app/                                       NEW — expo-router file-based routes (§4)
    │   ├── _layout.tsx                            Root layout: fonts, i18n init, secure-store hydrate, theme + auth providers
    │   ├── (tabs)/
    │   │   ├── _layout.tsx                        Tabs config; visible-tab subset decision (§4)
    │   │   ├── index.tsx                          Home
    │   │   ├── browse.tsx                         Buy/Browse
    │   │   ├── sell.tsx                           Sell
    │   │   ├── services.tsx                       Services
    │   │   ├── finance.tsx                        Finance
    │   │   ├── maintenance.tsx                    Maintenance
    │   │   ├── favorites.tsx                      Favorites
    │   │   └── account.tsx                        Account
    │   ├── listing/[id].tsx                       VDP — hidden from tab bar
    │   ├── reserve/[listingId].tsx                Reservation wizard root
    │   ├── reserve/[listingId]/step/[n].tsx       Wizard steps
    │   ├── inspection-sign/[token].tsx            Customer e-sign deep link (no auth)
    │   ├── auth/sign-in.tsx
    │   ├── auth/sign-up.tsx
    │   ├── auth/otp.tsx                           Renders "coming soon" until API 501 stub is resolved
    │   ├── search.tsx                             Standalone search modal
    │   └── +not-found.tsx
    ├── components/                                NEW — pure presentational primitives
    │   ├── Button.tsx
    │   ├── Card.tsx
    │   ├── Skeleton.tsx
    │   ├── EmptyState.tsx
    │   ├── ListingCard.tsx
    │   └── …
    ├── screens/                                   NEW — composed screen bodies (decouples route file from view)
    │   ├── home/HomeScreen.tsx
    │   ├── auth/SignInScreen.tsx
    │   └── …
    ├── services/                                  NEW — non-UI singletons
    │   ├── http.ts                                axios instance + auth interceptor + refresh-queue
    │   ├── auth.ts                                signIn/signUp/refresh/signOut + biometric gate
    │   ├── storage.ts                             facade over secure-store (sensitive) + AsyncStorage (cache)
    │   ├── biometrics.ts                          expo-local-authentication wrapper + capability detect
    │   └── deeplinks.ts                           expo-linking parser → router paths
    ├── hooks/                                     NEW — useAuth, useTheme, useLocale, useListings (W2 fills)
    ├── theme/
    │   └── theme.ts                               (exists, complete)
    ├── i18n/
    │   ├── index.ts                               NEW — i18next.init + RTL bootstrap (§6)
    │   └── locales/{en,ar}.json                   (exists, sparse)
    └── native/                                    NEW — Expo config plugins (mostly W4)
        └── README.md
```

**Why `app/` + `screens/` split:** expo-router files in `app/` stay thin — parse params, render the matching screen component from `screens/`. Keeps routing testable (snapshot tests on the route file) and screen logic reusable (e.g. `SignInScreen` embeddable in onboarding without router involvement).

---

## 3. Lib reuse map

### Safe to import from `libs/shared/types`

All Zod schemas are universal — pure TS with the `zod` peer, no Angular/Node-only imports. Verified by inspection of `libs/shared/types/src/lib/`:

| Export | Mobile-safe? | Notes |
|---|---|---|
| `auth.schemas.ts` — `SignInWithEmailSchema`, `SignInWithMobileSchema`, `RequestOtpSchema`, `VerifyOtpSchema`, `RegisterWithEmailSchema`, `RefreshSchema`, `PublicUser`, `AuthSession` | YES | Mobile auth flows match byte-for-byte. |
| `listings-public.schemas.ts` | YES | Public listings DTO — owned by parallel storefront session; treat as read-only for mobile. |
| `listings.schemas.ts` | **NO** | Admin DTO — includes `costFils` etc. Mobile must use `listings-public.schemas.ts`. |
| `notify.public.schemas.ts` | YES | Reusable; contract-author adds a push-token sub-schema (NEW file). |
| `saved-listings.public.schemas.ts` | YES | Favorites screen. |
| `media.schemas.ts` | YES | Presigned-upload responses for Sell. |
| `offer.schemas.ts` (customer surface) | YES | Customer-side offer view/accept/decline/counter. |
| `inspection.schemas.ts` (public-shared subset) | YES | Concierge booking + inspection-sign token shape. |
| `roles.ts` — `UserRole`, `AdminRole` | YES | Mobile uses `UserRole = 'customer'` exclusively; type lives here. |
| `dashboard.schemas.ts`, `admin-users.schemas.ts`, `audit-log.schemas.ts`, `aging.schemas.ts`, `pricing.schemas.ts`, `catalog.schemas.ts` | **NO** | Admin-only. Do not import from mobile. |

The `tsconfig.json` path alias `@behbehani-cpo/shared-types` is wired; `jest.moduleNameMapper` mirrors it. **No changes needed.**

### `libs/data-access` is NOT reusable — fork to `libs/data-access-mobile/`

Every file in `libs/data-access/src/lib/` imports from `@angular/core` and `@angular/common/http` (verified — `AuthService` line 1: `import { HttpClient, HttpErrorResponse } from '@angular/common/http';`). None of it works under React Native.

**Decision: create a new sibling lib `libs/data-access-mobile/`** (not a `mobile/` subfolder inside `libs/data-access/`).

**Why sibling, not subfolder:**

1. **Workspace clarity.** `package.json` workspace pattern `libs/*` globs sibling libs as separate npm packages. A `mobile/` subfolder either needs a nested `package.json` (Nx then treats it as two projects under one root — graph confusion) or shares the Angular package's `package.json` and accidentally pulls `@angular/*` peers into the RN bundle.
2. **Bundle isolation.** Metro must NEVER see `@angular/core`. RN code inside the Angular lib means a wrong VS Code import suggestion will compile, then crash at runtime. A sibling lib keeps the boundary at the package level — `@angular/*` is not even installable into mobile.
3. **Test framework split.** `libs/data-access` uses `jest-preset-angular`; mobile uses `jest-expo`. Two presets in one package is fragile.
4. **Future-proof.** When/if `libs/data-access-react` becomes needed for a marketing site, the pattern is established.

### `libs/data-access-mobile/` proposed layout

```
libs/data-access-mobile/
├── package.json              name: @behbehani-cpo/data-access-mobile
├── tsconfig.json
├── tsconfig.lib.json
├── jest.config.cjs           jest-expo preset
├── README.md
└── src/
    ├── index.ts              public exports
    └── lib/
        ├── http-client.ts            axios.create + auth interceptor + refresh-on-401 queue
        ├── api-config.ts             plain factory (NOT a DI token)
        ├── auth.api.ts               signIn/signUp/refresh/me — /v1/auth/*
        ├── listings.api.ts           GET /v1/public/listings, GET /v1/public/listings/:id
        ├── favorites.api.ts          /v1/public/saved-listings/*
        ├── concierge.api.ts          POST /v1/public/concierge/inspections
        ├── inspection-sign.api.ts    GET/POST /v1/public/inspection-sign/:token
        ├── offers.api.ts             customer offer surface
        ├── media.api.ts              presigned upload requests for Sell
        └── notify.api.ts             POST /v1/public/notifications/push-token (NEW endpoint — contract dep)
```

**Critical rule:** every method in `*.api.ts` runs the response through the matching Zod schema's `.parse()`. Parse-at-boundary catches contract drift, same as the web side.

### react-query cache-key conventions (W1 addition — decision C3)

All queries follow a `[resource, variant, ...params]` tuple pattern. Register new keys here before adding hooks in W2:

| Key | Query | staleTime |
|---|---|---|
| `['listings', 'featured']` | Home hero rail (pageSize=12, sort=featured) | 5 min |
| `['listings', 'list', filter]` | Browse/search results (full filter object as key) | 2 min |
| `['listings', 'detail', slug]` | VDP by slug | 10 min |
| `['listings', 'low-mileage']` | Low-mileage rail | 5 min |
| `['me']` | Authenticated user profile | 0 (always fresh) |
| `['favorites']` | Saved listings list | 2 min |

Cache is persisted to AsyncStorage under key `cpo.query-cache` via `PersistQueryClientProvider` in `app/_layout.tsx`.

Peer deps: `@behbehani-cpo/shared-types`, `axios`. **No `@angular/*`. No `rxjs`** (we use promises + react-query, added in W2).

### Additive-only constraints on shared libs

Per `CLAUDE.md` and §17 of `memoryfile.md`, edits to `libs/shared/types` are additive-only across all sessions. Mobile-specific additions (e.g. a `device-token.public.schemas.ts` for push registration) MUST be NEW files, not edits to `auth.schemas.ts`. The contract-author agent owns drafting these and must not modify `listings-public.schemas.ts` (parallel storefront session's surface).

---

## 4. expo-router tab structure (full parity-ready)

Eight bottom-tab routes are scaffolded to match SRS §3.14 parity requirement (Home/Buy/Sell/Services/Account in SRS §5.3, extended with finance/maintenance/favorites which are first-class flows in the web sitemap). Tab order honors the locked customer journey: discovery → transaction → ownership → identity.

```
(tabs)/
├── index.tsx          → "/"            Home          icon: home         i18n: nav.home
├── browse.tsx         → "/browse"      Buy/Browse    icon: search       i18n: nav.buy
├── sell.tsx           → "/sell"        Sell          icon: tag          i18n: nav.sell
├── services.tsx       → "/services"    Services      icon: wrench       i18n: nav.services
├── finance.tsx        → "/finance"     Finance       icon: calculator   i18n: nav.finance
├── maintenance.tsx    → "/maintenance" Maintenance   icon: tool         i18n: nav.maintenance
├── favorites.tsx      → "/favorites"   Favorites     icon: heart        i18n: nav.favorites
└── account.tsx        → "/account"     Account       icon: user         i18n: nav.account
```

**Visibility decision (deferred — Risk #2):** 8 tabs is too many for a bottom bar on phones < 380 px (iPhone SE, many Androids). `(tabs)/_layout.tsx` will render the first 5 as visible tabs (Home, Browse, Sell, Services, Account) and surface Finance/Maintenance/Favorites via a "More" sheet OR sub-routes inside Services/Account. W2 owns that UX via a mockup-first iteration. **All 8 route files exist from day one so deep links work** — only tab-bar visibility is conditional.

### Hidden routes (NOT in tab bar — addressable by URL/deep link)

```
listing/[id].tsx                   → /listing/:id                    VDP
reserve/[listingId].tsx            → /reserve/:listingId             Reservation wizard root (modal stack)
reserve/[listingId]/step/[n].tsx   → /reserve/:listingId/step/:n     Wizard steps
inspection-sign/[token].tsx        → /inspection-sign/:token         Customer e-sign — no-auth, token-gated
auth/sign-in.tsx                   → /auth/sign-in
auth/sign-up.tsx                   → /auth/sign-up
auth/otp.tsx                       → /auth/otp                       "Coming soon" until API OTP stubs resolved
search.tsx                         → /search                         Standalone search modal
+not-found.tsx                     → catch-all
```

### Deep-link / universal-link plan

- **Custom scheme:** `behbehani-cpo://` (already in `app.json`). All hidden routes addressable, e.g. `behbehani-cpo://listing/abc-123`.
- **Universal links:** iOS `apple-app-site-association` and Android `assetlinks.json` will host `behbehani-motors.com` (customer domain — admin domain is irrelevant to mobile). Domain config lives in `app.json` `ios.associatedDomains` and `android.intentFilters` — **stub in W1, populated in W4** when signed certificates exist.
- **Inspection-sign deep link** is the only no-auth route — accepts a single-use token, looks up the inspection report via public-shared endpoint, presents signature pad, posts back. This route MUST NOT trigger the auth interceptor's 401-redirect (services/http.ts exposes a per-request `skipAuthRefresh: true` flag).

---

## 5. Auth strategy

### Storage matrix

| Item | Storage | Why |
|---|---|---|
| Access token (15-min TTL) | `expo-secure-store` (`cpo.auth.access`) | Keychain (iOS) / EncryptedSharedPreferences (Android). |
| Refresh token (30-day TTL) | `expo-secure-store` (`cpo.auth.refresh`) | Same. |
| Access token expiry (ISO-8601) | `expo-secure-store` (`cpo.auth.expires`) | Mirrors web `AuthService` (`libs/data-access/src/lib/auth.service.ts:50`). |
| Cached `PublicUser` JSON | `AsyncStorage` (`cpo.auth.user`) | Non-sensitive; fast first-paint without keychain unlock. |
| Last locale | `expo-secure-store` (`cpo.locale`) | Read at very-early boot before i18n init; survives reinstalls on iOS. |
| Biometric-enabled flag | `expo-secure-store` (`cpo.auth.biometric_enabled`) | User-toggled in Account settings. |

### Refresh flow (mirrors `/v1/auth/refresh`)

The web `AuthService.refresh()` (verified at `libs/data-access/src/lib/auth.service.ts:87-100`) POSTs `{refreshToken}` to `/v1/auth/refresh` and expects an `AuthSession` back. Mobile mirrors:

```
1. Request fires via http.ts axios instance.
2. Response interceptor catches 401.
3. If request.url is /auth/refresh OR request.skipAuthRefresh === true → reject (no loop).
4. Else: enqueue rejected request in refreshQueue, fire ONE refresh call.
   - On success: replay queue with new access token.
   - On failure: clear secure-store, navigate to /auth/sign-in (replaceUrl).
5. New tokens persisted; user signal updated; expiry timestamp re-stored.
```

Standard axios "single refresh in flight" pattern. ~40 lines hand-written in `services/auth.ts` — **do NOT pull in `axios-auth-refresh`** (one more dep, this is straightforward).

### Biometric unlock (FR-MOB-003)

- `expo-local-authentication` for Face ID / Touch ID / Android fingerprint / pattern.
- Capability check at boot: `LocalAuthentication.hasHardwareAsync()` + `isEnrolledAsync()`.
- Settings toggle in Account: "Use Face ID/biometrics to sign in." Toggling ON requires the user to be currently signed in. The refresh token is **already** in keychain; the biometric gate is enforced at *app boot* by `_layout.tsx`: if `cpo.auth.biometric_enabled === '1'` AND a refresh token exists, prompt for biometric BEFORE handing control to the router. On success, proceed to normal refresh flow. On failure, route to `/auth/sign-in`.
- iOS `NSFaceIDUsageDescription` is in `app.json:19`. Android needs no extra permission.

### API stub dependency

Per `memoryfile.md` §"project_api_customer_gap" and verified at `apps/api/src/auth/auth.controller.ts:71-97`:

| Endpoint | Current state | Mobile impact |
|---|---|---|
| `POST /v1/auth/register` | LIVE — 201/200 with `kind` discriminator | Sign-up works in W2. |
| `POST /v1/auth/login` (email or mobile) | LIVE — returns `AuthSession` | Email+password sign-in works in W2. |
| `POST /v1/auth/refresh` | LIVE | Refresh flow works in W2. |
| `POST /v1/auth/otp/request` | **202 stub no-op** | OTP screen exists but cannot complete a sign-in. |
| `POST /v1/auth/otp/verify` | **501** | Same — OTP sign-in is BLOCKED. |
| `GET /v1/auth/google` | **501** | Google sign-in BLOCKED. |
| `GET /v1/auth/apple` | **501** | Apple sign-in BLOCKED. **App Store mandates Apple Sign-In if Google is offered** — flag for W4 release planning. |
| `GET /v1/me` | LIVE | Profile load works. |

**The #1 contract-author dependency carried out of this doc** (see SendMessage at §13).

---

## 6. i18n + RTL

### Library: **`i18next` + `react-i18next` + `expo-localization`** (already in `package.json`)

`@ngx-translate/core` is Angular-only and is NOT in the mobile package — correctly so. `libs/shared/i18n/` is also Angular-only (DI tokens, `TranslateService`). What IS reusable: the **JSON key structure** from `apps/web/public/assets/i18n/{en,ar}.json`. Where keys overlap (e.g. `common.signIn`, `common.cancel`), mobile MUST use the same key path so future shared-key tooling can dedupe. Mobile-only keys get a `mobile.*` prefix.

### `i18n/index.ts` skeleton (mobile-scaffold writes)

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { I18nManager } from 'react-native';
import en from './locales/en.json';
import ar from './locales/ar.json';

const SUPPORTED = ['en', 'ar'] as const;
type Locale = (typeof SUPPORTED)[number];

export async function initI18n(): Promise<Locale> {
  const stored = await SecureStore.getItemAsync('cpo.locale');
  const device = Localization.getLocales()[0]?.languageCode ?? 'en';
  const locale: Locale = (SUPPORTED.includes(stored as Locale)
    ? stored
    : device === 'ar' ? 'ar' : 'en') as Locale;

  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng: locale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

  applyRTL(locale);
  return locale;
}

export async function setLocale(next: Locale): Promise<{ requiresReload: boolean }> {
  await SecureStore.setItemAsync('cpo.locale', next);
  await i18n.changeLanguage(next);
  return applyRTL(next);
}

function applyRTL(locale: Locale): { requiresReload: boolean } {
  const shouldRTL = locale === 'ar';
  if (I18nManager.isRTL !== shouldRTL) {
    I18nManager.forceRTL(shouldRTL);
    I18nManager.allowRTL(shouldRTL);
    return { requiresReload: true }; // caller MUST trigger Updates.reloadAsync() in prod
  }
  return { requiresReload: false };
}
```

**RTL caveat:** `I18nManager.forceRTL` only takes effect after a JS reload (`expo-updates`' `Updates.reloadAsync()`) or app cold-start. The language toggle in Account MUST show "App will restart to apply Arabic" on first switch. After that, the locale persists in secure-store and applies at boot.

`theme.ts` already exposes `rtlMarginStart` / `rtlPaddingStart` etc. — components use these instead of raw `marginLeft`. React Native's built-in `Start`/`End` style props work on modern OSes, but the explicit helpers in `theme.ts` are defensive.

---

## 7. Theme tokens

`apps/mobile/src/theme/theme.ts` (read in full during this design pass) **already satisfies the W1 requirement**:

- `colors.primary` = `palette.royalBlue800` = `#1E3A8A`
- `fontFamily.{regular,medium,semiBold,bold}` = Plus Jakarta Sans family
- Full 4-base spacing scale (`spacing[0]`..`spacing[24]`)
- RTL-aware helpers (`rtlMarginStart`, `rtlPaddingEnd`, etc.)
- Shadow, radius, z-index tokens
- Composite `theme` export with full `Theme` TS type

**Action for mobile-foundation: NO CHANGES TO `theme.ts` in W1.** Use as-is. If W2 needs a missing token (e.g. dark-mode pair), add it then.

Fonts to add at `apps/mobile/assets/fonts/`: `PlusJakartaSans-{Regular,Medium,SemiBold,Bold}.ttf`. Load in `app/_layout.tsx`:

```ts
import { useFonts } from 'expo-font';

const [fontsLoaded] = useFonts({
  PlusJakartaSans_400Regular:  require('../../assets/fonts/PlusJakartaSans-Regular.ttf'),
  PlusJakartaSans_500Medium:   require('../../assets/fonts/PlusJakartaSans-Medium.ttf'),
  PlusJakartaSans_600SemiBold: require('../../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
  PlusJakartaSans_700Bold:     require('../../assets/fonts/PlusJakartaSans-Bold.ttf'),
});
```

**Arabic fallback:** Plus Jakarta Sans does NOT include Arabic glyphs. The system falls back to the platform default Arabic font (San Francisco Arabic / Noto Naskh Arabic) — acceptable for W1. W3 may bundle **Tajawal** to match the web storefront (see Risk #3).

---

## 8. EAS Build vs Fastlane

### Decision: **EAS Build**, exclusive. All release-pipeline work deferred to W4.

| Criterion | EAS Build | Fastlane |
|---|---|---|
| Toolchain weight | Zero local (cloud-build) | Ruby + Xcode CLI + Android SDK + per-machine certs |
| Expo SDK 52 integration | First-class, official | Manual `expo prebuild` then standard fastlane lanes |
| Secrets | EAS Secrets (`eas secret`) | Encrypted files in repo + match/sigh |
| Build minutes for our scale (≤4 builds/week W1-3) | Free tier covers it | Self-hosted = sunk cost, CI runners cost per minute |
| Multi-env (dev/staging/prod) | `eas build --profile <p>` + `app.config.ts` variants | Lane per env, more files |
| OTA updates | EAS Update (free at our user count) | Requires CodePush or self-hosted Updates |
| Team learning curve | Single CLI, JSON config | Ruby DSL + fastfile patterns |

EAS wins decisively for our team size and Expo-first stack. SRS §5.3 specifies "Fastlane" — that recommendation predates EAS Build's maturity. We supersede the SRS here; Fastlane was the right call in 2022, EAS is the right call now.

### W1 deliverable for EAS

- **`apps/mobile/eas.json` STUB** with placeholder `development` / `preview` / `production` profiles — actual signing config, env vars, and submit credentials land in W4. Stub:

```jsonc
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "distribution": "internal" },
    "production":  {}
  },
  "submit": { "production": {} }
}
```

- **No EAS account login in W1.** No build runs. The file exists so `nx build mobile` doesn't error on first execution.

W4 owns: signing certs, AppStoreConnect API key, Google Play service account JSON, environment promotion strategy, beta-channel rollout, crash-reporting wiring (Sentry vs Firebase Crashlytics — separate ADR).

---

## 9. Long-term scope (informational — NOT W1)

SRS §3.14 + §5.3 parity cascades into the following concerns, explicitly OUT OF W1:

- **Push notifications** (FCM Android, APNs iOS) — needs `notify.public.schemas.ts` extension for device-token registration (contract dep, §13).
- **Offline-first reading** (FR-MOB-005) — last-viewed listings + favorites cached. Engine choice (react-query persistence vs WatermelonDB vs manual MMKV) deferred to W2. See Risk #4.
- **Camera-guided photo capture** for Sell (FR-MOB-008) — `expo-camera` with on-device focus/lighting heuristics. W3.
- **App-exclusive deals** (FR-MOB-006) — needs a `channel: 'app'` flag on listings. Sprint 8+ concern; contract-author should NOT add this yet.
- **WhatsApp deep-link entry** (FR-MOB-007) — trivial `Linking.openURL('https://wa.me/...')`. No architecture impact.
- **Crash reporting + analytics** (FR-MOB-010) — Sentry chosen (free tier, EAS integration). W4 separate ADR.
- **Personalized recommendations** on Home (FR-MOB-004) — backend-driven; mobile is a thin consumer. Not mobile-W1.

---

## 10. Constraints the reviewer will enforce

From the user's brief, `CLAUDE.md`, and §17 of `memoryfile.md`. The reviewer agent in W4 will reject any PR that violates:

1. **No edits to `apps/web/**`, `apps/admin/**`, `apps/api/src/**`** controllers/routes in this session.
2. **No edits to `libs/shared/types/src/lib/listings-public.schemas.ts`** (parallel storefront session owns).
3. **No edits to any `/v1/public/*` or `/v1/admin/*` route handler.**
4. **Additive-only to `libs/shared/types`** — NEW files only (e.g. `device-token.public.schemas.ts`); no edits to existing.
5. **Additive-only to `libs/data-access`** — Angular lib must remain green for `apps/web` and `apps/admin`. Mobile gets its own sibling `libs/data-access-mobile/`.
6. **No edits to root `package.json` scripts.** Mobile-specific scripts may be proposed in mobile-scaffold's deliverable; this doc takes no position on whether they land at the root or stay inside `apps/mobile/package.json`.
7. **No edits to root `nx.json`.** No new plugins. Inferred targets via the `nx` block in `apps/mobile/package.json` only.
8. **No `webpack.config.js` in `apps/mobile/`.** Metro is the sole bundler.
9. **Strict Zod boundary parsing.** Every API response goes through `.parse()` in the relevant `*.api.ts` file before reaching UI code.
10. **VIN masking on customer surfaces** (per `memoryfile.md` §"Locked design rules"). The public listings schema already returns masked VINs; mobile just renders what the API gives.
11. **KWD with 3 decimals, money transported as string.** Mobile uses the same `Number(str)/1000` parse pattern. Consider copying `libs/shared/utils/kwd.ts` into a tiny mobile-local helper if needed (it's pure TS — verify, copy additively).

---

## 11. Risks & open questions (max 5 — lock before W2)

1. **OTP + social auth API stubs.** `/v1/auth/otp/verify`, `/v1/auth/google`, `/v1/auth/apple` are 501. **LOCKED (W1 completion pass, 2026-05-19):** Email/password is the ONLY active sign-in method for W2. OTP, Google, and Apple sign-in are stubbed as disabled "Coming soon" buttons in `app/auth/sign-in.tsx`. Apple Sign-In is App Store mandatory if Google is ever offered — both stubs must not be removed.

2. **Tab count overflow.** 8 tabs is 3 too many for a bottom bar on phones < 380 px. **LOCKED (W1 completion pass, 2026-05-19):** 5 visible + "More" sheet wins. Visible: Home / Browse / Sell / Services / Account. Finance + Maintenance + Favorites are in `(tabs)/more.tsx`. `(tabs)/_layout.tsx` updated accordingly. All 8 route files exist for deep-link correctness.

3. **Arabic typeface.** Plus Jakarta Sans has no Arabic glyphs; W1 falls back to system Arabic. **ACKNOWLEDGED by user (W1 completion pass, 2026-05-19):** System Arabic for W1/W2, migrate to Tajawal in W3. No immediate action required.

4. **Offline-first storage engine.** FR-MOB-005 mandates offline access. **LOCKED (W1 completion pass, 2026-05-19):** react-query + AsyncStorage persistence wins. `@tanstack/react-query`, `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, and `@react-native-async-storage/async-storage` added to `apps/mobile/package.json`. QueryClient + PersistQueryClientProvider wired in `app/_layout.tsx`. Cache-key conventions: `['listings', 'featured']`, `['listings', 'list', filter]`, `['listings', 'detail', slug]`.

5. **Inspection-sign deep-link dependency.** The `/inspection-sign/:token` route requires `GET/POST /v1/public/inspection-sign/:token` on the API. **ACKNOWLEDGED by user (W1 completion pass, 2026-05-19):** Deferred to W2 resolution with storefront session. Route exists (`app/inspection-sign/[token].tsx`) and renders a TODO screen. The deep-link entry in `app.json` is a placeholder until W2 confirmation.

---

## 12. Architectural Decision Records (ADR index)

| # | Decision | Status | Section |
|---|---|---|---|
| ADR-M1 | Expo SDK 52 + RN 0.76 + expo-router v4 (vs bare RN or React Navigation alone) | Locked by brief | §0 |
| ADR-M2 | Nx integration via command-target shims (vs `@nx/expo` plugin) | Accepted W1; re-evaluate W4 | §1 |
| ADR-M3 | Sibling lib `libs/data-access-mobile/` (vs subfolder in `libs/data-access/`) | Accepted | §3 |
| ADR-M4 | 8 expo-router tab routes from day one; visible-tab subset deferred | Accepted; UX deferred to W2 | §4 |
| ADR-M5 | expo-secure-store for tokens; AsyncStorage for cached user JSON | Accepted | §5 |
| ADR-M6 | Hand-written axios refresh-queue (no `axios-auth-refresh` dep) | Accepted | §5 |
| ADR-M7 | i18next + react-i18next + expo-localization (vs ngx-translate which is Angular-only) | Forced by stack | §6 |
| ADR-M8 | RTL via `I18nManager.forceRTL` + `Updates.reloadAsync()` round-trip | Accepted | §6 |
| ADR-M9 | EAS Build (vs Fastlane per SRS §5.3) | Accepted, supersedes SRS | §8 |
| ADR-M10 | Drop Huawei AppGallery (vs SRS FR-MOB-001 which lists it) | Locked by user brief | §0 |
| ADR-M11 | `requireAuthentication: true` on refresh token key only in SecureStore | Accepted W1 — threat model: 30-day refresh token warrants biometric/passcode gate; 15-min access token does not | §5 |
| ADR-M12 | Single-flight refresh mutex in http.ts (module-level promise) | Accepted W1 — prevents concurrent 401s from firing parallel refresh calls and overwriting SecureStore | §5 |
| ADR-M13 | Authorization header redaction before error propagation | Accepted W1 — pre-empts Sentry (W4) capturing raw Bearer tokens | §5 |
| ADR-M14 | react-query + AsyncStorage persistence for offline-first (FR-MOB-005) | Locked W1; WatermelonDB deferred to W3 evaluation | §9 |
| ADR-M15 | 5 visible tabs + More sheet (Finance/Maintenance/Favorites overflow) | Locked W1 user decision; all 8 routes exist for deep-link correctness | §4 |
| ADR-M16 | Email/password only for W2 sign-in; OTP/Google/Apple stub buttons present | Locked W1 user decision; Apple stub must not be removed (App Store rule) | §5 |

---

## 13. Hand-offs out of this session

After this doc lands, the architect (me) does exactly two things and then exits:

1. **SendMessage to `mobile-scaffold`** — 5-line summary of Nx integration choice (Option C — command-target shim + `serve`/`build` wrappers) and the folder-layout key (§2 tree).
2. **SendMessage to `contract-author`** — endpoint dependency list with rough Zod request/response shapes for: mobile-OTP completion, push-tokens, public inspection-sign endpoints, and OG metadata for VDP universal-link previews.

No code implementation. W2 starts on top of mobile-scaffold's output and contract-author's deliverable.

---

> *"You can build the prettiest house in the world, but if the foundation isn't level the doors stop closing in year three."*
