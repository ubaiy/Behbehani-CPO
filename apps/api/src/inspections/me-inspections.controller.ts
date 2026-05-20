/**
 * Customer inspection list endpoint — mounted in app.ts at /v1/public.
 *
 *   GET /v1/public/me/inspections?page=1&pageSize=20  — list customer's inspections
 *
 * Requires a valid customer session (Bearer JWT). Delegates to B's
 * `getInspectionsByCustomerId` export — concierge-only, latest-offer joined.
 *
 * Status codes (locked in v1.2.0 §5):
 *   AUTH_REQUIRED  → 401
 *   TOKEN_INVALID  → 401
 *   TOKEN_EXPIRED  → 410
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireCustomerSession } from '../auth/require-customer-session';
import { getInspectionsByCustomerId } from './inspections.service';

export const meInspectionsRouter = Router();

const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Lightweight pagination — accept page/pageSize as query strings, coerce to
// integers, clamp to sane defaults. Service layer re-clamps (max pageSize=100).
const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

meInspectionsRouter.get(
  '/me/inspections',
  requireCustomerSession,
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const { page, pageSize } = PaginationQuerySchema.parse(req.query);
      const result = await getInspectionsByCustomerId(req.customer!.id, { page, pageSize });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
