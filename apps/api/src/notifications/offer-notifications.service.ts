/**
 * Offer notification templates — Phase 4 §10.
 * Extracted from notifications.service.ts to keep that file under 500 lines.
 * All functions are re-exported from notifications.service.ts for a single
 * import point used by the offers module.
 *
 * 6 templates:
 *   offer.sent              — customer notified of new offer
 *   offer.withdrawn         — customer notified of withdrawal
 *   offer.countered         — customer counter acknowledgement
 *   offer.counter_accepted  — customer counter was accepted by admin
 *   offer.counter_declined  — customer counter was declined by admin
 *   offer.accepted_internal — operations team notified of accepted offer
 */

import { env } from '../config/env';
import { smsProvider, emailProvider } from './notifications.service';

// ─── Template input types ──────────────────────────────────────────────────────

export interface OfferSentTemplateInput {
  customerName: string;
  customerMobile: string;
  customerEmail: string | null;
  vehicleLabel: string;
  bookingRef: string;
  offerAmountKwd: string;
  validUntil: Date;
  offerToken: string;
  locale: 'en' | 'ar';
}

export interface OfferSimpleTemplateInput {
  customerName: string;
  customerMobile: string;
  customerEmail: string | null;
  vehicleLabel: string;
  bookingRef: string;
  locale: 'en' | 'ar';
}

export interface OfferCounteredTemplateInput {
  customerName: string;
  customerMobile: string;
  customerEmail: string | null;
  vehicleLabel: string;
  bookingRef: string;
  counterAmountKwd: string;
  locale: 'en' | 'ar';
}

export interface OfferAcceptedInternalTemplateInput {
  customerName: string;
  customerMobile: string;
  vehicleLabel: string;
  bookingRef: string;
  acceptedAmountKwd: string;
  stockNumber: string;
  locale: 'en' | 'ar';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildOfferLink(token: string): string {
  const base = env.SIGN_LINK_BASE_URL.replace(/\/$/, '');
  return `${base}/sell/concierge/offer/${token}`;
}

function formatExpiry(d: Date, locale: 'en' | 'ar'): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kuwait',
  }).format(d);
}

function toHtml(text: string): string {
  return text.split('\n').map((l) => `<p>${l || '&nbsp;'}</p>`).join('');
}

// ─── offer.sent ────────────────────────────────────────────────────────────────

export async function sendOfferSentNotification(input: OfferSentTemplateInput): Promise<void> {
  const link = buildOfferLink(input.offerToken);
  const exp = formatExpiry(input.validUntil, input.locale);
  const isAr = input.locale === 'ar';

  const smsBody = isAr
    ? `مرحباً ${input.customerName}. لديك عرض من بهبهاني لسيارتك ${input.vehicleLabel}: ${input.offerAmountKwd}. صالح حتى ${exp}. رابط: ${link}`
    : `Hi ${input.customerName} — Behbehani has made you an offer for your ${input.vehicleLabel}: ${input.offerAmountKwd}. Valid until ${exp}. View: ${link}`;

  const subject = isAr ? `عرض شراء سيارتك — ${input.vehicleLabel}` : `Your vehicle offer — ${input.vehicleLabel}`;

  const body = [
    isAr ? `مرحباً ${input.customerName}،` : `Hi ${input.customerName},`, '',
    isAr ? `قدّم فريق بهبهاني عرضاً لشراء سيارتك ${input.vehicleLabel} بمبلغ ${input.offerAmountKwd}.`
         : `Behbehani has made you an offer to purchase your ${input.vehicleLabel} for ${input.offerAmountKwd}.`, '',
    isAr ? `رقم الحجز: ${input.bookingRef}` : `Booking ref: ${input.bookingRef}`,
    isAr ? `العرض صالح حتى ${exp}.` : `This offer is valid until ${exp}.`, '', link, '',
    isAr ? '— فريق بهبهاني للسيارات' : '— Behbehani Motors',
  ].join('\n');

  await Promise.allSettled([
    smsProvider().send({ to: input.customerMobile, body: smsBody, locale: input.locale }),
    input.customerEmail
      ? emailProvider().send({ to: input.customerEmail, subject, bodyText: body, bodyHtml: toHtml(body), locale: input.locale })
      : Promise.resolve(),
  ]);
}

