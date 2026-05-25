/**
 * Inspections service — orchestration for CPO + Concierge inspection
 * workflows. Two surfaces:
 *
 *   • Admin-only flows (consumed by apps/admin via /v1/admin/inspections/*)
 *   • Public-shared flows tagged `// public-shared` — called by session A's
 *     storefront controllers (/v1/public/concierge/inspections,
 *     /v1/public/inspection-sign/:token). See
 *     CONCIERGE_INSPECTION_API_CONTRACT.md §2 for the contract.
 *
 * State machine:
 *   draft → in_progress → awaiting_inspector_signoff → signed_off          (CPO)
 *   draft → in_progress → awaiting_inspector_signoff
 *                       → awaiting_customer_signature → signed_off          (Concierge)
 *
 * All state transitions emit audit entries via recordAudit().
 */

import { randomBytes } from 'crypto';
import { enqueueInspectionReportPdf } from '../jobs/pdf-worker';
import type {
  CreateInspectionDto,
  CreateConciergeInspectionDto,
  CreateCpoInspectionDto,
  CreateConciergeInspectionResponse,
  ConciergeBookingStatus,
  PublicInspectionSummary,
  PublicVehicleSnapshot,
  CustomerSignDto,
  SaveInspectionProgressDto,
  SignoffDto,
  SignoffResponse,
  InspectionFilter,
  InspectionStatus,
  InspectionSummaryDto,
  InspectionListResponse,
  InspectionItemResult,
  InspectionReportJson,
  InspectionKpiResponse,
  INSPECTION_STATUSES,
  CancelSellBookingInputDto,
} from '@behbehani-cpo/shared-types';
import {
  INSPECTION_RUBRIC,
  INSPECTION_RUBRIC_TOTAL,
} from '@behbehani-cpo/shared-types';
import { env } from '../config/env';
import { maskVin } from '@behbehani-cpo/shared-types';
import { recordAudit } from '../middleware/audit';
import { publicUrl, presignGetUrl } from '../lib/s3';
import { InspectionError } from './inspections.errors';
import * as repo from './inspections.repo';
import { changeStage as changeListingStage } from '../listings/listings.service';
import {
  sendSignLinkSms,
  sendSignLinkEmail,
  buildSignLinkUrl,
} from '../notifications/notifications.service';
import { send as sendNotification } from '../notifications/notification.service';

// ─── Score computation ──────────────────────────────────────────────────────

const SCORE_BY_STATUS: Record<InspectionItemResult['status'], number> = {
  pass: 100,
  advisory: 60,
  fail: 0,
};

/**
 * Overall score = simple average of all item scores (pass=100, advisory=60,
 * fail=0). Returns null if fewer than the full rubric has been scored.
 */
function computeOverallScore(items: InspectionItemResult[]): number | null {
  if (items.length < INSPECTION_RUBRIC_TOTAL) return null;
  const total = items.reduce((sum, item) => sum + SCORE_BY_STATUS[item.status], 0);
  return Math.round(total / items.length);
}

function computeSectionScores(items: InspectionItemResult[]): Record<string, number> {
  const sectionByItemId = new Map<string, string>();
  for (const section of INSPECTION_RUBRIC) {
    for (const item of section.items) {
      sectionByItemId.set(item.id, section.key);
    }
  }
  const sums = new Map<string, { total: number; count: number }>();
  for (const item of items) {
    const sectionKey = sectionByItemId.get(item.itemId);
    if (!sectionKey) continue;
    const entry = sums.get(sectionKey) ?? { total: 0, count: 0 };
    entry.total += SCORE_BY_STATUS[item.status];
    entry.count += 1;
    sums.set(sectionKey, entry);
  }
  const out: Record<string, number> = {};
  for (const [key, { total, count }] of sums) {
    out[key] = count === 0 ? 0 : Math.round(total / count);
  }
  return out;
}

// ─── Photo URL hydration ───────────────────────────────────────────────────
// Legacy reports stored raw S3 keys (e.g. "inspections/abc/def/file.jpg") in
// reportJson.items[].photoKeys[]. Newer uploads push the full publicUrl. To
// keep the admin display logic simple, rewrite any non-http entry to its
// publicUrl before returning the report. Idempotent for already-hydrated
// reports.

/**
 * Rewrite each `photoKeys[]` entry to its public CDN URL when the entry is
 * still a raw S3 key. Entries already starting with `http://` or `https://`
 * are passed through untouched. Returns a new object — does not mutate input.
 */
export function hydrateReportPhotoUrls(
  report: InspectionReportJson,
): InspectionReportJson {
  return {
    items: report.items.map((item) => ({
      ...item,
      photoKeys: (item.photoKeys ?? []).map((key) =>
        /^https?:\/\//i.test(key) ? key : publicUrl(key),
      ),
    })),
  };
}

// ─── DTO shapers ────────────────────────────────────────────────────────────

