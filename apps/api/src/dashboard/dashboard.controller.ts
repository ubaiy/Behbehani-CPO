import { Router } from 'express';
import { requireAuth, requireAdminRole } from '../middleware/auth';
import { DASHBOARD_READ_ROLES as DASHBOARD_ROLES } from '../auth/role-groups';
import { getDashboardKpis } from './dashboard.service';
import { DashboardError } from './dashboard.errors';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  '/kpis',
  requireAdminRole(...DASHBOARD_ROLES),
  async (req, res, next) => {
    try {
      const dto = await getDashboardKpis(req.user!);
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
