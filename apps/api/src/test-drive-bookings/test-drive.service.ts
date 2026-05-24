/**
 * Test Drive Booking service — v1.5.29.
 *
 * Public surface:
 *   createTestDriveBookingFromPublic() — anonymous VDP booking
 *
 * Admin surface:
 *   listTestDriveBookingsAdmin()      — paginated list with status counts
 *   getTestDriveBookingByIdAdmin()    — single booking detail
 *   updateTestDriveBookingAdmin()     — status + scheduledAt + notes update (state machine enforced)
 *   assignTestDriveBookingAdmin()     — assign to a staff user
 *
 * State machine:
 *   requested → scheduled, cancelled
 *   scheduled → confirmed, cancelled
 *   confirmed → completed, no_show, cancelled
 *   completed, no_show, cancelled → (terminal)
 */

import type {
  CreateTestDriveBookingPublicInput,
  TestDriveBookingDto,
  TestDriveBookingListFilter,
  TestDriveBookingListResponse,
  TestDriveStatus,
  TestDriveStatusCounts,
  UpdateTestDriveBookingInput,
  AssignTestDriveBookingInput,
} from '@behbehani-cpo/shared-types';
import { TestDriveError } from './test-drive.errors.js';
import * as repo from './test-drive.repo.js';
import type { TestDriveBookingRow } from './test-drive.repo.js';

// ─── DTO mapper ───────────────────────────────────────────────────────────────

function toDto(row: TestDriveBookingRow): TestDriveBookingDto {
  return {
    id:              row.id,
    listing:         row.listing
      ? { id: row.listing.id, stockNumber: row.listing.stockNumber, titleEn: row.listing.titleEn }
      : null,
    customerName:    row.customerName,
    customerPhone:   row.customerPhone,
    customerEmail:   row.customerEmail,
    preferredDate:   row.preferredDate.toISOString().substring(0, 10),
    preferredWindow: row.preferredWindow as TestDriveStatus,
    location:        row.location as unknown as TestDriveBookingDto['location'],
    addressLine:     row.addressLine,
    customerNotes:   row.customerNotes,
    status:          row.status as TestDriveStatus,
    scheduledAt:     row.scheduledAt?.toISOString() ?? null,
    completedAt:     row.completedAt?.toISOString() ?? null,
    adminNotes:      row.adminNotes,
    assignedTo:      row.assignedTo
      ? { id: row.assignedTo.id, fullName: row.assignedTo.fullName, email: row.assignedTo.email }
      : null,
    idempotencyKey:  row.idempotencyKey,
    createdAt:       row.createdAt.toISOString(),
    updatedAt:       row.updatedAt.toISOString(),
  };
}

// ─── State machine ────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<TestDriveStatus, TestDriveStatus[]> = {
  requested: ['scheduled', 'cancelled'],
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  completed: [],
  no_show:   [],
  cancelled: [],
};

// ─── Status counts helper ─────────────────────────────────────────────────────

async function buildStatusCounts(): Promise<TestDriveStatusCounts> {
  const rows = await repo.groupCountByStatus();
  const counts: TestDriveStatusCounts = {
    requested: 0,
    scheduled: 0,
    confirmed: 0,
    completed: 0,
    no_show:   0,
    cancelled: 0,
  };
  for (const r of rows) {
    if (r.status in counts) {
      (counts as Record<string, number>)[r.status] = r.count;
    }
  }
  return counts;
}

// ─── Public surface ───────────────────────────────────────────────────────────

