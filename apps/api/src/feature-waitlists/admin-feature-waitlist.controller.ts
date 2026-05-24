/**
 * Admin feature-waitlist endpoints — v1.5.13.
 *
 *   GET /v1/admin/feature-waitlists?featurePath=&search=&page=&pageSize=
 *   GET /v1/admin/feature-waitlists/export?featurePath=
 *
 * All routes require admin role:
 *   operations_manager | general_manager | super_admin
 *
 * Validation: query params are Zod-parsed; invalid input returns 422.
 */

import { Router } from 'express';
import { ZodError } from 'zod';
import {
  AdminFeatureWaitlistListFilterSchema,
  AdminFeatureWaitlistExportFilterSchema,
} from '@behbehani-cpo/shared-types';
import { requireAuth, requireAdminRole } from '../middleware/auth.js';
import {
  listFeatureWaitlistEntries,
  exportFeatureWaitlistCsv,
} from './admin-feature-waitlist.service.js';

export const adminFeatureWaitlistRouter = Router();

const WAITLIST_ROLES = [
  'operations_manager',
  'general_manager',
] as const;

// All routes in this router require an authenticated admin.
adminFeatureWaitlistRouter.use(requireAuth);

// ─── GET /v1/admin/feature-waitlists ─────────────────────────────────────────

adminFeatureWaitlistRouter.get(
  '/feature-waitlists',
  requireAdminRole(...WAITLIST_ROLES),
  async (req, res, next) => {
    try {
      const parseResult = AdminFeatureWaitlistListFilterSchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(422).json({
          code:   'VALIDATION_ERROR',
          error:  'Invalid query parameters',
          issues: parseResult.error.flatten().fieldErrors,
        });
        return;
      }
      const result = await listFeatureWaitlistEntries(parseResult.data);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/admin/feature-waitlists/export ──────────────────────────────────

adminFeatureWaitlistRouter.get(
  '/feature-waitlists/export',
  requireAdminRole(...WAITLIST_ROLES),
  async (req, res, next) => {
    try {
      const parseResult = AdminFeatureWaitlistExportFilterSchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(422).json({
          code:   'VALIDATION_ERROR',
          error:  'Invalid query parameters',
          issues: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { csv, capHit, rowCount } = await exportFeatureWaitlistCsv(parseResult.data);

      const featurePart = parseResult.data.featurePath
        ? parseResult.data.featurePath.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/^_+/, '')
        : 'all';
      const datePart = new Date().toISOString().slice(0, 10);
      const filename = `waitlist-${featurePart}-${datePart}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Row-Count', String(rowCount));

      if (capHit) {
        res.setHeader('X-Export-Cap-Hit', 'true');
        res.setHeader('X-Export-Cap-Limit', '10000');
      }

      res.status(200).send(csv);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(422).json({
          code:   'VALIDATION_ERROR',
          error:  'Invalid query parameters',
          issues: err.flatten().fieldErrors,
        });
        return;
      }
      next(err);
    }
  },
);