// ─── offer.withdrawn ──────────────────────────────────────────────────────────

export async function sendOfferWithdrawnNotification(input: OfferSimpleTemplateInput): Promise<void> {
  const isAr = input.locale === 'ar';
  const smsBody = isAr
    ? `مرحباً ${input.customerName}. للأسف تم سحب العرض المقدّم لسيارتك ${input.vehicleLabel}.`
    : `Hi ${input.customerName} — the offer for your ${input.vehicleLabel} has been withdrawn. Please contact us for more information.`;

  const subject = isAr ? `تم سحب عرض سيارتك — ${input.vehicleLabel}` : `Offer withdrawn — ${input.vehicleLabel}`;
  const body = [
    isAr ? `مرحباً ${input.customerName}،` : `Hi ${input.customerName},`, '',
    isAr ? `للأسف تم سحب العرض المقدّم لسيارتك (${input.bookingRef}).`
         : `Unfortunately the offer for your vehicle (booking ${input.bookingRef}) has been withdrawn.`, '',
    isAr ? '— فريق بهبهاني للسيارات' : '— Behbehani Motors',
  ].join('\n');

  await Promise.allSettled([
    smsProvider().send({ to: input.customerMobile, body: smsBody, locale: input.locale }),
    input.customerEmail
      ? emailProvider().send({ to: input.customerEmail, subject, bodyText: body, bodyHtml: toHtml(body), locale: input.locale })
      : Promise.resolve(),
  ]);
}

// ─── offer.countered ──────────────────────────────────────────────────────────

export async function sendOfferCounteredByCustomerNotification(input: OfferCounteredTemplateInput): Promise<void> {
  const isAr = input.locale === 'ar';
  const smsBody = isAr
    ? `شكراً ${input.customerName}. تم استلام عرضك المضاد (${input.counterAmountKwd}) لسيارتك ${input.vehicleLabel}. سيرد عليك فريقنا خلال 24 ساعة.`
    : `Thanks ${input.customerName} — we've received your counter-offer of ${input.counterAmountKwd} for your ${input.vehicleLabel}. BMC will respond within 24 hours.`;

  const subject = isAr ? `تأكيد استلام عرضك المضاد — ${input.vehicleLabel}` : `Counter-offer received — ${input.vehicleLabel}`;
  const body = [
    isAr ? `مرحباً ${input.customerName}،` : `Hi ${input.customerName},`, '',
    isAr ? `تم استلام عرضك المضاد (${input.counterAmountKwd}) لسيارتك ${input.vehicleLabel} (${input.bookingRef}).`
         : `We've received your counter-offer of ${input.counterAmountKwd} for your ${input.vehicleLabel} (booking ${input.bookingRef}).`,
    isAr ? `سيرد عليك فريقنا خلال 24 ساعة.` : `Our team will respond within 24 hours.`, '',
    isAr ? '— فريق بهبهاني للسيارات' : '— Behbehani Motors',
  ].join('\n');

  await Promise.allSettled([
    smsProvider().send({ to: input.customerMobile, body: smsBody, locale: input.locale }),
    input.customerEmail
      ? emailProvider().send({ to: input.customerEmail, subject, bodyText: body, bodyHtml: toHtml(body), locale: input.locale })
      : Promise.resolve(),
  ]);
}

// ─── offer.counter_accepted ───────────────────────────────────────────────────

