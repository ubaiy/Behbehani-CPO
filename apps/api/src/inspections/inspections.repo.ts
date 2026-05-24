import type { Prisma } from '@prisma/client';
import type {
  InspectionFilter,
  InspectionKind,
  InspectionStatus,
  PreferredWindow,
  InspectionReportJson,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

/**
 * Inspection repo — raw Prisma access for InspectionReport. The service
 * layer wraps these with validation, DTO mapping, audit emission, and the
 * bookingRef / customerSignToken generators.
 */

const SUMMARY_INCLUDE = {
  listing: { select: { id: true, stockNumber: true, titleEn: true } },
  customer: { select: { id: true, fullName: true, mobile: true, email: true } },
  // v1.5.13: surface inspector.mobile so the tracker DTO can expose phoneE164
  // to the customer (per [ASK C→B] inspector-fields-on-tracker-dto). PII-light:
  // only mobile + fullName — no email / role / personal address.
  inspector: { select: { id: true, fullName: true, mobile: true } },
} satisfies Prisma.InspectionReportInclude;

const DETAIL_INCLUDE = {
  listing: { select: { id: true, stockNumber: true, titleEn: true, vin: true } },
  customer: { select: { id: true, fullName: true, mobile: true, email: true } },
  inspector: { select: { id: true, fullName: true, mobile: true } },
  // v1.5.14 ([ASK A→B-2]): fetch latest non-withdrawn offer so toBookingStatus()
  // can populate relatedOfferToken for the deep-link to /offer/:token/inspection-report.
  // `take: 1` + `orderBy: createdAt desc` ensures we get the most-recent offer.
  // `status: { not: 'withdrawn' }` prevents surfacing retracted offers.
  offers: {
    where: { status: { not: 'withdrawn' } },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { publicToken: true, publicTokenExpiresAt: true, status: true },
  },
} satisfies Prisma.InspectionReportInclude;

export type InspectionSummaryRow = Prisma.InspectionReportGetPayload<{
  include: typeof SUMMARY_INCLUDE;
}>;
export type InspectionDetailRow = Prisma.InspectionReportGetPayload<{
  include: typeof DETAIL_INCLUDE;
}>;

// ─── List / find ────────────────────────────────────────────────────────────

function buildWhere(filter: InspectionFilter): Prisma.InspectionReportWhereInput {
  const where: Prisma.InspectionReportWhereInput = {};
  if (filter.kind) where.kind = filter.kind;
  if (filter.status) where.status = filter.status;
  if (filter.inspectorId) where.inspectorId = filter.inspectorId;
  if (filter.q && filter.q.length >= 2) {
    where.OR = [
      { bookingRef: { contains: filter.q, mode: 'insensitive' } },
      { vehicleVin: { contains: filter.q, mode: 'insensitive' } },
      { customer: { fullName: { contains: filter.q, mode: 'insensitive' } } },
      { customer: { mobile: { contains: filter.q, mode: 'insensitive' } } },
      { listing: { stockNumber: { contains: filter.q, mode: 'insensitive' } } },
      { listing: { titleEn: { contains: filter.q, mode: 'insensitive' } } },
    ];
  }
  return where;
}

export async function listInspections(
  filter: InspectionFilter,
): Promise<{ rows: InspectionSummaryRow[]; total: number }> {
  const where = buildWhere(filter);
  const [rows, total] = await prisma.$transaction([
    prisma.inspectionReport.findMany({
      where,
      include: SUMMARY_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }],
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.inspectionReport.count({ where }),
  ]);
  return { rows, total };
}

/**
 * Group-by-status count for the admin queue KPI strip. Returns one row per
 * non-zero status. Optionally narrowed by `kind`.
 */
export async function groupCountByStatus(filter: {
  kind: 'cpo' | 'concierge' | null;
}): Promise<{ status: string; count: number }[]> {
  const where: Prisma.InspectionReportWhereInput = filter.kind ? { kind: filter.kind } : {};
  const rows = await prisma.inspectionReport.groupBy({
    by: ['status'],
    where,
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

export function findInspectionById(id: string): Promise<InspectionDetailRow | null> {
  return prisma.inspectionReport.findUnique({ where: { id }, include: DETAIL_INCLUDE });
}

export function findInspectionByBookingRef(
  bookingRef: string,
): Promise<InspectionDetailRow | null> {
  return prisma.inspectionReport.findUnique({
    where: { bookingRef },
    include: DETAIL_INCLUDE,
  });
}

export function findInspectionBySignToken(
  token: string,
): Promise<InspectionDetailRow | null> {
  return prisma.inspectionReport.findUnique({
    where: { customerSignToken: token },
    include: DETAIL_INCLUDE,
  });
}

export function findInspectionByListingId(
  listingId: string,
): Promise<InspectionDetailRow | null> {
  return prisma.inspectionReport.findUnique({
    where: { listingId },
    include: DETAIL_INCLUDE,
  });
}

// ─── Customer reconciliation (mobile-or-email) ──────────────────────────────

export function findCustomerByMobileOrEmail(
  mobile: string,
  email: string | null,
): Promise<{ id: string; mobile: string | null; email: string | null; fullName: string } | null> {
  return prisma.user.findFirst({
    where: {
      role: 'customer',
      deletedAt: null,
      OR: [
        { mobile },
        ...(email ? [{ email }] : []),
      ],
    },
    select: { id: true, mobile: true, email: true, fullName: true },
  });
}

export async function createGhostCustomer(input: {
  fullName: string;
  mobile: string;
  email: string | null;
}): Promise<{ id: string }> {
  // Ghost-account convention v1.2: passwordHash NULL marks an unclaimed
  // account (CONTRACT v1.2.0 §1 Q2). Migration 20260520000001_v1_2_auth
  // backfilled existing `''` rows to NULL. registerCustomer detects this row
  // on lookup and upgrades it in place rather than rejecting with 409.
  return prisma.user.create({
    data: {
      role: 'customer',
      fullName: input.fullName,
      mobile: input.mobile,
      email: input.email,
      passwordHash: null,
    },
    select: { id: true },
  });
}

// ─── Booking ref generator ──────────────────────────────────────────────────
// Format: "BMC-CON-NNNNNN" (6-digit zero-padded). Customers reference this
// over the phone; mirrors Listing.stockNumber. Race-safe via a Postgres
// sequence so concurrent submissions can't collide.

const BOOKING_REF_SEQUENCE_NAME = 'inspection_booking_ref_seq';

export async function nextBookingRef(): Promise<string> {
  // Lazy-create the sequence on first call so we don't need a separate
  // migration just for the counter. Postgres's `CREATE SEQUENCE IF NOT
  // EXISTS` is concurrency-safe.
  await prisma.$executeRawUnsafe(
    `CREATE SEQUENCE IF NOT EXISTS ${BOOKING_REF_SEQUENCE_NAME} START 1`,
  );
  const result = await prisma.$queryRawUnsafe<Array<{ nextval: bigint }>>(
    `SELECT nextval('${BOOKING_REF_SEQUENCE_NAME}') AS nextval`,
  );
  const seq = result[0]?.nextval ?? BigInt(1);
  const padded = seq.toString().padStart(6, '0');
  return `BMC-CON-${padded}`;
}

// ─── Create / update ────────────────────────────────────────────────────────

export function createInspection(
  data: Prisma.InspectionReportUncheckedCreateInput,
): Promise<InspectionDetailRow> {
  return prisma.inspectionReport.create({ data, include: DETAIL_INCLUDE });
}

export function updateInspection(
  id: string,
  data: Prisma.InspectionReportUncheckedUpdateInput,
): Promise<InspectionDetailRow> {
  return prisma.inspectionReport.update({ where: { id }, data, include: DETAIL_INCLUDE });
}

// ─── Typed reportJson helpers ───────────────────────────────────────────────

/** Read reportJson as the typed shape (or empty if null/malformed). */
export function readReportJson(row: { reportJson: Prisma.JsonValue | null }): InspectionReportJson {
  if (!row.reportJson || typeof row.reportJson !== 'object' || Array.isArray(row.reportJson)) {
    return { items: [] };
  }
  const obj = row.reportJson as Record<string, unknown>;
  const items = Array.isArray(obj['items']) ? (obj['items'] as InspectionReportJson['items']) : [];
  return { items };
}
