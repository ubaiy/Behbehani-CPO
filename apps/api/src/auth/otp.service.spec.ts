/**
 * otp.service unit tests — verifyOtp contract (v1.3.0 §1).
 *
 * Test infrastructure note (#24):
 *   - prisma is mocked via a factory object (same pattern as offers/aging specs)
 *     because jest auto-mock of PrismaClient produces undefined for named exports.
 *   - notifications layer is mocked to prevent transitive import of
 *     notifications.service.ts which has module-level fs/path calls that fail
 *     without esModuleInterop.
 *   - bcrypt is mocked so tests don't pay bcrypt hashing cost.
 */

// ─── Mocks (must come BEFORE service import) ─────────────────────────────────

const fakePrisma = {
  otpCode: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

// Factory-style mock — matches the pattern in offers.service.spec.ts and
// aging.engine.spec.ts. Auto-mock of PrismaClient yields undefined for prisma.
jest.mock('../db/prisma', () => ({
  prisma: fakePrisma,
  disconnectPrisma: jest.fn(),
}));

// bcrypt: provide an explicit factory because the auto-mock + esModuleInterop:false
// combination makes `bcrypt.compare` undefined when imported as a default.
// The `__esModule: true` + `default` key pattern lets ts-jest resolve
// `import bcrypt from 'bcrypt'` correctly regardless of interop settings.
const bcryptMock = {
  compare: jest.fn(),
  hash: jest.fn(),
};
jest.mock('bcrypt', () => ({
  __esModule: true,
  default: bcryptMock,
  ...bcryptMock, // also expose directly for require()-style callers
}));

// Mock the OTP notification layer — prevents transitive imports of
// notifications.service.ts which calls path.join() at module scope and
// fails without esModuleInterop.
jest.mock('../notifications/otp-notifications.service', () => ({
  sendOtpNotification: jest.fn().mockResolvedValue(undefined),
}));

import { verifyOtp } from './otp.service';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('verifyOtp signin identifier resolution (v1.3.0 §1)', () => {
  beforeEach(() => {
    // resetAllMocks clears call records AND drains mockResolvedValueOnce queues,
    // preventing mock bleed between tests.
    jest.resetAllMocks();
  });

  it('should resolve userId from identifier when OTP has null userId for signin purpose', async () => {
    // Setup: Mock OTP lookup — returns a row with userId:null
    const otpRow = {
      id: 'otp-1',
      identifier: '+96555512345',
      channel: 'sms' as const,
      purpose: 'signin' as const,
      codeHash: '$2b$08$mock.hash.value',
      userId: null,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60000),
      consumedAt: null,
    };

    fakePrisma.otpCode.findFirst.mockResolvedValueOnce(otpRow);

    // Setup: Mock user lookup by mobile
    fakePrisma.user.findUnique.mockResolvedValueOnce({ id: 'u-1' });

    // Setup: Mock OTP consumption
    fakePrisma.otpCode.update.mockResolvedValueOnce(undefined);

    // Setup: Mock bcrypt.compare to return true (correct code)
    bcryptMock.compare.mockResolvedValueOnce(true);

    // Execute
    const result = await verifyOtp('+96555512345', 'sms', 'signin', '123456');

    // Assert
    expect(result).toEqual({ otpId: 'otp-1', userId: 'u-1' });

    // Verify the user lookup was called with the correct identifier
    expect(fakePrisma.user.findUnique).toHaveBeenCalledWith({
      where: { mobile: '+96555512345' },
      select: { id: true },
    });

    // Verify OTP was consumed
    expect(fakePrisma.otpCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'otp-1' },
        data: expect.objectContaining({
          consumedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('throws OTP_EXPIRED when expiresAt is in the past', async () => {
    fakePrisma.otpCode.findFirst.mockResolvedValueOnce({
      id: 'otp-expired',
      identifier: '+96555512345',
      channel: 'sms' as const,
      purpose: 'signin' as const,
      codeHash: '$2b$08$mock.hash.value',
      userId: null,
      attempts: 0,
      expiresAt: new Date(Date.now() - 1000), // in the past
      consumedAt: null,
    });

    await expect(
      verifyOtp('+96555512345', 'sms', 'signin', '123456'),
    ).rejects.toMatchObject({ code: 'OTP_EXPIRED' });
  });

  it('throws OTP_LOCKED when attempts >= 5', async () => {
    fakePrisma.otpCode.findFirst.mockResolvedValueOnce({
      id: 'otp-locked',
      identifier: '+96555512345',
      channel: 'sms' as const,
      purpose: 'signin' as const,
      codeHash: '$2b$08$mock.hash.value',
      userId: null,
      attempts: 5,
      expiresAt: new Date(Date.now() + 60000),
      consumedAt: null,
    });

    await expect(
      verifyOtp('+96555512345', 'sms', 'signin', '123456'),
    ).rejects.toMatchObject({ code: 'OTP_LOCKED' });
  });

  it('throws OTP_NOT_FOUND when no live row exists', async () => {
    // findFirst returns null (no unconsumed row) + no consumed row either
    fakePrisma.otpCode.findFirst
      .mockResolvedValueOnce(null)  // unconsumed lookup
      .mockResolvedValueOnce(null); // consumed lookup

    await expect(
      verifyOtp('+96555512345', 'sms', 'signin', '000000'),
    ).rejects.toMatchObject({ code: 'OTP_NOT_FOUND' });
  });
});
