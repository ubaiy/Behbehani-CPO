/**
 * Notifications service — multi-provider SMS + email dispatcher.
 *
 * Scaffolded in W2 of the Inspection module to support the Concierge
 * customer-signing remote-link flow (CONCIERGE_INSPECTION_API_CONTRACT.md
 * Q2). Designed as a thin Provider abstraction so we can swap providers
 * (Unifonic ↔ Twilio for SMS, SendGrid ↔ SES for email) via env without
 * changing call sites.
 *
 * In dev/test, the default provider is `devlog` which writes payloads to
 * `apps/api/.dev/notifications.log` instead of calling any external service —
 * the parallel storefront session asked for this so they can test the signing
 * flow end-to-end locally without provider credentials.
 */

import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

// ─── Provider interfaces ──────────────────────────────────────────────────

export interface SmsPayload {
  to: string;            // E.164 e.g. "+96598765432" — sanitize at boundary
  body: string;          // SMS body (en or ar)
  locale: 'en' | 'ar';
}

export interface EmailPayload {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  locale: 'en' | 'ar';
}

export interface SmsProvider {
  send(payload: SmsPayload): Promise<{ providerMessageId: string | null }>;
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<{ providerMessageId: string | null }>;
}

// ─── Dev-log provider (default in dev/test) ───────────────────────────────

const DEV_LOG_DIR = path.join(process.cwd(), 'apps', 'api', '.dev');
const DEV_LOG_PATH = path.join(DEV_LOG_DIR, 'notifications.log');

function appendDevLog(channel: 'sms' | 'email', payload: SmsPayload | EmailPayload): void {
  try {
    if (!fs.existsSync(DEV_LOG_DIR)) fs.mkdirSync(DEV_LOG_DIR, { recursive: true });
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      channel,
      payload,
    }) + '\n';
    fs.appendFileSync(DEV_LOG_PATH, entry, 'utf8');
  } catch (err) {
    // Dev-log failures are non-fatal — log to stderr and move on.
    // eslint-disable-next-line no-console
    console.error('[notifications.devlog] failed to write', err);
  }
}

class DevLogSmsProvider implements SmsProvider {
  async send(payload: SmsPayload): Promise<{ providerMessageId: string | null }> {
    appendDevLog('sms', payload);
    // eslint-disable-next-line no-console
    console.log('[notifications.devlog SMS]', payload.to, payload.body);
    return { providerMessageId: `devlog-sms-${Date.now()}` };
  }
}

class DevLogEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<{ providerMessageId: string | null }> {
    appendDevLog('email', payload);
    // eslint-disable-next-line no-console
    console.log('[notifications.devlog EMAIL]', payload.to, payload.subject);
    return { providerMessageId: `devlog-email-${Date.now()}` };
  }
}

// ─── Unifonic SMS provider (KW/GCC primary) ───────────────────────────────
// Stub — real implementation pulls in @unifonic/sdk or hits their REST API.
// Returns provider message ID so we can chase delivery status later.

class UnifonicSmsProvider implements SmsProvider {
  async send(payload: SmsPayload): Promise<{ providerMessageId: string | null }> {
    if (!env.UNIFONIC_APP_ID) {
      // eslint-disable-next-line no-console
      console.error('[notifications.unifonic] UNIFONIC_APP_ID not configured — falling back to devlog');
      return new DevLogSmsProvider().send(payload);
    }
    // TODO(unifonic): POST https://el.cloud.unifonic.com/rest/SMS/messages
    //   AppSid: env.UNIFONIC_APP_ID
    //   SenderID: env.UNIFONIC_SENDER_ID
    //   Recipient: payload.to (E.164 without leading +)
    //   Body: payload.body
    // For now: log to console and fall back to dev-log so the contract works
    // in environments where provider credentials are stubbed but the calling
    // service expects a success path.
    appendDevLog('sms', payload);
    // eslint-disable-next-line no-console
    console.log('[notifications.unifonic STUB]', payload.to);
    return { providerMessageId: null };
  }
}

// ─── SendGrid email provider ──────────────────────────────────────────────

class SendGridEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<{ providerMessageId: string | null }> {
    if (!env.SENDGRID_API_KEY) {
      // eslint-disable-next-line no-console
      console.error('[notifications.sendgrid] SENDGRID_API_KEY not configured — falling back to devlog');
      return new DevLogEmailProvider().send(payload);
    }
    // TODO(sendgrid): POST https://api.sendgrid.com/v3/mail/send
    //   from: env.EMAIL_FROM_ADDRESS
    //   to: payload.to
    //   subject: payload.subject
    //   content: [{ type: 'text/plain', value: payload.bodyText }, { type: 'text/html', value: payload.bodyHtml }]
    appendDevLog('email', payload);
    // eslint-disable-next-line no-console
    console.log('[notifications.sendgrid STUB]', payload.to, payload.subject);
    return { providerMessageId: null };
  }
}

// ─── Provider singletons ──────────────────────────────────────────────────

function buildSmsProvider(): SmsProvider {
  switch (env.NOTIFICATIONS_SMS_PROVIDER) {
    case 'unifonic':
      return new UnifonicSmsProvider();
    case 'devlog':
    default:
      return new DevLogSmsProvider();
  }
}

