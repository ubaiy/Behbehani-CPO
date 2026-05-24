/**
 * Maintenance pickup requests — service layer.
 *
 * v1.5.7 — customer maintenance pickup capture per SRS §3.22.
 *
 * All queries are ownership-checked: rows belonging to a different userId
 * return MAINTENANCE_REQUEST_NOT_FOUND (not 403) to avoid leaking existence.
 *
 * Status semantics:
 *   open   → pending_review | scheduled | in_progress
 *   closed → completed | cancelled
 */

import type {
  CreateMaintenanceRequestInput,
  MaintenanceRequestDto,
  MaintenanceRequestErrorCode,
  MaintenanceRequestListResponse,
  UpdateMaintenanceRequestInput,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

// ─── Domain error ─────────────────────────────────────────────────────────────

export class MaintenanceRequestError extends Error {
  constructor(
    public readonly code: MaintenanceRequestErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MaintenanceRequestError';
  }
}

// ─── Status filter helpers ────────────────────────────────────────────────────

type StatusFilter = 'open' | 'closed' | undefined;

const OPEN_STATUSES  = ['pending_review', 'scheduled', 'in_progress'] as const;
const CLOSED_STATUSES = ['completed', 'cancelled'] as const;

function buildStatusWhere(statusFilter: StatusFilter) {
  if (statusFilter === 'open') {
    return { status: { in: [...OPEN_STATUSES] as string[] } };
  }
  if (statusFilter === 'closed') {
    return { status: { in: [...CLOSED_STATUSES] as string[] } };
  }
  return {};
}

// ─── DTO mapper ───────────────────────────────────────────────────────────────

function toDto(row: {
  id:               string;
  userId:           string;
  vehicleListingId: string | null;
  vehicleFreeText:  string | null;
  governorate:      string;
  pickupAddressLine: string;
  preferredWindow:  string;
  preferredDate:    Date;
  concernCategory:  string;
  concernNotes:     string;
  status:           string;
  adminNotes:       string | null;
  scheduledFor:     Date | null;
  createdAt:        Date;
  updatedAt:        Date;
}): MaintenanceRequestDto {
  return {
    id:               row.id,
    customerId:       row.userId,
    vehicleListingId: row.vehicleListingId,
    vehicleFreeText:  row.vehicleFreeText,
    governorate:      row.governorate as MaintenanceRequestDto['governorate'],
    pickupAddressLine: row.pickupAddressLine,
    preferredWindow:  row.preferredWindow as MaintenanceRequestDto['preferredWindow'],
    // preferredDate is a Date-only column — serialize as YYYY-MM-DD
    preferredDate:    row.preferredDate.toISOString().slice(0, 10),
    concernCategory:  row.concernCategory as MaintenanceRequestDto['concernCategory'],
    concernNotes:     row.concernNotes,
    status:           row.status as MaintenanceRequestDto['status'],
    adminNotes:       row.adminNotes,
    scheduledFor:     row.scheduledFor?.toISOString() ?? null,
    createdAt:        row.createdAt.toISOString(),
    updatedAt:        row.updatedAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Paginated list of a customer's maintenance requests, newest first.
 * Optional status filter: 'open' (pending_review|scheduled|in_progress)
 * or 'closed' (completed|cancelled).
 */
export async function listMaintenanceRequests(
  userId: string,
  filter: { page: number; pageSize: number; status?: StatusFilter },
): Promise<MaintenanceRequestListResponse> {
  const page     = Math.max(1, Math.floor(filter.page));
  const pageSize = Math.max(1, Math.min(100, Math.floor(filter.pageSize)));

  const where = {
    userId,
    ...buildStatusWhere(filter.status),
  };

  const [rows, total] = await Promise.all([
    prisma.maintenanceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.maintenanceRequest.count({ where }),
  ]);

  return {
    items: rows.map(toDto),
    total,
    page,
    pageSize,
  };
}

/**
 * Single request detail. Ownership-checked.
 */
export async function getMaintenanceRequest(
  id: string,
  userId: string,
): Promise<MaintenanceRequestDto> {
  const row = await prisma.maintenanceRequest.findFirst({ where: { id, userId } });
  if (!row) {
    throw new MaintenanceRequestError(
      'MAINTENANCE_REQUEST_NOT_FOUND',
      'Maintenance request not found',
    );
  }
  return toDto(row);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a new maintenance pickup request.
 * If idempotencyKey is supplied and a matching row already exists for this
 * user, the existing row is returned (idempotent POST per Saved Searches pattern).
 */
export async function createMaintenanceRequest(
  userId: string,
  input: CreateMaintenanceRequestInput,
  idempotencyKey?: string | null,
): Promise<MaintenanceRequestDto> {
  // Idempotency check — same key + same user → return existing row.
  if (idempotencyKey) {
    const existing = await prisma.maintenanceRequest.findFirst({
      where: { idempotencyKey, userId },
    });
    if (existing) return toDto(existing);
  }

  const row = await prisma.maintenanceRequest.create({
    data: {
      userId,
      vehicleListingId:  input.vehicleListingId ?? null,
      vehicleFreeText:   input.vehicleFreeText  ?? null,
      governorate:       input.governorate as never,
      pickupAddressLine: input.pickupAddressLine,
      preferredWindow:   input.preferredWindow  as never,
      preferredDate:     new Date(input.preferredDate),
      concernCategory:   input.concernCategory  as never,
      concernNotes:      input.concernNotes,
      idempotencyKey:    idempotencyKey ?? null,
    },
  });

  return toDto(row);
}

/**
 * Partial update of a maintenance request.
 * Only allowed when status is `pending_review`. Throws
 * MAINTENANCE_REQUEST_NOT_EDITABLE if the request has been scheduled or later.
 */
export async function updateMaintenanceRequest(
  id: string,
  userId: string,
  input: UpdateMaintenanceRequestInput,
): Promise<MaintenanceRequestDto> {
  const existing = await prisma.maintenanceRequest.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new MaintenanceRequestError(
      'MAINTENANCE_REQUEST_NOT_FOUND',
      'Maintenance request not found',
    );
  }

  const editableStatuses: string[] = ['pending_review'];
  if (!editableStatuses.includes(existing.status)) {
    throw new MaintenanceRequestError(
      'MAINTENANCE_REQUEST_NOT_EDITABLE',
      'Maintenance request cannot be edited once scheduled',
    );
  }

  const updated = await prisma.maintenanceRequest.update({
    where: { id },
    data:  {
      ...(input.pickupAddressLine !== undefined && { pickupAddressLine: input.pickupAddressLine }),
      ...(input.preferredWindow   !== undefined && { preferredWindow: input.preferredWindow as never }),
      ...(input.preferredDate     !== undefined && { preferredDate: new Date(input.preferredDate) }),
      ...(input.concernCategory   !== undefined && { concernCategory: input.concernCategory as never }),
      ...(input.concernNotes      !== undefined && { concernNotes: input.concernNotes }),
    },
  });

  return toDto(updated);
}

/**
 * Cancel (delete) a maintenance request. Only allowed when status is
 * `pending_review`. Throws MAINTENANCE_REQUEST_NOT_CANCELLABLE otherwise.
 */
export async function deleteMaintenanceRequest(
  id: string,
  userId: string,
): Promise<void> {
  const existing = await prisma.maintenanceRequest.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new MaintenanceRequestError(
      'MAINTENANCE_REQUEST_NOT_FOUND',
      'Maintenance request not found',
    );
  }

  if (existing.status !== 'pending_review') {
    throw new MaintenanceRequestError(
      'MAINTENANCE_REQUEST_NOT_CANCELLABLE',
      'Only pending_review requests can be cancelled',
    );
  }

  await prisma.maintenanceRequest.delete({ where: { id } });
}

// ─── HTTP-mapping helper ──────────────────────────────────────────────────────

export function mapMaintenanceRequestErrorToHttp(err: MaintenanceRequestError): {
  status: number;
  body: { code: MaintenanceRequestErrorCode; error: string };
} {
  const statusByCode: Record<MaintenanceRequestErrorCode, number> = {
    MAINTENANCE_REQUEST_NOT_FOUND:        404,
    MAINTENANCE_REQUEST_NOT_CANCELLABLE:  409,
    MAINTENANCE_REQUEST_NOT_EDITABLE:     409,
  };
  return {
    status: statusByCode[err.code],
    body:   { code: err.code, error: err.message },
  };
}
