import { Router } from 'express';
import {
  AdminUserFilterSchema,
  AdminUserCreateSchema,
  AdminUserUpdateSchema,
  AdminUserAssignRolesSchema,
  AdminUserLockSchema,
  AdminUserUnlockSchema,
  AdminUserDisableSchema,
  AdminUserEnableSchema,
  AdminUserResetPasswordSchema,
} from '@behbehani-cpo/shared-types';
import { requireAuth, requireAdminRole } from '../middleware/auth';
import { ADMIN_USERS_READ_ROLES } from '../auth/role-groups';
import { validateBody } from '../middleware/validate';
import { AdminUserError } from './admin-users.errors';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  assignRoles,
  lockUser,
  unlockUser,
  disableUser,
  enableUser,
  resetPassword,
} from './admin-users.service';
import type {
  AdminUserCreate,
  AdminUserUpdate,
  AdminUserAssignRoles,
  AdminUserResetPassword,
} from '@behbehani-cpo/shared-types';

export const adminUsersRouter = Router();

// All routes require a valid JWT. No `auditMutation` here — the service layer
// emits fine-grained `user.*` entries with before/after snapshots, and adding
// a coarse middleware audit on top double-records every mutation (carry-over
// D2 from the admin pass).
adminUsersRouter.use(requireAuth);

// ─── Read endpoints ─────────────────────────────────────────────────────────

adminUsersRouter.get(
  '/',
  requireAdminRole(...ADMIN_USERS_READ_ROLES),
  async (req, res, next) => {
    try {
      const filter = AdminUserFilterSchema.parse(req.query);
      const result = await listUsers(filter);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

adminUsersRouter.get(
  '/:id',
  requireAdminRole(...ADMIN_USERS_READ_ROLES),
  async (req, res, next) => {
    try {
      const user = await getUser(req.params.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Create ─────────────────────────────────────────────────────────────────

adminUsersRouter.post(
  '/',
  requireAdminRole('super_admin'),
  validateBody(AdminUserCreateSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as AdminUserCreate;
      const result = await createUser(
        dto,
        req.user!.sub,
        req.ip ?? null,
        req.get('user-agent') ?? null,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Update ─────────────────────────────────────────────────────────────────

adminUsersRouter.patch(
  '/:id',
  requireAdminRole('super_admin'),
  validateBody(AdminUserUpdateSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as AdminUserUpdate;
      const user = await updateUser(
        req.params.id,
        dto,
        req.user!.sub,
        req.ip ?? null,
        req.get('user-agent') ?? null,
      );
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Role assignment ─────────────────────────────────────────────────────────

adminUsersRouter.post(
  '/:id/roles',
  requireAdminRole('super_admin'),
  validateBody(AdminUserAssignRolesSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as AdminUserAssignRoles;
      const user = await assignRoles(
        req.params.id,
        dto,
        req.user!.sub,
        req.ip ?? null,
        req.get('user-agent') ?? null,
      );
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Lifecycle mutations ─────────────────────────────────────────────────────

adminUsersRouter.post(
  '/:id/lock',
  requireAdminRole('super_admin'),
  validateBody(AdminUserLockSchema),
  async (req, res, next) => {
    try {
      const user = await lockUser(
        req.params.id,
        req.user!.sub,
        req.ip ?? null,
        req.get('user-agent') ?? null,
      );
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

adminUsersRouter.post(
  '/:id/unlock',
  requireAdminRole('super_admin'),
  validateBody(AdminUserUnlockSchema),
  async (req, res, next) => {
    try {
      const user = await unlockUser(
        req.params.id,
        req.user!.sub,
        req.ip ?? null,
        req.get('user-agent') ?? null,
      );
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

adminUsersRouter.post(
  '/:id/disable',
  requireAdminRole('super_admin'),
  validateBody(AdminUserDisableSchema),
  async (req, res, next) => {
    try {
      const user = await disableUser(
        req.params.id,
        req.user!.sub,
        req.ip ?? null,
        req.get('user-agent') ?? null,
      );
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

adminUsersRouter.post(
  '/:id/enable',
  requireAdminRole('super_admin'),
  validateBody(AdminUserEnableSchema),
  async (req, res, next) => {
    try {
      const user = await enableUser(
        req.params.id,
        req.user!.sub,
        req.ip ?? null,
        req.get('user-agent') ?? null,
      );
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

adminUsersRouter.post(
  '/:id/reset-password',
  requireAdminRole('super_admin'),
  validateBody(AdminUserResetPasswordSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as AdminUserResetPassword;
      const result = await resetPassword(
        req.params.id,
        dto.mode,
        dto.password,
        req.user!.sub,
        req.ip ?? null,
        req.get('user-agent') ?? null,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Local error handler ─────────────────────────────────────────────────────

adminUsersRouter.use(
  (
    err: unknown,
    _req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    if (err instanceof AdminUserError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  },
);
