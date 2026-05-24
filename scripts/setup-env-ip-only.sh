#!/usr/bin/env bash
# scripts/setup-env-ip-only.sh
#
# v1.5.23 — Interactive helper that generates apps/api/.env for an IP-only
# HTTP deployment (no domain, no Let's Encrypt). Prompts for the values
# specific to your AWS infrastructure, generates JWT secrets, and writes a
# ready-to-use .env (chmod 600).
#
# Run ON THE EC2 SERVER after cloning the repo:
#   cd /opt/cpo
#   bash scripts/setup-env-ip-only.sh
#
# Or run LOCALLY then scp the resulting file to the server.
#
# Re-running prompts before overwriting an existing .env (no surprise clobber).
#
# Flags (optional — skip prompts):
#   --ec2-ip=13.x.x.x
#   --rds-endpoint=cpo-prod-db.xxxx.eu-central-1.rds.amazonaws.com
#   --rds-password=...           (or use --rds-password-stdin to read from STDIN)
#   --cache-endpoint=cpo-prod-cache.xxxx.cache.amazonaws.com
#   --s3-bucket=behbehani-cpo-media-prod
#   --aws-region=eu-central-1    (default)
#   --force                      (overwrite existing .env without prompt)
#
# Constraints documented in docs/DEPLOY.md "Appendix — IP-only HTTP deployment".
# Acceptable for: internal demo, dev/staging. NOT for customer-facing prod use.

set -euo pipefail

# ─── Config defaults ─────────────────────────────────────────────────────────
ENV_FILE="${ENV_FILE:-apps/api/.env}"
EXAMPLE_FILE="${EXAMPLE_FILE:-apps/api/.env.production.example}"
DEFAULT_REGION="eu-central-1"

# ─── Flag parsing ────────────────────────────────────────────────────────────
EC2_IP=""
RDS_ENDPOINT=""
RDS_PASSWORD=""
RDS_PASSWORD_FROM_STDIN=0
CACHE_ENDPOINT=""
S3_BUCKET=""
AWS_REGION="$DEFAULT_REGION"
FORCE=0

for arg in "$@"; do
  case "$arg" in
    --ec2-ip=*)               EC2_IP="${arg#*=}" ;;
    --rds-endpoint=*)         RDS_ENDPOINT="${arg#*=}" ;;
    --rds-password=*)         RDS_PASSWORD="${arg#*=}" ;;
    --rds-password-stdin)     RDS_PASSWORD_FROM_STDIN=1 ;;
    --cache-endpoint=*)       CACHE_ENDPOINT="${arg#*=}" ;;
    --s3-bucket=*)            S3_BUCKET="${arg#*=}" ;;
    --aws-region=*)           AWS_REGION="${arg#*=}" ;;
    --force)                  FORCE=1 ;;
    -h|--help)                sed -n '2,38p' "$0"; exit 0 ;;
    *)                        echo "Unknown flag: $arg" >&2; exit 2 ;;
  esac
done

# ─── Helpers ─────────────────────────────────────────────────────────────────
log()  { echo -e "\033[1;34m[setup]\033[0m $*"; }
warn() { echo -e "\033[1;33m[setup]\033[0m $*"; }
fail() { echo -e "\033[1;31m[setup]\033[0m $*" >&2; exit 1; }

# Prompt-once helper: $1=label, $2=default (optional), $3=variable name to set
ask() {
  local label="$1"
  local default="${2:-}"
  local var_name="$3"
  local current_val=""
  eval "current_val=\${$var_name}"
  if [[ -n "$current_val" ]]; then
    log "$label: ${current_val}  (from flag)"
    return
  fi
  local prompt="$label"
  [[ -n "$default" ]] && prompt="$prompt [$default]"
  prompt="$prompt: "
  local input=""
  read -r -p "$prompt" input
  if [[ -z "$input" ]]; then
    [[ -z "$default" ]] && fail "Required: $label"
    input="$default"
  fi
  eval "$var_name=\"\$input\""
}

