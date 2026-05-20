import { Router } from 'express';
import {
  RefreshSchema,
  RegisterWithEmailSchema,
  SignInWithEmailSchema,
  SignInWithMobileSchema,
} from '@behbehani-cpo/shared-types';
import { validateBody } from '../middleware/validate';
import { authLimiter } from '../middleware/rate-limit';
import { requireAuth } from '../middleware/auth';
import {
  AuthError,
  refresh,
  registerCustomer,
  signInWithEmail,
  signInWithMobile,
} from './auth.service';
import { findById, toPublic } from './users.repo';

export const authRouter = Router();

authRouter.post('/auth/register', authLimiter, validateBody(RegisterWithEmailSchema), async (req, res, next) => {
  try {
    const dto = req.body as ReturnType<typeof RegisterWithEmailSchema.parse>;
    const result = await registerCustomer(dto, {
      ip: req.ip ?? null,
      deviceLabel: req.get('user-agent') ?? null,
      platform: 'web',
    });
    // CONTRACT v1.2.1 §4.4: 201 for fresh create, 200 for ghost upgrade.
    // Same body shape either way so A's modal can branch on `kind`.
    const status = result.kind === 'created' ? 201 : 200;
    res.status(status).json({
      user: result.user,
      session: result.session,
      kind: result.kind,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/login', authLimiter, async (req, res, next) => {
  try {
    const ctx = {
      ip: req.ip ?? null,
      deviceLabel: req.get('user-agent') ?? null,
      platform: 'web' as const,
    };
    if (req.body && typeof req.body === 'object' && 'mobile' in req.body) {
      const dto = SignInWithMobileSchema.parse(req.body);
      const session = await signInWithMobile(dto, ctx);
      res.json(session);
      return;
    }
    const dto = SignInWithEmailSchema.parse(req.body);
    const session = await signInWithEmail(dto, ctx);
    res.json(session);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /v1/auth/refresh
 *
 * Performs JTI rotation with reuse-detection per CONTRACT v1.3.0 §3.
 * TOKEN_REUSED → 401 with distinctive code (all sessions revoked server-side).
 */
authRouter.post('/auth/refresh', authLimiter, validateBody(RefreshSchema), async (req, res, next) => {
  try {
    const dto = req.body as ReturnType<typeof RefreshSchema.parse>;
    const session = await refresh(dto, {
      ip: req.ip ?? null,
      deviceLabel: req.get('user-agent') ?? null,
      platform: 'web',
    });
    res.json(session);
  } catch (err) {
    if (err instanceof AuthError && err.message === 'TOKEN_REUSED') {
      res.status(401).json({ code: 'TOKEN_REUSED', error: 'Token reuse detected — all sessions revoked' });
      return;
    }
    if (err instanceof AuthError && err.message === 'TOKEN_INVALID') {
      res.status(401).json({ code: 'TOKEN_INVALID', error: 'Invalid refresh token' });
      return;
    }
    next(err);
  }
});

// OTP routes moved to apps/api/src/auth/auth-public.controller.ts per CONTRACT v1.2.2.
// Live signature: POST /v1/auth/otp/issue + /v1/auth/otp/verify with
// {identifier, channel, purpose} body shape (not the legacy mobile-only one).

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await findById(req.user!.sub);
    if (!user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    res.json(toPublic(user));
  } catch (err) {
    next(err);
  }
});

// Stubs for social login — wire to Passport Google/Apple strategies in Sprint 7.
authRouter.get('/auth/google', (_req, res) => {
  res.status(501).json({ error: 'google_oauth_not_configured' });
});
authRouter.get('/auth/apple', (_req, res) => {
  res.status(501).json({ error: 'apple_oauth_not_configured' });
});
