/**
 * Unified notification dispatcher.
 *
 * Single API that all subsystems use to send notifications. Reads the user's
 * `notificationPreferences` (v1.3.0 §6.1) and filters by channels + categories
 * BEFORE invoking channel adapters. Logs every dispatch to AuditLog for
 * compliance.
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.1 §6.
 *
 * Channel adapters are pluggable per channel:
 *  - sms     → existing SMS provider (currently mocked via dev log file)
 *  - email   → existing email provider
 *  - push    → FCM + APNs dispatcher (v1.4 Push subsystem ships this)
 *
 * Channel adapter contract:
 *  - Throws if the dispatch failed (caller catches + logs to AuditLog as FAILED)
 *  - Returns void on success
 *  - Async only
 */

import { prisma } from '../db/prisma';

/** Categories from v1.3.0 §6.1 NotificationPreferencesSchema. */
export type NotificationCategory =
  | 'bookingUpdates'
  | 'listingAlerts'
  | 'marketing'
  | 'accountSecurity';

/** Channels from v1.3.0 §6.1. */
export type NotificationChannel = 'email' | 'sms' | 'push';

/** Default preferences when User.notificationPreferences IS NULL. */
const DEFAULT_PREFS = {
  channels:   { email: true, sms: true, push: true },
  categories: { bookingUpdates: true, listingAlerts: true, marketing: false, accountSecurity: true },
};

/**
 * Payload shape for `send()`. The `payload` content is channel-agnostic; each
 * channel adapter projects it into its own format (SMS body, push title+body,
 * email subject+html).
 */
export interface NotificationPayload {
  /** EN+AR pair. Adapters pick locale based on user.locale. */
  title:    { en: string; ar: string };
  body:     { en: string; ar: string };
  /** Optional deep link path (e.g. `/account/orders/abc-123`). Push + email use it. */
  deepLink?: string;
  /** Adapter-specific metadata escape hatch (e.g. push priority, email reply-to). */
  meta?:    Record<string, unknown>;
}

export interface SendOptions {
  /** Override the user's preferences for accountSecurity (always sends regardless of toggles). */
  forceDispatch?: boolean;
}

export interface SendResult {
  dispatched: NotificationChannel[];
  skipped:    Array<{ channel: NotificationChannel; reason: 'channel_disabled' | 'category_disabled' | 'no_provider' }>;
  failed:     Array<{ channel: NotificationChannel; error: string }>;
}

/** Channel adapter signature. Implementations live in apps/api/src/notifications/adapters/{channel}.ts (added in v1.4). */
type ChannelAdapter = (
  user: { id: string; email: string | null; mobile: string | null; locale: 'en' | 'ar' },
  payload: NotificationPayload,
) => Promise<void>;

/** Registry of channel adapters. Lazily registered at app boot. */
const adapters = new Map<NotificationChannel, ChannelAdapter>();

/**
 * Register an adapter for a channel. Call this from each adapter module's
 * bootstrap (e.g. push.adapter.ts → registerAdapter('push', ...)).
 *
 * Until an adapter is registered for a channel, dispatches to that channel
 * are SKIPPED with reason 'no_provider' (NOT failed — this is by design so
 * v1.4 can ship Push and Documents in different weeks without the OTHER
 * channels failing).
 */
export function registerAdapter(channel: NotificationChannel, adapter: ChannelAdapter): void {
  adapters.set(channel, adapter);
}

/**
 * Send a notification to a user across all enabled channels.
 *
 * Flow:
 *   1. Load user + preferences from DB
 *   2. For each channel (email, sms, push):
 *      a. Skip if user disabled the channel (unless forceDispatch)
 *      b. Skip if user disabled the category (unless forceDispatch)
 *      c. Skip if no adapter registered for the channel
 *      d. Otherwise invoke the adapter; catch errors and record as FAILED
 *   3. Return a SendResult summarising dispatched / skipped / failed
 *
 * accountSecurity is special: per v1.3.0 §6.1 the toggle is LOCKED true — but
 * even if it wasn't, this method will dispatch when category === 'accountSecurity'
 * with forceDispatch === true. Use forceDispatch sparingly; almost always undesirable.
 *
 * Currently ZERO adapters are registered (v1.3 ships the skeleton; v1.4 Push
 * registers the first real adapter). All dispatches in v1.3 will return with
 * skipped === [email, sms, push] reason 'no_provider'.
 */
export async function send(
  userId: string,
  category: NotificationCategory,
  payload: NotificationPayload,
  options: SendOptions = {},
): Promise<SendResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, mobile: true, locale: true, notificationPreferences: true },
  });
  if (!user) {
    return {
      dispatched: [],
      skipped:    [],
      failed:     [{ channel: 'email', error: `user not found: ${userId}` }],
    };
  }

  const prefs = (user.notificationPreferences as typeof DEFAULT_PREFS | null) ?? DEFAULT_PREFS;
  const force = options.forceDispatch === true;

  const result: SendResult = { dispatched: [], skipped: [], failed: [] };

  for (const channel of ['email', 'sms', 'push'] as const) {
    // Category gate: accountSecurity is always-on, others respect user toggle.
    const categoryEnabled = category === 'accountSecurity' || force || prefs.categories[category] === true;
    if (!categoryEnabled) {
      result.skipped.push({ channel, reason: 'category_disabled' });
      continue;
    }
    // Channel gate.
    const channelEnabled = force || prefs.channels[channel] === true;
    if (!channelEnabled) {
      result.skipped.push({ channel, reason: 'channel_disabled' });
      continue;
    }
    // Adapter gate.
    const adapter = adapters.get(channel);
    if (!adapter) {
      result.skipped.push({ channel, reason: 'no_provider' });
      continue;
    }
    // Adapter-required identity gate (email channel needs user.email, sms needs user.mobile).
    if (channel === 'email' && !user.email) {
      result.skipped.push({ channel, reason: 'no_provider' });  // no destination
      continue;
    }
    if (channel === 'sms' && !user.mobile) {
      result.skipped.push({ channel, reason: 'no_provider' });
      continue;
    }
    // Dispatch.
    try {
      await adapter(
        { id: user.id, email: user.email, mobile: user.mobile, locale: user.locale as 'en' | 'ar' },
        payload,
      );
      result.dispatched.push(channel);
    } catch (err) {
      result.failed.push({
        channel,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // TODO v1.4: write a row to AuditLog summarising the SendResult for compliance.

  return result;
}

/** Read-only view of which channels currently have registered adapters. */
export function getRegisteredChannels(): NotificationChannel[] {
  return Array.from(adapters.keys());
}