function vehicleLabel(row: repo.InspectionSummaryRow | repo.InspectionDetailRow): string {
  if (row.listing) return row.listing.titleEn;
  const parts = [row.vehicleYear, row.vehicleBrandName, row.vehicleModelName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unspecified vehicle';
}

function vinMasked(row: repo.InspectionSummaryRow | repo.InspectionDetailRow): string | null {
  if (row.vehicleVin) return maskVin(row.vehicleVin);
  // CPO inspections derive VIN from the linked Listing (via DETAIL_INCLUDE).
  const detail = row as repo.InspectionDetailRow;
  if (detail.listing && 'vin' in detail.listing && detail.listing.vin) {
    return maskVin(detail.listing.vin as string);
  }
  return null;
}

function toSummary(row: repo.InspectionSummaryRow): InspectionSummaryDto {
  const reportJson = repo.readReportJson(row);
  const isConcierge = row.kind === 'concierge';
  // v1.5.36 — latest non-withdrawn offer (added to SUMMARY_INCLUDE in this
  // ship). Used by admin edit + sign-off pages to swap "Create buy offer"
  // for "View existing offer" when an offer is already on the inspection.
  // The `offers` array is at most length-1 by include's `take: 1`. Optional
  // chain guards against the row coming from a legacy code path that
  // didn't include offers.
  const latestOfferRow = (row as repo.InspectionSummaryRow & {
    offers?: Array<{ id: string; status: string; offerAmountFils: bigint }>;
  }).offers?.[0];
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    listing: row.listing
      ? { id: row.listing.id, stockNumber: row.listing.stockNumber, titleEn: row.listing.titleEn }
      : null,
    customer: row.customer
      ? {
          id: row.customer.id,
          fullName: row.customer.fullName,
          mobile: row.customer.mobile,
          email: row.customer.email ?? null,
        }
      : null,
    vehicleLabel: vehicleLabel(row),
    vinMasked: vinMasked(row),
    // CPO inspections derive vehicle facts from the linked Listing — only
    // surface the snapshot columns for concierge bookings where the customer
    // declared them at intake.
    vehicleYear: isConcierge ? row.vehicleYear ?? null : null,
    vehicleBrandName: isConcierge ? row.vehicleBrandName ?? null : null,
    vehicleModelName: isConcierge ? row.vehicleModelName ?? null : null,
    vehicleMileageKm: isConcierge ? row.vehicleMileageKm ?? null : null,
    vehicleTransmission: isConcierge ? row.vehicleTransmission ?? null : null,
    locationAddress: isConcierge ? row.locationAddress ?? null : null,
    locationGovernorate: isConcierge ? row.locationGovernorate ?? null : null,
    inspector: row.inspector ? { id: row.inspector.id, fullName: row.inspector.fullName } : null,
    scoredCount: reportJson.items.length,
    totalCount: INSPECTION_RUBRIC_TOTAL,
    overallScore: row.overallScore,
    scheduledFor: row.scheduledFor ? row.scheduledFor.toISOString() : null,
    startedAt: row.scheduledFor
      ? row.scheduledFor.toISOString()
      : row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    latestOffer: latestOfferRow
      ? {
          id: latestOfferRow.id,
          status: latestOfferRow.status,
          amountFils: latestOfferRow.offerAmountFils.toString(),
        }
      : null,
  };
}

function toPublicVehicleSnapshot(row: repo.InspectionDetailRow): PublicVehicleSnapshot {
  return {
    year: row.vehicleYear ?? null,
    brand: row.vehicleBrandName ?? null,
    model: row.vehicleModelName ?? null,
    vinMasked: vinMasked(row),
    mileageKm: row.vehicleMileageKm ?? null,
  };
}

function toPublicSummary(row: repo.InspectionDetailRow): PublicInspectionSummary {
  const reportJson = repo.readReportJson(row);
  const sectionScores = computeSectionScores(reportJson.items);
  const itemsNeedingAttention = collectItemsNeedingAttention(reportJson);

  return {
    id: row.id,
    status: row.status,
    vehicle: toPublicVehicleSnapshot(row),
    // Public DTO surfaces the finish time, not the start — maps to
    // inspectorSignedAt per contract v0.3 §4.
    inspectedAt: row.inspectorSignedAt ? row.inspectorSignedAt.toISOString() : null,
    inspectorName: row.inspector?.fullName ?? null,
    overallScore: row.overallScore,
    sectionScores,
    itemsNeedingAttention,
    signLinkExpiresAt: row.customerSignTokenExpiresAt
      ? row.customerSignTokenExpiresAt.toISOString()
      : null,
  };
}

function collectItemsNeedingAttention(
  reportJson: InspectionReportJson,
): PublicInspectionSummary['itemsNeedingAttention'] {
  const labelById = new Map<string, { labelEn: string; labelAr: string }>();
  for (const section of INSPECTION_RUBRIC) {
    for (const item of section.items) {
      labelById.set(item.id, { labelEn: item.labelEn, labelAr: item.labelAr });
    }
  }
  return reportJson.items
    .filter((i) => i.status !== 'pass')
    .map((i) => ({
      itemId: i.itemId,
      labelEn: labelById.get(i.itemId)?.labelEn ?? i.itemId,
      labelAr: labelById.get(i.itemId)?.labelAr ?? i.itemId,
      status: i.status as 'advisory' | 'fail',
      notes: i.notes ?? null,
    }));
}

/**
 * Map an InspectionDetailRow to the customer-facing ConciergeBookingStatus DTO.
 *
 * v1.5.14: promoted to async to presign the report PDF URL (presignGetUrl).
 * All callers must be awaited — see call sites below.
 *
 * Initials algorithm: split fullName on whitespace, take first character of
 * the first two words (or first char twice if only one word), uppercase.
 * Examples: "Yousef Mohammed" → "YM", "Ali" → "AA", "  " → "??" (fallback).
 */
async function toBookingStatus(row: repo.InspectionDetailRow): Promise<ConciergeBookingStatus> {
  // ── Presign PDF URL (defensive — never break the DTO if S3 is down) ────
  let inspectionReportPdfUrl: string | null = null;
  if (row.reportPdfKey) {
    try {
      const presigned = await presignGetUrl(row.reportPdfKey);
      inspectionReportPdfUrl = presigned.url;
    } catch (err) {
      console.error('[toBookingStatus] presignGetUrl failed — returning null for inspectionReportPdfUrl', err);
    }
  }

  // ── Inspector shape (v1.5.14 consolidated) ─────────────────────────────
  let inspector: ConciergeBookingStatus['inspector'] = null;
  if (row.inspector) {
    const fullName = row.inspector.fullName ?? '';
    // Initials: first letter of first 2 space-delimited words (uppercased).
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts.length === 1
          ? (parts[0][0] + parts[0][0]).toUpperCase()
          : '??';
    const whatsappE164 = row.inspector.mobile ?? undefined;
    inspector = {
      // v1.5.14 richer fields (A's spec, [ASK A→B-2]):
      fullName,
      initials,
      // rating + completedCount: undefined until DB columns ship (v1.6+)
      whatsappE164,
      // v1.5.13 legacy aliases — same values for back-compat:
      name: fullName,
      phoneE164: row.inspector.mobile ?? null,
    };
  }

  return {
    bookingRef: row.bookingRef ?? '',
    status: row.status,
    vehicle: toPublicVehicleSnapshot(row),
    customerPreference:
      row.customerPreferredDate && row.customerPreferredWindow
        ? {
            preferredDate: row.customerPreferredDate.toISOString().slice(0, 10),
            window: row.customerPreferredWindow,
          }
        : null,
    inspectorAssigned: row.inspectorId !== null,
    inspector,
    inspectedAt: row.inspectorSignedAt ? row.inspectorSignedAt.toISOString() : null,
    signLinkAvailable:
      row.status === 'awaiting_customer_signature' &&
      row.customerSignToken !== null &&
      row.customerSignTokenExpiresAt !== null &&
      row.customerSignTokenExpiresAt.getTime() > Date.now(),
    // v1.5.14 new fields ([ASK A→B-2]):
    overallScore: row.overallScore ?? null,
    inspectionReportPdfUrl,
    relatedOfferToken: (row as repo.InspectionDetailRow & { offers?: Array<{ publicToken: string | null }> }).offers?.[0]?.publicToken ?? null,
    // v1.5.14 cancellation ([ASK A→B-3]):
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
  };
}

