import { Router } from 'express';
import { AuditLogFilterSchema, AuditLogExportRequestSchema } from '@behbehani-cpo/shared-types';
import { requireAuth, requireAdminRole } from '../middleware/auth';
import { AUDIT_LOG_READ_ROLES } from '../auth/role-groups';
import { AuditLogError } from './audit-log.errors';
import { getAuditLogList, getActions, getResources, buildCsvExport } from './audit-log.service';

export const auditLogRouter = Router();

// RBAC: super_admin (implicit bypass in requireAdminRole) + general_manager.
// No auditMutation — applying it here would cause infinite recursion:
//   read audit log → write audit log entry → read audit log → ...
auditLogRouter.use(requireAuth);
auditLogRouter.use(requireAdminRole(...AUDIT_LOG_READ_ROLES));

// GET /v1/admin/audit-log/
auditLogRouter.get('/', async (req, res, next) => {
  try {
    const filter = AuditLogFilterSchema.parse(req.query);
    const result = await getAuditLogList(filter);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /v1/admin/audit-log/actions
auditLogRouter.get('/actions', async (_req, res, next) => {
  try {
    const result = await getActions();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /v1/admin/audit-log/resources
auditLogRouter.get('/resources', async (_req, res, next) => {
  try {
    const result = await getResources();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /v1/admin/audit-log/export
auditLogRouter.get('/export', async (req, res, next) => {
  try {
    const filter = AuditLogExportRequestSchema.parse(req.query);
    const { csv, filename } = await buildCsvExport(filter);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// Local error handler — surfaces AuditLogError as a structured JSON response.
auditLogRouter.use(
  (
    err: unknown,
    _req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    if (err instanceof AuditLogError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  },
);
