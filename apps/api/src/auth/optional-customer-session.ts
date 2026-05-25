import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from './jwt';

/**
 * v1.5.34 — `optionalCustomerSession` middleware.
 *
 * Sibling to `requireCustomerSession` for endpoints that are *anonymous by
 * default* but want to opportunistically link the request to a signed-in
 * customer if a valid Bearer token happens to be sent.
 *
 * Closes the forward half of A v1.5-D19 [ASK A→B-7]: a signed-in customer
 * who submits the /sell concierge wizard should have the resulting
 * InspectionReport linked to their user-id at create-time, not orphaned to a
 * ghost row.
 *
 * Behaviour vs `requireCustomerSession`:
 *   - No header / wrong scheme  → `req.customer = undefined`, next().
 *   - Header present + token invalid / expired → `req.customer = undefined`,
 *     next() (we deliberately DO NOT 401 — the route is anonymous-friendly,
 *     a busted token shouldn't break the public flow).
 *   - Header present + token valid + role!=customer → `req.customer = undefined`,
 *     next() (admin tokens are ignored on customer-facing public routes).
 *   - Header present + token valid + role=customer → `req.customer = {id, ...}`,
 *     next().
 *
 * The `req.customer` ambient typing is already declared in
 * `require-customer-session.ts`, so we just populate it here.
 */
export const optionalCustomerSession: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.role === 'customer') {
      req.customer = { id: payload.sub, role: 'customer', sessionJti: payload.sessionJti };
    }
  } catch (err) {
    // Token bad/expired — swallow and continue anonymous. We do NOT 401 here
    // because this is an opt-in linkage, not a gated route.
    if (!(err instanceof jwt.JsonWebTokenError) && !(err instanceof jwt.TokenExpiredError)) {
      // Unknown error class — re-throw so the global handler logs it. Real
      // jwt errors are expected/benign on a public route.
      throw err;
    }
  }

  next();
};
