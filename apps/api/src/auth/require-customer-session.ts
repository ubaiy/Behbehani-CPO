import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from './jwt';

/**
 * Customer-session middleware for public `/v1/public/me/*` routes.
 *
 * Locked in `CONCIERGE_INSPECTION_API_CONTRACT.md` v1.2.0 §4 (B owns) and
 * v1.2.1 §4.1 (signed off + envelope shape locked).
 *
 * Error envelope mirrors v1.0 §3 / v1.2.0 §5: `{ code, error }`. Status codes
 * locked per v1.2.0 §5.
 *
 * Usage from A's public controllers:
 *   meRouter.use(requireCustomerSession);
 *   // or per-route:
 *   meRouter.get('/saved-listings', requireCustomerSession, async (req, res) => {
 *     const customerId = req.customer!.id;
 *     ...
 *   });
 */

declare module 'express-serve-static-core' {
  interface Request {
    customer?: { id: string; role: 'customer'; sessionJti: string };
  }
}

export const requireCustomerSession: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ code: 'AUTH_REQUIRED', error: 'Authentication required' });
    return;
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    // jsonwebtoken throws TokenExpiredError specifically for `exp` past — map
    // that to the contract-specified 410, separate from generic 401 INVALID.
    if (err instanceof jwt.TokenExpiredError) {
      res.status(410).json({ code: 'TOKEN_EXPIRED', error: 'Session expired' });
      return;
    }
    res.status(401).json({ code: 'TOKEN_INVALID', error: 'Invalid token' });
    return;
  }

  if (payload.role !== 'customer') {
    res.status(403).json({ code: 'FORBIDDEN', error: 'Customer session required' });
    return;
  }

  req.customer = { id: payload.sub, role: 'customer', sessionJti: payload.sessionJti };
  next();
};
