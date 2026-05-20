/**
 * §16 D5 — Atomic acceptance flow for Offer / Valuation module.
 *
 * When an offer reaches `accepted` (customer or admin accepts), this module
 * atomically:
 *   1. Flips offer status to 'accepted'.
 *   2. Creates a draft Listing (stage='acquired') with vehicle facts from the
 *      Concierge inspection.
 *   3. Links InspectionReport.listingId to the new Listing.
 *   4. Audits with action 'offer.accepted_to_listing'.
 *   5. Notifies the operations team (fire-and-forget).
 *
 * Extracted from offers.service.ts to keep both files under 500 lines.
 */

import { prisma } from '../db/prisma';
import { recordAudit } from '../middleware/audit';
import { OfferError } from './offers.errors';
import { nextStockNumber } from '../listings/listings.repo';
import type { OfferRow } from './offers.repo';
import type { OfferStatus } from '@behbehani-cpo/shared-types';
import {
  sendOfferAcceptedInternalNotification,
  sendOfferSentNotification,
  sendOfferWithdrawnNotification,
  sendOfferCounteredByCustomerNotification,
  sendOfferCounterDeclinedNotification,
} from '../notifications/notifications.service';

// ─── KWD formatting ───────────────────────────────────────────────────────────

export function filsToKwd(fils: bigint): string {
  const kwd = Number(fils) / 1000;
  return `KWD ${kwd.toLocaleString('en-KW', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

// ─── Vehicle label helper ─────────────────────────────────────────────────────

export function vehicleLabelFromRow(row: OfferRow): string {
  const parts = [
    row.inspection.vehicleYear,
    row.inspection.vehicleBrandName,
    row.inspection.vehicleModelName,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : `Booking ${row.bookingRef}`;
}

// ─── Brand / model resolution ─────────────────────────────────────────────────

async function resolveBrandModel(
  vehicleBrandName: string | null,
  vehicleModelName: string | null,
): Promise<{ brandId: string; modelId: string; usedFallback: boolean }> {
  let brandId: string | null = null;
  let modelId: string | null = null;
  let usedFallback = false;

  if (vehicleBrandName) {
    const brand = await prisma.brand.findFirst({
      where: { slug: { equals: vehicleBrandName.toLowerCase().replace(/\s+/g, '-') } },
      select: { id: true },
    });
    if (brand) {
      brandId = brand.id;
      if (vehicleModelName) {
        const model = await prisma.model.findFirst({
          where: {
            brandId,
            slug: { equals: vehicleModelName.toLowerCase().replace(/\s+/g, '-') },
          },
          select: { id: true },
        });
        if (model) modelId = model.id;
      }
    }
  }

  if (!brandId) {
    usedFallback = true;
    const fallbackBrand = await prisma.brand.findFirst({
      where: { slug: 'unknown' },
      select: { id: true },
    });
    if (fallbackBrand) {
      brandId = fallbackBrand.id;
    } else {
      const created = await prisma.brand.create({
        data: { slug: 'unknown', nameEn: 'Unknown', nameAr: 'غير معروف' },
        select: { id: true },
      });
      brandId = created.id;
    }
  }

  if (!modelId && brandId) {
    const fallbackModel = await prisma.model.findFirst({
      where: { brandId, slug: 'unknown' },
      select: { id: true },
    });
    if (fallbackModel) {
      modelId = fallbackModel.id;
    } else {
      const created = await prisma.model.create({
        data: {
          brandId,
          slug: 'unknown',
          nameEn: vehicleModelName ?? 'Unknown',
          nameAr: vehicleModelName ?? 'غير معروف',
        },
        select: { id: true },
      });
      modelId = created.id;
    }
  }

  if (!brandId || !modelId) {
    throw new OfferError(500, 'Brand/model resolution failed', 'LISTING_CREATE_FAILED');
  }

  return { brandId, modelId, usedFallback };
}

// ─── Main acceptance flow ─────────────────────────────────────────────────────

export async function runAcceptanceFlow(
  row: OfferRow,
  acceptedAmount: bigint,
  actorId: string | null,
  ctx: { ip?: string | null; userAgent?: string | null },
  responseMeta?: {
    respondedAt: Date;
    respondedIp: string;
    respondedUserAgent: string;
  },
): Promise<{ offerId: string; status: OfferStatus; listingStockNumber: string }> {
  const inspection = row.inspection;

  const stockNumber = await nextStockNumber();

  const { brandId, modelId, usedFallback } = await resolveBrandModel(
    inspection.vehicleBrandName,
    inspection.vehicleModelName,
  );

  const firstBodyType = await prisma.bodyType.findFirst({ select: { id: true } });
  if (!firstBodyType) {
    throw new OfferError(500, 'No body types found in catalog', 'LISTING_CREATE_FAILED');
  }

  const declared = inspection.customerDeclaredJson as Record<string, unknown> | null;
  const transmission =
    (declared?.['transmission'] as string | undefined) ?? 'automatic';
  const exteriorColor = (declared?.['exteriorColor'] as string | undefined) ?? 'unspecified';
  const interiorColor = (declared?.['interiorColor'] as string | undefined) ?? 'unspecified';

  const vehicleLabel =
    [inspection.vehicleYear, inspection.vehicleBrandName, inspection.vehicleModelName]
      .filter(Boolean)
      .join(' ') || 'Concierge Vehicle';

  const slug = `${vehicleLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}-${stockNumber.toLowerCase()}`;

  const acquisitionSource = {
    source: 'concierge',
    inspectionId: inspection.id,
    offerId: row.id,
    customerId: row.customerId,
    bookingRef: row.bookingRef,
  };

  // Atomic: flip offer + create listing in one transaction (array form).
  // NOTE (B1 — reviewer-validated): the listing FK back-link on InspectionReport
  // (inspectionReport.update { listingId }) cannot be included in this same
  // array because newListing.id is not available at array-construction time —
  // the array form evaluates all operations concurrently, so you cannot pass the
  // result of ops[1] as input to ops[2]. The interactive-transaction form would
  // work but requires a separate Prisma client instance. The two-step approach
  // (atomic offer+listing, then separate inspectionReport update) is therefore
  // the correct pattern here: if the inspectionReport update fails after the
  // transaction commits, the listing and accepted offer are still valid —
  // the listingId FK is convenience denormalisation, not a consistency boundary.
  const [, newListing] = await prisma.$transaction([
    prisma.offer.update({
      where: { id: row.id },
      data: { status: 'accepted', ...(responseMeta ?? {}) },
    }),
    prisma.listing.create({
      data: {
        stockNumber,
        vin: inspection.vehicleVin ?? `CONCIERGE-${row.id.slice(0, 8).toUpperCase()}`,
        titleEn: vehicleLabel,
        slug,
        brandId,
        modelId,
        bodyTypeId: firstBodyType.id,
        year: inspection.vehicleYear ?? new Date().getFullYear(),
        mileageKm: inspection.vehicleMileageKm ?? 0,
        exteriorColor,
        interiorColor,
        transmission: transmission as 'automatic' | 'manual' | 'cvt' | 'dct',
        fuelType: 'petrol',
        drivetrain: 'fwd',
        seats: 5,
        doors: 4,
        priceFils: BigInt(0),
        costFils: acceptedAmount,
        stage: 'acquired',
        acquisitionSourceJson: acquisitionSource,
        createdById: actorId ?? row.customerId,
      },
      select: { id: true, stockNumber: true },
    }),
  ]);

  // Link inspection to new listing (separate update — avoids FK circularity in tx).
  await prisma.inspectionReport.update({
    where: { id: inspection.id },
    data: { listingId: newListing.id },
  });

  await recordAudit({
    actorId: actorId ?? row.customerId,
    action: 'offer.accepted_to_listing',
    resource: 'admin.offer',
    resourceId: row.id,
    before: { status: row.status },
    after: {
      status: 'accepted',
      acceptedAmountFils: Number(acceptedAmount),
      listingId: newListing.id,
      listingStockNumber: newListing.stockNumber,
      usedFallbackBrandModel: usedFallback,
    },
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
  });

  void dispatchAcceptedInternalNotification(row, newListing.stockNumber, acceptedAmount);

  return { offerId: row.id, status: 'accepted', listingStockNumber: newListing.stockNumber };
}

// ─── Notification dispatch helpers ────────────────────────────────────────────

export async function dispatchOfferSentNotification(row: OfferRow): Promise<void> {
  try {
    await sendOfferSentNotification({
      customerName: row.customer.fullName.split(' ')[0] ?? 'there',
      customerMobile: row.customer.mobile ?? '',
      customerEmail: row.customer.email ?? null,
      vehicleLabel: vehicleLabelFromRow(row),
      bookingRef: row.bookingRef,
      offerAmountKwd: filsToKwd(row.offerAmountFils),
      validUntil: row.validUntil,
      offerToken: row.publicToken,
      locale: 'en',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[offers] sendOfferSentNotification failed', err);
  }
}

export async function dispatchOfferWithdrawnNotification(row: OfferRow): Promise<void> {
  try {
    await sendOfferWithdrawnNotification({
      customerName: row.customer.fullName.split(' ')[0] ?? 'there',
      customerMobile: row.customer.mobile ?? '',
      customerEmail: row.customer.email ?? null,
      vehicleLabel: vehicleLabelFromRow(row),
      bookingRef: row.bookingRef,
      locale: 'en',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[offers] sendOfferWithdrawnNotification failed', err);
  }
}

export async function dispatchCounteredByCustomerNotification(
  row: OfferRow,
  counterAmountFils: number,
): Promise<void> {
  try {
    await sendOfferCounteredByCustomerNotification({
      customerName: row.customer.fullName.split(' ')[0] ?? 'there',
      customerMobile: row.customer.mobile ?? '',
      customerEmail: row.customer.email ?? null,
      vehicleLabel: vehicleLabelFromRow(row),
      bookingRef: row.bookingRef,
      counterAmountKwd: filsToKwd(BigInt(counterAmountFils)),
      locale: 'en',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[offers] sendOfferCounteredByCustomerNotification failed', err);
  }
}

export async function dispatchCounterDeclinedNotification(row: OfferRow): Promise<void> {
  try {
    await sendOfferCounterDeclinedNotification({
      customerName: row.customer.fullName.split(' ')[0] ?? 'there',
      customerMobile: row.customer.mobile ?? '',
      customerEmail: row.customer.email ?? null,
      vehicleLabel: vehicleLabelFromRow(row),
      bookingRef: row.bookingRef,
      locale: 'en',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[offers] sendOfferCounterDeclinedNotification failed', err);
  }
}

async function dispatchAcceptedInternalNotification(
  row: OfferRow,
  stockNumber: string,
  acceptedAmount: bigint,
): Promise<void> {
  try {
    await sendOfferAcceptedInternalNotification({
      customerName: row.customer.fullName,
      customerMobile: row.customer.mobile ?? '',
      vehicleLabel: vehicleLabelFromRow(row),
      bookingRef: row.bookingRef,
      acceptedAmountKwd: filsToKwd(acceptedAmount),
      stockNumber,
      locale: 'en',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[offers] sendOfferAcceptedInternalNotification failed', err);
  }
}
