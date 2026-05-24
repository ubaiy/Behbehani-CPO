import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-change-me-please'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-change-me-please'),
  JWT_ACCESS_TTL_SEC: z.coerce.number().int().positive().default(24 * 60 * 60), // 1 day (FR-AUTH-007; changed from 15 min Sprint 3)
  JWT_REFRESH_TTL_SEC: z.coerce.number().int().positive().default(30 * 24 * 60 * 60), // 30 days
  DATABASE_URL: z.string().default('postgres://cpo:cpo@localhost:5432/cpo'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGINS: z.string().default('http://localhost:4200,http://localhost:4201'),

  // ─── S3 (MinIO local) ───
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('cpo-media'),
  S3_ACCESS_KEY: z.string().default('cpo-local'),
  S3_SECRET_KEY: z.string().default('cpo-local-secret'),
  S3_PUBLIC_BASE_URL: z.string().url().default('http://localhost:9000/cpo-media'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  S3_PRESIGN_TTL_SEC: z.coerce.number().int().positive().default(900),
  MAX_PHOTO_BYTES: z.coerce.number().int().positive().default(10_485_760),   // 10 MB
  MAX_VIDEO_BYTES: z.coerce.number().int().positive().default(104_857_600),  // 100 MB
  MAX_360_BYTES: z.coerce.number().int().positive().default(262_144_000),    // 250 MB
  /** Max byte size for customer avatar uploads (v1.5.10). Default 5 MB —
   *  generous for compressed JPEG/PNG headshots, tight enough to discourage
   *  raw camera dumps. Mobile/web should client-side downscale before PUT. */
  MAX_AVATAR_BYTES: z.coerce.number().int().positive().default(5_242_880),   // 5 MB

  // ─── Aging engine ───
  AGING_ENGINE_CRON: z.string().default('0 2 * * *'),
  AGING_ENGINE_TZ: z.string().default('Asia/Kuwait'),
  AGING_ENGINE_ENABLED: z.coerce.boolean().default(true),

  // ─── Notifications (Concierge inspection signing links) ───
  /** 'devlog' writes payloads to apps/api/.dev/notifications.log (default).
   *  'unifonic' uses the Unifonic API for SMS (KW/GCC primary provider).
   *  'sendgrid' uses SendGrid for email. */
  NOTIFICATIONS_SMS_PROVIDER: z.enum(['devlog', 'unifonic']).default('devlog'),
  NOTIFICATIONS_EMAIL_PROVIDER: z.enum(['devlog', 'sendgrid']).default('devlog'),
  UNIFONIC_APP_ID: z.string().default(''),
  UNIFONIC_SENDER_ID: z.string().default('Behbehani'),
  SENDGRID_API_KEY: z.string().default(''),
  EMAIL_FROM_ADDRESS: z.string().default('concierge@behbehani.com'),
  /** Base URL the customer's signing link will use, e.g. https://behbehani.com.
   *  Templates render the link as `${SIGN_LINK_BASE_URL}/inspection-sign/:token`. */
  SIGN_LINK_BASE_URL: z.string().url().default('http://localhost:4200'),
  SIGN_LINK_TTL_DAYS: z.coerce.number().int().positive().default(7),

  // ─── OTP (v1.2 customer auth) ───
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(5),
  /** Google OAuth client id; required at runtime once verifyGoogleIdToken is wired. */
  GOOGLE_OAUTH_CLIENT_ID: z.string().default(''),

  // ─── CDN (v1.3 avatars) ───
  /** Base URL for CDN-served assets. avatarUrl paths are relative; this prefix
   *  is prepended in toPublic(). Empty string = relative paths served as-is. */
  CDN_BASE_URL: z.string().default(''),

  // ─── Push notification provider creds (v1.4 Day 3) ───────────────────────
  // Empty string = mock fallback; real dispatch activates automatically once
  // values are populated. See push.adapter.ts for details.
  /** File path to the Firebase service-account JSON (e.g. `apps/api/.secrets/firebase-admin.json`).
   *  Required for FCM (Android) dispatch. Empty = mock-fallback in push.adapter.ts.
   *  Store the actual file under `apps/api/.secrets/` — directory is gitignored. */
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().default(''),
  /** APNs 10-character key ID from Apple Developer portal (e.g. "ABCDE12345"). */
  APNS_KEY_ID:   z.string().default(''),
  /** Apple Developer team ID (10-character, e.g. "UVWXY67890"). */
  APNS_TEAM_ID:  z.string().default(''),
  /** Absolute file path to the .p8 APNs auth key on the server. */
  APNS_KEY_PATH: z.string().default(''),
  /** APNs bundle identifier, e.g. "com.behbehani.cpo". */
  APNS_BUNDLE_ID: z.string().default(''),

  // ─── Otto Payment Services (v1.4 Day 4 — mock mode; real creds land Day 5) ───
  /** Otto API key for authenticated server-to-server calls (e.g. session creation). */
  OTTO_API_KEY:         z.string().default(''),
  /** HMAC secret for verifying X-Otto-Signature on incoming webhooks. Empty = skip verify (dev). */
  OTTO_WEBHOOK_SECRET:  z.string().default(''),
  /** Base URL for Otto-hosted checkout pages, e.g. https://sandbox.otto.kw/checkout */
  OTTO_HOSTED_BASE_URL: z.string().default('https://sandbox.otto.kw/checkout'),
  /** When true, mock Otto responses without calling the real Otto API. */
  OTTO_SANDBOX_MODE:    z.coerce.boolean().default(true),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);

export const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
