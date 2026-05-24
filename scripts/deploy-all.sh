#!/usr/bin/env bash
# scripts/deploy-all.sh
#
# v1.5.31 — One-command deploy for API + admin + web together.
# Idempotent — safe to re-run after any code change.
#
# What it does (in order):
#   1.  git pull               (skip with --no-pull)
#   2.  npm ci                 (skip with --skip-install)
#   3.  prisma migrate deploy  (skip with --skip-migrate)
#   4.  nx build shared-types + api + admin + web (parallel where Nx allows)
#   5.  Sync admin dist → /var/www/cpo-admin
#   6.  Sync web dist  → /var/www/cpo-web (with index.csr.html → index.html symlink)
#   7.  pm2 reload cpo-api --update-env
#   8.  Health-probe wait + 3-route smoke (/health, /admin/, /)
#
# Prerequisites (one-time, per docs/DEPLOY.md):
#   - Node 22 + PM2 + nginx installed + cpo-admin/cpo-web dirs owned by www-data
#   - /opt/cpo/Behbehani-CPO cloned, owned by ubuntu
#   - apps/api/.env exists (chmod 600), generated via scripts/setup-env-ip-only.sh
#   - PM2 already initialized: pm2 start ecosystem.config.cjs ran at least once
#   - nginx site config at /etc/nginx/sites-enabled/cpo-api.conf
#
# Usage:
#   bash scripts/deploy-all.sh                  # full deploy
#   bash scripts/deploy-all.sh --no-pull        # use current checkout
#   bash scripts/deploy-all.sh --skip-migrate   # if no schema changes
#   bash scripts/deploy-all.sh --skip-install   # if no package.json changes
#   bash scripts/deploy-all.sh --api-only       # skip web + admin sync
#   bash scripts/deploy-all.sh --static-only    # skip API rebuild + reload
#   bash scripts/deploy-all.sh --no-cache       # nx --skip-nx-cache

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
REPO_DIR="${REPO_DIR:-/opt/cpo/Behbehani-CPO}"
PM2_APP_NAME="${PM2_APP_NAME:-cpo-api}"
ENV_FILE="${ENV_FILE:-$REPO_DIR/apps/api/.env}"
ADMIN_WEBROOT="${ADMIN_WEBROOT:-/var/www/cpo-admin}"
WEB_WEBROOT="${WEB_WEBROOT:-/var/www/cpo-web}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/health}"
HEALTH_TIMEOUT_SEC="${HEALTH_TIMEOUT_SEC:-30}"
NGINX_LOOPBACK="${NGINX_LOOPBACK:-http://127.0.0.1}"

# ─── Flag parsing ────────────────────────────────────────────────────────────
NO_PULL=0
SKIP_INSTALL=0
SKIP_MIGRATE=0
API_ONLY=0
STATIC_ONLY=0
NO_CACHE=0
for arg in "$@"; do
  case "$arg" in
    --no-pull)       NO_PULL=1 ;;
    --skip-install)  SKIP_INSTALL=1 ;;
    --skip-migrate)  SKIP_MIGRATE=1 ;;
    --api-only)      API_ONLY=1 ;;
    --static-only)   STATIC_ONLY=1 ;;
    --no-cache)      NO_CACHE=1 ;;
    -h|--help)       sed -n '2,32p' "$0"; exit 0 ;;
    *)               echo "Unknown flag: $arg" >&2; exit 2 ;;
  esac
done

# ─── Helpers ─────────────────────────────────────────────────────────────────
log()  { echo -e "\033[1;34m[deploy-all]\033[0m $*"; }
warn() { echo -e "\033[1;33m[deploy-all]\033[0m $*"; }
fail() { echo -e "\033[1;31m[deploy-all]\033[0m $*" >&2; exit 1; }
sect() { echo; echo -e "\033[1;36m===== $* =====\033[0m"; }

NX_FLAGS=()
[[ "$NO_CACHE" -eq 1 ]] && NX_FLAGS+=(--skip-nx-cache)

# ─── Pre-flight ──────────────────────────────────────────────────────────────
cd "$REPO_DIR" || fail "REPO_DIR not found: $REPO_DIR"

[[ -f "$ENV_FILE" ]] || fail "Env file missing: $ENV_FILE (generate via scripts/setup-env-ip-only.sh)"

