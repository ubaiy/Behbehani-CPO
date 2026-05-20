/**
 * Notification deep-link router — Task #64
 *
 * Handles push notification taps and routes the user to the correct in-app screen
 * via expo-router's universal link handler (`Linking.openURL`).
 *
 * The `deepLink` field in notification payloads is shaped like:
 *   behbehani-motors://orders/${id}
 *   behbehani-motors://inspections/${id}
 *   behbehani-motors://listing/${id}
 *   (see MOBILE_API_CONTRACT.md §2)
 *
 * Only URLs that start with `behbehani-motors://` are accepted — any other URL
 * is rejected (defence against malicious push payloads).
 *
 * expo-notifications import is guarded with try/require — mirrors the pattern
 * used in pushTokens.ts so the module loads even when the package is absent
 * (e.g. CI, bare test runner, or before `npx expo install expo-notifications`).
 */

import * as Linking from 'expo-linking';
import { isValidCustomSchemeUrl } from '../services/deeplinks';

// ─── expo-notifications require guard ────────────────────────────────────────
// Minimal inline types for the subset of expo-notifications APIs we call here.
// Kept deliberately narrow to avoid a hard type-level dependency on the package.

interface NotificationData {
  deepLink?: unknown;
  [key: string]: unknown;
}

interface NotificationContent {
  data: NotificationData;
}

interface NotificationRequest {
  content: NotificationContent;
}

interface Notification {
  request: NotificationRequest;
}

export interface NotificationResponse {
  notification: Notification;
}

interface NotificationSubscription {
  remove(): void;
}

interface ExpoNotificationsModule {
  addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void,
  ): NotificationSubscription;
  getLastNotificationResponseAsync(): Promise<NotificationResponse | null | undefined>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Notifications: ExpoNotificationsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  Notifications = require('expo-notifications') as ExpoNotificationsModule;
} catch {
  console.warn(
    '[notificationRouter] expo-notifications is not installed. ' +
      'Run: npx expo install expo-notifications in apps/mobile/. ' +
      'Push notification tap routing will be skipped until then.',
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extracts the `deepLink` field from a notification tap response.
 *
 * Returns null if:
 *   - the field is missing or not a string
 *   - the URL does not start with `behbehani-motors://` (scheme guard)
 */
export function extractDeepLink(response: NotificationResponse): string | null {
  const data = response.notification.request.content.data;
  const deepLink = data?.deepLink;

  if (!isValidCustomSchemeUrl(deepLink)) {
    if (deepLink !== undefined) {
      console.warn(
        '[notificationRouter] Rejected deepLink with unexpected scheme:',
        deepLink,
      );
    }
    return null;
  }

  return deepLink;
}

/**
 * Opens the given custom-scheme URL via expo-router's universal link handler.
 * Wrap in try/catch — failure is logged but must not crash the app.
 */
export async function routeToDeepLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch (err) {
    console.warn('[notificationRouter] routeToDeepLink failed for URL:', url, err);
  }
}

/**
 * Attaches a `Notifications.addNotificationResponseReceivedListener` callback
 * that extracts and routes the deepLink whenever the user taps a notification.
 *
 * If expo-notifications is not installed, this is a no-op that returns a dummy
 * unsubscribe function so call-sites never need to branch on package availability.
 *
 * @returns A cleanup function — call on component unmount to remove the listener.
 */
export function setupNotificationRouter(): () => void {
  if (!Notifications) {
    return () => {
      /* no-op: expo-notifications not available */
    };
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response: NotificationResponse) => {
      const url = extractDeepLink(response);
      if (url) {
        void routeToDeepLink(url);
      }
    },
  );

  return () => subscription.remove();
}