function buildEmailProvider(): EmailProvider {
  switch (env.NOTIFICATIONS_EMAIL_PROVIDER) {
    case 'sendgrid':
      return new SendGridEmailProvider();
    case 'devlog':
    default:
      return new DevLogEmailProvider();
  }
}

let smsProviderSingleton: SmsProvider | null = null;
let emailProviderSingleton: EmailProvider | null = null;

export function smsProvider(): SmsProvider {
  if (!smsProviderSingleton) smsProviderSingleton = buildSmsProvider();
  return smsProviderSingleton;
}

export function emailProvider(): EmailProvider {
  if (!emailProviderSingleton) emailProviderSingleton = buildEmailProvider();
  return emailProviderSingleton;
}

/** Test/dev only — reset the singletons so a test can swap implementations. */
export function __resetProviders(): void {
  smsProviderSingleton = null;
  emailProviderSingleton = null;
}

// ─── Concierge sign-link templates (en + ar) ──────────────────────────────

export interface SignLinkTemplateInput {
  customerName: string;
  vehicleLabel: string;     // "2020 Lexus RX 350"
  signLink: string;         // absolute URL e.g. https://behbehani.com/inspection-sign/aB3kZ9...
  expiresAt: Date;
  locale: 'en' | 'ar';
}

function formatExpiry(d: Date, locale: 'en' | 'ar'): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kuwait',
  }).format(d);
}

export function renderSignLinkSms(input: SignLinkTemplateInput): string {
  if (input.locale === 'ar') {
    return `مرحباً ${input.customerName}. تم إكمال فحص ${input.vehicleLabel}. الرجاء التوقيع: ${input.signLink} (ينتهي ${formatExpiry(input.expiresAt, 'ar')})`;
  }
  return `Hi ${input.customerName} — your ${input.vehicleLabel} inspection is complete. Sign here: ${input.signLink} (expires ${formatExpiry(input.expiresAt, 'en')}). — Behbehani`;
}

export function renderSignLinkEmail(input: SignLinkTemplateInput): { subject: string; bodyText: string; bodyHtml: string } {
  if (input.locale === 'ar') {
    const subject = `وقّع تقرير فحص ${input.vehicleLabel}`;
    const bodyText = [
      `مرحباً ${input.customerName}،`,
      ``,
      `تم إكمال فحص سيارتك (${input.vehicleLabel}). الرجاء مراجعة التقرير والتوقيع عبر الرابط أدناه:`,
      ``,
      input.signLink,
      ``,
      `الرابط ساري حتى ${formatExpiry(input.expiresAt, 'ar')}.`,
      ``,
      `— فريق بهبهاني للسيارات`,
    ].join('\n');
    const bodyHtml = bodyText.split('\n').map((l) => `<p>${l || '&nbsp;'}</p>`).join('');
    return { subject, bodyText, bodyHtml };
  }
  const subject = `Sign your ${input.vehicleLabel} inspection report`;
  const bodyText = [
    `Hi ${input.customerName},`,
    ``,
    `Your ${input.vehicleLabel} inspection is complete. Please review and sign the report at the link below:`,
    ``,
    input.signLink,
    ``,
    `This link is valid until ${formatExpiry(input.expiresAt, 'en')}.`,
    ``,
    `— Behbehani Motors`,
  ].join('\n');
  const bodyHtml = bodyText.split('\n').map((l) => `<p>${l || '&nbsp;'}</p>`).join('');
  return { subject, bodyText, bodyHtml };
}

// ─── High-level send helpers (used by inspections.service) ────────────────

export async function sendSignLinkSms(
  to: string,
  input: SignLinkTemplateInput,
): Promise<{ providerMessageId: string | null }> {
  return smsProvider().send({
    to,
    body: renderSignLinkSms(input),
    locale: input.locale,
  });
}

export async function sendSignLinkEmail(
  to: string,
  input: SignLinkTemplateInput,
): Promise<{ providerMessageId: string | null }> {
  const rendered = renderSignLinkEmail(input);
  return emailProvider().send({
    to,
    subject: rendered.subject,
    bodyText: rendered.bodyText,
    bodyHtml: rendered.bodyHtml,
    locale: input.locale,
  });
}

/** Build the absolute customer-signing URL from env + token. */
export function buildSignLinkUrl(token: string): string {
  const base = env.SIGN_LINK_BASE_URL.replace(/\/$/, '');
  return `${base}/inspection-sign/${token}`;
}

// ─── Offer notification templates (Phase 4) — see offer-notifications.service.ts
// Re-exported here so callers can import from a single location.
export {
  sendOfferSentNotification,
  sendOfferWithdrawnNotification,
  sendOfferCounteredByCustomerNotification,
  sendOfferCounterAcceptedNotification,
  sendOfferCounterDeclinedNotification,
  sendOfferAcceptedInternalNotification,
} from './offer-notifications.service';
export type {
  OfferSentTemplateInput,
  OfferSimpleTemplateInput,
  OfferCounteredTemplateInput,
  OfferAcceptedInternalTemplateInput,
} from './offer-notifications.service';
