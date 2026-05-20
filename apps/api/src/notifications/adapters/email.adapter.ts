/**
 * Email notification adapter.
 *
 * v1.4.2 §5 Day 3 — registered with NotificationService.send() via bootstrap.ts.
 * Wraps the existing emailProvider() singleton from notifications.service.ts
 * (Devlog default, SendGrid when SENDGRID_API_KEY is set).
 *
 * Note: OTP emails continue using their direct sendOtpNotification path in
 * otp-notifications.service.ts — THIS adapter is for NEW v1.4+
 * NotificationService dispatches only.
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.2 §5 Day 3.
 */

import type { NotificationPayload } from '../notification.service';
import { emailProvider } from '../notifications.service';

/**
 * Email adapter registered with NotificationService.
 * Signature matches ChannelAdapter from notification.service.ts.
 *
 * NotificationService.send() already gates on user.email !== null before
 * invoking this adapter; the null-check here is defence-in-depth only.
 */
export async function emailAdapter(
  user: { id: string; email: string | null; mobile: string | null; locale: 'en' | 'ar' },
  payload: NotificationPayload,
): Promise<void> {
  if (!user.email) return;

  const subject  = payload.title[user.locale] ?? payload.title.en;
  const bodyText = payload.body[user.locale]  ?? payload.body.en;
  // Minimal HTML wrapping for the notification body. Production templates can
  // be enhanced in a v1.4.x pass once the email design system is ready.
  const bodyHtml = `<p>${bodyText.replace(/\n/g, '</p><p>')}</p>`;

  await emailProvider().send({
    to:       user.email,
    subject,
    bodyText,
    bodyHtml,
    locale:   user.locale,
  });
}
