import { Router } from 'express';
import {
  AdminDocumentFinalizeSchema,
  AdminDocumentListQuerySchema,
  AdminDocumentUploadUrlRequestSchema,
} from '@behbehani-cpo/shared-types';
import { requireAuth, requireAdminRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  AdminDocumentError,
  finalizeAdminUpload,
  issueAdminUploadUrl,
  listCustomerDocuments,
} from './admin-document.service';

/**
 * Admin document router — mounted at /v1/admin in app.ts.
 *
 * Endpoints (spec: CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.4 §4):
 *   POST /v1/admin/documents/upload-url  — issue a pre-signed S3 PUT URL
 *   POST /v1/admin/documents             — finalize after admin PUT to S3
 *   GET  /v1/admin/customers/:id/documents — paginated list for one customer
 *
 * Role gating: requireAdminRole with no specific sub-roles → super_admin passes
 * automatically; any admin role is accepted (operations_manager, sales_manager, etc.).
 */
export const adminDocumentRouter = Router();

adminDocumentRouter.use(requireAuth);

/** POST /v1/admin/documents/upload-url — issue a pre-signed PUT URL. */
adminDocumentRouter.post(
  '/documents/upload-url',
  requireAdminRole(),
  validateBody(AdminDocumentUploadUrlRequestSchema),
  async (req, res, next) => {
    try {
      const result = await issueAdminUploadUrl(req.body);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof AdminDocumentError) {
        const status = err.code === 'CUSTOMER_NOT_FOUND' ? 404 : 400;
        res.status(status).json({ code: err.code, error: err.message });
        return;
      }
      next(err);
    }
  },
);

/** POST /v1/admin/documents — finalize after admin PUT-uploaded to S3. */
adminDocumentRouter.post(
  '/documents',
  requireAdminRole(),
  validateBody(AdminDocumentFinalizeSchema),
  async (req, res, next) => {
    try {
      const result = await finalizeAdminUpload(req.user!.sub, req.body);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof AdminDocumentError) {
        const status = err.code === 'CUSTOMER_NOT_FOUND' ? 404 : 400;
        res.status(status).json({ code: err.code, error: err.message });
        return;
      }
      next(err);
    }
  },
);

/** GET /v1/admin/customers/:customerId/documents — admin paginated view. */
adminDocumentRouter.get(
  '/customers/:customerId/documents',
  requireAdminRole(),
  async (req, res, next) => {
    try {
      const query = AdminDocumentListQuerySchema.parse(req.query);
      const result = await listCustomerDocuments(req.params.customerId, query);
      res.json(result);
    } catch (err) {
      if (err instanceof AdminDocumentError) {
        const status = err.code === 'CUSTOMER_NOT_FOUND' ? 404 : 400;
        res.status(status).json({ code: err.code, error: err.message });
        return;
      }
      next(err);
    }
  },
);
