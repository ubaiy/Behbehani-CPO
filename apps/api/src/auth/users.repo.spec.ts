/**
 * Lockout-logic tests for users.repo.
 *
 * Covers FR-AUTH-005: 5 failed logins lock the account for 10 minutes; a
 * successful login clears the counter. `isLocked` reflects the window.
 */

// ─── Mock prisma BEFORE importing the repo ──────────────────────────────────
jest.mock('../db/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '../db/prisma';
import {
  recordFailedLogin,
  resetFailedLogin,
  isLocked,
  type UserRecord,
} from './users.repo';

const userUpdate = (prisma.user.update as jest.Mock);

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'u1',
    email: 'admin@behbehani.com',
    mobile: null,
    passwordHash: 'hash',
    fullName: 'Admin User',
    role: 'admin',
    adminRoles: [],
    locale: 'en',
    failedLoginCount: 0,
    lockedUntil: null,
    lastSignInAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
    ...overrides,
  } as UserRecord;
}

beforeEach(() => {
  jest.clearAllMocks();
  userUpdate.mockImplementation(async ({ where, data }: { where: unknown; data: unknown }) => ({
    ...makeUser(),
    ...(data as object),
    id: (where as { id: string }).id,
  }));
});

describe('users.repo lockout logic', () => {
  it('should NOT lock the account on the first 4 failed logins', async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const user = makeUser({ failedLoginCount: attempt, lockedUntil: null });
      await recordFailedLogin(user);
      const call = userUpdate.mock.calls[attempt];
      expect(call[0].data.failedLoginCount).toBe(attempt + 1);
      expect(call[0].data.lockedUntil).toBeNull();
    }
  });

  it('should set lockedUntil to ~10 minutes from now on the 5th failed login', async () => {
    const before = Date.now();
    const user = makeUser({ failedLoginCount: 4 });

    await recordFailedLogin(user);

    const call = userUpdate.mock.calls[0];
    const data = call[0].data as { failedLoginCount: number; lockedUntil: Date };
    expect(data.failedLoginCount).toBe(5);
    expect(data.lockedUntil).toBeInstanceOf(Date);
    // Allow a small window — should be ~10 minutes ahead.
    const diff = data.lockedUntil.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(10 * 60 * 1000 - 50);
    expect(diff).toBeLessThanOrEqual(10 * 60 * 1000 + 1000);
  });

  it('should keep extending lockout window on attempts beyond the 5th', async () => {
    const user = makeUser({ failedLoginCount: 7 });
    await recordFailedLogin(user);
    const data = userUpdate.mock.calls[0][0].data;
    expect(data.failedLoginCount).toBe(8);
    expect(data.lockedUntil).toBeInstanceOf(Date);
  });

  it('should reset failedLoginCount and lockedUntil on successful login', async () => {
    const user = makeUser({ failedLoginCount: 5, lockedUntil: new Date(Date.now() + 60_000) });

    await resetFailedLogin(user);

    const data = userUpdate.mock.calls[0][0].data;
    expect(data.failedLoginCount).toBe(0);
    expect(data.lockedUntil).toBeNull();
    expect(data.lastSignInAt).toBeInstanceOf(Date);
  });

  it('isLocked should return true inside the lockout window', () => {
    const user = makeUser({ lockedUntil: new Date(Date.now() + 60_000) });
    expect(isLocked(user)).toBe(true);
  });

  it('isLocked should return false when lockedUntil is in the past', () => {
    const user = makeUser({ lockedUntil: new Date(Date.now() - 1_000) });
    expect(isLocked(user)).toBe(false);
  });

  it('isLocked should return false when lockedUntil is null', () => {
    expect(isLocked(makeUser({ lockedUntil: null }))).toBe(false);
  });

  it('lockout should expire after 10 minutes — simulated with fake timers', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2026-05-15T10:00:00.000Z'));
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
      const user = makeUser({ failedLoginCount: 5, lockedUntil });

      // Still inside the window.
      expect(isLocked(user)).toBe(true);

      // Jump past the window.
      jest.setSystemTime(new Date('2026-05-15T10:10:01.000Z'));
      expect(isLocked(user)).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});