// ─── Public-shared functions (also called by session A's storefront) ────────

/**
 * public-shared
 * Create a Concierge inspection from a customer booking. Reconciles the
 * customer by mobile-or-email (creates a ghost account if none found).
 * Emits `inspection.concierge.create` audit entry.
 */
export async function createConciergeInspection(
  input: CreateConciergeInspectionDto,
  ctx: {
    actorId?: string;
    ip?: string | null;
    userAgent?: string | null;
    /**
     * v1.5.34 (closes A v1.5-D19 [ASK A→B-7] §4a forward fix): when set, the
     * caller has already proven their customer identity via a Bearer token
     * (see `optionalCustomerSession` middleware in inspections-public.controller).
     * In that case we link the booking directly to this userId and skip the
     * mobile/email reconciliation + ghost-create dance — eliminating the
     * orphan-row class entirely for signed-in submissions.
     */
    actorCustomerId?: string;
  },
): Promise<CreateConciergeInspectionResponse> {
  // 1. Reconcile customer by mobile-or-email (Q4 in contract).
  const mobile = normalizeKwMobile(input.customer.mobile);
  const email = input.customer.email ?? null;

  // v1.5.34 forward-fix branch: a signed-in caller short-circuits the
  // ghost/lookup path. We still record the wizard-entered name/mobile/email
  // on the booking via the audit + return payload, but the row's customerId
  // points to the real authenticated user — so the customer's
  // /account/sell-bookings page (which filters on customerId) sees it
  // immediately, with no follow-up reconciliation needed.
  let customer: { id: string };
  if (ctx.actorCustomerId) {
    customer = { id: ctx.actorCustomerId };
  } else {
    const existingCustomer = await repo.findCustomerByMobileOrEmail(mobile, email);
    customer = existingCustomer
      ? { id: existingCustomer.id }
      : await repo.createGhostCustomer({ fullName: input.customer.fullName, mobile, email });
  }

  // 2. Generate booking ref (Postgres sequence — concurrency-safe).
  const bookingRef = await repo.nextBookingRef();

  // 3. Build the create payload.
  const row = await repo.createInspection({
    kind: 'concierge',
    bookingRef,
    customerId: customer.id,
    vehicleYear: input.vehicle.year,
    vehicleBrandName: input.vehicle.brandName,
    vehicleModelName: input.vehicle.modelName,
    vehicleVin: input.vehicle.vin ?? null,
    vehicleMileageKm: input.vehicle.mileageKm,
    vehicleTransmission: input.vehicle.transmission ?? null,
    locationAddress: input.location.address,
    locationGovernorate: input.location.governorate ?? null,
    locationLat: input.location.lat ?? null,
    locationLng: input.location.lng ?? null,
    customerPreferredDate: input.customerPreference
      ? new Date(input.customerPreference.preferredDate)
      : null,
    customerPreferredWindow: input.customerPreference?.window ?? null,
    customerNotes: input.notes ?? null,
    customerDeclaredJson: (input.customerDeclared ?? null) as never,
    status: 'draft',
  });

  await recordAudit({
    actorId: ctx.actorId ?? null,
    action: 'inspection.concierge.create',
    resource: 'admin.inspection',
    resourceId: row.id,
    after: {
      bookingRef: row.bookingRef,
      customerId: row.customerId,
      kind: 'concierge',
    },
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
  });

  return {
    id: row.id,
    bookingRef: row.bookingRef!,
    status: row.status,
    customerPreference:
      row.customerPreferredDate && row.customerPreferredWindow
        ? {
            preferredDate: row.customerPreferredDate.toISOString().slice(0, 10),
            window: row.customerPreferredWindow,
          }
        : null,
    customerFullName: input.customer.fullName,
    customerMobile: mobile,
  };
}

/**
 * public-shared
 * Read a Concierge booking by its human-readable ref (BMC-CON-NNNNNN) for the
 * customer-facing tracker page.
 */
export async function getInspectionByBookingRef(
  bookingRef: string,
): Promise<ConciergeBookingStatus | null> {
  const row = await repo.findInspectionByBookingRef(bookingRef);
  if (!row || row.kind !== 'concierge') return null;
  return await toBookingStatus(row);
}

// ─── v1.5.13: Me-scoped sell-bookings (closes [ASK C→B] from MOBILE v0.22 §3) ─

/**
 * public-shared (v1.5.13)
 *
 * List authenticated customer's own concierge sell-bookings, newest first,
 * paginated. Returned shape mirrors the no-auth tracker (ConciergeBookingStatus[])
 * so mobile/web can reuse the same row component. CPO inspections (non-concierge)
 * are filtered out — those are operator-internal and never surfaced to customers.
 */
export async function listMySellBookings(
  customerId: string,
  filter: { page: number; pageSize: number },
): Promise<{
  items: ConciergeBookingStatus[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, Math.floor(filter.page));
  const pageSize = Math.max(1, Math.min(100, Math.floor(filter.pageSize)));

  // The repo's existing `findMany` returns SUMMARY-shaped rows but we need
  // DETAIL_INCLUDE for `toBookingStatus` (which expects InspectionDetailRow).
  // Query directly with the same include so we get the inspector relation +
  // signature artifacts in one round-trip.
  const where = { customerId, kind: 'concierge' as const };
  const [rows, total] = await Promise.all([
    prisma.inspectionReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        listing: { select: { id: true, stockNumber: true, titleEn: true, vin: true } },
        customer: { select: { id: true, fullName: true, mobile: true, email: true } },
        inspector: { select: { id: true, fullName: true, mobile: true } },
        // v1.5.14: mirror DETAIL_INCLUDE offers shape for relatedOfferToken
        offers: {
          where: { status: { not: 'withdrawn' } },
          orderBy: { createdAt: 'desc' as const },
          take: 1,
          select: { publicToken: true, publicTokenExpiresAt: true, status: true },
        },
      },
    }),
    prisma.inspectionReport.count({ where }),
  ]);

  return {
    items: await Promise.all(rows.map(async (row) => await toBookingStatus(row as repo.InspectionDetailRow))),
    total,
    page,
    pageSize,
  };
}