ENV_PERMS="$(stat -c %a "$ENV_FILE" 2>/dev/null || stat -f %A "$ENV_FILE")"
if [[ "$ENV_PERMS" != "600" && "$ENV_PERMS" != "400" ]]; then
  fail "Env file perms = $ENV_PERMS, must be 600. Run: chmod 600 $ENV_FILE"
fi

command -v node >/dev/null || fail "node not installed"
command -v npm  >/dev/null || fail "npm not installed"
command -v pm2  >/dev/null || fail "pm2 not installed (sudo npm i -g pm2@latest)"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[[ "$NODE_MAJOR" -ge 22 ]] || warn "Node major is $NODE_MAJOR; codebase targets 22+. Continue at your own risk."

[[ -d "$ADMIN_WEBROOT" ]] || fail "ADMIN_WEBROOT not found: $ADMIN_WEBROOT (sudo mkdir -p + chown www-data)"
[[ -d "$WEB_WEBROOT"   ]] || fail "WEB_WEBROOT not found:   $WEB_WEBROOT (sudo mkdir -p + chown www-data)"

log "Starting full deploy at $(date -Iseconds)"
log "REPO_DIR=$REPO_DIR  API_ONLY=$API_ONLY  STATIC_ONLY=$STATIC_ONLY  NO_CACHE=$NO_CACHE"

# ─── 1. Pull ─────────────────────────────────────────────────────────────────
if [[ "$NO_PULL" -eq 0 ]]; then
  sect "1/8  git pull"
  git pull --ff-only
else
  log "1/8  skipping git pull (--no-pull)"
fi

CURRENT_SHA="$(git rev-parse --short HEAD)"
log "Deploying commit $CURRENT_SHA"

# ─── 2. Install ──────────────────────────────────────────────────────────────
if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  sect "2/8  npm ci"
  npm ci --no-audit --no-fund
else
  log "2/8  skipping npm ci (--skip-install)"
fi

