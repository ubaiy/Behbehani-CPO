/**
 * Offers service — Phase 4 Offer / Valuation module.
 *
 * Two surfaces:
 *   • Admin-only flows — /v1/admin/offers/* and the nested
 *     POST /v1/admin/inspections/:id/offer creation route.
 *   • Public-shared flows tagged `// public-shared` — called by session A's
 *     storefront controllers (/v1/public/concierge/offers/:token).
 *
 * §16 D1: counter-offers are UNLIMITED rounds via previousOfferId chain.
 *         `countered_by_admin` is a valid status; admin can issue counters.
 * §16 D5: acceptance atomically creates a draft Listing. See offers.acceptance.ts.
 *
 * All state-changing calls emit audit entries via recordAudit().
 */

import { randomBytes } from 'crypto';
import type {
  CreateOfferDto,
  AdminCounterDto,
  CustomerOfferResponseDto,
  OfferListFilter,
  OfferListResponse,
  OfferDetailDto,
  PublicOfferView,
  OfferStatus,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';
import { recordAudit } from '../middleware/audit';
import { OfferError } from './offers.errors';
import * as repo from './offers.repo';
import type { OfferRow } from './offers.repo';
import {
  runAcceptanceFlow,
  filsToKwd,
  vehicleLabelFromRow,
  dispatchOfferSentNotification,
  dispatchOfferWithdrawnNotification,
  dispatchCounteredByCustomerNotification,
  dispatchCounterDeclinedNotification,
} from './offers.acceptance';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Public token readable for +30 days post-expiry (D3).
 * publicTokenExpiresAt = validUntil + 30 days.
 */
const PUBLIC_TOKEN_GRACE_DAYS = 30;

/** Terminal offer statuses — no further customer action permitted. */
const TERMINAL_STATUSES: OfferStatus[] = ['accepted', 'declined', 'expired', 'withdrawn'];

// ─── DTO shapers ──────────────────────────────────────────────────────────────

function toSummaryDto(row: OfferRow): import('@behbehani-cpo/shared-types').OfferSummaryDto {
  const ageMinutes = Math.floor((Date.now() - row.createdAt.getTime()) / 60_000);
  return {
    id: row.id,
    inspectionId: row.inspectionId,
    bookingRef: row.bookingRef,
    customerId: row.customerId,
    customerFullName: row.customer.fullName,
    vehicleLabel: vehicleLabelFromRow(row),
    offerAmountFils: Number(row.offerAmountFils),
    counterAmountFils: row.counterAmountFils !== null ? Number(row.counterAmountFils) : null,
    adminCounterAmountFils:
      row.adminCounterAmountFils !== null ? Number(row.adminCounterAmountFils) : null,
    validUntil: row.validUntil.toISOString(),
    status: row.status as OfferStatus,
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
    ageMinutes,
  };
}

function toDetailDto(row: OfferRow, chain: OfferRow[]): OfferDetailDto {
  const summary = toSummaryDto(row);
  // F3: surface listing stock number + id once acceptance flow has run (§16 D5).
  // row.inspection.listing is populated by OFFER_INCLUDE if listingId is set.
  const listing = (row.inspection as typeof row.inspection & { listing?: { id: string; stockNumber: string } | null }).listing ?? null;
  return {
    ...summary,
    notes: row.notes ?? null,
    counterNotes: row.counterNotes ?? null,
    adminCounterNotes: row.adminCounterNotes ?? null,
    respondedIp: row.respondedIp ?? null,
    respondedUserAgent: row.respondedUserAgent ?? null,
    publicToken: row.publicToken,
    publicTokenExpiresAt: row.publicTokenExpiresAt.toISOString(),
    createdById: row.createdById,
    createdByFullName: row.createdBy.fullName,
    offerHistory: chain.map(toSummaryDto),
    listingStockNumber: listing?.stockNumber ?? null,
    listingId: listing?.id ?? null,
  };
}

// ─── Admin-owned exports ──────────────────────────────────────────────────────

/**
 * Create a new offer for a signed-off Concierge inspection.
 * Guards: inspection.status === 'signed_off' AND inspection.kind === 'concierge'.
 * Generates a 64-char hex publicToken. Emits audit 'offer.created'.
 */
export async function createOffer(
  inspectionId: string,
  dto: CreateOfferDto,
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<OfferDetailDto> {
  const inspection = await prisma.inspectionReport.findUnique({
    where: { id: inspectionId },
    select: {
      id: true, kind: true, status: true, bookingRef: true, customerId: true,
    },
  });
  if (!inspection) throw new OfferError(404, 'Inspection not found', 'NOT_FOUND');
  if (inspection.kind !== 'concierge') {
    throw new OfferError(422, 'Offers can only be created for Concierge inspections', 'WRONG_KIND');
  }
  if (inspection.status !== 'signed_off') {
    throw new OfferError(422, 'Inspection must be signed off before creating an offer', 'WRONG_STATUS');
  }
  if (!inspection.customerId) {
    throw new OfferError(422, 'Inspection has no linked customer', 'NO_CUSTOMER');
  }

  // T2 guard: prevent duplicate open offers on the same inspection.
  // Multi-round negotiation uses previousOfferId to chain from a terminal row;
  // two sibling open rows on the same inspection are never valid.
  const openOffer = await repo.findOpenOfferForInspection(inspectionId);
  if (openOffer && openOffer.id !== dto.previousOfferId) {
    throw new OfferError(
      409,
      `Inspection already has an open offer (id: ${openOffer.id}, status: ${openOffer.status}). ` +
        'Set previousOfferId to that offer\'s id to create a chain, or wait for it to reach a terminal state.',
      'OPEN_OFFER_EXISTS',
    );
  }

  const validUntil = new Date(dto.validUntil);
  const diffDays = (validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays < 1 || diffDays > 30) {
    throw new OfferError(422, 'validUntil must be 1–30 days from now', 'INVALID_VALIDITY');
  }

  const publicTokenExpiresAt = new Date(
    validUntil.getTime() + PUBLIC_TOKEN_GRACE_DAYS * 24 * 60 * 60 * 1000,
  );
  const publicToken = randomBytes(32).toString('hex'); // 64 hex chars (D6)

  const row = await repo.createOffer({
    inspectionId,
    bookingRef: inspection.bookingRef ?? inspectionId.slice(0, 8),
    customerId: inspection.customerId,
    offerAmountFils: BigInt(dto.offerAmountFils),
    validUntil,
    status: 'drafted',
    notes: dto.notes ?? null,
    publicToken,
    publicTokenExpiresAt,
    createdById: actorId,
    previousOfferId: dto.previousOfferId ?? null,
  });

  await recordAudit({
    actorId,
    action: 'offer.created',
    resource: 'admin.offer',
    resourceId: row.id,
    after: {
      inspectionId,
      bookingRef: row.bookingRef,
      offerAmountFils: dto.offerAmountFils,
      status: 'drafted',
    },
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
  });

  const chain = await repo.getOfferChain(row.id);
  return toDetailDto(row, chain);
}

/**
 * Publish a drafted offer — transitions drafted → sent and dispatches the
 * customer notification. Emits audit 'offer.sent'.
 */
export async function sendOffer(
  id: string,
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<{ status: OfferStatus }> {
  const row = await repo.findOfferById(id);
  if (!row) throw new OfferError(404, 'Offer not found', 'NOT_FOUND');
  if (row.status !== 'drafted') {
    throw new OfferError(409, `Offer is already in '${row.status}' state`, 'WRONG_STATUS');
  }
  const updated = await repo.updateOffer(id, { status: 'sent' });
  await recordAudit({
    actorId, action: 'offer.sent', resource: 'admin.offer', resourceId: id,
    before: { status: 'drafted' }, after: { status: 'sent' },
    ip: ctx.ip ?? null, userAgent: ctx.userAgent ?? null,
  });
  void dispatchOfferSentNotification(updated);
  return { status: updated.status as OfferStatus };
}

/**
 * KPI summary for the admin offer list page (F1).
 * Derived from repo.groupOfferCountByStatus() + a time-windowed accepted/expired
 * count for "this week" metrics. Mirrors the inspections KPI pattern.
 */
export async function getKpiForAdmin(): Promise<{
  pendingResponse: number;
  countersOpen: number;
  acceptedThisWeek: number;
  expiredThisWeek: number;
}> {
  const byCounts = await repo.groupOfferCountByStatus();
  const countFor = (status: string) => byCounts.find((r) => r.status === status)?.count ?? 0;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [acceptedThisWeek, expiredThisWeek] = await Promise.all([
    prisma.offer.count({ where: { status: 'accepted', updatedAt: { gte: weekAgo } } }),
    prisma.offer.count({ where: { status: 'expired', updatedAt: { gte: weekAgo } } }),
  ]);

  return {
    pendingResponse: countFor('sent') + countFor('countered_by_admin'),
    countersOpen: countFor('countered_by_customer'),
    acceptedThisWeek,
    expiredThisWeek,
  };
}

/** Return paginated list of offers matching filter. Admin-only. */
export async function listOffersForAdmin(filter: OfferListFilter): Promise<OfferListResponse> {
  const { rows, total } = await repo.listOffers(filter);
  return { data: rows.map(toSummaryDto), total, page: filter.page, limit: filter.limit };
}

/**
 * Return full offer detail including chain history. Admin-only.
 * Throws OfferError(404) if not found.
 */
export async function getOfferForAdmin(id: string): Promise<OfferDetailDto> {
  const row = await repo.findOfferById(id);
  if (!row) throw new OfferError(404, 'Offer not found', 'NOT_FOUND');
  const chain = await repo.getOfferChain(id);
  return toDetailDto(row, chain);
}

/**
 * Admin issues a counter-offer (§16 D1). Transitions to `countered_by_admin`.
 * Guard: status must be 'sent' or 'countered_by_customer'.
 * Emits audit 'offer.admin_counter'.
 */
export async function submitAdminCounter(
  id: string,
  dto: AdminCounterDto,
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<{ offerId: string; status: OfferStatus }> {
  const row = await repo.findOfferById(id);
  if (!row) throw new OfferError(404, 'Offer not found', 'NOT_FOUND');
  const allowed: OfferStatus[] = ['sent', 'countered_by_customer'];
  if (!allowed.includes(row.status as OfferStatus)) {
    throw new OfferError(409, `Cannot issue admin counter from '${row.status}' state`, 'WRONG_STATUS');
  }
  const updated = await repo.updateOffer(id, {
    status: 'countered_by_admin',
    adminCounterAmountFils: BigInt(dto.counterAmountFils),
    adminCounterNotes: dto.counterNotes ?? null,
  });
  await recordAudit({
    actorId, action: 'offer.admin_counter', resource: 'admin.offer', resourceId: id,
    before: { status: row.status }, after: { status: 'countered_by_admin', counterAmountFils: dto.counterAmountFils },
    ip: ctx.ip ?? null, userAgent: ctx.userAgent ?? null,
  });
  return { offerId: updated.id, status: updated.status as OfferStatus };
}

/**
 * Admin responds to a customer counter-offer.
 * Guard: offer.status === 'countered_by_customer'.
 * action 'accept' → §16 D5 atomic acceptance flow.
 * action 'decline' → status 'declined'.
 */
export async function respondToCounter(
  id: string,
  action: 'accept' | 'decline',
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<{ offerId: string; status: OfferStatus; listingStockNumber?: string }> {
  const row = await repo.findOfferById(id);
  if (!row) throw new OfferError(404, 'Offer not found', 'NOT_FOUND');
  if (row.status !== 'countered_by_customer') {
    throw new OfferError(409, `Expected 'countered_by_customer', got '${row.status}'`, 'WRONG_STATUS');
  }
  if (action === 'accept') {
    const acceptedAmount =
      row.counterAmountFils !== null ? row.counterAmountFils : row.offerAmountFils;
    return runAcceptanceFlow(row, acceptedAmount, actorId, ctx);
  }
  await repo.updateOffer(id, { status: 'declined' });
  await recordAudit({
    actorId, action: 'offer.counter_declined', resource: 'admin.offer', resourceId: id,
    before: { status: 'countered_by_customer' }, after: { status: 'declined' },
    ip: ctx.ip ?? null, userAgent: ctx.userAgent ?? null,
  });
  void dispatchCounterDeclinedNotification(row);
  return { offerId: id, status: 'declined' };
}

/**
 * Admin retracts an offer. Guard: status must be 'drafted', 'sent', or
 * 'countered_by_customer'. Throws OfferError(409) on wrong state.
 */
export async function withdrawOffer(
  id: string,
  actorId: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<void> {
  const row = await repo.findOfferById(id);
  if (!row) throw new OfferError(404, 'Offer not found', 'NOT_FOUND');
  const withdrawable: OfferStatus[] = ['drafted', 'sent', 'countered_by_customer'];
  if (!withdrawable.includes(row.status as OfferStatus)) {
    throw new OfferError(409, `Cannot withdraw offer in '${row.status}' state`, 'WRONG_STATUS');
  }
  await repo.updateOffer(id, { status: 'withdrawn' });
  await recordAudit({
    actorId, action: 'offer.withdrawn', resource: 'admin.offer', resourceId: id,
    before: { status: row.status }, after: { status: 'withdrawn' },
    ip: ctx.ip ?? null, userAgent: ctx.userAgent ?? null,
  });
  void dispatchOfferWithdrawnNotification(row);
}

/**
 * Internal — called by the daily BullMQ sweep job.
 * Transitions offer from active states → 'expired' if validUntil < now.
 * No-ops if already terminal.
 */
export async function expireOffer(id: string): Promise<void> {
  const row = await repo.findOfferById(id);
  if (!row) return;
  if (TERMINAL_STATUSES.includes(row.status as OfferStatus)) return;
  if (row.validUntil.getTime() >= Date.now()) return;
  await repo.updateOffer(id, { status: 'expired' });
  await recordAudit({
    actorId: null, action: 'offer.expired', resource: 'admin.offer', resourceId: id,
    before: { status: row.status }, after: { status: 'expired' },
  });
}

// ─── Public-shared exports ────────────────────────────────────────────────────

/**
 * // public-shared
 * Validate publicToken, return sanitised offer view for the customer.
 * Error codes per spec §8: NOT_FOUND(404), TOKEN_EXPIRED(410),
 * OFFER_WITHDRAWN(410), ALREADY_RESPONDED(409).
 */
export async function getOfferByToken(token: string): Promise<PublicOfferView> {
  const row = await repo.findOfferByPublicToken(token);
  if (!row) throw new OfferError(404, 'Offer not found', 'NOT_FOUND');
  if (row.publicTokenExpiresAt.getTime() < Date.now()) {
    throw new OfferError(410, 'Offer link has expired', 'TOKEN_EXPIRED');
  }
  if (row.status === 'withdrawn') {
    throw new OfferError(410, 'This offer has been withdrawn', 'OFFER_WITHDRAWN');
  }
  // T1 — NOT-A-BUG: we intentionally do NOT throw ALREADY_RESPONDED here for
  // accepted/declined/expired offers. The public page renders the offer in a
  // read-only "history" state (publicTokenExpiresAt is set to validUntil + 30d
  // per §16 D3) so the customer can see what they accepted/declined.
  // ALREADY_RESPONDED (409) is thrown by submitCustomerResponse when the
  // customer tries to act on a non-respondable offer — not on the read path.
  const canRespond = row.status === 'sent' || row.status === 'countered_by_admin';
  return {
    bookingRef: row.bookingRef,
    vehicleLabel: vehicleLabelFromRow(row),
    vehicleYear: row.inspection.vehicleYear ?? null,
    vehicleBrandName: row.inspection.vehicleBrandName ?? null,
    vehicleModelName: row.inspection.vehicleModelName ?? null,
    offerAmountFils: Number(row.offerAmountFils),
    offerAmountKwd: filsToKwd(row.offerAmountFils),
    validUntil: row.validUntil.toISOString(),
    status: row.status as OfferStatus,
    counterAmountFils: row.counterAmountFils !== null ? Number(row.counterAmountFils) : null,
    adminCounterAmountFils:
      row.adminCounterAmountFils !== null ? Number(row.adminCounterAmountFils) : null,
    canRespond,
    publicTokenExpiresAt: row.publicTokenExpiresAt.toISOString(),
    // v1.5.4: surfaced so mobile/web offer page can deep-link to the inspection
    // report viewer. The `inspection` include is already populated by
    // OFFER_INCLUDE; this is a no-cost field add.
    inspectionReportId: row.inspection.id,
  };
}

/**
 * public-shared (v1.5.7 — ASK A→B v1.5-D §5)
 *
 * Pivots offer `:token` → offer → offer.inspection → PublicInspectionSummary.
 * Used by A's `/offer/:token/inspection-report` page so the customer can read
 * the CPO inspection details on the same shared link they used to view their
 * offer.
 *
 * Error mapping (per CONCIERGE_INSPECTION_API_CONTRACT.md v1.5-D §5):
 *   - token not found            → 404 `INSPECTION_NOT_AVAILABLE`
 *   - publicTokenExpiresAt < now → 410 `OFFER_LINK_EXPIRED`
 *   - offer.status === withdrawn → 410 `OFFER_LINK_EXPIRED`
 *   - inspection not signed_off  → 404 `INSPECTION_NOT_AVAILABLE`
 *   - inspection row missing     → 404 `INSPECTION_NOT_AVAILABLE`
 *
 * 5xx surfaces unchanged via the global error handler — A treats those as
 * `network_error` per its `OffersService.getInspectionReport$` discriminated
 * union.
 */
export async function getInspectionReportByOfferToken(
  token: string,
): Promise<import('@behbehani-cpo/shared-types').PublicInspectionSummary> {
  const offer = await repo.findOfferByPublicToken(token);
  if (!offer) {
    throw new OfferError(404, 'Inspection not available', 'INSPECTION_NOT_AVAILABLE');
  }
  if (offer.publicTokenExpiresAt.getTime() < Date.now()) {
    throw new OfferError(410, 'Offer link has expired', 'OFFER_LINK_EXPIRED');
  }
  if (offer.status === 'withdrawn') {
    throw new OfferError(410, 'Offer link has expired', 'OFFER_LINK_EXPIRED');
  }

  // Delegate to inspections.service for the signed-off check + summary mapping.
  // Translate any InspectionError into the canonical OfferError surface so the
  // offers-public.controller error adapter formats the response correctly.
  try {
    const { getInspectionReportById } = await import('../inspections/inspections.service');
    return await getInspectionReportById(offer.inspection.id);
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'name' in err &&
      (err as { name?: string }).name === 'InspectionError'
    ) {
      const ie = err as { code?: string };
      // INSPECTION_NOT_AVAILABLE is the only code the helper throws — surface
      // it under the same code via OfferError so the controller adapter emits
      // the contracted shape.
      throw new OfferError(404, 'Inspection not available', ie.code ?? 'INSPECTION_NOT_AVAILABLE');
    }
    throw err;
  }
}

/**
 * // public-shared
 * Process a customer action (accept / decline / counter).
 * Guards: status must be 'sent' or 'countered_by_admin'.
 * §16 D1: unlimited counter rounds; customer can counter admin's counter.
 * §16 D5: 'accept' runs atomic listing-creation flow.
 */
export async function submitCustomerResponse(
  token: string,
  dto: CustomerOfferResponseDto,
  ctx: { ip: string; userAgent: string },
): Promise<{ offerId: string; status: OfferStatus; listingStockNumber?: string }> {
  const row = await repo.findOfferByPublicToken(token);
  if (!row) throw new OfferError(404, 'Offer not found', 'NOT_FOUND');
  if (row.publicTokenExpiresAt.getTime() < Date.now()) {
    throw new OfferError(410, 'Offer link has expired', 'TOKEN_EXPIRED');
  }
  if (row.status === 'withdrawn') {
    throw new OfferError(410, 'This offer has been withdrawn', 'OFFER_WITHDRAWN');
  }
  const respondable: OfferStatus[] = ['sent', 'countered_by_admin'];
  if (!respondable.includes(row.status as OfferStatus)) {
    throw new OfferError(409, 'This offer can no longer be responded to', 'ALREADY_RESPONDED');
  }

  const respondedAt = new Date();
  const responseMeta = {
    respondedAt,
    respondedIp: ctx.ip,
    respondedUserAgent: ctx.userAgent.slice(0, 512),
  };

  if (dto.action === 'accept') {
    const acceptedAmount =
      row.status === 'countered_by_admin' && row.adminCounterAmountFils !== null
        ? row.adminCounterAmountFils
        : row.offerAmountFils;
    return runAcceptanceFlow(row, acceptedAmount, null, ctx, responseMeta);
  }

  if (dto.action === 'decline') {
    await repo.updateOffer(row.id, { status: 'declined', ...responseMeta });
    await recordAudit({
      actorId: row.customerId, action: 'offer.customer_declined',
      resource: 'admin.offer', resourceId: row.id,
      before: { status: row.status }, after: { status: 'declined' },
      ip: ctx.ip, userAgent: ctx.userAgent.slice(0, 512),
    });
    return { offerId: row.id, status: 'declined' };
  }

  // action === 'counter'
  await repo.updateOffer(row.id, {
    status: 'countered_by_customer',
    counterAmountFils: BigInt(dto.counterAmountFils),
    counterNotes: dto.counterNotes ?? null,
    ...responseMeta,
  });
  await recordAudit({
    actorId: row.customerId, action: 'offer.customer_countered',
    resource: 'admin.offer', resourceId: row.id,
    before: { status: row.status },
    after: { status: 'countered_by_customer', counterAmountFils: dto.counterAmountFils },
    ip: ctx.ip, userAgent: ctx.userAgent.slice(0, 512),
  });
  void dispatchCounteredByCustomerNotification(row, dto.counterAmountFils);
  return { offerId: row.id, status: 'countered_by_customer' };
}
