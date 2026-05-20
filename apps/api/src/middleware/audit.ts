import type { RequestHandler } from 'express';
import { prisma } from '../db/prisma';

/**
 * Append-only audit log (FR-ADM-021).
 *
 * Use `recordAudit` directly from services when you have the before/after
 * snapshots in hand, or `auditMutation(resource)` as Express middleware for
 * a coarse capture (no body diff).
 */

export interface AuditInput {
  actorId: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        before: (input.before as object | null) ?? undefined,
        after: (input.after as object | null) ?? undefined,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    // Audit failures must never break a successful request. Log and move on;
    // operational alerting picks these up.
    // eslint-disable-next-line no-console
    console.error('[audit] failed to persist entry', err);
  }
}

/**
 * Express middleware that records *every* non-GET request hitting the route
 * it's mounted on. Useful as a backstop on admin routers; service-level
 * `recordAudit` calls give finer detail with before/after snapshots.
 */
export function auditMutation(resource: string): RequestHandler {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
      next();
      return;
    }
    res.on('finish', () => {
      if (res.statusCode >= 400) return; // only audit successful mutations
      void recordAudit({
        actorId: req.user?.sub ?? null,
        action: req.method,
        resource,
        resourceId: typeof req.params.id === 'string' ? req.params.id : null,
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
    });
    next();
  };
}
