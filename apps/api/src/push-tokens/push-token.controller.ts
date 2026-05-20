import { Router } from 'express';
import { PushTokenInputSchema } from '@behbehani-cpo/shared-types';
import { validateBody } from '../middleware/validate';
import { requireCustomerSession } from '../auth/require-customer-session';
import { PushTokenError, registerToken, unregisterToken } from './push-token.service';

export const pushTokenRouter = Router();

pushTokenRouter.use(requireCustomerSession);

/**
 * POST /v1/public/notifications/push-token
 * Register a device for push notifications. Idempotent on token.
 *  - 201 { registered: true }                                  — brand-new token
 *  - 200 { registered: false, alreadyRegistered: true }        — same user re-registering
 *  - 409 { code: 'TOKEN_OWNED_BY_OTHER_USER', error: ... }    — token belongs to a different user
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.2 §3 + v1.4.3 §4.
 */
pushTokenRouter.post(
  '/notifications/push-token',
  validateBody(PushTokenInputSchema),
  async (req, res, next) => {
    try {
      const result = await registerToken(req.customer!.id, req.body);
      if (result.alreadyRegistered) {
        res.status(200).json({ registered: false, alreadyRegistered: true });
      } else {
        res.status(201).json({ registered: true });
      }
    } catch (err) {
      if (err instanceof PushTokenError) {
        res.status(409).json({ code: err.code, error: err.message });
        return;
      }
      next(err);
    }
  },
);

/**
 * DELETE /v1/public/notifications/push-token/:token
 * Unregister a device. Idempotent silent-204 per v1.4.3 §4 — succeeds even if
 * the token doesn't exist or belonged to another user (guards against race
 * conditions between auto-cleanup and client-driven revoke).
 */
pushTokenRouter.delete(
  '/notifications/push-token/:token',
  async (req, res, next) => {
    try {
      await unregisterToken(req.customer!.id, req.params.token);
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  },
);
