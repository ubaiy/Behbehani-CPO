import { Router } from 'express';
import {
  CreateInspectionSchema,
  InspectionFilterSchema,
  InspectionPhotoPresignSchema,
  SaveInspectionProgressSchema,
  SignoffSchema,
} from '@behbehani-cpo/shared-types';
import { requireAuth, requireAdminRole } from '../middleware/auth';
import { auditMutation, recordAudit } from '../middleware/audit';
import { validateBody } from '../middleware/validate';
import { presignPutUrl, publicUrl } from '../lib/s3';
import { env } from '../config/env';
import { randomUUID } from 'crypto';
import { InspectionError } from './inspections.errors';
import {
  listForAdmin,
  getForAdmin,
  createForAdmin,
  saveProgress,
  signoff,
  resendSignLink,
  revokeSignLink,
  inspectionToSummary,
  hydrateReportPhotoUrls,
  getKpiForAdmin,
} from './inspections.service';
import * as repo from './inspections.repo';

/**
 * Admin inspections router — mounted at /v1/admin/inspections.
 *
 * Role gating:
 *   READ  — inspection_officer, operations_manager, general_manager
 *   WRITE — inspection_officer (assigned), operations_manager
 *
 * Public-facing endpoints (POST /v1/public/concierge/inspections,
 * GET/POST /v1/public/inspection-sign/:token) are owned by session A and
 * live under apps/api/src/.../public-*.controller.ts. They call into the
 * `// public-shared` exports of inspections.service.ts.
 */
export const adminInspectionsRouter = Router();

const READ_ROLES = ['inspection_officer', 'operations_manager', 'general_manager'] as const;
const WRITE_ROLES = ['inspection_officer', 'operations_manager'] as const;

adminInspectionsRouter.use(requireAuth);
adminInspectionsRouter.use(auditMutation('admin.inspection'));

// ─── GET /v1/admin/inspections/kpi — per-status counts (full dataset) ──────
//
// The queue's KPI strip needs full-dataset counts, not page-1 counts. This
// endpoint is registered BEFORE the `/:id` route so Express's matcher picks
// it up correctly. v0.7 §4 item 4.

adminInspectionsRouter.get(
  '/kpi',
  requireAdminRole(...READ_ROLES),
  async (req, res, next) => {
    try {
      // Respect the kind filter so the KPI strip reflects what the user is
      // currently viewing (admin can toggle CPO vs Concierge).
      const filter = InspectionFilterSchema.partial().parse(req.query);
      const kpi = await getKpiForAdmin({ kind: filter.kind ?? null });
      res.json(kpi);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/admin/inspections — queue listing ─────────────────────────────

adminInspectionsRouter.get(
  '/',
  requireAdminRole(...READ_ROLES),
  async (req, res, next) => {
    try {
      const filter = InspectionFilterSchema.parse(req.query);
      const result = await listForAdmin(filter);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/admin/inspections/:id — full report ───────────────────────────

adminInspectionsRouter.get(
  '/:id',
  requireAdminRole(...READ_ROLES),
  async (req, res, next) => {
    try {
      const row = await getForAdmin(req.params.id);
      // Reuse the summary shape — the admin edit page derives the form state
      // from this DTO + the inline reportJson. A separate "detail" DTO can be
      // added later if the UI needs more than what summary exposes.
      const summary = inspectionToSummary(row);
      const reportJson = hydrateReportPhotoUrls(repo.readReportJson(row));
      res.json({ ...summary, reportJson });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /v1/admin/inspections — create CPO or Concierge (admin manual) ───

adminInspectionsRouter.post(
  '/',
  requireAdminRole(...WRITE_ROLES),
  validateBody(CreateInspectionSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as ReturnType<typeof CreateInspectionSchema.parse>;
      const result = await createForAdmin(dto, req.user!.sub, {
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /v1/admin/inspections/:id — save in-progress item scores ────────

adminInspectionsRouter.patch(
  '/:id',
  requireAdminRole(...WRITE_ROLES),
  validateBody(SaveInspectionProgressSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as ReturnType<typeof SaveInspectionProgressSchema.parse>;
      const updated = await saveProgress(req.params.id, dto, req.user!.sub, {
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      const summary = inspectionToSummary(updated);
      res.json({
        ...summary,
        reportJson: hydrateReportPhotoUrls(repo.readReportJson(updated)),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /v1/admin/inspections/:id/items/:itemId/photo/presign ────────────

adminInspectionsRouter.post(
  '/:id/items/:itemId/photo/presign',
  requireAdminRole(...WRITE_ROLES),
  validateBody(InspectionPhotoPresignSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as ReturnType<typeof InspectionPhotoPresignSchema.parse>;
      // Sanity check the inspection exists + isn't locked
      const row = await repo.findInspectionById(req.params.id);
      if (!row) {
        res.status(404).json({ error: 'Inspection not found' });
        return;
      }
      if (row.status === 'signed_off') {
        res.status(409).json({ error: 'Cannot upload photos to a signed-off inspection' });
        return;
      }
      // S3 key namespaced by inspection + item so cleanups can scope easily.
      const ext = extForContentType(dto.contentType);
      const key = `inspections/${req.params.id}/${req.params.itemId}/${randomUUID()}${ext}`;
      const presign = await presignPutUrl(key, dto.contentType, dto.byteSize);
      res.json({
        uploadUrl: presign.url,
        s3Key: key,
        publicUrl: publicUrl(key),
        expiresAt: presign.expiresAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

function extForContentType(ct: string): string {
  switch (ct) {
    case 'image/png':  return '.png';
    case 'image/webp': return '.webp';
    case 'image/heic': return '.heic';
    case 'image/jpeg':
    default:           return '.jpg';
  }
}

// ─── POST /v1/admin/inspections/:id/signoff ────────────────────────────────

adminInspectionsRouter.post(
  '/:id/signoff',
  requireAdminRole(...WRITE_ROLES),
  validateBody(SignoffSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as ReturnType<typeof SignoffSchema.parse>;
      const result = await signoff(req.params.id, dto, req.user!.sub, {
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /v1/admin/inspections/:id/resend-link ────────────────────────────

adminInspectionsRouter.post(
  '/:id/resend-link',
  requireAdminRole(...WRITE_ROLES),
  async (req, res, next) => {
    try {
      const result = await resendSignLink(req.params.id, req.user!.sub, {
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /v1/admin/inspections/:id/revoke-link ────────────────────────────

adminInspectionsRouter.post(
  '/:id/revoke-link',
  requireAdminRole(...WRITE_ROLES),
  async (req, res, next) => {
    try {
      await revokeSignLink(req.params.id, req.user!.sub, {
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ─── Local error adapter ───────────────────────────────────────────────────

adminInspectionsRouter.use(
  (
    err: unknown,
    _req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    if (err instanceof InspectionError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  },
);

/** Re-export for use in app.ts. */
export { env as _env };
