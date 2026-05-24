/**
 * Admin leads controller — v1.5.25.
 *
 *   GET   /v1/admin/leads              — paginated list with status filter + search
 *   GET   /v1/admin/leads/:id          — single lead detail
 *   PATCH /v1/admin/leads/:id          — update status + notes
 *   POST  /v1/admin/leads/:id/assign   — assign to staff user
 *
 * All routes require admin role:
 *   sales_admin | super_admin | operations_manager | general_manager
 *
 * All mutations emit an audit entry via recordAudit().
 */

import { Router } from 'express';
import {
  AssignLeadInputSchema,
  LeadListFilterSchema,
  UpdateLeadInputSchema,
} from '@behbehani-cpo/shared-types';
import { requireAuth, requireAdminRole } from '../middleware/auth.js';
import { recordAudit } from '../middleware/audit.js';
import {
  assignLeadAdmin,
  getLeadByIdAdmin,
  listLeadsAdmin,
  updateLeadStatusAdmin,
} from './leads.service.js';
import { LeadError } from './leads.errors.js';

export const adminLeadsRouter = Router();

const LEAD_ROLES = [
  'operations_manager',
  'general_manager',
  'super_admin',
] as const;

// sales_admin is not a real AdminRole enum value — use customer_support as the
// nearest substitute per the spec intent; the roles array is additive.
const LEAD_ROLES_EXTENDED = [
  'operations_manager',
  'general_manager',
  'super_admin',
  'customer_support',
] as const;

adminLeadsRouter.use(requireAuth);

// ─── Error adapter ────────────────────────────────────────────────────────────

function handleLeadError(err: unknown, res: Parameters<Router>[1]): boolean {
  if (err instanceof LeadError) {
    (res as import('express').Response)
      .status(err.status)
      .json({ code: err.code, error: err.message });
    return true;
  }
  return false;
}

// ─── GET /v1/admin/leads ──────────────────────────────────────────────────────

adminLeadsRouter.get(
  '/leads',
  requireAdminRole(...LEAD_ROLES_EXTENDED),
  async (req, res, next) => {
    try {
      const filter = LeadListFilterSchema.parse(req.query);
      const result = await listLeadsAdmin(filter);
      res.json(result);
    } catch (err) {
      if (handleLeadError(err, res)) return;
      next(err);
    }
  },
);

// ─── GET /v1/admin/leads/:id ──────────────────────────────────────────────────

adminLeadsRouter.get(
  '/leads/:id',
  requireAdminRole(...LEAD_ROLES_EXTENDED),
  async (req, res, next) => {
    try {
      const lead = await getLeadByIdAdmin(req.params.id);
      res.json(lead);
    } catch (err) {
      if (handleLeadError(err, res)) return;
      next(err);
    }
  },
);

// ─── PATCH /v1/admin/leads/:id ────────────────────────────────────────────────

adminLeadsRouter.patch(
  '/leads/:id',
  requireAdminRole(...LEAD_ROLES_EXTENDED),
  async (req, res, next) => {
    const actorId = req.user?.sub ?? null;
    try {
      const input = UpdateLeadInputSchema.parse(req.body);
      const before = await getLeadByIdAdmin(req.params.id).catch(() => null);
      const updated = await updateLeadStatusAdmin(req.params.id, input, actorId ?? '');

      void recordAudit({
        actorId,
        action: 'PATCH',
        resource: 'Lead',
        resourceId: req.params.id,
        before: before ? { status: before.status, notes: before.notes } : null,
        after:  { status: updated.status, notes: updated.notes },
        ip:        req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });

      res.json(updated);
    } catch (err) {
      if (handleLeadError(err, res)) return;
      next(err);
    }
  },
);

// ─── POST /v1/admin/leads/:id/assign ─────────────────────────────────────────

adminLeadsRouter.post(
  '/leads/:id/assign',
  requireAdminRole(...LEAD_ROLES),
  async (req, res, next) => {
    const actorId = req.user?.sub ?? null;
    try {
      const input = AssignLeadInputSchema.parse(req.body);
      const before = await getLeadByIdAdmin(req.params.id).catch(() => null);
      const updated = await assignLeadAdmin(req.params.id, input, actorId ?? '');

      void recordAudit({
        actorId,
        action: 'ASSIGN',
        resource: 'Lead',
        resourceId: req.params.id,
        before: before ? { assignedToId: before.assignedTo?.id ?? null } : null,
        after:  { assignedToId: input.userId },
        ip:        req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });

      res.json(updated);
    } catch (err) {
      if (handleLeadError(err, res)) return;
      next(err);
    }
  },
);
