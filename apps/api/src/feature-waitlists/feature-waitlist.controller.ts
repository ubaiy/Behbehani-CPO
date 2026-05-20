import { Router } from 'express';
import { FeatureWaitlistInputSchema } from '@behbehani-cpo/shared-types';
import { validateBody } from '../middleware/validate';
import { verifyAccessToken } from '../auth/jwt';
import { subscribe } from './feature-waitlist.service';

export const featureWaitlistRouter = Router();

/**
 * POST /feature-waitlists  (mounted at /v1/public in app.ts)
 *
 * Guest-allowed (no requireCustomerSession). Idempotent on (featurePath, email):
 *  - 201 { subscribed: true }                            when a new row was created
 *  - 200 { subscribed: false, alreadySubscribed: true }  when the pair already existed
 *
 * If the request carries a valid bearer token, the optional userId is
 * captured on the row. Otherwise the row is a guest subscription.
 *
 * Contract refs: CONCIERGE_INSPECTION_API_CONTRACT.md v1.3.4+ / v1.4.1 §5.
 */
featureWaitlistRouter.post(
  '/feature-waitlists',
  validateBody(FeatureWaitlistInputSchema),
  async (req, res, next) => {
    try {
      // Best-effort capture of the authenticated user if a bearer token is
      // present (but it is NOT required). Guests are first-class subscribers.
      let userId: string | null = null;
      const header = req.headers.authorization ?? '';
      const [scheme, token] = header.split(' ');
      if (scheme === 'Bearer' && token) {
        try {
          const payload = verifyAccessToken(token);
          if (payload.role === 'customer') {
            userId = payload.sub;
          }
        } catch {
          // Token invalid or expired — treat as guest, do not reject.
        }
      }

      const result = await subscribe(req.body, { userId });
      if (result.alreadySubscribed) {
        res.status(200).json({ subscribed: false, alreadySubscribed: true });
      } else {
        res.status(201).json({ subscribed: true });
      }
    } catch (err) {
      next(err);
    }
  },
);
