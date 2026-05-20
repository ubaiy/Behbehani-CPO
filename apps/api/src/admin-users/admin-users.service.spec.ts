/**
 * Unit tests for admin-users.service.
 *
 * Covered (the parts that would silently break):
 *   - deriveStatus via toDetail/toSummary (disabled > locked > active)
 *   - Self-protection guards: cannot lock/disable self; cannot strip own super_admin
 *   - Other super_admins CAN be locked/disabled (no role check at service layer)
 *   - Idempotency: lock-when-locked, disable-when-disabled, unlock-when-unlocked, enable-when-enabled
 *   - Password generation mode vs. manual mode
 *   - DTO shaping never returns passwordHash
 *   - createUser uniqueness checks (409 on conflict)
 *
 * Prisma is mocked at the module boundary (same pattern as aging.engine.spec.ts).
 * bcrypt and crypto are mocked so we don't hash for real (slow) and so we can
 * assert the generated password shape deterministically.
 */

// ─── Prisma mock (must come BEFORE service import) ──────────────────────────

const fakePrisma = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn().mockResolvedValue(undefined),
  },
};

jest.mock('../db/prisma', () => ({ prisma: fakePrisma }));

// bcrypt: avoid real hashing (12 rounds is slow & nondeterministic).
jest.mock('bcrypt', () => ({
  __esModule: true,
  default: { hash: jest.fn(async (pw: string) => `hashed:${pw}`) },
  hash: jest.fn(async (pw: string) => `hashed:${pw}`),
}));

// crypto.randomBytes: deterministic so we can assert length/charset.
jest.mock('node:crypto', () => {
  const actual = jest.requireActual('node:crypto');
  return {
    __esModule: true,
    default: {
      ...actual,
      randomBytes: jest.fn((n: number) => Buffer.alloc(n, 0xab)),
    },
  };
});

import {
  createUser,
  updateUser,
  assignRoles,
  lockUser,
  unlockUser,
  disableUser,
  enableUser,
  getUser,
  listUsers,
  resetPassword,
} from './admin-users.service';
import { AdminUserError } from './admin-users.errors';