/**
 * public-shared (v1.5.13)
 *
 * Read one of the authenticated customer's concierge sell-bookings by ref.
 * Returns null when either (a) the booking doesn't exist, (b) it exists but
 * belongs to another customer, or (c) it's a CPO inspection (non-concierge).
 * Controller surfaces null as 404 to avoid leaking existence information.
 */
export async function getMySellBookingByRef(
  customerId: string,
  bookingRef: string,
): Promise<ConciergeBookingStatus | null> {
  const row = await repo.findInspectionByBookingRef(bookingRef);
  if (!row || row.kind !== 'concierge') return null;
  if (row.customerId !== customerId) return null;  // ownership check — 404 not 403 to prevent enumeration
  return await toBookingStatus(row);
}

/**
 * public-shared (v1.5.13)
 *
 * Customer self-service reschedule of their own concierge sell-booking.
 *
 * Allowed only while status === 'draft' (no inspector assigned yet). Once an
 * inspector is on the way or has been at the vehicle, customer must call
 * support — server returns 409 `BOOKING_NOT_RESCHEDULABLE` so mobile/web can
 * surface the "Contact support to reschedule" copy.
 *
 * Updates customerPreferredDate + customerPreferredWindow. Returns the fresh
 * ConciergeBookingStatus.
 *
 * Throws:
 *   - InspectionError(404, 'BOOKING_NOT_FOUND')        — unknown ref / not owned / CPO
 *   - InspectionError(409, 'BOOKING_NOT_RESCHEDULABLE') — status past 'draft'
 */
export async function rescheduleMySellBooking(
  customerId: string,
  bookingRef: string,
  input: { preferredDate: string; window: 'morning' | 'afternoon' | 'evening' },
): Promise<ConciergeBookingStatus> {
  const row = await repo.findInspectionByBookingRef(bookingRef);
  if (!row || row.kind !== 'concierge' || row.customerId !== customerId) {
    throw new InspectionError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  }
  if (row.status !== 'draft') {
    throw new InspectionError(
      409,
      'This booking can no longer be rescheduled. Please contact support.',
      'BOOKING_NOT_RESCHEDULABLE',
    );
  }

  await prisma.inspectionReport.update({
    where: { id: row.id },
    data: {
      // Date-only column (@db.Date) — Prisma accepts ISO date strings or Date.
      customerPreferredDate: new Date(input.preferredDate + 'T00:00:00Z'),
      customerPreferredWindow: input.window,
    },
  });

  // Re-fetch to surface fresh DTO with the updated preference + any other
  // server-side derived flags (signLinkAvailable etc.).
  const fresh = await repo.findInspectionByBookingRef(bookingRef);
  // Defensive: row was just updated — fresh must exist.
  if (!fresh) {
    throw new InspectionError(404, 'Booking not found after reschedule', 'BOOKING_NOT_FOUND');
  }
  return await toBookingStatus(fresh);
}

/**
 * public-shared (v1.5.14)
 *
 * Customer self-service cancellation of their own concierge sell-booking.
 * Closes [ASK A→B-3] (CONCIERGE_INSPECTION_API_CONTRACT.md v1.5-D10 §3).
 *
 * Allowed only while status === 'draft'. The 'draft' state covers both
 * `pending_assignment` + `inspector_assigned` as named in A's v1.5-D10 §3
 * (those are A's UI-alias names for the single 'draft' DB state).
 *
 * Idempotent: if `cancelledAt` is already set, returns current DTO without
 * re-writing any DB fields and without erroring.
 *
 * Notifies the assigned inspector (best-effort — never fails the cancel).
 *
 * Throws:
 *   - InspectionError(404, 'BOOKING_NOT_FOUND')        — unknown ref / not owned / CPO
 *   - InspectionError(409, 'BOOKING_NOT_CANCELLABLE')   — status past 'draft'
 */
