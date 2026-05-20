/**
 * Mobile push token capture stub — v1.4 Day 1 per CONCIERGE v1.4.2 §5
 *
 * Calls B's locked POST /v1/public/notifications/push-token endpoint.
 * Permission UX: prompt on first sign-in (not at cold launch).
 * Token revoke: called from sign-out flow per v1.4.3 §4 DELETE shape.
 *
 * expo-notifications import is guarded with try/require so this module loads
 * even when the package is not yet installed (mirrors the pattern used for
 * expo-image-picker in the sell photos flow).
 *
 * INSTALL REQUIRED: `npx expo install expo-notifications` from apps/mobile/
 * and add the plugin entry to app.json (see Step 1 in the sprint brief).
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { httpClient } from '../services/http';
import { NotificationsPublicApiClient } from '@behbehani-cpo/data-access-mobile';

// ─── expo-notifications require guard ────────────────────────────────────────
// Wraps the import so the module still loads in environments where
// expo-notifications has not been installed yet (e.g. CI, web, bare test runner).
// TODO (v1.4 Day 1): Remove the guard once `npx expo install expo-notifications`
// has been run and confirmed in the dev environment.

// Minimal inline shape for the subset of expo-notifications APIs we call.
// Avoids a hard type-level dependency on the package before it is installed.
interface ExpoNotificationsModule {
  requestPermissionsAsync(): Promise<{ status: string }>;
  getDevicePushTokenAsync(): Promise<{ data: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Notifications: ExpoNotificationsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  Notifications = require('expo-notifications') as ExpoNotificationsModule;
} catch {
  console.warn(
    '[pushTokens] expo-notifications is not installed. ' +
      'Run: npx expo install expo-notifications in apps/mobile/. ' +
      'Push token registration will be skipped until then.',
  );
}

// ─── Singleton API client ─────────────────────────────────────────────────────
// Uses the intercepted httpClient — both endpoints require a valid Bearer token.
const notificationsClient = new NotificationsPublicApiClient(httpClient);

// ─── App version label ────────────────────────────────────────────────────────

const APP_VERSION: string =
  (Constants.expoConfig?.version as string | undefined) ?? '0.0.0';

function buildDeviceLabel(): string {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return `BehbehaniCPO/${platform}/${APP_VERSION}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Requests push notification permission from the OS.
 * Should be called after the user has signed in — not at cold app launch.
 *
 * @returns true if permission was granted (or was already granted), false otherwise.
 */
export async function ensurePushPermission(): Promise<boolean> {
  if (!Notifications) {
    console.warn('[pushTokens] ensurePushPermission: expo-notifications not available.');
    return false;
  }

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    if (!granted) {
      console.warn('[pushTokens] Push notification permission denied by user.');
    }
    return granted;
  } catch (err) {
    console.warn('[pushTokens] ensurePushPermission failed:', err);
    return false;
  }
}

/**
 * Captures the device push token and registers it with the CPO API.
 * This is best-effort — failures must NOT block sign-in or any user flow.
 *
 * Platform notes:
 *   - iOS:     uses getDevicePushTokenAsync() for native APNs token;
 *               firebase-admin on B's side accepts both APNs and FCM tokens.
 *   - Android: uses getDevicePushTokenAsync() for FCM registration token.
 *   - Web:     returns null (push not supported in this app's web target).
 *
 * @param opts.deviceLabel  Optional label override. Defaults to "BehbehaniCPO/{platform}/{version}".
 * @returns The registered token + platform, or null on failure / unsupported platform.
 */
export async function captureAndRegisterPushToken(
  opts?: { deviceLabel?: string },
): Promise<{ token: string; platform: 'ios' | 'android' } | null> {
  if (Platform.OS === 'web') {
    // Web is not a push target for this app.
    return null;
  }

  if (!Notifications) {
    console.warn('[pushTokens] captureAndRegisterPushToken: expo-notifications not available.');
    return null;
  }

  const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';

  try {
    // getDevicePushTokenAsync() returns the native APNs token (iOS) or FCM token (Android).
    // firebase-admin on B's server accepts both paths via the FCM unified HTTP v1 API.
    //
    // Alternative: getExpoPushTokenAsync() returns an Expo push token routed via Expo's
    // FCM gateway. We use the native token here so B can use firebase-admin directly
    // without routing through Expo's infrastructure (v1.4.3 design decision).
    const { data: token } = await Notifications.getDevicePushTokenAsync();

    const deviceLabel = opts?.deviceLabel ?? buildDeviceLabel();

    await notificationsClient.registerPushToken({ token, platform, deviceLabel });

    console.log(`[pushTokens] Push token registered (${platform}).`);
    return { token, platform };
  } catch (err) {
    // Best-effort: log and return null — caller must not block on this.
    console.warn('[pushTokens] captureAndRegisterPushToken failed (non-fatal):', err);
    return null;
  }
}

/**
 * Revokes the device push token from the CPO API (sign-out flow).
 * The DELETE endpoint is idempotent per v1.4.3 §4 — safe to call even if the
 * token was never registered. Failures are silently swallowed (best-effort cleanup).
 *
 * @param token The push token string that was returned at registration time.
 */
export async function revokePushToken(token: string): Promise<void> {
  try {
    await notificationsClient.unregisterPushToken(token);
    console.log('[pushTokens] Push token revoked.');
  } catch (err) {
    // Silent — revocation is best-effort. The server's idempotent DELETE
    // handles the case where the token is already gone (v1.4.3 §4).
    console.warn('[pushTokens] revokePushToken failed (non-fatal):', err);
  }
}
