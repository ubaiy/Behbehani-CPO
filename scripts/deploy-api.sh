#!/usr/bin/env bash
# scripts/deploy-api.sh
#
# One-command API deploy / update for the production EC2.
# Idempotent — safe to re-run.
#
# Run AS the `ubuntu` user (or whichever user owns /opt/cpo + the PM2 daemon).
#
# Prerequisites (one-time, per docs/DEPLOY.md §1.2):
#   - Node 22.x installed
#   - PM2 installed globally (npm i -g pm2@latest)
#   - /opt/cpo cloned from git, owned by deploying user
#   - /opt/cpo/apps/api/.env created from .env.production.example (chmod 600)
#   - PM2 already initialized: `pm2 start ecosystem.config.cjs` ran at least once
#
# Usage:
#   bash scripts/deploy-api.sh
#   bash scripts/deploy-api.sh --skip-migrate   # skip prisma migrate (already applied)
#   bash scripts/deploy-api.sh --no-pull        # skip git pull (use current checkout)
#   bash scripts/deploy-api.sh --no-restart     # build only, don't restart PM2

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
REPO_DIR="${REPO_DIR:-/opt/cpo}"
PM2_APP_NAME="${PM2_APP_NAME:-cpo-api}"
ENV_FILE="${ENV_FILE:-$REPO_DIR/apps/api/.env}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/health}"
HEALTH_TIMEOUT_SEC="${HEALTH_TIMEOUT_SEC:-30}"

# ─── Flag parsing ────────────────────────────────────────────────────────────
SKIP_MIGRATE=0
NO_PULL=0
NO_RESTART=0
for arg in "$@"; do
  case "$arg" in
    --skip-migrate) SKIP_MIGRATE=1 ;;
    --no-pull)      NO_PULL=1 ;;
    --no-restart)   NO_RESTART=1 ;;
    -h|--help)
      sed -n '2,30p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg" >&2
      exit 2
      ;;
  esac
done

# ─── Helpers ─────────────────────────────────────────────────────────────────
log()  { echo -e "\033[1;34m[deploy]\033[0m $*"; }
warn() { echo -e "\033[1;33m[deploy]\033[0m $*"; }
fail() { echo -e "\033[1;31m[deploy]\033[0m $*" >&2; exit 1; }

# ─── Pre-flight ──────────────────────────────────────────────────────────────
cd "$REPO_DIR" || fail "REPO_DIR not found: $REPO_DIR"

[[ -f "$ENV_FILE" ]] || fail "Env file missing: $ENV_FILE (copy from apps/api/.env.production.example)"

# Refuse if .env is world-readable
ENV_PERMS="$(stat -c %a "$ENV_FILE" 2>/dev/null || stat -f %A "$ENV_FILE")"
if [[ "$ENV_PERMS" != "600" && "$ENV_PERMS" != "400" ]]; then
  fail "Env file $ENV_FILE has perms $ENV_PERMS — must be 600 (or 400). Run: chmod 600 $ENV_FILE"
fi

command -v node >/dev/null || fail "node not installed"
command -v npm  >/dev/null || fail "npm not installed"
command -v pm2  >/dev/null || fail "pm2 not installed — run: sudo npm i -g pm2@latest"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[[ "$NODE_MAJOR" -ge 22 ]] || warn "Node major is $NODE_MAJOR; codebase targets 22+. Continue at your own risk."

log "Starting deploy at $(date -Iseconds)"
log "REPO_DIR=$REPO_DIR  PM2_APP_NAME=$PM2_APP_NAME"

# ─── Pull ────────────────────────────────────────────────────────────────────
if [[ "$NO_PULL" -eq 0 ]]; then
  log "git pull"
  git pull --ff-only
else
  log "skipping git pull (--no-pull)"
fi

CURRENT_SHA="$(git rev-parse --short HEAD)"
log "deploying commit $CURRENT_SHA"

# ─── Install ─────────────────────────────────────────────────────────────────
log "npm ci"
npm ci --no-audit --no-fund

# ─── Migrate ─────────────────────────────────────────────────────────────────
if [[ "$SKIP_MIGRATE" -eq 0 ]]; then
  log "prisma generate + migrate deploy"
  npx prisma generate --schema apps/api/prisma/schema.prisma
  # `migrate deploy` is safe in prod — only applies migrations that aren't in
  # the _prisma_migrations table. Will NEVER create destructive migrations.
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
else
  log "skipping migrations (--skip-migrate)"
fi

# ─── Build ───────────────────────────────────────────────────────────────────
log "nx build api"
npx nx build api

[[ -f apps/api/dist/main.js ]] || fail "build artifact missing: apps/api/dist/main.js"

# ─── Restart ─────────────────────────────────────────────────────────────────
if [[ "$NO_RESTART" -eq 1 ]]; then
  log "build done; skipping PM2 restart (--no-restart)"
  exit 0
fi

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  log "pm2 reload $PM2_APP_NAME (zero-downtime)"
  pm2 reload "$PM2_APP_NAME" --update-env
else
  log "pm2 start ecosystem.config.cjs (first-time)"
  pm2 start ecosystem.config.cjs
  pm2 save
fi

# ─── Health probe ────────────────────────────────────────────────────────────
log "waiting up to ${HEALTH_TIMEOUT_SEC}s for $HEALTH_URL"
START_T=$SECONDS
while (( SECONDS - START_T < HEALTH_TIMEOUT_SEC )); do
  if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
    HEALTH_JSON="$(curl -fsS "$HEALTH_URL")"
    log "health OK: $HEALTH_JSON"
    log "deploy $CURRENT_SHA finished at $(date -Iseconds)"
    exit 0
  fi
  sleep 1
done

fail "health endpoint did not become reachable within ${HEALTH_TIMEOUT_SEC}s — check pm2 logs $PM2_APP_NAME"
