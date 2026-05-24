# DEPLOY.md — Production Deployment Runbook

> **Audience:** operations/devops engineer setting up the Behbehani CPO / Motors
> stack for the first time, or rolling out updates afterwards.
>
> **Architecture:** EC2 (Node API) + RDS Postgres + ElastiCache Redis + S3
> (media) + CloudFront (static SPAs) — all in `eu-central-1` (Frankfurt).
>
> **Last reviewed:** 2026-05-21 (v1.5.17).

---

## Table of contents

- [Phase 0 — One-time prerequisites](#phase-0--one-time-prerequisites)
  - [0.1 Choose + register your domains](#01-choose--register-your-domains)
  - [0.2 AWS account + IAM admin user](#02-aws-account--iam-admin-user)
  - [0.3 SSH key pair](#03-ssh-key-pair)
- [Phase 1 — Deploy the API to EC2](#phase-1--deploy-the-api-to-ec2)
  - [1.1 Provision AWS infra](#11-provision-aws-infra)
  - [1.2 SSH in + system prep](#12-ssh-in--system-prep)
  - [1.3 Clone repo + create .env](#13-clone-repo--create-env)
  - [1.4 Build + migrate + seed](#14-build--migrate--seed)
  - [1.5 PM2 process manager](#15-pm2-process-manager)
  - [1.6 nginx reverse proxy + Let's Encrypt TLS](#16-nginx-reverse-proxy--lets-encrypt-tls)
  - [1.7 Production smoke probes](#17-production-smoke-probes)
- [Phase 2 — Deploy admin SPA to S3 + CloudFront](#phase-2--deploy-admin-spa-to-s3--cloudfront)
- [Phase 3 — Deploy web SPA to S3 + CloudFront](#phase-3--deploy-web-spa-to-s3--cloudfront)
- [Routine operations](#routine-operations)
- [Cost summary](#cost-summary)
- [Security checklist](#security-checklist)

---

## Phase 0 — One-time prerequisites

### 0.1 Choose + register your domains

You'll use **one root domain with subdomains** — cheaper, simpler TLS, and a
cleaner brand. Recommendation: `behbehanimotors.com` (customer-facing brand)
with subdomains:

| Subdomain | Purpose | Hosting |
|---|---|---|
| `www.behbehanimotors.com` + `behbehanimotors.com` | Public storefront (apps/web) | S3 + CloudFront |
| `admin.behbehanimotors.com` | Internal admin (apps/admin) | S3 + CloudFront |
| `api.behbehanimotors.com` | Backend API (apps/api on EC2) | EC2 + nginx |
| `cdn.behbehanimotors.com` *(optional)* | Media CDN over S3 bucket | CloudFront |

**Where to register:**

| Registrar | Cost (.com) | Notes |
|---|---|---|
| AWS Route 53 | ~$13/year | Easiest — DNS auto-managed in same account. Best default. |
| Cloudflare | ~$10/year | At-cost pricing, no markup. DNS + free CDN on top. |
| Namecheap | ~$10/year + WHOIS privacy | Cheap, separate DNS host. |

**Recommendation:** register at **Route 53** so all DNS records live in the
same AWS account. If you already own the domain elsewhere, you can either:
1. Transfer it to Route 53 (~$13 + 1 year auto-renew), or
2. Keep it where it is and just delegate the NS records to a Route 53 hosted
   zone (free; takes minutes to propagate).

> **What I cannot do for you:** register the domain. You must do this from
> your own AWS Console + payment method.

After registration, create a **Route 53 Hosted Zone** for the domain. Copy
the 4 NS records and (if not registered at Route 53) update your registrar.

### 0.2 AWS account + IAM admin user

If you don't have an AWS account, create one at https://aws.amazon.com/.
Set up:
- **MFA** on the root user (mandatory — root has unrestricted access)
- A separate **IAM user** with `AdministratorAccess` for daily work — never
  use the root user except for billing/account-closure
- AWS CLI configured locally: `aws configure --profile cpo-prod`

> **What I cannot do for you:** create your AWS account, hold your root
> credentials, or enter payment data.

### 0.3 SSH key pair

Create an SSH key for the EC2 instance:

```bash
ssh-keygen -t ed25519 -C "cpo-deploy-$(date +%Y%m)" -f ~/.ssh/cpo-deploy-key
chmod 400 ~/.ssh/cpo-deploy-key
```

Upload the public key (`cpo-deploy-key.pub` contents) when creating the EC2
instance in §1.1.g.

---

## Phase 1 — Deploy the API to EC2

### 1.1 Provision AWS infra

All in **eu-central-1**. Do these in the AWS Console (or extend the existing
`infrastructure/terraform/` for repeatable IaC).

#### a. VPC + subnets

Use the **default VPC**. It already has 3 public subnets across 3 AZs and an
Internet Gateway. Sufficient for v1; build a custom VPC later if you need
isolation tiers.

#### b. Security Groups (create 3)

| Name | Inbound rules | Outbound |
|---|---|---|
| `cpo-ec2-sg` | TCP 22 from **YOUR_IP/32**; TCP 80 from `0.0.0.0/0`; TCP 443 from `0.0.0.0/0` | All |
| `cpo-rds-sg` | TCP 5432 from **`cpo-ec2-sg` only** | None |
| `cpo-cache-sg` | TCP 6379 from **`cpo-ec2-sg` only** | None |

**Never** put `0.0.0.0/0` on 5432 or 6379. SG-to-SG references are the safe
pattern — they auto-track EC2 instance IPs.

#### c. RDS Postgres

| Setting | Value |
|---|---|
| Engine | PostgreSQL 16.x (latest minor) |
| Template | Production |
| DB instance identifier | `cpo-prod-db` |
| Instance class | `db.t4g.micro` (sufficient for v1) |
| Storage | 20 GB gp3, autoscaling to 100 GB max |
| Multi-AZ | No (enable later for SLA-grade uptime; doubles cost) |
| VPC | Default |
| Subnet group | Default (or create one across 3 AZs) |
| Public access | **No** |
| Security group | `cpo-rds-sg` |
| Master username | `cpo_admin` |
| Master password | Generate strong (≥ 16 chars), save to your password manager |
| Initial database name | `cpo` |
| Backup retention | 7 days |
| Encryption | Enabled (default with AWS-managed KMS key) |
| Enhanced monitoring | Off (saves a few $/mo; turn on if needed) |

After creation, copy the **Endpoint** value (`cpo-prod-db.xxxx.eu-central-1.rds.amazonaws.com`) — you'll paste it into `DATABASE_URL`.

#### d. ElastiCache Redis

| Setting | Value |
|---|---|
| Engine | Redis 7.x |
| Deployment | Cluster mode disabled (single node) |
| Name | `cpo-prod-cache` |
| Node type | `cache.t4g.micro` |
| Replicas | 0 |
| Subnet group | Default |
| Security group | `cpo-cache-sg` |
| Encryption in transit | **Enabled** (forces TLS — use `rediss://`) |
| Encryption at rest | Enabled |
| Backup | Disabled (Redis state here is OTP cache + rate-limit counters + BullMQ; safe to lose on failover) |

Copy the **Primary endpoint** for `REDIS_URL`.

#### e. S3 bucket for media

| Setting | Value |
|---|---|
| Bucket name | `behbehani-cpo-media-prod` (must be globally unique — adjust if taken) |
| Region | eu-central-1 |
| **Block all public access** | **ON** (presigned URLs grant temporary access) |
| Versioning | Enabled |
| Encryption | SSE-S3 (default) |

**CORS** (Permissions tab → CORS configuration):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "https://www.behbehanimotors.com",
      "https://admin.behbehanimotors.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Adjust origins to your real domains.

#### f. IAM role for EC2 (no static keys in .env)

IAM Console → Roles → Create role → AWS service / EC2.

Inline policy `cpo-ec2-s3-access`:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:GetObjectVersion",
      "s3:AbortMultipartUpload",
      "s3:ListBucket"
    ],
    "Resource": [
      "arn:aws:s3:::behbehani-cpo-media-prod",
      "arn:aws:s3:::behbehani-cpo-media-prod/*"
    ]
  }]
}
```

Name the role `cpo-ec2-role`. With this attached to the EC2 instance, you can
leave `S3_ACCESS_KEY` and `S3_SECRET_KEY` **blank** in `.env` — the AWS SDK
fetches temporary credentials from the instance metadata service. More secure
than static IAM-user keys.

#### g. EC2 instance

| Setting | Value |
|---|---|
| AMI | Ubuntu Server 22.04 LTS (arm64 — Graviton) |
| Instance type | `t4g.small` (2 vCPU, 2 GB RAM) |
| Key pair | Upload your `cpo-deploy-key.pub` from §0.3 |
| VPC | Default |
| Subnet | Any public subnet |
| Auto-assign public IPv4 | Enable |
| Security group | `cpo-ec2-sg` |
| IAM instance profile | `cpo-ec2-role` |
| Storage | 20 GB gp3 |

**Optional user-data** (paste in Advanced details → User data; auto-runs first boot):

```bash
#!/bin/bash
set -e
apt update -y && apt upgrade -y
apt install -y nginx postgresql-client redis-tools build-essential git certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2@latest
mkdir -p /var/log/cpo
chown ubuntu:ubuntu /var/log/cpo
```

#### h. Elastic IP

Allocate one and associate with the EC2 instance. You'll point `api.behbehanimotors.com` at this IP — Elastic IPs survive instance reboots/replacements, instance public IPs don't.

#### i. Route 53 DNS records

In your hosted zone, add:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `api.behbehanimotors.com` | Elastic IP from step h | 300 |

(Records for admin/web come in Phases 2/3.)

---

### 1.2 SSH in + system prep

```bash
ssh -i ~/.ssh/cpo-deploy-key ubuntu@api.behbehanimotors.com

# If user-data didn't run (or you want to verify):
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx postgresql-client redis-tools build-essential git certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs
sudo npm install -g pm2@latest

# Verify
node --version    # v22.x
pm2 --version
psql --version

# Connectivity smoke tests (substitute your endpoints)
psql "postgresql://cpo_admin:PASSWORD@RDS_ENDPOINT:5432/cpo?sslmode=require" -c '\l'
redis-cli -h ELASTICACHE_ENDPOINT --tls ping     # expect: PONG
```

If either smoke fails: most likely cause is security-group misconfiguration. Double-check that `cpo-rds-sg` / `cpo-cache-sg` allow inbound from `cpo-ec2-sg`.

---

### 1.3 Clone repo + create .env

```bash
sudo mkdir -p /opt/cpo && sudo chown ubuntu:ubuntu /opt/cpo
cd /opt/cpo

# Option A: from your git remote
git clone https://github.com/YOUR_ORG/YOUR_REPO.git .

# Option B: rsync from local machine (if repo isn't pushed yet)
#   rsync -avz --exclude node_modules --exclude .nx --exclude dist \
#         /local/path/MYB/Project/ ubuntu@api.behbehanimotors.com:/opt/cpo/

npm ci --no-audit --no-fund

# Create .env from template
cp apps/api/.env.production.example apps/api/.env
chmod 600 apps/api/.env

# Generate JWT secrets (different values!)
openssl rand -hex 48
openssl rand -hex 48

# Edit .env — paste secrets + RDS endpoint + ElastiCache endpoint + S3 bucket
nano apps/api/.env
```

Refer to comments in `.env.production.example` — every `<CHANGE_ME>` must be filled before continuing.

> **Security:** the `.env` file lives only on the server. Never commit it, never paste it into chat or email. Take a backup to your password manager.

---

### 1.4 Build + migrate + seed

```bash
cd /opt/cpo

# Generate Prisma client from schema
npx prisma generate --schema apps/api/prisma/schema.prisma

# Apply all migrations to RDS (idempotent — only applies new ones)
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

# Build webpack bundle → apps/api/dist/main.js + dist/seed/demo-media/
npx nx build api

# Seed (first deploy only — populates catalog + 12 listings + 6 with rich media)
npm run db:seed
```

Expected seed output:
```
[seed] catalog + demo users + 12 sample listings ready
[seed] attached demo rich media (video + 360) to 6 premium listings
```

> **Re-seeding is idempotent** but will reset demo data. Don't re-seed once
> you've added real listings — use the admin UI for live data instead.

---

### 1.5 PM2 process manager

```bash
cd /opt/cpo

# First-time start (ecosystem.config.cjs is at repo root)
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu
# ↑ prints a sudo command — copy and run it to enable auto-start on reboot

# Smoke check on loopback
curl http://127.0.0.1:3000/health
# {"status":"ok","uptime":...}

# Live tail
pm2 logs cpo-api --lines 50
```

---

### 1.6 nginx reverse proxy + Let's Encrypt TLS

```bash
# Copy the tracked nginx config from the repo
sudo cp /opt/cpo/infrastructure/nginx/cpo-api.conf /etc/nginx/sites-available/
sudo mkdir -p /etc/nginx/snippets
sudo cp /opt/cpo/infrastructure/nginx/snippets/cpo-proxy-common.conf /etc/nginx/snippets/

# Adjust server_name to your real domain (file is templated for behbehanimotors.com)
sudo sed -i 's/api\.behbehanimotors\.com/api.YOUR-DOMAIN.com/g' /etc/nginx/sites-available/cpo-api.conf

# Enable + reload
sudo ln -sf /etc/nginx/sites-available/cpo-api.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Smoke via public DNS (HTTP first)
curl http://api.YOUR-DOMAIN.com/health

# Provision Let's Encrypt cert — auto-edits the nginx config to add 443 + redirect
sudo certbot --nginx -d api.YOUR-DOMAIN.com \
  --non-interactive --agree-tos -m ops@YOUR-DOMAIN.com

# Verify cert auto-renewal cron
sudo certbot renew --dry-run
```

After certbot runs, your nginx config has both port-80 (redirects to 443) and
port-443 (terminates TLS) server blocks. Renewal is automatic via systemd timer.

---

### 1.7 Production smoke probes

```bash
# Health
curl https://api.YOUR-DOMAIN.com/health
# {"status":"ok","uptime":...}

# Public catalog endpoint
curl https://api.YOUR-DOMAIN.com/v1/public/listings?page=1
# {"items":[...12 entries...],"total":12,"page":1,"pageSize":20}

# v1.5.16 rich media surfaced on premium listing
curl https://api.YOUR-DOMAIN.com/v1/public/listings/2022-porsche-cayenne-0007 | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('walkaround:', d.get('walkaroundVideo')); print('spin360:', d.get('spin360'))"

# Demo media static mount
curl -I https://api.YOUR-DOMAIN.com/static/demo-media/walkaround/demo-walkaround.mp4
# HTTP/2 200 / content-type: video/mp4

# Auth — should reject unauthenticated
curl -i https://api.YOUR-DOMAIN.com/v1/admin/listings
# HTTP/2 401
```

If anything fails: `pm2 logs cpo-api --lines 100` + `sudo journalctl -u nginx -n 50`.

---

## Phase 2 — Deploy admin SPA to S3 + CloudFront

(After API is live + `https://api.YOUR-DOMAIN.com` smoke probes pass.)

### 2.1 S3 bucket for admin

| Setting | Value |
|---|---|
| Name | `behbehani-admin-prod` |
| Region | eu-central-1 |
| Block all public access | **ON** (CloudFront accesses via OAC) |
| Versioning | Optional (helpful for rollback) |
| Static website hosting | Off |

### 2.2 ACM TLS certificate (for CloudFront)

CloudFront certs MUST be in `us-east-1`. Switch region in console → Certificate Manager → Request a public certificate for `admin.YOUR-DOMAIN.com`. Use DNS validation (Route 53 creates the CNAME automatically).

### 2.3 CloudFront distribution

| Setting | Value |
|---|---|
| Origin domain | The S3 bucket (use the "REST API endpoint" suggestion, NOT the website endpoint) |
| Origin access | Origin Access Control (OAC) — create new, then update S3 bucket policy when prompted |
| Viewer protocol policy | Redirect HTTP to HTTPS |
| Allowed HTTP methods | GET, HEAD |
| Default root object | `index.html` |
| Alternate domain names (CNAMEs) | `admin.YOUR-DOMAIN.com` |
| Custom SSL certificate | Pick the ACM cert from §2.2 |
| Price class | "Use only North America and Europe" (cheaper, covers Kuwait via EU edge) |

**Custom error responses** (so Angular client-side routing works):

| HTTP error | Response page | Response code | TTL |
|---|---|---|---|
| 403 | `/index.html` | 200 | 10 |
| 404 | `/index.html` | 200 | 10 |

### 2.4 Build + deploy

On your local machine (or CI):

```bash
cd /local/path/MYB/Project

# Point the admin at the live API
cat > apps/admin/src/environments/environment.production.ts <<'EOF'
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.YOUR-DOMAIN.com',
};
EOF

# Build
npx nx build admin --configuration=production
# Outputs to apps/admin/dist/browser/

# Sync to S3
aws s3 sync apps/admin/dist/browser/ s3://behbehani-admin-prod/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.map"

# index.html gets a SHORT cache so deploys go live quickly
aws s3 cp apps/admin/dist/browser/index.html s3://behbehani-admin-prod/index.html \
  --cache-control "public, max-age=60, must-revalidate"

# Invalidate the CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/index.html" "/"
```

### 2.5 Route 53 + CORS

Add to Route 53:
| Type | Name | Value (alias) | TTL |
|---|---|---|---|
| A | `admin.YOUR-DOMAIN.com` | CloudFront distribution (use AWS-suggested alias target) | n/a |

Update API `.env`:
```bash
ssh ubuntu@api.YOUR-DOMAIN.com
nano /opt/cpo/apps/api/.env
# Add admin domain to CORS_ORIGINS:
#   CORS_ORIGINS=https://www.YOUR-DOMAIN.com,https://admin.YOUR-DOMAIN.com
pm2 reload cpo-api --update-env
```

### 2.6 Smoke

```bash
curl -I https://admin.YOUR-DOMAIN.com/
# HTTP/2 200 / content-type: text/html

# Open in browser, sign in with admin@test.local / Admin#2026 (from seed)
# Verify: listings load, can create/edit, no CORS errors in console
```

---

## Phase 3 — Deploy web SPA to S3 + CloudFront

Identical to Phase 2 with these substitutions:

| Phase 2 | Phase 3 |
|---|---|
| `behbehani-admin-prod` | `behbehani-web-prod` |
| `admin.YOUR-DOMAIN.com` | `www.YOUR-DOMAIN.com` (and apex `YOUR-DOMAIN.com` if desired) |
| `apps/admin/...` | `apps/web/...` |

Extra step for the apex (root) domain `behbehanimotors.com` → `www.behbehanimotors.com`:

| Type | Name | Value | TTL |
|---|---|---|---|
| A (alias) | `www.YOUR-DOMAIN.com` | CloudFront for web | n/a |
| A (alias) | `YOUR-DOMAIN.com` | CloudFront for web (add apex as alternate domain on the same distribution + a 2nd ACM cert) | n/a |

Update API CORS to include both web origins, then `pm2 reload cpo-api --update-env`.

---

## Routine operations

### Update / re-deploy the API

```bash
ssh ubuntu@api.YOUR-DOMAIN.com
cd /opt/cpo
bash scripts/deploy-api.sh
```

That script does: `git pull` → `npm ci` → `prisma migrate deploy` → `nx build api` → `pm2 reload cpo-api` → health-probe wait.

Flags:
- `--skip-migrate` — skip migrations if you know none changed
- `--no-pull` — deploy current checkout without pulling
- `--no-restart` — build only

### Update an SPA

Re-run §2.4 (admin) or §3 equivalent for web. Cache invalidation is the
critical step — without it CloudFront serves the old `index.html` for up to
24 hours.

### Rollback the API

```bash
ssh ubuntu@api.YOUR-DOMAIN.com
cd /opt/cpo
git log --oneline -10
git checkout <previous-commit-sha>
bash scripts/deploy-api.sh --no-pull
```

If a migration is the problem, **don't roll back migrations** — they're append-only. Roll the *code* back to a version that's compatible with the migrated schema.

### Backups

- **RDS** auto-backs up daily with 7-day retention (set in §1.1.c). To restore: RDS → Snapshots → Restore.
- **S3** versioning is on (set in §1.1.e). Deleted objects can be recovered via "Show versions".
- **App code** lives in git. The `.env` file is your secret backup responsibility — store a copy in your password manager.

### Logs

```bash
pm2 logs cpo-api --lines 200          # app
sudo journalctl -u nginx -n 100       # nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

For long-term log shipping, consider CloudWatch Agent (push pm2 + nginx logs to CloudWatch Logs).

### Monitoring

Bare-minimum monitors to set up:
- **Uptime ping** of `https://api.YOUR-DOMAIN.com/health` from outside AWS (UptimeRobot free tier, or CloudWatch Synthetics)
- **CloudWatch alarms** on EC2 CPU > 80%, RDS CPU > 80%, RDS storage < 5 GB free
- **Slack/email alerts** on PM2 restart count > 5 in 10 min

---

## Cost summary

Monthly cost for the architecture above in eu-central-1 (Frankfurt), light traffic (~1k MAU):

| Service | Spec | Approx $/month |
|---|---|---|
| EC2 t4g.small + 20 GB EBS | 2 vCPU / 2 GB | $14 |
| Elastic IP (in use) | — | $0 |
| RDS db.t4g.micro + 20 GB | Postgres 16 | $14 |
| ElastiCache cache.t4g.micro | Redis 7 | $12 |
| S3 (media + 2 SPA buckets) | ~10 GB + requests | $3 |
| CloudFront (2 distributions) | ~100 GB/mo | $5 |
| Route 53 (1 zone + queries) | — | $1 |
| Data transfer out (~50 GB) | — | $4 |
| **Total** | | **~$53/month** |

Growth signal to upgrade:
- API EC2 CPU > 60% sustained → t4g.medium ($28)
- RDS CPU > 70% sustained → db.t4g.small ($28)
- Add Multi-AZ on RDS when downtime tolerance < 1h ($28 extra)

---

## Security checklist

Before going live, verify:

- [ ] `.env` is `chmod 600`, owned by deploy user
- [ ] `.env` is NOT in git (`git ls-files --error-unmatch apps/api/.env` → fatal)
- [ ] JWT_ACCESS_SECRET ≠ JWT_REFRESH_SECRET; both ≥ 48 hex chars
- [ ] RDS not publicly accessible (`Publicly accessible: No`)
- [ ] ElastiCache `Encryption in transit: enabled` → URL uses `rediss://`
- [ ] EC2 SG: SSH (22) restricted to your IP/32, NOT `0.0.0.0/0`
- [ ] S3 bucket: Block all public access ON; CORS origins are explicit (no `*`)
- [ ] IAM role attached to EC2 has S3 access only — not full admin
- [ ] HTTPS works + HTTP redirects to HTTPS (`curl -I http://api.YOUR-DOMAIN.com/`)
- [ ] certbot auto-renewal is set up (`systemctl status certbot.timer`)
- [ ] RDS backups: 7 days retention, encryption enabled
- [ ] CORS_ORIGINS lists exact domains (no `*`, no http://, no trailing slash)
- [ ] Default admin password from seed (`Admin#2026`) is changed via admin UI on first login
- [ ] CloudWatch billing alarm set at your monthly budget threshold
- [ ] MFA on AWS root + IAM admin users

---

## Appendix — File locations

| Path | Contents |
|---|---|
| `/opt/cpo` | Git checkout |
| `/opt/cpo/apps/api/.env` | Production env (chmod 600) |
| `/opt/cpo/apps/api/.secrets/` | Firebase JSON, APNs .p8 (chmod 700 dir, 600 files) |
| `/opt/cpo/ecosystem.config.cjs` | PM2 config (tracked) |
| `/opt/cpo/scripts/deploy-api.sh` | Deploy script (tracked) |
| `/etc/nginx/sites-available/cpo-api.conf` | nginx server config (copy from `/opt/cpo/infrastructure/nginx/`) |
| `/etc/nginx/snippets/cpo-proxy-common.conf` | Shared proxy snippet |
| `/var/log/cpo/api-*.log` | PM2 stdout/stderr |
| `/etc/letsencrypt/live/api.YOUR-DOMAIN.com/` | TLS cert + key |
| `~/.pm2/dump.pm2` | PM2 process snapshot (created by `pm2 save`) |

---

## Appendix — IP-only HTTP deployment (no domain yet)

For early demos / staging where you don't have a domain registered yet. Skips
Route 53, Let's Encrypt, and TLS entirely. **Not safe for public customer-facing
use**: no padlock, cookies with `Secure` flag silently fail, OAuth callbacks
break, mobile push deep-links break. Acceptable for internal demos, dev/staging,
and stakeholder screen-shares.

### Constraints

| Works ✅ | Breaks ❌ |
|---|---|
| Internal demo / screen-share | Public customer access (browser security warnings) |
| Dev/staging testing | Mobile push deep-links (FCM/APNs require HTTPS) |
| Postman/curl smoke tests | Apple Sign-In + Google OAuth (HTTPS callback required) |
| Local SPAs pointing at the IP | Cookies with `Secure` flag (silently dropped over HTTP) |
| | Service workers / PWA on customer storefront |

### Modified Phase 1 steps

Same as §1.1 — §1.7 with these changes:

| Step | Change |
|---|---|
| §1.1.e CORS | `AllowedOrigins`: `["http://<EC2-IP>", "http://localhost:4200", "http://localhost:4201"]` |
| §1.1.i Route 53 | **SKIP** — no domain to point. Use the Elastic IP directly. |
| §1.2 system prep | Skip `certbot python3-certbot-nginx` packages (no Let's Encrypt). |
| §1.3 `.env` creation | Use the helper script (below) instead of hand-editing. |
| §1.6 nginx | After `sudo cp`: replace `server_name api.behbehanimotors.com;` with `server_name _;` (catch-all, accepts raw IP host header). |
| §1.6 Let's Encrypt | **SKIP** entirely. No `certbot` invocation. |
| §1.7 smoke | Hit `http://<EC2-IP>/health` instead of `https://api.YOUR-DOMAIN.com/health`. |

### Helper script for `.env` generation

`scripts/setup-env-ip-only.sh` interactively prompts for the 5 values you need
(EC2 IP, RDS endpoint + password, ElastiCache endpoint, S3 bucket name) and
auto-generates JWT secrets via `openssl rand`. Reduces step §1.3 from ~15 min
of manual editing to ~2 min of guided prompts.

**Run on the server after cloning the repo:**

```bash
cd /opt/cpo
bash scripts/setup-env-ip-only.sh
```

Prompts you'll see:
```
EC2 Elastic IP (e.g. 13.50.123.45): 13.50.123.45
RDS endpoint (cpo-prod-db.xxxx.eu-central-1.rds.amazonaws.com): cpo-prod-db.abc.eu-central-1.rds.amazonaws.com
RDS master password (cpo_admin) (input hidden): ********
ElastiCache primary endpoint: cpo-prod-cache.xyz.cache.amazonaws.com
S3 bucket name [behbehani-cpo-media-prod]: <press enter>
AWS region [eu-central-1]: <press enter>
```

Output: `apps/api/.env` (chmod 600), fully populated with:
- Strong JWT secrets (96 hex chars each, different from each other)
- `DATABASE_URL=postgresql://...?sslmode=require`
- `REDIS_URL=rediss://...:6379` (TLS — assumes ElastiCache encryption-in-transit on)
- `CORS_ORIGINS=http://<EC2-IP>,http://localhost:4200,http://localhost:4201`
- `SIGN_LINK_BASE_URL=http://<EC2-IP>`
- `S3_PUBLIC_BASE_URL=https://<bucket>.s3.<region>.amazonaws.com` (S3 keeps its own HTTPS via AWS cert)
- Empty `S3_ACCESS_KEY` / `S3_SECRET_KEY` (assumes EC2 IAM role from §1.1.f)
- All optional creds (Firebase / APNs / Otto / SendGrid / Unifonic) left blank → mock-fallback

Non-interactive mode (skip prompts via flags) — useful for CI or scripted
provisioning:

```bash
bash scripts/setup-env-ip-only.sh \
  --ec2-ip=13.50.123.45 \
  --rds-endpoint=cpo-prod-db.abc.eu-central-1.rds.amazonaws.com \
  --rds-password-stdin \
  --cache-endpoint=cpo-prod-cache.xyz.cache.amazonaws.com \
  --s3-bucket=behbehani-cpo-media-prod \
  --aws-region=eu-central-1 \
  --force <<< "$RDS_PASSWORD"
```

### Smoke probes (IP-only)

```bash
# Health
curl http://<EC2-IP>/health
# {"status":"ok","uptime":...}

# Public catalog
curl http://<EC2-IP>/v1/public/listings?page=1

# Demo media (Pixabay 360 — v1.5.21)
curl -I http://<EC2-IP>/static/demo-media/spin360/demo-spin360-v2.mp4
# HTTP/1.1 200, content-type: video/mp4
```

### Upgrade path → real domain + TLS

When you eventually register a domain (e.g. `behbehanimotors.com`):

1. Route 53: create hosted zone, A-record `api.behbehanimotors.com` → Elastic IP.
2. SSH in: `sudo apt install -y certbot python3-certbot-nginx` (was skipped earlier).
3. Edit `/etc/nginx/sites-available/cpo-api.conf`: change `server_name _;` → `server_name api.behbehanimotors.com;`.
4. `sudo nginx -t && sudo systemctl reload nginx`
5. `sudo certbot --nginx -d api.behbehanimotors.com --non-interactive --agree-tos -m ops@behbehanimotors.com`
6. Update `.env`:
   - `CORS_ORIGINS=https://api.behbehanimotors.com,...` (drop http://IP entries when ready)
   - `SIGN_LINK_BASE_URL=https://www.behbehanimotors.com`
7. `pm2 reload cpo-api --update-env`

No DB migration, no rebuild, no data loss. ~15 min end-to-end.

### Upgrade path → CloudFront-fronted HTTPS (no domain needed)

If you want HTTPS sooner but don't have a domain yet, put CloudFront in front
of the EC2 IP (origin = your Elastic IP, protocol HTTP). CloudFront auto-assigns
`https://d1234abcd.cloudfront.net`. Free `*.cloudfront.net` cert, generous free
tier (~$0/mo at low traffic). See §2.2 — §2.3 for CloudFront setup patterns;
the API origin uses the same shape as the SPAs but with `CachingDisabled` policy.
