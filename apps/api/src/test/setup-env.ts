/**
 * Jest setupFiles entry — loaded BEFORE any module that calls
 * `EnvSchema.parse(process.env)` is imported (i.e. before config/env.ts runs).
 *
 * Per project CONVENTIONS §13.5: tests must NOT depend on a real .env.
 * Every required env var gets a deterministic default here. The Zod schema
 * in config/env.ts already supplies fallbacks for most fields, so this file
 * only needs to set values that differ in test context or that have no schema
 * default (schema defaults are used when env var is absent, but explicitly
 * setting them here documents the test contract and prevents accidental bleed
 * from a developer's local .env that jest might pick up).
 */

process.env['NODE_ENV'] ??= 'test';

// ─── JWT ─────────────────────────────────────────────────────────────────────
process.env['JWT_ACCESS_SECRET'] ??= 'test-jwt-access-secret-32-chars-min';
process.env['JWT_REFRESH_SECRET'] ??= 'test-jwt-refresh-secret-32-chars-min';

// ─── Database ─────────────────────────────────────────────────────────────────
// Prisma client is always mocked in unit tests; this URL is never dialled.
process.env['DATABASE_URL'] ??= 'postgres://test:test@localhost:5432/test_db';

// ─── Redis ───────────────────────────────────────────────────────────────────
// ioredis is always mocked in unit tests; this URL is never dialled.
process.env['REDIS_URL'] ??= 'redis://localhost:6379';

// ─── CORS ────────────────────────────────────────────────────────────────────
process.env['CORS_ORIGINS'] ??= 'http://localhost:4200';

// ─── S3 / MinIO ──────────────────────────────────────────────────────────────
process.env['S3_ENDPOINT'] ??= 'http://localhost:9000';
process.env['S3_REGION'] ??= 'us-east-1';
process.env['S3_BUCKET'] ??= 'cpo-media-test';
process.env['S3_ACCESS_KEY'] ??= 'test-access-key';
process.env['S3_SECRET_KEY'] ??= 'test-secret-key';
process.env['S3_PUBLIC_BASE_URL'] ??= 'http://localhost:9000/cpo-media-test';

// ─── Notifications ────────────────────────────────────────────────────────────
// devlog provider is the default — no external calls in test.
process.env['NOTIFICATIONS_SMS_PROVIDER'] ??= 'devlog';
process.env['NOTIFICATIONS_EMAIL_PROVIDER'] ??= 'devlog';
process.env['SIGN_LINK_BASE_URL'] ??= 'http://localhost:4200';

// ─── OTP ─────────────────────────────────────────────────────────────────────
process.env['OTP_TTL_MINUTES'] ??= '5';
