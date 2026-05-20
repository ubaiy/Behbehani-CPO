/**
 * OTP notification dispatch — bilingual SMS + email templates for the v1.2
 * customer auth flow (CONTRACT v1.2.0 §1 + v1.2.1 §4.3).
 *
 * Kept in its own file (rather than appending to notifications.service.ts)
 * to honour the 500-line cap on the parent. Reuses the same `smsProvider()`
 * + `emailProvider()` singletons + dev-log fallback.
 *
 * Channel routing:
 *   channel='sms'   → smsProvider().send(...)
 *   channel='email' → emailProvider().send(...)
 *
 * Identifier shape:
 *   sms:   E.164 KW mobile, e.g. "+96598765432"
 *   email: plain RFC-compliant email
 */

import type { OtpChannel } from '@prisma/client';
import { emailProvider, smsProvider } from './notifications.service';

export interface OtpNotificationInput {
  identifier: string;       // mobile (E.164) or email
  channel: OtpChannel;
  code: string;             // 6-digit raw code (never persisted in plain text — for dispatch only)
  ttlMinutes: number;       // for the "valid for N minutes" copy
  /** Optional locale override; defaults to en. KW market default is bilingual SMS. */
  locale?: 'en' | 'ar';
}

// ─── Templates ─────────────────────────────────────────────────────────────

export function renderOtpSms(code: string, ttlMinutes: number, locale: 'en' | 'ar'): string {
  if (locale === 'ar') {
    return `رمز التحقق الخاص بك من بهبهاني هو ${code}. صالح لمدة ${ttlMinutes} دقائق.`;
  }
  return `Your Behbehani Motors verification code is ${code}. Valid for ${ttlMinutes} minutes.`;
}

export function renderOtpEmail(
  code: string,
  ttlMinutes: number,
  locale: 'en' | 'ar',
): { subject: string; bodyText: string; bodyHtml: string } {
  if (locale === 'ar') {
    return {
      subject: `رمز التحقق: ${code}`,
      bodyText: `رمز التحقق الخاص بك من بهبهاني هو ${code}. صالح لمدة ${ttlMinutes} دقائق. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.`,
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; direction: rtl; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1E3A8A;">رمز التحقق</h2>
          <p>الرجاء استخدام الرمز التالي لإكمال عملية التحقق:</p>
          <div style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #1E3A8A; padding: 16px; background: #F1F5F9; border-radius: 8px; text-align: center; margin: 16px 0;">${code}</div>
          <p style="color: #64748B; font-size: 14px;">صالح لمدة ${ttlMinutes} دقائق.</p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
          <p style="color: #94A3B8; font-size: 12px;">إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.</p>
        </div>
      `.trim(),
    };
  }
  return {
    subject: `Your Behbehani verification code: ${code}`,
    bodyText: `Your Behbehani Motors verification code is ${code}. Valid for ${ttlMinutes} minutes. If you didn't request this, you can ignore this email.`,
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1E3A8A;">Verification code</h2>
        <p>Please use the code below to complete your verification:</p>
        <div style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #1E3A8A; padding: 16px; background: #F1F5F9; border-radius: 8px; text-align: center; margin: 16px 0;">${code}</div>
        <p style="color: #64748B; font-size: 14px;">Valid for ${ttlMinutes} minutes.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
        <p style="color: #94A3B8; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `.trim(),
  };
}

// ─── Dispatch ──────────────────────────────────────────────────────────────

export async function sendOtpNotification(input: OtpNotificationInput): Promise<void> {
  const locale = input.locale ?? 'en';

  if (input.channel === 'sms') {
    const body = renderOtpSms(input.code, input.ttlMinutes, locale);
    await smsProvider().send({ to: input.identifier, body, locale });
    return;
  }

  // channel === 'email'
  const { subject, bodyText, bodyHtml } = renderOtpEmail(input.code, input.ttlMinutes, locale);
  await emailProvider().send({ to: input.identifier, subject, bodyText, bodyHtml, locale });
}
