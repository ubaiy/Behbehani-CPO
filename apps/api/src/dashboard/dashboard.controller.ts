import { Router } from 'express';
import { requireAuth, requireAdminRole } from '../middleware/auth';
import { DASHBOARD_READ_ROLES as DASHBOARD_ROLES } from '../auth/role-groups';
import { getDashboardKpis } from './dashboard.service';
import { DashboardError } from './dashboard.errors';
import type { DashboardKpisDto } from '@behbehani-cpo/shared-types';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

// ─── 60-second in-memory KPI cache ───────────────────────────────────────────
// Keyed by userId so each admin sees their role-personalised projection,
// but heavy aggregation queries don't hammer the DB on every page refresh.

const KPI_CACHE_TTL_MS = 60_000;
const kpiCache = new Map<string, { dto: DashboardKpisDto; expiresAt: number }>();

dashboardRouter.get(
  '/kpis',
  requireAdminRole(...DASHBOARD_ROLES),
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const cached = kpiCache.get(userId);
      if (cached && cached.expiresAt > Date.now()) {
        res.json(cached.dto);
        return;
      }
      const dto = await getDashboardKpis(req.user!);
      kpiCache.set(userId, { dto, expiresAt: Date.now() + KPI_CACHE_TTL_MS });
      res.json(dto);
    } catch (err) {
      next(err);
    }
  },
);

dashboardRouter.use(
  (
    err: unknown,
    _req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    if (err instanceof DashboardError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  },
);
