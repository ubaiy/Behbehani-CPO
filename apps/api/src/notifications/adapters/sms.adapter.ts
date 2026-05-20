/**
 * SMS notification adapter.
 *
 * v1.4.2 §5 Day 3 — registered with NotificationService.send() via bootstrap.ts.
 * Wraps the existing smsProvider() singleton from notifications.service.ts
 * (Devlog default, Unifonic when UNIFONIC_APP_ID is set).
 *
 * OTP SMS continues using its direct sendOtpNotification path in
 * otp-notifications.service.ts — THIS adapter is for NEW v1.4+
 * NotificationService dispatches only.
 *
 * KW market note: SMS body is limited to 160 chars (ASCII/GSM-7) or 70 chars
 * if any Arabic character is present (UCS-2 encoding). Adapter truncates
 * payload.body to stay within those limits before handing off to the provider.
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.2 §5 Day 3.
 */

import type { NotificationPayload } from '../notification.service';
import { smsProvider } from '../notifications.service';

// ─── Character-limit helpers ──────────────────────────────────────────────

const SMS_LIMIT_ASCII = 160;
const SMS_LIMIT_UCS2  = 70;
const ARABIC_RE = /[؀-ۿ]/;

function truncate(text: string): string {
  const limit = ARABIC_RE.test(text) ? SMS_LIMIT_UCS2 : SMS_LIMIT_ASCII;
  if (text.length <= limit) return text;
  // Reserve 1 char for the ellipsis.
  return text.slice(0, limit - 1) + '…';
}

// ─── Adapter ──────────────────────────────────────────────────────────────

/**
 * SMS adapter registered with NotificationService.
 * Signature matches ChannelAdapter from notification.service.ts.
 *
 * NotificationService.send() already gates on user.mobile !== null before
 * invoking this adapter; the null-check here is defence-in-depth only.
 */
export async function smsAdapter(
  user: { id: string; email: string | null; mobile: string | null; locale: 'en' | 'ar' },
  payload: NotificationPayload,
): Promise<void> {
  if (!user.mobile) return;

  const message = truncate(payload.body[user.locale] ?? payload.body.en);

  await smsProvider().send({
    to:     user.mobile,
    body:   message,
    locale: user.locale,
  });
}