export async function sendOfferCounterAcceptedNotification(input: OfferCounteredTemplateInput): Promise<void> {
  const isAr = input.locale === 'ar';
  const smsBody = isAr
    ? `مرحباً ${input.customerName}! قبل فريق بهبهاني عرضك المضاد (${input.counterAmountKwd}) لسيارتك ${input.vehicleLabel}. سيتواصل معك فريق المبيعات قريباً.`
    : `Great news ${input.customerName} — Behbehani has accepted your counter-offer of ${input.counterAmountKwd} for your ${input.vehicleLabel}. Our sales team will be in touch shortly.`;

  const subject = isAr ? `تم قبول عرضك المضاد — ${input.vehicleLabel}` : `Counter-offer accepted — ${input.vehicleLabel}`;
  const body = [
    isAr ? `مرحباً ${input.customerName}،` : `Hi ${input.customerName},`, '',
    isAr ? `قبل فريق بهبهاني عرضك المضاد (${input.counterAmountKwd}) لسيارتك ${input.vehicleLabel} (${input.bookingRef}).`
         : `Behbehani has accepted your counter-offer of ${input.counterAmountKwd} for your ${input.vehicleLabel} (booking ${input.bookingRef}).`,
    isAr ? `سيتواصل معك فريق المبيعات قريباً لإتمام الإجراءات.` : `Our sales team will contact you shortly to complete the process.`, '',
    isAr ? '— فريق بهبهاني للسيارات' : '— Behbehani Motors',
  ].join('\n');

  await Promise.allSettled([
    smsProvider().send({ to: input.customerMobile, body: smsBody, locale: input.locale }),
    input.customerEmail
      ? emailProvider().send({ to: input.customerEmail, subject, bodyText: body, bodyHtml: toHtml(body), locale: input.locale })
      : Promise.resolve(),
  ]);
}

// ─── offer.counter_declined ───────────────────────────────────────────────────

export async function sendOfferCounterDeclinedNotification(input: OfferSimpleTemplateInput): Promise<void> {
  const isAr = input.locale === 'ar';
  const smsBody = isAr
    ? `مرحباً ${input.customerName}. للأسف لم نتمكن من قبول عرضك المضاد لسيارتك ${input.vehicleLabel}.`
    : `Hi ${input.customerName} — unfortunately we're unable to accept your counter-offer for your ${input.vehicleLabel}. Our team can discuss a new offer if you'd like to continue.`;

  const subject = isAr ? `عرضك المضاد — ${input.vehicleLabel}` : `Counter-offer update — ${input.vehicleLabel}`;
  const body = [
    isAr ? `مرحباً ${input.customerName}،` : `Hi ${input.customerName},`, '',
    isAr ? `للأسف لم نتمكن من قبول عرضك المضاد لسيارتك (${input.bookingRef}).`
         : `Unfortunately we're unable to accept your counter-offer for booking ${input.bookingRef}.`,
    isAr ? `يمكن للفريق تقديم عرض جديد إذا رغبت في مواصلة التفاوض.` : `Our team can discuss a new offer if you'd like to continue the negotiation.`, '',
    isAr ? '— فريق بهبهاني للسيارات' : '— Behbehani Motors',
  ].join('\n');

  await Promise.allSettled([
    smsProvider().send({ to: input.customerMobile, body: smsBody, locale: input.locale }),
    input.customerEmail
      ? emailProvider().send({ to: input.customerEmail, subject, bodyText: body, bodyHtml: toHtml(body), locale: input.locale })
      : Promise.resolve(),
  ]);
}

// ─── offer.accepted_internal ──────────────────────────────────────────────────

export async function sendOfferAcceptedInternalNotification(input: OfferAcceptedInternalTemplateInput): Promise<void> {
  const salesHandoffEmail = process.env['SALES_HANDOFF_EMAIL'] ?? 'sales@behbehani.com';
  const adminLink = `${env.SIGN_LINK_BASE_URL.replace(/\/$/, '')}/admin/listings/${input.stockNumber}`;
  const subject = `[ACTION REQUIRED] Concierge offer accepted — ${input.vehicleLabel} (${input.bookingRef})`;
  const bodyText = [
    `A Concierge offer has been accepted. Please review the draft listing and proceed with onboarding.`, '',
    `Customer: ${input.customerName} — ${input.customerMobile}`,
    `Vehicle: ${input.vehicleLabel}`,
    `Booking ref: ${input.bookingRef}`,
    `Accepted price: ${input.acceptedAmountKwd}`,
    `Draft listing stock number: ${input.stockNumber}`, '',
    `Admin listing link: ${adminLink}`, '',
    '— Behbehani CPO system',
  ].join('\n');

  await emailProvider().send({
    to: salesHandoffEmail, subject, bodyText,
    bodyHtml: toHtml(bodyText), locale: 'en',
  });
}