export async function createTestDriveBookingFromPublic(
  input: CreateTestDriveBookingPublicInput,
  ipAddress: string | null,
  userAgent: string | null,
  idempotencyKey: string,
): Promise<TestDriveBookingDto> {
  // Idempotency check: return existing booking if key already used
  const existing = await repo.findTestDriveBookingByIdempotencyKey(idempotencyKey);
  if (existing) {
    return toDto(existing);
  }

  // Service-side date validation: preferredDate >= tomorrow UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const preferred = new Date(input.preferredDate + 'T00:00:00Z');
  if (preferred < tomorrow) {
    throw new TestDriveError(422, 'Preferred date must be at least tomorrow', 'TEST_DRIVE_INVALID_DATE');
  }

  // Service-side address validation
  if (input.location === 'customer_address' && !input.addressLine?.trim()) {
    throw new TestDriveError(
      422,
      'Address is required when location is customer_address',
      'TEST_DRIVE_ADDRESS_REQUIRED',
    );
  }

  const row = await repo.createTestDriveBooking({
    listingId:       input.listingId ?? null,
    customerName:    input.customerName,
    customerPhone:   input.customerPhone,
    customerEmail:   input.customerEmail ?? null,
    preferredDate:   new Date(input.preferredDate + 'T00:00:00Z'),
    preferredWindow: input.preferredWindow,
    location:        input.location,
    addressLine:     input.addressLine ?? null,
    customerNotes:   input.customerNotes ?? null,
    status:          'requested',
    idempotencyKey,
    ipAddress,
    userAgent,
  });
  return toDto(row);
}

// ─── Admin surface ────────────────────────────────────────────────────────────

export async function listTestDriveBookingsAdmin(
  filter: TestDriveBookingListFilter,
): Promise<TestDriveBookingListResponse> {
  const [{ rows, total }, statusCounts] = await Promise.all([
    repo.listTestDriveBookings(filter),
    buildStatusCounts(),
  ]);
  return {
    items:        rows.map(toDto),
    total,
    page:         filter.page,
    pageSize:     filter.pageSize,
    statusCounts,
  };
}

export async function getTestDriveBookingByIdAdmin(
  id: string,
): Promise<TestDriveBookingDto> {
  const row = await repo.findTestDriveBookingById(id);
  if (!row) {
    throw new TestDriveError(404, 'Test drive booking not found', 'TEST_DRIVE_NOT_FOUND');
  }
  return toDto(row);
}

export async function updateTestDriveBookingAdmin(
  id: string,
  input: UpdateTestDriveBookingInput,
  _actorId: string,
): Promise<TestDriveBookingDto> {
  const row = await repo.findTestDriveBookingById(id);
  if (!row) {
    throw new TestDriveError(404, 'Test drive booking not found', 'TEST_DRIVE_NOT_FOUND');
  }

  const updateData: Record<string, unknown> = {};

  if (input.status !== undefined) {
    const currentStatus = row.status as TestDriveStatus;
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed.includes(input.status)) {
      throw new TestDriveError(
        409,
        `Cannot transition from "${currentStatus}" to "${input.status}"`,
        'TEST_DRIVE_INVALID_STATUS_TRANSITION',
      );
    }
    updateData['status'] = input.status;

    // scheduledAt is required when transitioning to 'scheduled'
    if (input.status === 'scheduled') {
      if (!input.scheduledAt) {
        throw new TestDriveError(
          422,
          'scheduledAt is required when transitioning to scheduled',
          'TEST_DRIVE_SCHEDULED_AT_REQUIRED',
        );
      }
      updateData['scheduledAt'] = new Date(input.scheduledAt);
    }

    // Auto-set completedAt when transitioning to 'completed'
    if (input.status === 'completed') {
      updateData['completedAt'] = new Date();
    }
  }

  if (input.scheduledAt !== undefined && input.status !== 'scheduled') {
    // Allow updating scheduledAt independently
    updateData['scheduledAt'] = input.scheduledAt ? new Date(input.scheduledAt) : null;
  }

  if (input.adminNotes !== undefined) {
    updateData['adminNotes'] = input.adminNotes;
  }

  const updated = await repo.updateTestDriveBooking(id, updateData);
  return toDto(updated);
}

export async function assignTestDriveBookingAdmin(
  id: string,
  input: AssignTestDriveBookingInput,
  _actorId: string,
): Promise<TestDriveBookingDto> {
  const [row, assignee] = await Promise.all([
    repo.findTestDriveBookingById(id),
    repo.findAdminUserById(input.userId),
  ]);

  if (!row) {
    throw new TestDriveError(404, 'Test drive booking not found', 'TEST_DRIVE_NOT_FOUND');
  }
  if (!assignee) {
    throw new TestDriveError(
      404,
      'Assignee admin user not found',
      'TEST_DRIVE_ASSIGNEE_NOT_FOUND',
    );
  }

  const updated = await repo.updateTestDriveBooking(id, { assignedToId: input.userId });
  return toDto(updated);
}