ask_secret() {
  local label="$1"
  local var_name="$2"
  local current_val=""
  eval "current_val=\${$var_name}"
  if [[ -n "$current_val" ]]; then
    log "$label: ********  (from flag or stdin)"
    return
  fi
  local input=""
  read -r -s -p "$label (input hidden): " input
  echo  # newline after silent read
  [[ -z "$input" ]] && fail "Required: $label"
  eval "$var_name=\"\$input\""
}

# Simple IPv4 validation. EC2 Elastic IPs are always IPv4.
validate_ip() {
  local ip="$1"
  [[ "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]] || \
    fail "Invalid IPv4: $ip"
}

# ─── Pre-flight ──────────────────────────────────────────────────────────────
[[ -f "$EXAMPLE_FILE" ]] || fail "Missing example file: $EXAMPLE_FILE (run from repo root)"

if [[ -f "$ENV_FILE" && "$FORCE" -eq 0 ]]; then
  warn "$ENV_FILE already exists."
  read -r -p "Overwrite? [y/N]: " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || fail "Aborted."
fi

command -v openssl >/dev/null || fail "openssl not installed (used to generate JWT secrets)"

echo
log "v1.5.23 IP-only env setup — answer 5 prompts, get a ready .env."
echo

# ─── Read RDS password from stdin if requested ───────────────────────────────
if [[ "$RDS_PASSWORD_FROM_STDIN" -eq 1 ]]; then
  IFS= read -r RDS_PASSWORD || true
  [[ -n "$RDS_PASSWORD" ]] || fail "Empty RDS password on stdin"
fi

# ─── Prompts ─────────────────────────────────────────────────────────────────
ask "EC2 Elastic IP (e.g. 13.50.123.45)"                          ""               EC2_IP
validate_ip "$EC2_IP"
ask "RDS endpoint (cpo-prod-db.xxxx.${AWS_REGION}.rds.amazonaws.com)" ""           RDS_ENDPOINT
ask_secret "RDS master password (cpo_admin)"                                       RDS_PASSWORD
ask "ElastiCache primary endpoint (cpo-prod-cache.xxxx.cache.amazonaws.com)" ""    CACHE_ENDPOINT
ask "S3 bucket name"                                            "behbehani-cpo-media-prod" S3_BUCKET
ask "AWS region"                                                "$AWS_REGION"      AWS_REGION

# ─── Generate JWT secrets ────────────────────────────────────────────────────
log "Generating JWT secrets via openssl rand -hex 48…"
JWT_ACCESS_SECRET="$(openssl rand -hex 48)"
JWT_REFRESH_SECRET="$(openssl rand -hex 48)"
# Defensive: ensure they differ (collision probability is astronomically low,
# but the env.ts zod schema enforces >=16 chars; doesn't enforce inequality.)
if [[ "$JWT_ACCESS_SECRET" == "$JWT_REFRESH_SECRET" ]]; then
  fail "openssl produced identical secrets (this is essentially impossible — re-run)"
fi

# ─── Build URL strings ───────────────────────────────────────────────────────
DATABASE_URL="postgresql://cpo_admin:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/cpo?sslmode=require"
# rediss:// for TLS-encrypted ElastiCache (recommended). If you turned encryption
# off on the cluster, the operator should hand-edit to redis:// after this runs.
REDIS_URL="rediss://${CACHE_ENDPOINT}:6379"
CORS_ORIGINS="http://${EC2_IP},http://localhost:4200,http://localhost:4201"
SIGN_LINK_BASE_URL="http://${EC2_IP}"
S3_ENDPOINT_URL="https://s3.${AWS_REGION}.amazonaws.com"
S3_PUBLIC_BASE_URL="https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com"
CDN_BASE_URL="$S3_PUBLIC_BASE_URL"

# ─── Write env file ──────────────────────────────────────────────────────────
log "Writing $ENV_FILE…"
cat > "$ENV_FILE" <<EOF
# apps/api/.env — generated $(date -Iseconds) by scripts/setup-env-ip-only.sh
# v1.5.23 IP-only HTTP deployment posture. NOT customer-facing safe.
# Constraints: docs/DEPLOY.md Appendix — IP-only HTTP deployment.

# ─── Core ─────────────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=3000
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_TTL_SEC=86400
JWT_REFRESH_TTL_SEC=2592000

# ─── Database (RDS Postgres) ──────────────────────────────────────────────────
DATABASE_URL=${DATABASE_URL}

# ─── Cache (ElastiCache Redis, TLS) ───────────────────────────────────────────
REDIS_URL=${REDIS_URL}

# ─── CORS (IP-only — no domain yet) ───────────────────────────────────────────
CORS_ORIGINS=${CORS_ORIGINS}

# ─── S3 (IAM-role-backed; access/secret keys intentionally empty) ─────────────
S3_ENDPOINT=${S3_ENDPOINT_URL}
S3_REGION=${AWS_REGION}
S3_BUCKET=${S3_BUCKET}
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_PUBLIC_BASE_URL=${S3_PUBLIC_BASE_URL}
S3_FORCE_PATH_STYLE=false
S3_PRESIGN_TTL_SEC=900
MAX_PHOTO_BYTES=10485760
MAX_VIDEO_BYTES=104857600
MAX_360_BYTES=262144000
MAX_AVATAR_BYTES=5242880

# ─── CDN prefix for served assets (S3 keeps its own HTTPS via AWS cert) ───────
CDN_BASE_URL=${CDN_BASE_URL}

# ─── Inspection signing link base (IP-only — swap to domain when registered) ──
SIGN_LINK_BASE_URL=${SIGN_LINK_BASE_URL}
SIGN_LINK_TTL_DAYS=7

# ─── Aging engine cron (daily 02:00 Asia/Kuwait) ──────────────────────────────
# Quoted because bash \`source\` interprets unquoted values with spaces as commands.
# Don't drop the quotes — node-cron parses the inner string fine either way.
AGING_ENGINE_CRON="0 2 * * *"
AGING_ENGINE_TZ=Asia/Kuwait
AGING_ENGINE_ENABLED=true

# ─── OTP (customer auth) ──────────────────────────────────────────────────────
OTP_TTL_MINUTES=5

# ─── Notifications providers — devlog fallback until creds arrive ─────────────
NOTIFICATIONS_SMS_PROVIDER=devlog
NOTIFICATIONS_EMAIL_PROVIDER=devlog
EMAIL_FROM_ADDRESS=concierge@behbehani.com
UNIFONIC_APP_ID=
UNIFONIC_SENDER_ID=Behbehani
SENDGRID_API_KEY=

# ─── Optional credentials (mock-fallback until populated) ─────────────────────
GOOGLE_OAUTH_CLIENT_ID=
FIREBASE_SERVICE_ACCOUNT_PATH=
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_KEY_PATH=
APNS_BUNDLE_ID=
OTTO_API_KEY=
OTTO_WEBHOOK_SECRET=
OTTO_HOSTED_BASE_URL=https://sandbox.otto.kw/checkout
OTTO_SANDBOX_MODE=true
EOF

chmod 600 "$ENV_FILE"

# ─── Summary ─────────────────────────────────────────────────────────────────
echo
log "✓ Wrote $ENV_FILE (chmod 600)"
log "  EC2_IP:         $EC2_IP"
log "  RDS endpoint:   $RDS_ENDPOINT"
log "  RDS password:   ******** (saved to .env)"
log "  ElastiCache:    $CACHE_ENDPOINT"
log "  S3 bucket:      $S3_BUCKET ($AWS_REGION)"
log "  JWT secrets:    generated fresh ($(echo "$JWT_ACCESS_SECRET" | wc -c | tr -d ' ')-char access, equal-length refresh)"
echo
log "Next steps:"
log "  1. Verify RDS reachability:  psql \"\$(grep ^DATABASE_URL $ENV_FILE | cut -d= -f2-)\" -c '\\l'"
log "  2. Verify Redis reachability: redis-cli -h $CACHE_ENDPOINT --tls ping"
log "  3. Migrate + seed:            npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && npm run db:seed"
log "  4. Start:                     pm2 start ecosystem.config.cjs && pm2 save"
log "  5. Smoke check:               curl http://127.0.0.1:3000/health"
echo
warn "IP-only HTTP posture: NOT for public customer use. Add CloudFront or a"
warn "domain + Let's Encrypt before exposing to real users. Cookies with the"
warn "Secure flag will silently fail over HTTP. See docs/DEPLOY.md appendix."
