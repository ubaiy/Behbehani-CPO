/**
 * Admin test drive bookings controller — v1.5.29.
 *
 *   GET   /v1/admin/test-drive-bookings          — paginated list with status filter + search
 *   GET   /v1/admin/test-drive-bookings/:id       — single booking detail
 *   PATCH /v1/admin/test-drive-bookings/:id       — update status + scheduledAt + adminNotes
 *   POST  /v1/admin/test-drive-bookings/:id/assign — assign to staff user
 *
 * All routes require admin role:
 *   operations_manager | sales_admin | general_manager | super_admin
 *
 * All mutations emit an audit entry via recordAudit().
 */

import { Router } from 'express';
import {
  AssignTestDriveBookingInputSchema,
  TestDriveBookingListFilterSchema,
  UpdateTestDriveBookingInputSchema,
} from '@behbehani-cpo/shared-types';
import { requireAuth, requireAdminRole } from '../middleware/auth.js';
import { recordAudit } from '../middleware/audit.js';
import {
  assignTestDriveBookingAdmin,
  getTestDriveBookingByIdAdmin,
  listTestDriveBookingsAdmin,
  updateTestDriveBookingAdmin,
} from './test-drive.service.js';
import { TestDriveError } from './test-drive.errors.js';

export const adminTestDriveRouter = Router();

const TEST_DRIVE_ROLES = [
  'operations_manager',
  'general_manager',
  'super_admin',
  'customer_support',
] as const;

adminTestDriveRouter.use(requireAuth);

// ─── Error adapter ────────────────────────────────────────────────────────────

function handleTestDriveError(
  err: unknown,
  res: Parameters<Router>[1],
): boolean {
  if (err instanceof TestDriveError) {
    (res as import('express').Response)
      .status(err.status)
      .json({ code: err.code, error: err.message });
    return true;
  }
  return false;
}

// ─── GET /v1/admin/test-drive-bookings ───────────────────────────────────────

adminTestDriveRouter.get(
  '/test-drive-bookings',
  requireAdminRole(...TEST_DRIVE_ROLES),
  async (req, res, next) => {
    try {
      const filter = TestDriveBookingListFilterSchema.parse(req.query);
      const result = await listTestDriveBookingsAdmin(filter);
      res.json(result);
    } catch (err) {
      if (handleTestDriveError(err, res)) return;
      next(err);
    }
  },
);

// ─── GET /v1/admin/test-drive-bookings/:id ───────────────────────────────────

adminTestDriveRouter.get(
  '/test-drive-bookings/:id',
  requireAdminRole(...TEST_DRIVE_ROLES),
  async (req, res, next) => {
    try {
      const booking = await getTestDriveBookingByIdAdmin(req.params.id);
      res.json(booking);
    } catch (err) {
      if (handleTestDriveError(err, res)) return;
      next(err);
    }
  },
);

// ─── PATCH /v1/admin/test-drive-bookings/:id ─────────────────────────────────

adminTestDriveRouter.patch(
  '/test-drive-bookings/:id',
  requireAdminRole(...TEST_DRIVE_ROLES),
  async (req, res, next) => {
    const actorId = req.user?.sub ?? null;
    try {
      const input = UpdateTestDriveBookingInputSchema.parse(req.body);
      const before = await getTestDriveBookingByIdAdmin(req.params.id).catch(() => null);
      const updated = await updateTestDriveBookingAdmin(
        req.params.id,
        input,
        actorId ?? '',
      );

      void recordAudit({
        actorId,
        action: 'PATCH',
        resource: 'TestDriveBooking',
        resourceId: req.params.id,
        before: before
          ? { status: before.status, scheduledAt: before.scheduledAt, adminNotes: before.adminNotes }
          : null,
        after: {
          status:      updated.status,
          scheduledAt: updated.scheduledAt,
          adminNotes:  updated.adminNotes,
        },
        ip:        req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });

      res.json(updated);
    } catch (err) {
      if (handleTestDriveError(err, res)) return;
      next(err);
    }
  },
);

// ─── POST /v1/admin/test-drive-bookings/:id/assign ───────────────────────────

adminTestDriveRouter.post(
  '/test-drive-bookings/:id/assign',
  requireAdminRole(...TEST_DRIVE_ROLES),
  async (req, res, next) => {
    const actorId = req.user?.sub ?? null;
    try {
      const input = AssignTestDriveBookingInputSchema.parse(req.body);
      const before = await getTestDriveBookingByIdAdmin(req.params.id).catch(() => null);
      const updated = await assignTestDriveBookingAdmin(
        req.params.id,
        input,
        actorId ?? '',
      );

      void recordAudit({
        actorId,
        action: 'ASSIGN',
        resource: 'TestDriveBooking',
        resourceId: req.params.id,
        before: before ? { assignedToId: before.assignedTo?.id ?? null } : null,
        after:  { assignedToId: input.userId },
        ip:        req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });

      res.json(updated);
    } catch (err) {
      if (handleTestDriveError(err, res)) return;
      next(err);
    }
  },
);
