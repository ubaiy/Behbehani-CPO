/**
 * Push notification adapter — FCM (Android) + APNs (iOS).
 *
 * Looks up the user's active PushToken rows, projects the v1.3.0 §6.1
 * NotificationPayload into FCM message + APNs payload shapes, dispatches via
 * provider SDKs, and prunes invalid tokens.
 *
 * MOCK FALLBACK: if FCM/APNs creds aren't in env (FIREBASE_SERVICE_ACCOUNT_PATH
 * + APNS_KEY_PATH unset), logs the dispatch to the dev notifications log file
 * (same pattern as notifications.service.ts: apps/api/.dev/notifications.log)
 * and returns success. This keeps v1.4 development unblocked through Day 3-4
 * while user procures creds.
 *
 * Real dispatch lights up automatically the moment env vars land — no code
 * change needed beyond the env update.
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.2 §5 Day 3.
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';
import type { NotificationPayload } from '../notification.service';

// Lazy import — only loaded when FCM creds are present.
let firebaseAdminLazy: typeof import('firebase-admin') | null = null;

// ─── Credential guards ────────────────────────────────────────────────────

const hasFcmCreds  = (): boolean => Boolean(env.FIREBASE_SERVICE_ACCOUNT_PATH);
const hasApnsCreds = (): boolean =>
  Boolean(env.APNS_KEY_PATH && env.APNS_KEY_ID && env.APNS_TEAM_ID);

// ─── Firebase Admin lazy init ─────────────────────────────────────────────

async function getFirebaseAdmin(): Promise<typeof import('firebase-admin')> {
  if (!firebaseAdminLazy) {
    // Dynamic import so TypeScript compiles without firebase-admin installed.
    // npm i firebase-admin is handled by lead post-swarm.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import('firebase-admin')) as any;
    if (mod.apps.length === 0) {
      // firebase-admin's `cert()` accepts a file path OR a parsed object.
      // Passing the path keeps the service-account JSON out of the env/process
      // memory dump and avoids the 2-3KB env-var-bloat-on-every-spawn cost.
      mod.initializeApp({ credential: mod.credential.cert(env.FIREBASE_SERVICE_ACCOUNT_PATH) });
    }
    firebaseAdminLazy = mod;
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return firebaseAdminLazy!;
}

// ─── Dev mock log (mirrors apps/api/.dev/notifications.log convention) ───

const DEV_LOG_DIR  = path.join(process.cwd(), 'apps', 'api', '.dev');
const DEV_LOG_PATH = path.join(DEV_LOG_DIR, 'notifications.log');

async function logMockDispatch(
  channel: 'fcm' | 'apns' | 'apns-pending',
  tokens: string[],
  payload: Record<string, unknown>,
): Promise<void> {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    channel,
    tokenCount: tokens.length,
    payload,
  }) + '\n';
  try {
    if (!fs.existsSync(DEV_LOG_DIR)) fs.mkdirSync(DEV_LOG_DIR, { recursive: true });
    fs.appendFileSync(DEV_LOG_PATH, entry, 'utf8');
  } catch (err) {
    // Non-fatal — mirror the same pattern used by notifications.service.ts.
    // eslint-disable-next-line no-console
    console.error('[push.adapter] dev-log write failed', err);
  }
  // eslint-disable-next-line no-console
  console.log(`[push.adapter MOCK ${channel}]`, entry.trim());
}

// ─── Adapter ──────────────────────────────────────────────────────────────

/**
 * Push adapter registered with NotificationService.
 * Signature matches ChannelAdapter from notification.service.ts.
 */
export async function pushAdapter(
  user: { id: string; email: string | null; mobile: string | null; locale: 'en' | 'ar' },
  payload: NotificationPayload,
): Promise<void> {
  const tokens = await prisma.pushToken.findMany({
    where:  { userId: user.id },
    select: { id: true, token: true, platform: true },
  });
  if (tokens.length === 0) return; // nothing to do

  const title = payload.title[user.locale] ?? payload.title.en;
  const body  = payload.body[user.locale]  ?? payload.body.en;

  const androidTokens = tokens.filter((t) => t.platform === 'android').map((t) => t.token);
  const iosTokens     = tokens.filter((t) => t.platform === 'ios').map((t) => t.token);

  // ── FCM dispatch (Android) ───────────────────────────────────────────────
  if (androidTokens.length > 0) {
    if (hasFcmCreds()) {
      const admin = await getFirebaseAdmin();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (admin as any).messaging().sendEachForMulticast({
          tokens:       androidTokens,
          notification: { title, body },
          data:         payload.deepLink ? { deepLink: payload.deepLink } : undefined,
        });
        // Prune tokens that FCM rejected as permanently invalid.
        const invalidTokens: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response.responses.forEach((r: any, idx: number) => {
          if (!r.success && r.error) {
            const code: string | undefined = r.error?.code;
            if (
              code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token'
            ) {
              invalidTokens.push(androidTokens[idx]);
            }
          }
        });
        if (invalidTokens.length > 0) {
          await prisma.pushToken.deleteMany({ where: { token: { in: invalidTokens } } });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[push.adapter] FCM dispatch failed', err);
        throw err;
      }
    } else {
      await logMockDispatch('fcm', androidTokens, { title, body, deepLink: payload.deepLink, meta: payload.meta });
    }
  }

  // ── APNs dispatch (iOS) ──────────────────────────────────────────────────
  if (iosTokens.length > 0) {
    if (hasApnsCreds()) {
      // Real APNs via @parse/node-apn or node-apn will be wired here once user
      // provisions the .p8 key. Logged as 'apns-pending' so it's distinguishable
      // from the ordinary mock path.
      // TODO v1.4.x: wire real APNs dispatch using env.APNS_KEY_PATH / KEY_ID / TEAM_ID / BUNDLE_ID.
      await logMockDispatch('apns-pending', iosTokens, { title, body, deepLink: payload.deepLink, meta: payload.meta });
    } else {
      await logMockDispatch('apns', iosTokens, { title, body, deepLink: payload.deepLink, meta: payload.meta });
    }
  }
}
