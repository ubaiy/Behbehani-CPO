/**
 * Zod refinement contracts for admin-user schemas.
 *
 * Locks in the refinement behaviours documented in admin-users.schemas.ts so
 * a silent refactor of `.refine(...)` doesn't accidentally accept invalid
 * payloads (or reject valid ones).
 */

import {
  AdminUserCreateSchema,
  AdminUserUpdateSchema,
  AdminUserResetPasswordSchema,
} from './admin-users.schemas.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_KW_MOBILE = '+96550001234';

function baseCreate(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'New Staff',
    accountType: 'admin' as const,
    adminRoles: ['operations_manager'],
    locale: 'en' as const,
    passwordMode: 'generate' as const,
    requirePasswordChangeOnNextSignIn: true,
    ...overrides,
  };
}

// ─── AdminUserCreate refines ────────────────────────────────────────────────

describe('AdminUserCreateSchema — email-or-mobile refine', () => {
  it('rejects when BOTH email and mobile are null', () => {
    const result = AdminUserCreateSchema.safeParse(
      baseCreate({ email: null, mobile: null }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toEqual(
        expect.arrayContaining([expect.stringMatching(/email or mobile/i)]),
      );
    }
  });

  it('accepts when only email is provided', () => {
    const result = AdminUserCreateSchema.safeParse(
      baseCreate({ email: 'x@y.com', mobile: null }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts when only mobile is provided', () => {
    const result = AdminUserCreateSchema.safeParse(
      baseCreate({ email: null, mobile: VALID_KW_MOBILE }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts when both are provided', () => {
    const result = AdminUserCreateSchema.safeParse(
      baseCreate({ email: 'x@y.com', mobile: VALID_KW_MOBILE }),
    );
    expect(result.success).toBe(true);
  });
});

describe('AdminUserCreateSchema — password-when-manual refine', () => {
  it('rejects manual mode with no password', () => {
    const result = AdminUserCreateSchema.safeParse(
      baseCreate({ email: 'x@y.com', passwordMode: 'manual' }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toEqual(
        expect.arrayContaining([expect.stringMatching(/password is required/i)]),
      );
    }
  });

  it('rejects manual mode with password shorter than 8 chars', () => {
    const result = AdminUserCreateSchema.safeParse(
      baseCreate({ email: 'x@y.com', passwordMode: 'manual', password: 'short' }),
    );
    expect(result.success).toBe(false);
  });

  it('accepts manual mode with an 8+ char password', () => {
    const result = AdminUserCreateSchema.safeParse(
      baseCreate({ email: 'x@y.com', passwordMode: 'manual', password: '12345678' }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts generate mode with no password', () => {
    const result = AdminUserCreateSchema.safeParse(
      baseCreate({ email: 'x@y.com', passwordMode: 'generate' }),
    );
    expect(result.success).toBe(true);
  });
});

describe('AdminUserCreateSchema — role-when-admin refine', () => {
  it('rejects accountType=admin with empty adminRoles', () => {
    const result = AdminUserCreateSchema.safeParse(
      baseCreate({ email: 'x@y.com', accountType: 'admin', adminRoles: [] }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toEqual(
        expect.arrayContaining([expect.stringMatching(/at least one admin role/i)]),
      );
    }
  });

  it('accepts accountType=admin with at least one role', () => {
    const result = AdminUserCreateSchema.safeParse(
      baseCreate({ email: 'x@y.com', accountType: 'admin', adminRoles: ['sales_agent'] }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts accountType=customer with empty adminRoles', () => {
    const result = AdminUserCreateSchema.safeParse(
      baseCreate({ email: 'x@y.com', accountType: 'customer', adminRoles: [] }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects an unknown admin role string', () => {
    const result = AdminUserCreateSchema.safeParse(
      baseCreate({
        email: 'x@y.com',
        accountType: 'admin',
        adminRoles: ['nonexistent_role'],
      }),
    );
    expect(result.success).toBe(false);
  });
});

// ─── AdminUserUpdate refine ─────────────────────────────────────────────────

describe('AdminUserUpdateSchema — non-empty refine', () => {
  it('rejects an empty body', () => {
    const result = AdminUserUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toEqual(
        expect.arrayContaining([expect.stringMatching(/at least one field/i)]),
      );
    }
  });

  it('accepts a single fullName change', () => {
    const result = AdminUserUpdateSchema.safeParse({ fullName: 'Renamed' });
    expect(result.success).toBe(true);
  });

  it('accepts explicit null email (clearing the field)', () => {
    const result = AdminUserUpdateSchema.safeParse({ email: null });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid Kuwait mobile', () => {
    const result = AdminUserUpdateSchema.safeParse({ mobile: '1234' });
    expect(result.success).toBe(false);
  });
});

// ─── AdminUserResetPassword refine ──────────────────────────────────────────

describe('AdminUserResetPasswordSchema — password-when-manual refine', () => {
  it('rejects manual mode without password', () => {
    const result = AdminUserResetPasswordSchema.safeParse({ mode: 'manual' });
    expect(result.success).toBe(false);
  });

  it('rejects manual mode with too-short password', () => {
    const result = AdminUserResetPasswordSchema.safeParse({
      mode: 'manual',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('accepts manual mode with valid password', () => {
    const result = AdminUserResetPasswordSchema.safeParse({
      mode: 'manual',
      password: 'Valid1234',
    });
    expect(result.success).toBe(true);
  });

  it('accepts generate mode with no password', () => {
    const result = AdminUserResetPasswordSchema.safeParse({ mode: 'generate' });
    expect(result.success).toBe(true);
  });
});