// ─── Fixtures ────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function makeRow(overrides: Row = {}): Row {
  return {
    id: 'u-target',
    email: 'target@behbehani.com',
    mobile: null,
    passwordHash: 'pre-existing-hash',
    fullName: 'Target User',
    role: 'admin',
    adminRoles: ['operations_manager'],
    locale: 'en',
    failedLoginCount: 0,
    lockedUntil: null,
    emailVerifiedAt: null,
    mobileVerifiedAt: null,
    lastSignInAt: null,
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

const ACTOR_ID = 'actor-super-admin';
const IP = '10.0.0.1';
const UA = 'jest';

beforeEach(() => {
  jest.clearAllMocks();
  fakePrisma.user.findFirst.mockReset();
  fakePrisma.user.create.mockReset();
  fakePrisma.user.update.mockReset();
});

// ─── deriveStatus (via DTO shape) ────────────────────────────────────────────

describe('admin-users.service — status derivation', () => {
  it("returns 'disabled' when deletedAt is set (even if also locked)", async () => {
    fakePrisma.user.findFirst.mockResolvedValue(
      makeRow({
        deletedAt: new Date('2026-05-01'),
        lockedUntil: new Date(Date.now() + 60_000),
      }),
    );
    const dto = await getUser('u-target');
    expect(dto.status).toBe('disabled');
  });

  it("returns 'locked' when lockedUntil is in the future", async () => {
    fakePrisma.user.findFirst.mockResolvedValue(
      makeRow({ lockedUntil: new Date(Date.now() + 60_000), deletedAt: null }),
    );
    const dto = await getUser('u-target');
    expect(dto.status).toBe('locked');
  });

  it("returns 'active' when lockedUntil is in the past", async () => {
    fakePrisma.user.findFirst.mockResolvedValue(
      makeRow({ lockedUntil: new Date(Date.now() - 1_000), deletedAt: null }),
    );
    const dto = await getUser('u-target');
    expect(dto.status).toBe('active');
  });

  it("returns 'active' when lockedUntil is null and deletedAt is null", async () => {
    fakePrisma.user.findFirst.mockResolvedValue(makeRow({}));
    const dto = await getUser('u-target');
    expect(dto.status).toBe('active');
  });
});

// ─── Self-protection guards ──────────────────────────────────────────────────

describe('admin-users.service — self-protection', () => {
  it('throws 422 when actor tries to lock themselves', async () => {
    const err = await lockUser(ACTOR_ID, ACTOR_ID, IP, UA).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AdminUserError);
    expect((err as AdminUserError).status).toBe(422);
    expect(fakePrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('throws 422 when actor tries to disable themselves', async () => {
    const err = await disableUser(ACTOR_ID, ACTOR_ID, IP, UA).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AdminUserError);
    expect((err as AdminUserError).status).toBe(422);
    expect(fakePrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('throws 422 when actor removes their own super_admin via setRoles', async () => {
    fakePrisma.user.findFirst.mockResolvedValue(
      makeRow({ id: ACTOR_ID, adminRoles: ['super_admin'] }),
    );
    const err = await assignRoles(
      ACTOR_ID,
      { adminRoles: ['operations_manager'] },
      ACTOR_ID,
      IP,
      UA,
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AdminUserError);
    expect((err as AdminUserError).status).toBe(422);
    expect(fakePrisma.user.update).not.toHaveBeenCalled();
  });

  it('allows actor to re-assign roles to themselves as long as super_admin is kept', async () => {
    const row = makeRow({ id: ACTOR_ID, adminRoles: ['super_admin'] });
    fakePrisma.user.findFirst.mockResolvedValue(row);
    fakePrisma.user.update.mockResolvedValue({
      ...row,
      adminRoles: ['super_admin', 'pricing_manager'],
    });

    const result = await assignRoles(
      ACTOR_ID,
      { adminRoles: ['super_admin', 'pricing_manager'] },
      ACTOR_ID,
      IP,
      UA,
    );
    expect(result.adminRoles).toContain('super_admin');
    expect(fakePrisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('CAN lock another super_admin (no role check at service layer)', async () => {
    const otherSuper = makeRow({ id: 'u-other-super', adminRoles: ['super_admin'] });
    fakePrisma.user.findFirst.mockResolvedValue(otherSuper);
    fakePrisma.user.update.mockResolvedValue({
      ...otherSuper,
      lockedUntil: new Date(Date.now() + 1_000_000),
    });

    const result = await lockUser('u-other-super', ACTOR_ID, IP, UA);
    expect(result.status).toBe('locked');
    expect(fakePrisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('CAN disable another super_admin', async () => {
    const otherSuper = makeRow({ id: 'u-other-super', adminRoles: ['super_admin'] });
    fakePrisma.user.findFirst.mockResolvedValue(otherSuper);
    fakePrisma.user.update.mockResolvedValue({
      ...otherSuper,
      deletedAt: new Date(),
    });

    const result = await disableUser('u-other-super', ACTOR_ID, IP, UA);
    expect(result.status).toBe('disabled');
    expect(fakePrisma.user.update).toHaveBeenCalledTimes(1);
  });
});

// ─── Idempotency ─────────────────────────────────────────────────────────────

describe('admin-users.service — idempotency', () => {
  it('lockUser on an already-locked user is a no-op (no update, no audit)', async () => {
    fakePrisma.user.findFirst.mockResolvedValue(
      makeRow({ id: 'u-locked', lockedUntil: new Date(Date.now() + 60_000) }),
    );
    const result = await lockUser('u-locked', ACTOR_ID, IP, UA);
    expect(result.status).toBe('locked');
    expect(fakePrisma.user.update).not.toHaveBeenCalled();
    expect(fakePrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('disableUser on an already-disabled user is a no-op', async () => {
    fakePrisma.user.findFirst.mockResolvedValue(
      makeRow({ id: 'u-disabled', deletedAt: new Date('2026-04-01') }),
    );
    const result = await disableUser('u-disabled', ACTOR_ID, IP, UA);
    expect(result.status).toBe('disabled');
    expect(fakePrisma.user.update).not.toHaveBeenCalled();
    expect(fakePrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('unlockUser on a not-locked user is a no-op', async () => {
    fakePrisma.user.findFirst.mockResolvedValue(makeRow({ id: 'u', lockedUntil: null }));
    await unlockUser('u', ACTOR_ID, IP, UA);
    expect(fakePrisma.user.update).not.toHaveBeenCalled();
    expect(fakePrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('enableUser on a not-disabled user is a no-op', async () => {
    fakePrisma.user.findFirst.mockResolvedValue(makeRow({ id: 'u', deletedAt: null }));
    await enableUser('u', ACTOR_ID, IP, UA);
    expect(fakePrisma.user.update).not.toHaveBeenCalled();
    expect(fakePrisma.auditLog.create).not.toHaveBeenCalled();
  });
});

// ─── Password mode ───────────────────────────────────────────────────────────

describe('admin-users.service — password handling', () => {
  beforeEach(() => {
    // No conflicts; create returns a fresh row.
    fakePrisma.user.findFirst.mockResolvedValue(null);
    fakePrisma.user.create.mockImplementation(async ({ data }: { data: Row }) =>
      makeRow({ ...data, id: 'new-user-id' }),
    );
  });

  it("generate mode returns a non-empty base64url password (no padding, URL-safe)", async () => {
    const result = await createUser(
      {
        fullName: 'New Staff',
        email: 'new@behbehani.com',
        mobile: null,
        accountType: 'admin',
        adminRoles: ['operations_manager'],
        locale: 'en',
        passwordMode: 'generate',
        requirePasswordChangeOnNextSignIn: true,
      },
      ACTOR_ID,
      IP,
      UA,
    );

    expect(result.generatedPassword).not.toBeNull();
    expect(typeof result.generatedPassword).toBe('string');
    // base64url of 9 bytes → 12 chars, alphabet [A-Za-z0-9_-], no padding.
    expect(result.generatedPassword!.length).toBe(12);
    expect(result.generatedPassword!).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.generatedPassword).not.toContain('=');
    expect(result.generatedPassword).not.toContain('+');
    expect(result.generatedPassword).not.toContain('/');
  });

  it('manual mode returns generatedPassword: null', async () => {
    const result = await createUser(
      {
        fullName: 'New Staff',
        email: 'new2@behbehani.com',
        mobile: null,
        accountType: 'admin',
        adminRoles: ['operations_manager'],
        locale: 'en',
        passwordMode: 'manual',
        password: 'SuperSecret123',
        requirePasswordChangeOnNextSignIn: true,
      },
      ACTOR_ID,
      IP,
      UA,
    );
    expect(result.generatedPassword).toBeNull();
  });

  it('resetPassword generate mode returns a new 12-char password', async () => {
    fakePrisma.user.findFirst.mockResolvedValue(makeRow({ id: 'u-reset' }));
    fakePrisma.user.update.mockResolvedValue(makeRow({ id: 'u-reset' }));

    const result = await resetPassword('u-reset', 'generate', undefined, ACTOR_ID, IP, UA);
    expect(result.generatedPassword).not.toBeNull();
    expect(result.generatedPassword!.length).toBe(12);
    expect(result.requireChangeOnNextSignIn).toBe(true);
  });

  it('resetPassword manual mode returns generatedPassword: null', async () => {
    fakePrisma.user.findFirst.mockResolvedValue(makeRow({ id: 'u-reset' }));
    fakePrisma.user.update.mockResolvedValue(makeRow({ id: 'u-reset' }));

    const result = await resetPassword('u-reset', 'manual', 'BrandNew123', ACTOR_ID, IP, UA);
    expect(result.generatedPassword).toBeNull();
  });
});

// ─── List status filter ──────────────────────────────────────────────────────

describe('admin-users.service — listUsers status filter', () => {
  beforeEach(() => {
    // listAdminUsers internally calls prisma.$transaction; we don't mock
    // the repo, so emulate the underlying prisma.user calls via a spy.
    // The repo uses prisma.$transaction([findMany, count]) — add it.
    (fakePrisma as Record<string, unknown>).$transaction = jest.fn(
      async (queries: Array<Promise<unknown>>) => Promise.all(queries),
    );
    (fakePrisma.user as Record<string, unknown>).findMany = jest.fn(async () => []);
    (fakePrisma.user as Record<string, unknown>).count = jest.fn(async () => 0);
  });

  it("'active' filter passes deletedAt:null AND lockedUntil:{lte: now} to the repo", async () => {
    await listUsers({
      status: 'active',
      sort: 'createdAt:desc',
      page: 1,
      pageSize: 25,
    });

    const findManyArgs = (
      fakePrisma.user as unknown as { findMany: jest.Mock }
    ).findMany.mock.calls[0][0];
    expect(findManyArgs.where.deletedAt).toBeNull();
    expect(findManyArgs.where.lockedUntil).toBeDefined();
    expect(findManyArgs.where.lockedUntil.lte).toBeInstanceOf(Date);
    expect(findManyArgs.where.lockedUntil.lte.getTime()).toBeLessThanOrEqual(Date.now() + 100);
  });

  it("'locked' filter passes lockedUntil:{gt: now} AND deletedAt:null", async () => {
    await listUsers({
      status: 'locked',
      sort: 'createdAt:desc',
      page: 1,
      pageSize: 25,
    });

    const where = (fakePrisma.user as unknown as { findMany: jest.Mock }).findMany.mock.calls[0][0]
      .where;
    expect(where.deletedAt).toBeNull();
    expect(where.lockedUntil.gt).toBeInstanceOf(Date);
  });

  it("'disabled' filter passes NOT:{deletedAt:null}", async () => {
    await listUsers({
      status: 'disabled',
      sort: 'createdAt:desc',
      page: 1,
      pageSize: 25,
    });

    const where = (fakePrisma.user as unknown as { findMany: jest.Mock }).findMany.mock.calls[0][0]
      .where;
    expect(where.NOT).toEqual({ deletedAt: null });
  });
});

// ─── DTO shaping ─────────────────────────────────────────────────────────────

describe('admin-users.service — DTO shaping', () => {
  it('never returns passwordHash on getUser', async () => {
    fakePrisma.user.findFirst.mockResolvedValue(
      makeRow({ passwordHash: 'sensitive-hash-do-not-leak' }),
    );
    const dto = await getUser('u-target');
    expect(dto).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(dto)).not.toContain('sensitive-hash-do-not-leak');
  });

  it('createUser response.user does not include passwordHash', async () => {
    fakePrisma.user.findFirst.mockResolvedValue(null); // no conflicts
    fakePrisma.user.create.mockResolvedValue(
      makeRow({ id: 'new-id', passwordHash: 'sensitive-hash' }),
    );

    const result = await createUser(
      {
        fullName: 'New',
        email: 'e@x.com',
        mobile: null,
        accountType: 'admin',
        adminRoles: ['operations_manager'],
        locale: 'en',
        passwordMode: 'generate',
        requirePasswordChangeOnNextSignIn: true,
      },
      ACTOR_ID,
      IP,
      UA,
    );

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(result.user)).not.toContain('sensitive-hash');
  });
});

// ─── Uniqueness ──────────────────────────────────────────────────────────────

describe('admin-users.service — uniqueness on create', () => {
  it('throws 409 if email already exists', async () => {
    fakePrisma.user.findFirst.mockResolvedValueOnce({ id: 'existing-email-owner' });

    const err = await createUser(
      {
        fullName: 'Dup',
        email: 'dup@x.com',
        mobile: null,
        accountType: 'admin',
        adminRoles: ['operations_manager'],
        locale: 'en',
        passwordMode: 'generate',
        requirePasswordChangeOnNextSignIn: true,
      },
      ACTOR_ID,
      IP,
      UA,
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AdminUserError);
    expect((err as AdminUserError).status).toBe(409);
    expect(fakePrisma.user.create).not.toHaveBeenCalled();
  });

  it('throws 409 if mobile already exists', async () => {
    fakePrisma.user.findFirst
      .mockResolvedValueOnce(null) // email check
      .mockResolvedValueOnce({ id: 'existing-mobile-owner' }); // mobile check

    const err = await createUser(
      {
        fullName: 'Dup',
        email: 'fine@x.com',
        mobile: '+96550001234',
        accountType: 'admin',
        adminRoles: ['operations_manager'],
        locale: 'en',
        passwordMode: 'generate',
        requirePasswordChangeOnNextSignIn: true,
      },
      ACTOR_ID,
      IP,
      UA,
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AdminUserError);
    expect((err as AdminUserError).status).toBe(409);
    expect(fakePrisma.user.create).not.toHaveBeenCalled();
  });

  it('updateUser throws 404 when target user is missing', async () => {
    fakePrisma.user.findFirst.mockResolvedValue(null);
    const err = await updateUser('missing', { fullName: 'X' }, ACTOR_ID, IP, UA).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(AdminUserError);
    expect((err as AdminUserError).status).toBe(404);
  });
});
