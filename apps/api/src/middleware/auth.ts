import type { RequestHandler } from 'express';
import type { AdminRole } from '@behbehani-cpo/shared-types';
import { verifyAccessToken, type AccessTokenPayload } from '../auth/jwt';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AccessTokenPayload;
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
};

export function requireRole(...roles: AccessTokenPayload['role'][]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    next();
  };
}

/**
 * Admin-only RBAC. Pass the admin sub-roles allowed to access the route.
 * `super_admin` is implicit — it always passes.
 */
export function requireAdminRole(...allowed: AdminRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    const roles = req.user.adminRoles ?? [];
    if (roles.includes('super_admin')) {
      next();
      return;
    }
    if (allowed.length === 0 || allowed.some((r) => roles.includes(r))) {
      next();
      return;
    }
    res.status(403).json({ error: 'forbidden' });
  };
}
