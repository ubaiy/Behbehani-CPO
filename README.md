# Behbehani CPO

Certified pre-owned vehicle e-commerce platform for Kuwait. Nx monorepo containing:

- `apps/web` — Angular 21 SSR customer site (`/en`, `/ar` with full RTL)
- `apps/admin` — Angular 21 back-office portal
- `apps/api` — Node.js + Express TypeScript API
- `libs/shared/*` — types (Zod), utils (KWD/date), i18n, UI components
- `libs/data-access` — Angular API clients + auth interceptor + guard

The full plan and scope reconciliation are in
`C:\Users\UBAIY\.claude\plans\c-users-ubaiy-downloads-behbehani-cpo-p-wondrous-frog.md`.

## Prerequisites

- Node.js 22+ and npm 10+
- Docker Desktop (for local Postgres / Redis / MinIO / MailHog)

## Quick start

```bash
# 1. install deps (root)
npm install

# 2. copy env template and adjust
cp .env.example .env

# 3. start local services (Postgres, Redis, MinIO, MailHog)
npm run dev:services

# 4. run apps in three terminals
npm run serve:api    # http://localhost:3333
npm run serve:web    # http://localhost:4200
npm run serve:admin  # http://localhost:4201
```

The web/admin dev servers proxy `/api/*` -> API on `:3333`.

## Demo credentials (Sprint 0 in-memory user)

```
email:    demo@behbehani-cpo.com
password: Demo!Pass8
```

Replaced by Prisma + Postgres in Sprint 1.

## Useful commands

```bash
npm run build       # build all apps (production)
npm run lint        # lint all projects
npm run test        # run unit tests
npm run typecheck   # typecheck all projects
npx nx graph        # visual project graph
npx nx affected -t build,test,lint  # only affected by last commit
```

## Directory layout

```
apps/
  api/           Express API (TS)
  web/           Angular customer SSR
  admin/         Angular admin SPA
libs/
  shared/
    types/       Zod schemas + DTOs shared API/frontends
    utils/       KWD formatter (3 decimals), DD/MM/YYYY date
    i18n/        ngx-translate + EN/AR + RTL Dir provider
    ui/          shared Angular components
  data-access/   Angular HTTP clients, AuthService, AuthGuard, interceptor
infrastructure/
  docker/        docker-compose for local services
  terraform/     AWS me-south-1 IaC (added in later sprints)
docs/            SRS source documents
```
