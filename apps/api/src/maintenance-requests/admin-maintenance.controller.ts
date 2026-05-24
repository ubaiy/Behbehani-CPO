/**
 * Admin maintenance-request endpoints — v1.5.12a.
 *
 *   GET   /v1/admin/maintenance-requests?status=&page=&pageSize=&search=
 *   GET   /v1/admin/maintenance-requests/:id
 *   PATCH /v1/admin/maintenance-requests/:id
 *
 * All routes require admin role:
 *   operations_manager | maintenance_coordinator | general_manager | super_admin
 *
 * Error envelope: { code, error } — consistent with admin-order.controller.ts.
 */

import { Router } from 'express';
import {
  AdminMaintenanceListQuerySchema,
  UpdateMaintenanceRequestStatusInputSchema,
} from '@behbehani-cpo/shared-types';
import { requireAuth, requireAdminRole } from '../middleware/auth.js';
import {
  AdminMaintenanceError,
  getAdminMaintenanceRequestDetail,
  listAllMaintenanceRequests,
  mapAdminMaintenanceErrorToStatus,
  updateAdminMaintenanceRequest,
} from './admin-maintenance.service.js';

export const adminMaintenanceRouter = Router();

const MAINTENANCE_ROLES = [
  'operations_manager',
  'maintenance_coordinator',
  'general_manager',
] as const;

adminMaintenanceRouter.use(requireAuth);

// ─── GET /v1/admin/maintenance-requests ──────────────────────────────────────

adminMaintenanceRouter.get(
  '/maintenance-requests',
  requireAdminRole(...MAINTENANCE_ROLES),
  async (req, res, next) => {
    try {
      const query = AdminMaintenanceListQuerySchema.parse(req.query);
      const result = await listAllMaintenanceRequests(query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/admin/maintenance-requests/:id ───────────────────────────────────

adminMaintenanceRouter.get(
  '/maintenance-requests/:id',
  requireAdminRole(...MAINTENANCE_ROLES),
  async (req, res, next) => {
    try {
      const result = await getAdminMaintenanceRequestDetail(req.params.id);
      res.json(result);
    } catch (err) {
      if (err instanceof AdminMaintenanceError) {
        res
          .status(mapAdminMaintenanceErrorToStatus(err.code))
          .json({ code: err.code, error: err.message });
        return;
      }
      next(err);
    }
  },
);

// ─── PATCH /v1/admin/maintenance-requests/:id ─────────────────────────────────

adminMaintenanceRouter.patch(
  '/maintenance-requests/:id',
  requireAdminRole(...MAINTENANCE_ROLES),
  async (req, res, next) => {
    try {
      const input = UpdateMaintenanceRequestStatusInputSchema.parse(req.body);
      const result = await updateAdminMaintenanceRequest(req.params.id, input);
      res.json(result);
    } catch (err) {
      if (err instanceof AdminMaintenanceError) {
        res
          .status(mapAdminMaintenanceErrorToStatus(err.code))
          .json({ code: err.code, error: err.message });
        return;
      }
      next(err);
    }
  },
);
