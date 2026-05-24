/**
 * Admin maintenance-request service — v1.5.12a.
 *
 * Provides three operations:
 *   listAllMaintenanceRequests — paginated, filterable, with per-status counts
 *   getAdminMaintenanceRequestDetail — single row, no ownership check
 *   updateAdminMaintenanceRequest — PATCH status/adminNotes/scheduledFor
 *
 * State-machine transitions enforced here (same as shared-types docs):
 *   pending_review → { scheduled, cancelled }
 *   scheduled      → { in_progress, cancelled }
 *   in_progress    → { completed, cancelled }
 *   completed      → terminal
 *   cancelled      → terminal
 */

import type {
  AdminMaintenanceRequestDetailDto,
  AdminMaintenanceRequestListResponseDto,
  AdminMaintenanceRequestSummaryDto,
  AdminMaintenanceListQueryDto,
  AdminMaintenanceErrorCode,
  MaintenanceStatusCounts,
  UpdateMaintenanceRequestStatusInput,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma.js';

// ─── Domain error ─────────────────────────────────────────────────────────────

export class AdminMaintenanceError extends Error {
  constructor(
    public readonly code: AdminMaintenanceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminMaintenanceError';
  }
}

// ─── State machine ────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_review: ['scheduled', 'cancelled'],
  scheduled:      ['in_progress', 'cancelled'],
  in_progress:    ['completed', 'cancelled'],
  completed:      [],
  cancelled:      [],
};

// ─── DTO mapper ───────────────────────────────────────────────────────────────

type RawMaintenanceRow = {
  id:                  string;
  vehicleListingId:    string | null;
  vehicleFreeText:     string | null;
  governorate:         string;
  pickupAddressLine:   string;
  preferredWindow:     string;
  preferredDate:       Date;
  concernCategory:     string;
  concernNotes:        string;
  status:              string;
  adminNotes:          string | null;
  scheduledFor:        Date | null;
  cancellationReason:  string | null;
  createdAt:           Date;
  updatedAt:           Date;
  user: {
    id:       string;
    fullName: string;
    mobile:   string | null;
    email:    string | null;
  };
  vehicleListing: {
    id:          string;
    stockNumber: string;
  } | null;
};

function toSummaryDto(row: RawMaintenanceRow): AdminMaintenanceRequestSummaryDto {
  return {
    id:                row.id,
    customer: {
      id:       row.user.id,
      fullName: row.user.fullName,
      mobile:   row.user.mobile,
      email:    row.user.email,
    },
    vehicleListingId:   row.vehicleListingId,
    vehicleListing:     row.vehicleListing
      ? { id: row.vehicleListing.id, stockNumber: row.vehicleListing.stockNumber }
      : null,
    vehicleFreeText:    row.vehicleFreeText,
    governorate:        row.governorate as AdminMaintenanceRequestSummaryDto['governorate'],
    pickupAddressLine:  row.pickupAddressLine,
    preferredWindow:    row.preferredWindow as AdminMaintenanceRequestSummaryDto['preferredWindow'],
    preferredDate:      row.preferredDate.toISOString().slice(0, 10),
    concernCategory:    row.concernCategory as AdminMaintenanceRequestSummaryDto['concernCategory'],
    concernNotes:       row.concernNotes,
    status:             row.status as AdminMaintenanceRequestSummaryDto['status'],
    adminNotes:         row.adminNotes,
    scheduledFor:       row.scheduledFor?.toISOString() ?? null,
    cancellationReason: row.cancellationReason,
    createdAt:          row.createdAt.toISOString(),
    updatedAt:          row.updatedAt.toISOString(),
  };
}

const USER_SELECT = {
  id:       true,
  fullName: true,
  mobile:   true,
  email:    true,
} as const;

const VEHICLE_LISTING_SELECT = {
  id:          true,
  stockNumber: true,
} as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Admin paginated list of all maintenance requests.
 * Optional filters: status enum, full-text search (customer name/mobile/email).
 * Response includes statusCounts across ALL rows (not just the filtered page).
 */