export async function cancelMySellBooking(
  customerId: string,
  bookingRef: string,
  input: CancelSellBookingInputDto,
): Promise<ConciergeBookingStatus> {
  const row = await repo.findInspectionByBookingRef(bookingRef);
  if (!row || row.kind !== 'concierge' || row.customerId !== customerId) {
    // Consolidated 404 — prevents booking-ref enumeration (same pattern as
    // BOOKING_NOT_FOUND in v1.5.13 reschedule + ownership check).
    throw new InspectionError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  }

  // Idempotent: re-cancel on already-cancelled returns current state (200).
  if (row.cancelledAt) {
    const fresh = await repo.findInspectionByBookingRef(bookingRef);
    return await toBookingStatus(fresh!);
  }

  // State-machine guard. Only 'draft' is cancellable per v1.5-D10 §3.
  if (row.status !== 'draft') {
    throw new InspectionError(
      409,
      'This booking can no longer be cancelled. Please contact support.',
      'BOOKING_NOT_CANCELLABLE',
    );
  }

  await prisma.inspectionReport.update({
    where: { id: row.id },
    data: {
      cancelledAt:        new Date(),
      cancellationReason: input.reason ?? null,
    },
  });

  // Notify inspector if assigned. Best-effort — never fail the cancel over a
  // notification dispatch error.
  if (row.inspectorId) {
    try {
      await sendNotification(
        row.inspectorId,
        'bookingUpdates',
        {
          title: {
            en: `Customer cancelled inspection ${bookingRef}`,
            ar: `ألغى العميل الفحص ${bookingRef}`,
          },
          body: {
            en: input.reason ?? 'No reason provided.',
            ar: input.reason ?? 'لم يتم تقديم سبب.',
          },
        },
        {
          inboxMeta: {
            category: 'inspection',
            iconHint: 'inspection',
            alsoInApp: true,
          },
        },
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[cancelMySellBooking] inspector notification failed', err);
    }
  }

  const fresh = await repo.findInspectionByBookingRef(bookingRef);
  return await toBookingStatus(fresh!);
}

/**
 * public-shared
 * Read a Concierge inspection by its customer-signing token. Used by the
 * public signing page (mockup 05).
 *
 * Contract (CONCIERGE_INSPECTION_API_CONTRACT.md v0.7 §1.3):
 *   resolves → { summary, customerFirstName }
 *   throws InspectionError with code in:
 *     'NOT_FOUND'       → HTTP 404  (no row matched the token — see note below)
 *     'TOKEN_EXPIRED'   → HTTP 410  (expiresAt < now AND token still bound)
 *     'ALREADY_SIGNED'  → HTTP 409  (reserved — see note below)
 *     'TOKEN_REVOKED'   → HTTP 410  (reserved — see note below)
 *
 * Data-model note (confirmed via v1.1.5 joint verification):
 *
 *   The current implementation NULLS `customerSignToken` on both customer
 *   signature submission (consumed) AND admin revoke. Because
 *   findInspectionBySignToken matches on that exact column, both consumed
 *   and revoked URLs are indistinguishable from never-issued ones — all
 *   three resolve to **NOT_FOUND**. Only TOKEN_EXPIRED remains reachable as
 *   a distinct code on an aged-out token whose row still has a non-null
 *   `customerSignToken`.
 *
 *   ALREADY_SIGNED + TOKEN_REVOKED are kept in the type union for forward-
 *   compat: a future migration adding `customerSignTokenConsumedAt` /
 *   `customerSignTokenRevokedAt` would make them reachable without breaking
 *   the storefront's switch on err.code (A confirmed both branches are
 *   already wired client-side as no-op handlers — terminal card render).
 *
 *   See `CONCIERGE_INSPECTION_API_CONTRACT.md` v1.1.5 §3 + v1.1.6 §3 for
 *   the full coordination trail and the Option-A decision.
 */
export async function getInspectionBySignToken(
  token: string,
): Promise<{ summary: PublicInspectionSummary; customerFirstName: string }> {
  const row = await repo.findInspectionBySignToken(token);
  if (!row) throw new InspectionError(404, 'Inspection not found', 'NOT_FOUND');
  if (row.status === 'signed_off') {
    throw new InspectionError(409, 'This report has already been signed', 'ALREADY_SIGNED');
  }
  if (row.status !== 'awaiting_customer_signature') {
    // Defensive: any non-awaiting, non-signed state means the token shouldn't
    // be live. Surface as NOT_FOUND to avoid leaking internal state.
    throw new InspectionError(404, 'Inspection not found', 'NOT_FOUND');
  }
  if (!row.customerSignTokenExpiresAt || row.customerSignTokenExpiresAt.getTime() < Date.now()) {
    throw new InspectionError(410, 'Signing link has expired', 'TOKEN_EXPIRED');
  }
  const customerFirstName = (row.customer?.fullName ?? '').split(/\s+/)[0] ?? '';
  return { summary: toPublicSummary(row), customerFirstName };
}

/**
 * public-shared (v1.5.7 — ASK A→B v1.5-D §5)
 * Fetches a `signed_off` inspection's public summary by its id, with the same
 * shape as `/inspection-sign/:token`. Used by the `getInspectionReportByOfferToken`
 * helper in offers.service so the customer's /offer/:token/inspection-report
 * page can render the CPO inspection details.
 *
 * Throws `InspectionError(404, 'INSPECTION_NOT_AVAILABLE')` when:
 *   - the row doesn't exist
 *   - the inspection is not yet `signed_off` (we don't surface in-progress reports
 *     to customers via the offer flow — they're surfaced via the sign-link instead)
 *
 * Caller (offers.service) catches the InspectionError and re-throws as OfferError
 * so the offers-public.controller's error adapter emits the right HTTP envelope.
 */
export async function getInspectionReportById(
  id: string,
): Promise<PublicInspectionSummary> {
  const row = await repo.findInspectionById(id);
  if (!row) {
    throw new InspectionError(404, 'Inspection not available', 'INSPECTION_NOT_AVAILABLE');
  }
  if (row.status !== 'signed_off') {
    throw new InspectionError(404, 'Inspection not available', 'INSPECTION_NOT_AVAILABLE');
  }
  return toPublicSummary(row);
}

/**
 * public-shared
 * Customer submits their signature via the remote-link page. Validates the
 * token, transitions status to `signed_off`, stores signature artifacts +
 * audit metadata, returns the final state.
 */
export async function submitCustomerSignature(
  token: string,
  payload: CustomerSignDto,
  requestMeta: { ip: string; userAgent: string },
): Promise<{ inspectionId: string; status: InspectionStatus; signedOffAt: string }> {
  const row = await repo.findInspectionBySignToken(token);
  if (!row) throw new InspectionError(404, 'Inspection not found', 'NOT_FOUND');
  if (row.status === 'signed_off') {
    throw new InspectionError(409, 'This report has already been signed', 'ALREADY_SIGNED');
  }
  if (row.status !== 'awaiting_customer_signature') {
    throw new InspectionError(404, 'Inspection not found', 'NOT_FOUND');
  }
  if (!row.customerSignTokenExpiresAt || row.customerSignTokenExpiresAt.getTime() < Date.now()) {
    throw new InspectionError(410, 'Signing link has expired', 'TOKEN_EXPIRED');
  }

  // Persist signature + finalize.
  // TODO(pdf): generate PDF + upload to S3 → set reportPdfKey. Deferred to
  // a follow-up; admin sign-off page already shows the placeholder.
  const signedAt = new Date();
  const updated = await repo.updateInspection(row.id, {
    status: 'signed_off',
    // Mirror finalize timestamp to inspectedAt for back-compat with the
    // listings-public.controller.ts reader (owned by session A).
    inspectedAt: row.inspectorSignedAt ?? signedAt,
    customerSignatureMethod: 'remote_link',
    // The drawn signature SVG comes in as base64-encoded SVG text — we store
    // the raw text inline as a placeholder; the real upload-to-S3 step will
    // run in the PDF rendering follow-up.
    customerSignatureDrawnKey: `inline://${row.id}/customer.svg`,
    customerSignatureTypedName: payload.typedName,
    customerCivilIdLast4: payload.civilIdLast4 ?? null,
    customerSignedAt: signedAt,
    customerSignedIp: requestMeta.ip,
    customerSignedUserAgent: requestMeta.userAgent.slice(0, 512),
    // Token has been consumed — invalidate so the link can't be reused.
    customerSignToken: null,
    customerSignTokenExpiresAt: null,
  });

  await recordAudit({
    actorId: row.customerId ?? null,
    action: 'inspection.customer.signed',
    resource: 'admin.inspection',
    resourceId: row.id,
    after: { status: 'signed_off', method: 'remote_link', typedName: payload.typedName },
    ip: requestMeta.ip,
    userAgent: requestMeta.userAgent.slice(0, 512),
  });

  // Enqueue PDF generation — fire-and-forget (§9). Never await.
  void enqueueInspectionReportPdf(updated.id);

  return {
    inspectionId: updated.id,
    status: updated.status,
    signedOffAt: signedAt.toISOString(),
  };
}

// ─── Admin-only flows ───────────────────────────────────────────────────────

export async function listForAdmin(filter: InspectionFilter): Promise<InspectionListResponse> {
  const { rows, total } = await repo.listInspections(filter);
  return {
    items: rows.map(toSummary),
    total,
    page: filter.page,
    pageSize: filter.pageSize,
  };
}

/**
 * KPI strip backing data — full-dataset counts grouped by status, optionally
 * scoped by inspection kind. Replaces the page-1-derived counts that were
 * misreporting on queues with >1 page.
 *
 * v0.7 §4 item 4.
 */
export async function getKpiForAdmin(filter: {
  kind: 'cpo' | 'concierge' | null;
}): Promise<InspectionKpiResponse> {
  const grouped = await repo.groupCountByStatus(filter);
  // Initialise all statuses to 0 so the UI never has to defend against
  // missing keys.
  const byStatus = Object.fromEntries(
    INSPECTION_STATUSES.map((s) => [s, 0]),
  ) as InspectionKpiResponse['byStatus'];
  let total = 0;
  for (const row of grouped) {
    if ((INSPECTION_STATUSES as readonly string[]).includes(row.status)) {
      byStatus[row.status as InspectionStatus] = row.count;
      total += row.count;
    }
  }
  return { total, byStatus };
}

export async function getForAdmin(id: string): Promise<repo.InspectionDetailRow> {
  const row = await repo.findInspectionById(id);
  if (!row) throw new InspectionError(404, 'Inspection not found');
  return row;
}

/**
 * Admin creates an inspection — CPO (one per Listing) or Concierge manual
 * entry (walk-in / phone booking). The Concierge path delegates to the
 * public-shared `createConciergeInspection` so the audit + reconciliation
 * logic stays in one place.
 */
export async function createForAdmin(
  dto: CreateInspectionDto,
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<{ id: string; bookingRef: string | null }> {
  if (dto.kind === 'concierge') {
    const result = await createConciergeInspection(dto as CreateConciergeInspectionDto, {
      actorId,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
    return { id: result.id, bookingRef: result.bookingRef };
  }
  return createCpoInspection(dto as CreateCpoInspectionDto, actorId, ctx);
}

async function createCpoInspection(
  dto: CreateCpoInspectionDto,
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<{ id: string; bookingRef: string | null }> {
  const existing = await repo.findInspectionByListingId(dto.listingId);
  if (existing) {
    throw new InspectionError(
      409,
      'This listing already has an inspection report',
      'listing_inspection_exists',
    );
  }
  const row = await repo.createInspection({
    kind: 'cpo',
    listingId: dto.listingId,
    status: 'draft',
  });
  await recordAudit({
    actorId,
    action: 'inspection.cpo.create',
    resource: 'admin.inspection',
    resourceId: row.id,
    after: { listingId: dto.listingId, kind: 'cpo' },
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
  });
  return { id: row.id, bookingRef: null };
}

/**
 * Save in-progress item scores + notes. Idempotent — the same item can be
 * re-scored repeatedly. Transitions status from `draft` to `in_progress` on
 * the first save, then to `awaiting_inspector_signoff` once all 71 items
 * are scored.
 */
export async function saveProgress(
  id: string,
  dto: SaveInspectionProgressDto,
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<repo.InspectionDetailRow> {
  const before = await repo.findInspectionById(id);
  if (!before) throw new InspectionError(404, 'Inspection not found');
  if (before.status === 'signed_off') {
    throw new InspectionError(409, 'Cannot edit a signed-off inspection', 'inspection_locked');
  }
  if (before.status === 'awaiting_customer_signature') {
    throw new InspectionError(
      409,
      'Cannot edit while awaiting customer signature',
      'inspection_pending_customer',
    );
  }

  // Merge new item scores into the existing reportJson (upsert by itemId).
  const existing = repo.readReportJson(before);
  const merged = mergeItems(existing.items, dto.items);
  const nextReport: InspectionReportJson = { items: merged };

  const nextStatus: InspectionStatus =
    merged.length >= INSPECTION_RUBRIC_TOTAL
      ? 'awaiting_inspector_signoff'
      : merged.length > 0
        ? 'in_progress'
        : before.status === 'draft' && merged.length === 0
          ? 'draft'
          : 'in_progress';

  // Re-compute overallScore on every save so the signoff page's score circle
  // reflects the inspector's current decisions, not whatever was baked in by
  // the seed or a prior incomplete pass. Returns null until the full rubric
  // is scored — at which point the queue's score column lights up too.
  const overallScore = computeOverallScore(merged);

  const updated = await repo.updateInspection(id, {
    reportJson: nextReport as never,
    status: nextStatus,
    overallScore,
    inspectorId: before.inspectorId ?? actorId,
  });

  if (before.status !== nextStatus) {
    await recordAudit({
      actorId,
      action: `inspection.status.${nextStatus}`,
      resource: 'admin.inspection',
      resourceId: id,
      before: { status: before.status },
      after: { status: nextStatus, scoredCount: merged.length },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
  }

  return updated;
}

function mergeItems(
  existing: InspectionItemResult[],
  incoming: InspectionItemResult[],
): InspectionItemResult[] {
  const byId = new Map<string, InspectionItemResult>();
  for (const item of existing) byId.set(item.itemId, item);
  for (const item of incoming) byId.set(item.itemId, item);
  return [...byId.values()];
}

/**
 * Inspector signs off. For CPO, transitions directly to `signed_off`.
 * For Concierge in-person, finalizes immediately if the customer-signature
 * payload is included. For Concierge remote-link, generates a sign token,
 * dispatches SMS+email, and transitions to `awaiting_customer_signature`.
 */
export async function signoff(
  id: string,
  dto: SignoffDto,
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<SignoffResponse> {
  const before = await repo.findInspectionById(id);
  if (!before) throw new InspectionError(404, 'Inspection not found');
  if (before.status !== 'awaiting_inspector_signoff') {
    throw new InspectionError(
      409,
      `Cannot sign off: inspection is in '${before.status}' state`,
      'wrong_state_for_signoff',
    );
  }

  const report = repo.readReportJson(before);
  if (report.items.length < INSPECTION_RUBRIC_TOTAL) {
    throw new InspectionError(
      422,
      `All ${INSPECTION_RUBRIC_TOTAL} items must be scored before sign-off`,
      'incomplete_scoring',
    );
  }
  const overallScore = computeOverallScore(report.items);

  // CPO: finalize immediately.
  if (dto.mode === 'cpo') {
    if (before.kind !== 'cpo') {
      throw new InspectionError(422, 'Mode/kind mismatch', 'kind_mismatch');
    }
    const signedAt = new Date();
    const updated = await repo.updateInspection(id, {
      status: 'signed_off',
      overallScore,
      inspectorSignedAt: signedAt,
      inspectorSignedById: actorId,
      // Mirror to legacy `inspectedAt` so session A's listings-public reader
      // keeps working until they migrate to inspectorSignedAt directly.
      inspectedAt: signedAt,
    });
    await recordAudit({
      actorId,
      action: 'inspection.cpo.signed_off',
      resource: 'admin.inspection',
      resourceId: id,
      before: { status: before.status },
      after: { status: 'signed_off', overallScore },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
    // Enqueue PDF generation — fire-and-forget (§9). Never await.
    void enqueueInspectionReportPdf(updated.id);

    // F2: auto-advance listing stage inspection → photoshoot when the admin
    // confirmed advanceToPhotoshoot in the CPO signoff modal (§16 D10 / §11).
    // The listing must be in the 'inspection' stage; if it is not (edge case:
    // manually diverted before signoff), log a warning and skip — the signoff
    // itself must not roll back.
    if (dto.advanceToPhotoshoot && before.listingId) {
      try {
        await changeListingStage(
          before.listingId,
          { stage: 'photoshoot', reason: 'cpo_signoff_auto_advance' },
          actorId,
        );
        await recordAudit({
          actorId,
          action: 'listing.stage.auto_advanced',
          resource: 'admin.listing',
          resourceId: before.listingId,
          before: { stage: 'inspection' },
          after: { stage: 'photoshoot', reason: 'cpo_signoff' },
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        });
      } catch (err) {
        // Non-fatal: listing may already be past 'inspection' or may not be
        // in a state that allows the transition (e.g. already reconditioning).
        // Log the warning and continue — the signoff is already committed.
        // eslint-disable-next-line no-console
        console.warn('[inspections] auto-advance inspection→photoshoot skipped', err);
      }
    }

    return {
      inspectionId: updated.id,
      status: updated.status,
      customerSignUrl: null,
      customerSignTokenExpiresAt: null,
    };
  }

  // Concierge in-person: finalize with customer signature attached.
  if (dto.mode === 'concierge_in_person') {
    if (before.kind !== 'concierge') {
      throw new InspectionError(422, 'Mode/kind mismatch', 'kind_mismatch');
    }
    const signedAt = new Date();
    const updated = await repo.updateInspection(id, {
      status: 'signed_off',
      overallScore,
      inspectorSignedAt: signedAt,
      inspectorSignedById: actorId,
      inspectedAt: signedAt,
      customerSignatureMethod: 'in_person',
      customerSignatureDrawnKey: `inline://${id}/customer.svg`,
      customerSignatureTypedName: dto.customerSignature.typedName,
      customerCivilIdLast4: dto.customerSignature.civilIdLast4 ?? null,
      customerSignedAt: new Date(),
      customerSignedIp: ctx.ip ?? null,
      customerSignedUserAgent: (ctx.userAgent ?? '').slice(0, 512),
    });
    await recordAudit({
      actorId,
      action: 'inspection.concierge.signed_off',
      resource: 'admin.inspection',
      resourceId: id,
      before: { status: before.status },
      after: { status: 'signed_off', overallScore, signatureMethod: 'in_person' },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
    // Enqueue PDF generation — fire-and-forget (§9). Never await.
    void enqueueInspectionReportPdf(updated.id);
    return {
      inspectionId: updated.id,
      status: updated.status,
      customerSignUrl: null,
      customerSignTokenExpiresAt: null,
    };
  }

  // Concierge remote-link: issue token, send notifications.
  if (dto.mode === 'concierge_remote_link') {
    if (before.kind !== 'concierge') {
      throw new InspectionError(422, 'Mode/kind mismatch', 'kind_mismatch');
    }
    const token = randomBytes(32).toString('hex'); // 64 hex chars
    const expiresAt = new Date(Date.now() + env.SIGN_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
    const updated = await repo.updateInspection(id, {
      status: 'awaiting_customer_signature',
      overallScore,
      inspectorSignedAt: new Date(),
      inspectorSignedById: actorId,
      customerSignatureMethod: 'remote_link',
      customerSignToken: token,
      customerSignTokenExpiresAt: expiresAt,
      customerSignTokenLastSentAt: new Date(),
    });
    await dispatchSignLink(updated, token, expiresAt);
    await recordAudit({
      actorId,
      action: 'inspection.signlink.sent',
      resource: 'admin.inspection',
      resourceId: id,
      before: { status: before.status },
      after: { status: 'awaiting_customer_signature', expiresAt: expiresAt.toISOString() },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
    return {
      inspectionId: updated.id,
      status: updated.status,
      customerSignUrl: buildSignLinkUrl(token),
      customerSignTokenExpiresAt: expiresAt.toISOString(),
    };
  }

  throw new InspectionError(400, 'Unsupported signoff mode', 'unsupported_mode');
}

/**
 * Resend the customer signing link (SMS + email). Rate-limited to one send
 * per 60 seconds via `customerSignTokenLastSentAt`. Bumps the expiry to a
 * fresh TTL.
 */
export async function resendSignLink(
  id: string,
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<{ expiresAt: string }> {
  const row = await repo.findInspectionById(id);
  if (!row) throw new InspectionError(404, 'Inspection not found');
  if (row.status !== 'awaiting_customer_signature' || !row.customerSignToken) {
    throw new InspectionError(409, 'No active signing link to resend', 'no_active_link');
  }
  if (
    row.customerSignTokenLastSentAt &&
    Date.now() - row.customerSignTokenLastSentAt.getTime() < 60_000
  ) {
    throw new InspectionError(429, 'Resend rate-limited — try again in a minute', 'rate_limited');
  }

  const expiresAt = new Date(Date.now() + env.SIGN_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
  const updated = await repo.updateInspection(id, {
    customerSignTokenExpiresAt: expiresAt,
    customerSignTokenLastSentAt: new Date(),
  });
  await dispatchSignLink(updated, row.customerSignToken, expiresAt);

  await recordAudit({
    actorId,
    action: 'inspection.signlink.resent',
    resource: 'admin.inspection',
    resourceId: id,
    after: { expiresAt: expiresAt.toISOString() },
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
  });

  return { expiresAt: expiresAt.toISOString() };
}

/**
 * Revoke the customer signing link. Used when the customer requests a
 * different signing method (e.g. switch from remote to in-person) or the
 * admin needs to invalidate the existing token.
 */
export async function revokeSignLink(
  id: string,
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<void> {
  const row = await repo.findInspectionById(id);
  if (!row) throw new InspectionError(404, 'Inspection not found');
  if (row.status !== 'awaiting_customer_signature' || !row.customerSignToken) {
    throw new InspectionError(409, 'No active signing link to revoke', 'no_active_link');
  }
  await repo.updateInspection(id, {
    customerSignToken: null,
    customerSignTokenExpiresAt: null,
    // Roll back to awaiting_inspector_signoff so the inspector can choose
    // a different signature method via /signoff again.
    status: 'awaiting_inspector_signoff',
  });
  await recordAudit({
    actorId,
    action: 'inspection.signlink.revoked',
    resource: 'admin.inspection',
    resourceId: id,
    before: { status: 'awaiting_customer_signature' },
    after: { status: 'awaiting_inspector_signoff' },
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
  });
}

// ─── Internal helpers ───────────────────────────────────────────────────────

async function dispatchSignLink(
  row: repo.InspectionDetailRow,
  token: string,
  expiresAt: Date,
): Promise<void> {
  if (!row.customer) return; // shouldn't happen for Concierge, but guard
  const link = buildSignLinkUrl(token);
  const vehicleLabelStr = vehicleLabel(row);
  const locale: 'en' | 'ar' = 'en'; // TODO: derive from customer.locale once stored
  const templateInput = {
    customerName: row.customer.fullName.split(' ')[0] ?? 'there',
    vehicleLabel: vehicleLabelStr,
    signLink: link,
    expiresAt,
    locale,
  };
  await Promise.allSettled([
    sendSignLinkSms(row.customer.mobile ?? '', templateInput),
    row.customer.email ? sendSignLinkEmail(row.customer.email, templateInput) : Promise.resolve(),
  ]);
}

/** Strip the leading +965 country code if the customer wizard included it. */
function normalizeKwMobile(input: string): string {
  return input.replace(/^\+965/, '').replace(/\s+/g, '');
}

// ─── public-shared (v1.2) — customer my-bookings ───────────────────────────
//
// CONTRACT v1.2.0 §4 + v1.2.1 §4.7. A's controller mounts this at
// `GET /v1/public/me/inspections` under requireCustomerSession. Returns the
// customer's own Concierge inspections only — CPO inspections are admin-side
// and never surfaced to customers.

import type {
  CustomerInspectionListResponse,
  CustomerInspectionView,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

/**
 * Paginated list of Concierge inspections owned by `customerId`. Each row
 * includes the latest live offer (if any) so A's UI can render "Offer
 * KD 8,500 expires in 2 days" inline without an N+1 fetch.
 */
export async function getInspectionsByCustomerId(
  customerId: string,
  filter: { page: number; pageSize: number },
): Promise<CustomerInspectionListResponse> {
  const page = Math.max(1, Math.floor(filter.page));
  const pageSize = Math.max(1, Math.min(100, Math.floor(filter.pageSize)));

  const where = { customerId, kind: 'concierge' as const };

  const [rows, total] = await Promise.all([
    prisma.inspectionReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        bookingRef: true,
        status: true,
        scheduledFor: true,
        inspectorSignedAt: true,
        createdAt: true,
        vehicleYear: true,
        vehicleBrandName: true,
        vehicleModelName: true,
        vehicleVin: true,
        vehicleMileageKm: true,
        offers: {
          // Latest non-terminal-or-most-recent offer; A renders the summary
          // even on terminal states (accepted/declined) so the customer can
          // peek at their decision history.
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            publicToken: true,
            status: true,
            offerAmountFils: true,
            adminCounterAmountFils: true,
            counterAmountFils: true,
            validUntil: true,
          },
        },
      },
    }),
    prisma.inspectionReport.count({ where }),
  ]);

  const items: CustomerInspectionView[] = rows.map((row) => {
    const latest = row.offers[0];
    // For `countered_by_admin`, the customer sees the admin counter amount as
    // the active number — mirrors the offer-page hero rendering in v1.1.
    // For `countered_by_customer`, surface the customer's counter so the
    // history view shows the most-recent figure either side proposed.
    let amount: bigint | null = null;
    if (latest) {
      if (latest.status === 'countered_by_admin' && latest.adminCounterAmountFils != null) {
        amount = latest.adminCounterAmountFils;
      } else if (latest.status === 'countered_by_customer' && latest.counterAmountFils != null) {
        amount = latest.counterAmountFils;
      } else {
        amount = latest.offerAmountFils;
      }
    }
    return {
      id: row.id,
      bookingRef: row.bookingRef,
      kind: 'concierge' as const,
      status: row.status as InspectionStatus,
      vehicle: {
        year: row.vehicleYear ?? null,
        brand: row.vehicleBrandName ?? null,
        model: row.vehicleModelName ?? null,
        vinMasked: row.vehicleVin ? maskVin(row.vehicleVin) : null,
        mileageKm: row.vehicleMileageKm ?? null,
      },
      scheduledFor: row.scheduledFor ? row.scheduledFor.toISOString() : null,
      inspectedAt: row.inspectorSignedAt ? row.inspectorSignedAt.toISOString() : null,
      latestOffer: latest
        ? {
            publicToken: latest.publicToken,
            status: latest.status,
            amountFils: (amount ?? 0n).toString(),
            validUntil: latest.validUntil.toISOString(),
          }
        : null,
      createdAt: row.createdAt.toISOString(),
    };
  });

  return { items, total, page, pageSize };
}

// ─── Exports re-exported for the controller layer ───────────────────────────

export { toSummary as inspectionToSummary };
export type { InspectionSummaryDto };