# ─── 3. Source env + prisma generate + migrate ──────────────────────────────
sect "3/8  prisma generate + migrate"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
[[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL not set after sourcing $ENV_FILE"

npx prisma generate --schema apps/api/prisma/schema.prisma

if [[ "$SKIP_MIGRATE" -eq 0 ]]; then
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
else
  log "3/8  skipping migrations (--skip-migrate)"
fi

# ─── 4. Build everything ────────────────────────────────────────────────────
sect "4/8  nx build (shared-types + api + admin + web)"

if [[ "$STATIC_ONLY" -eq 1 ]]; then
  log "Static-only mode — skipping API build"
  BUILD_PROJECTS="shared-types admin web"
elif [[ "$API_ONLY" -eq 1 ]]; then
  log "API-only mode — skipping admin + web builds"
  BUILD_PROJECTS="shared-types api"
else
  BUILD_PROJECTS="shared-types api admin web"
fi

# Build with --base-href on admin (subpath deploy)
# nx doesn't accept --base-href in run-many; build admin separately with the flag.
if echo "$BUILD_PROJECTS" | grep -q "admin"; then
  PROJECTS_WITHOUT_ADMIN="$(echo "$BUILD_PROJECTS" | sed 's/ admin//' | sed 's/admin //')"
  if [[ -n "$PROJECTS_WITHOUT_ADMIN" ]]; then
    # shellcheck disable=SC2086
    npx nx run-many -t build -p $PROJECTS_WITHOUT_ADMIN "${NX_FLAGS[@]}"
  fi
  npx nx build admin --configuration=production --base-href=/admin/ "${NX_FLAGS[@]}"
else
  # shellcheck disable=SC2086
  npx nx run-many -t build -p $BUILD_PROJECTS "${NX_FLAGS[@]}"
fi

# Sanity — API dist must exist if we built it
if echo "$BUILD_PROJECTS" | grep -q "api"; then
  [[ -f apps/api/dist/main.js ]] || fail "build artifact missing: apps/api/dist/main.js"
fi

# ─── 5. Sync admin dist → /var/www/cpo-admin ────────────────────────────────
if [[ "$API_ONLY" -eq 0 ]] && echo "$BUILD_PROJECTS" | grep -q "admin"; then
  sect "5/8  sync admin dist → $ADMIN_WEBROOT"
  ADMIN_SRC="dist/apps/admin/browser"
  [[ -d "$ADMIN_SRC" ]] || fail "admin dist missing at $ADMIN_SRC"

  sudo rm -rf "$ADMIN_WEBROOT"/*
  sudo cp -r "$ADMIN_SRC"/. "$ADMIN_WEBROOT"/
  sudo chown -R www-data:www-data "$ADMIN_WEBROOT"
  sudo chmod -R 755 "$ADMIN_WEBROOT"

  ADMIN_FILES="$(ls "$ADMIN_WEBROOT" | wc -l)"
  log "admin dist synced ($ADMIN_FILES files)"
else
  log "5/8  skipping admin sync"
fi

# ─── 6. Sync web dist → /var/www/cpo-web ────────────────────────────────────
if [[ "$API_ONLY" -eq 0 ]] && echo "$BUILD_PROJECTS" | grep -q "web"; then
  sect "6/8  sync web dist → $WEB_WEBROOT"
  WEB_SRC="dist/apps/web/browser"
  [[ -d "$WEB_SRC" ]] || fail "web dist missing at $WEB_SRC"

  sudo rm -rf "$WEB_WEBROOT"/*
  sudo cp -r "$WEB_SRC"/. "$WEB_WEBROOT"/
  sudo chown -R www-data:www-data "$WEB_WEBROOT"
  sudo chmod -R 755 "$WEB_WEBROOT"

  # Angular 19+ outputs index.csr.html — nginx try_files expects index.html
  if [[ -f "$WEB_WEBROOT/index.csr.html" && ! -f "$WEB_WEBROOT/index.html" ]]; then
    sudo ln -sf "$WEB_WEBROOT/index.csr.html" "$WEB_WEBROOT/index.html"
    log "symlinked index.csr.html → index.html"
  fi

  WEB_FILES="$(ls "$WEB_WEBROOT" | wc -l)"
  log "web dist synced ($WEB_FILES files)"
else
  log "6/8  skipping web sync"
fi

# ─── 7. Reload PM2 (API) ────────────────────────────────────────────────────
if [[ "$STATIC_ONLY" -eq 0 ]] && echo "$BUILD_PROJECTS" | grep -q "api"; then
  sect "7/8  pm2 reload $PM2_APP_NAME"
  if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
    pm2 reload "$PM2_APP_NAME" --update-env
  else
    pm2 start ecosystem.config.cjs
    pm2 save
  fi
else
  log "7/8  skipping PM2 reload"
fi

# ─── 8. Smoke probes ────────────────────────────────────────────────────────
sect "8/8  smoke probes"

# 8a. Wait for API health (only if we restarted)
if [[ "$STATIC_ONLY" -eq 0 ]] && echo "$BUILD_PROJECTS" | grep -q "api"; then
  log "waiting up to ${HEALTH_TIMEOUT_SEC}s for $HEALTH_URL"
  START_T=$SECONDS
  HEALTH_OK=0
  while (( SECONDS - START_T < HEALTH_TIMEOUT_SEC )); do
    if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
      HEALTH_JSON="$(curl -fsS "$HEALTH_URL")"
      log "✓ /health: $HEALTH_JSON"
      HEALTH_OK=1
      break
    fi
    sleep 1
  done
  [[ "$HEALTH_OK" -eq 1 ]] || fail "API /health did not respond in ${HEALTH_TIMEOUT_SEC}s — check: pm2 logs $PM2_APP_NAME"
fi

# 8b. nginx loopback smoke for each surface served
if echo "$BUILD_PROJECTS" | grep -q "api"; then
  if curl -fsS -o /dev/null -w "  /health (via nginx) → %{http_code}\n" "$NGINX_LOOPBACK/health" 2>&1; then :; fi
fi
if [[ "$API_ONLY" -eq 0 ]] && echo "$BUILD_PROJECTS" | grep -q "admin"; then
  curl -fsS -o /dev/null -w "  /admin/  → %{http_code}\n" "$NGINX_LOOPBACK/admin/" || warn "admin smoke failed"
fi
if [[ "$API_ONLY" -eq 0 ]] && echo "$BUILD_PROJECTS" | grep -q "web"; then
  curl -fsS -o /dev/null -w "  /        → %{http_code}\n" "$NGINX_LOOPBACK/" || warn "web smoke failed"
fi

sect "done"
log "✓ deploy $CURRENT_SHA finished at $(date -Iseconds)"
log "Public URLs:"
log "  Customer:  http://<your-ec2-ip>/"
log "  Admin:     http://<your-ec2-ip>/admin/"
log "  API:       http://<your-ec2-ip>/v1/*  +  http://<your-ec2-ip>/api/v1/*"