export async function listAllMaintenanceRequests(
  query: AdminMaintenanceListQueryDto,
): Promise<AdminMaintenanceRequestListResponseDto> {
  const page     = Math.max(1, query.page);
  const pageSize = Math.max(1, Math.min(100, query.pageSize));

  // Build search filter
  const searchClause = query.search
    ? {
        user: {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' as const } },
            { mobile:   { contains: query.search, mode: 'insensitive' as const } },
            { email:    { contains: query.search, mode: 'insensitive' as const } },
          ],
        },
      }
    : {};

  const statusClause = query.status ? { status: query.status } : {};

  const where = {
    ...statusClause,
    ...searchClause,
  };

  const [rows, total] = await Promise.all([
    prisma.maintenanceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      include: {
        user:           { select: USER_SELECT },
        vehicleListing: { select: VEHICLE_LISTING_SELECT },
      },
    }),
    prisma.maintenanceRequest.count({ where }),
  ]);

  // Status counts across ALL rows (no search/status filter applied)
  const statusCountRows = await prisma.maintenanceRequest.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  const statusCounts: MaintenanceStatusCounts = {
    pending_review: 0,
    scheduled:      0,
    in_progress:    0,
    completed:      0,
    cancelled:      0,
  };
  for (const row of statusCountRows) {
    const key = row.status as keyof MaintenanceStatusCounts;
    if (key in statusCounts) {
      statusCounts[key] = row._count._all;
    }
  }

  return {
    items:    rows.map((r) => toSummaryDto(r as unknown as RawMaintenanceRow)),
    total,
    page,
    pageSize,
    statusCounts,
  };
}

/**
 * Single maintenance request detail. No ownership check (admin reads any row).
 */
export async function getAdminMaintenanceRequestDetail(
  id: string,
): Promise<AdminMaintenanceRequestDetailDto> {
  const row = await prisma.maintenanceRequest.findUnique({
    where:   { id },
    include: {
      user:           { select: USER_SELECT },
      vehicleListing: { select: VEHICLE_LISTING_SELECT },
    },
  });
  if (!row) {
    throw new AdminMaintenanceError(
      'MAINTENANCE_REQUEST_NOT_FOUND',
      'Maintenance request not found',
    );
  }
  return toSummaryDto(row as unknown as RawMaintenanceRow);
}

/**
 * Admin PATCH — update status, adminNotes, scheduledFor, cancellationReason.
 * Enforces state-machine transition guard before writing.
 */
export async function updateAdminMaintenanceRequest(
  id: string,
  input: UpdateMaintenanceRequestStatusInput,
): Promise<AdminMaintenanceRequestDetailDto> {
  const existing = await prisma.maintenanceRequest.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) {
    throw new AdminMaintenanceError(
      'MAINTENANCE_REQUEST_NOT_FOUND',
      'Maintenance request not found',
    );
  }

  // Enforce state-machine transition when status is changing
  if (input.status !== undefined && input.status !== existing.status) {
    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new AdminMaintenanceError(
        'MAINTENANCE_INVALID_STATUS_TRANSITION',
        `Cannot transition from ${existing.status} to ${input.status}`,
      );
    }
  }

  const data: Record<string, unknown> = {};

  if (input.status !== undefined) {
    data['status'] = input.status;
  }
  if (input.adminNotes !== undefined) {
    data['adminNotes'] = input.adminNotes;
  }
  if (input.scheduledFor !== undefined) {
    data['scheduledFor'] = input.scheduledFor != null ? new Date(input.scheduledFor) : null;
  }
  if (input.cancellationReason !== undefined) {
    data['cancellationReason'] = input.cancellationReason;
  }

  const updated = await prisma.maintenanceRequest.update({
    where:   { id },
    data,
    include: {
      user:           { select: USER_SELECT },
      vehicleListing: { select: VEHICLE_LISTING_SELECT },
    },
  });

  return toSummaryDto(updated as unknown as RawMaintenanceRow);
}

// ─── HTTP error mapper ────────────────────────────────────────────────────────

export function mapAdminMaintenanceErrorToStatus(
  code: AdminMaintenanceErrorCode,
): number {
  switch (code) {
    case 'MAINTENANCE_REQUEST_NOT_FOUND':        return 404;
    case 'MAINTENANCE_INVALID_STATUS_TRANSITION': return 409;
    default:                                      return 400;
  }
}
