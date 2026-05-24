/**
 * Customer reviews — service layer.
 *
 * v1.5.8 — per MOBILE_API_CONTRACT v0.18 §2.
 *
 * Polymorphic target: a review can be for a CPO Listing or a Service
 * (concierge inspection | maintenance pickup request).
 *
 * Reviewability guard on POST:
 *   listing   → customer must have a completed Order for that listing
 *   inspection → customer must have a signed_off InspectionReport
 *   maintenance → customer must have a completed MaintenanceRequest
 *
 * Duplicate prevention: compound @@unique on (userId, targetListingId)
 * and (userId, targetServiceKind, targetServiceId) catches re-submissions;
 * P2002 is caught and re-thrown as REVIEW_ALREADY_SUBMITTED.
 *
 * Anonymization: customerDisplayName derived from User.fullName at fetch
 * time — never stored (single source of truth).
 */

import type {
  CreateReviewInput,
  ReviewDto,
  ReviewErrorCode,
  ReviewListResponse,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

// ─── Domain error ─────────────────────────────────────────────────────────────

export class ReviewError extends Error {
  constructor(
    public readonly code: ReviewErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ReviewError';
  }
}

// ─── Anonymization helper (D6) ────────────────────────────────────────────────

/**
 * Derives a privacy-safe display name from a full name.
 * "Abbas Ahmed Behbehani" → "Abbas A."
 * Single-word names (no space) → returned as-is.
 * Empty / null → "Anonymous".
 */
export function anonymizeName(fullName: string | null | undefined): string {
  if (!fullName || fullName.trim().length === 0) return 'Anonymous';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

// ─── Internal row type (Prisma result + user join) ────────────────────────────

type ReviewRowWithUser = {
  id:                string;
  userId:            string;
  user:              { fullName: string };
  targetKind:        string;
  targetListingId:   string | null;
  targetServiceKind: string | null;
  targetServiceId:   string | null;
  rating:            number;
  title:             string;
  body:              string;
  createdAt:         Date;
  updatedAt:         Date;
};

// ─── DTO mapper ───────────────────────────────────────────────────────────────

function toDto(row: ReviewRowWithUser): ReviewDto {
  const target: ReviewDto['target'] =
    row.targetKind === 'listing'
      ? { kind: 'listing', listingId: row.targetListingId! }
      : {
          kind:        'service',
          serviceKind: row.targetServiceKind as 'inspection' | 'maintenance',
          serviceId:   row.targetServiceId!,
        };

  return {
    id:                  row.id,
    customerDisplayName: anonymizeName(row.user.fullName),
    target,
    rating:              row.rating,
    title:               row.title,
    body:                row.body,
    createdAt:           row.createdAt.toISOString(),
    updatedAt:           row.updatedAt.toISOString(),
  };
}

// ─── Histogram + average helpers ──────────────────────────────────────────────

function buildHistogramAndAverage(rows: { rating: number }[]): {
  averageRating: number;
  ratingHistogram: ReviewListResponse['ratingHistogram'];
} {
  const histogram: ReviewListResponse['ratingHistogram'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (rows.length === 0) {
    return { averageRating: 0, ratingHistogram: histogram };
  }
  let sum = 0;
  for (const row of rows) {
    const r = row.rating as 1 | 2 | 3 | 4 | 5;
    histogram[r] = (histogram[r] ?? 0) + 1;
    sum += r;
  }
  return {
    averageRating:   Math.round((sum / rows.length) * 100) / 100,
    ratingHistogram: histogram,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Paginated list of a customer's own reviews, newest first.
 * averageRating + histogram computed from this customer's reviews.
 */
export async function listMyReviews(
  userId: string,
  pagination: { page: number; pageSize: number },
): Promise<ReviewListResponse> {
  const page     = Math.max(1, Math.floor(pagination.page));
  const pageSize = Math.max(1, Math.min(100, Math.floor(pagination.pageSize)));

  const where = { userId };

  const [rows, total, allRatings] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
    // Fetch all ratings for this user (for accurate histogram across all pages)
    prisma.review.findMany({ where, select: { rating: true } }),
  ]);

  const { averageRating, ratingHistogram } = buildHistogramAndAverage(allRatings);

  return {
    items: rows.map(toDto),
    total,
    averageRating,
    ratingHistogram,
    page,
    pageSize,
  };
}

/**
 * Paginated list of reviews on a specific listing — PUBLIC (no auth required).
 * averageRating + histogram computed across ALL reviews on this listing.
 */
export async function listListingReviews(
  listingId: string,
  pagination: { page: number; pageSize: number },
): Promise<ReviewListResponse> {
  const page     = Math.max(1, Math.floor(pagination.page));
  const pageSize = Math.max(1, Math.min(100, Math.floor(pagination.pageSize)));

  const where = { targetListingId: listingId };

  const [rows, total, allRatings] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
    prisma.review.findMany({ where, select: { rating: true } }),
  ]);

  const { averageRating, ratingHistogram } = buildHistogramAndAverage(allRatings);

  return {
    items: rows.map(toDto),
    total,
    averageRating,
    ratingHistogram,
    page,
    pageSize,
  };
}

// ─── Reviewability guard (D5) ─────────────────────────────────────────────────

async function assertReviewable(userId: string, input: CreateReviewInput): Promise<void> {
  const { target } = input;

  if (target.kind === 'listing') {
    const order = await prisma.order.findFirst({
      where: {
        customerId: userId,
        listingId:  target.listingId,
        status:     'completed',
      },
    });
    if (!order) {
      throw new ReviewError(
        'REVIEW_TARGET_NOT_REVIEWABLE',
        'No completed order found for this listing',
      );
    }
    return;
  }

  // target.kind === 'service'
  if (target.serviceKind === 'inspection') {
    const report = await prisma.inspectionReport.findFirst({
      where: {
        customerId: userId,
        id:         target.serviceId,
        status:     'signed_off',
      },
    });
    if (!report) {
      throw new ReviewError(
        'REVIEW_TARGET_NOT_REVIEWABLE',
        'No signed-off inspection found for this service target',
      );
    }
    return;
  }

  // target.serviceKind === 'maintenance'
  const maintenance = await prisma.maintenanceRequest.findFirst({
    where: {
      userId,
      id:     target.serviceId,
      status: 'completed',
    },
  });
  if (!maintenance) {
    throw new ReviewError(
      'REVIEW_TARGET_NOT_REVIEWABLE',
      'No completed maintenance request found for this service target',
    );
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Submit a review. Runs reviewability guard before insert.
 * Idempotency-Key: if a matching key already exists for this user, returns
 * the existing row (idempotent POST).
 * Throws REVIEW_ALREADY_SUBMITTED on compound unique violation (P2002).
 */
export async function createReview(
  userId: string,
  input:  CreateReviewInput,
  idempotencyKey?: string | null,
): Promise<ReviewDto> {
  // Idempotency check — same key + same user → return existing row.
  if (idempotencyKey) {
    const existing = await prisma.review.findFirst({
      where:   { idempotencyKey, userId },
      include: { user: { select: { fullName: true } } },
    });
    if (existing) return toDto(existing);
  }

  // Reviewability guard
  await assertReviewable(userId, input);

  // Build the write payload based on target kind
  const data =
    input.target.kind === 'listing'
      ? {
          userId,
          targetKind:      'listing'  as const,
          targetListingId: input.target.listingId,
          rating:          input.rating,
          title:           input.title,
          body:            input.body,
          idempotencyKey:  idempotencyKey ?? null,
        }
      : {
          userId,
          targetKind:        'service' as const,
          targetServiceKind: input.target.serviceKind as 'inspection' | 'maintenance',
          targetServiceId:   input.target.serviceId,
          rating:            input.rating,
          title:             input.title,
          body:              input.body,
          idempotencyKey:    idempotencyKey ?? null,
        };

  try {
    const row = await prisma.review.create({
      data,
      include: { user: { select: { fullName: true } } },
    });
    return toDto(row);
  } catch (err: unknown) {
    // Prisma unique constraint violation (compound unique or idempotencyKey unique)
    if (
      err != null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      throw new ReviewError(
        'REVIEW_ALREADY_SUBMITTED',
        'You have already submitted a review for this target',
      );
    }
    throw err;
  }
}

/**
 * Delete a customer's own review.
 * Ownership-checked: non-existent or other-user's review → REVIEW_NOT_FOUND.
 */
export async function deleteReview(id: string, userId: string): Promise<void> {
  const existing = await prisma.review.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new ReviewError('REVIEW_NOT_FOUND', 'Review not found');
  }
  await prisma.review.delete({ where: { id } });
}

// ─── HTTP-mapping helper ──────────────────────────────────────────────────────

export function mapReviewErrorToHttp(err: ReviewError): {
  status: number;
  body: { code: ReviewErrorCode; error: string };
} {
  const statusByCode: Record<ReviewErrorCode, number> = {
    REVIEW_NOT_FOUND:              404,
    REVIEW_TARGET_NOT_REVIEWABLE:  403,
    REVIEW_ALREADY_SUBMITTED:      409,
  };
  return {
    status: statusByCode[err.code],
    body:   { code: err.code, error: err.message },
  };
}
