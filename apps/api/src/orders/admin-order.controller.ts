import { Router } from 'express';
import {
  AdminOrderCancelSchema,
  AdminOrderListQuerySchema,
  AdminOrderStatusUpdateSchema,
} from '@behbehani-cpo/shared-types';
import { validateBody } from '../middleware/validate';
import { requireAuth, requireAdminRole } from '../middleware/auth';
import {
  AdminOrderError,
  cancelOrderAsAdmin,
  getAdminOrderDetail,
  listAllOrders,
  updateOrderStatus,
} from './admin-order.service';

export const adminOrderRouter = Router();

adminOrderRouter.use(requireAuth);

function mapAdminOrderErrorToStatus(code: AdminOrderError['code']): number {
  switch (code) {
    case 'ORDER_NOT_FOUND':           return 404;
    case 'INVALID_STATUS_TRANSITION': return 409;
    case 'ORDER_ALREADY_TERMINAL':    return 409;
    default:                          return 400;
  }
}

/** GET /v1/admin/orders?status=&customerId=&page=&pageSize= */
adminOrderRouter.get('/orders', requireAdminRole(), async (req, res, next) => {
  try {
    const query = AdminOrderListQuerySchema.parse(req.query);
    const result = await listAllOrders(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** GET /v1/admin/orders/:id */
adminOrderRouter.get('/orders/:id', requireAdminRole(), async (req, res, next) => {
  try {
    const result = await getAdminOrderDetail(req.params.id);
    res.json(result);
  } catch (err) {
    if (err instanceof AdminOrderError) {
      res.status(mapAdminOrderErrorToStatus(err.code)).json({ code: err.code, error: err.message });
      return;
    }
    next(err);
  }
});

/** POST /v1/admin/orders/:id/cancel */
adminOrderRouter.post(
  '/orders/:id/cancel',
  requireAdminRole(),
  validateBody(AdminOrderCancelSchema),
  async (req, res, next) => {
    try {
      const result = await cancelOrderAsAdmin(req.user!.sub, req.params.id, req.body);
      res.json(result);
    } catch (err) {
      if (err instanceof AdminOrderError) {
        res.status(mapAdminOrderErrorToStatus(err.code)).json({ code: err.code, error: err.message });
        return;
      }
      next(err);
    }
  },
);

/** POST /v1/admin/orders/:id/status */
adminOrderRouter.post(
  '/orders/:id/status',
  requireAdminRole(),
  validateBody(AdminOrderStatusUpdateSchema),
  async (req, res, next) => {
    try {
      const result = await updateOrderStatus(req.user!.sub, req.params.id, req.body);
      res.json(result);
    } catch (err) {
      if (err instanceof AdminOrderError) {
        res.status(mapAdminOrderErrorToStatus(err.code)).json({ code: err.code, error: err.message });
        return;
      }
      next(err);
    }
  },
);
