import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import { verifyOtp } from './otp.service';
import { prisma } from '../db/prisma';

// Mock the prisma and bcrypt modules
jest.mock('../db/prisma');
jest.mock('bcrypt');

describe('verifyOtp signin identifier resolution (v1.3.0 §1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    (prisma.otpCode.findFirst as jest.Mock).mockResolvedValueOnce(otpRow);

    // Setup: Mock user lookup by mobile
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'u-1' });

    // Setup: Mock OTP consumption
    (prisma.otpCode.update as jest.Mock).mockResolvedValueOnce(undefined);

    // Setup: Mock bcrypt.compare to return true (correct code)
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    // Execute
    const result = await verifyOtp('+96555512345', 'sms', 'signin', '123456');

    // Assert
    expect(result).toEqual({ otpId: 'otp-1', userId: 'u-1' });

    // Verify the user lookup was called with correct identifier
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { mobile: '+96555512345' },
      select: { id: true },
    });

    // Verify OTP was consumed
    expect(prisma.otpCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'otp-1' },
        data: expect.objectContaining({
          consumedAt: expect.any(Date),
        }),
      })
    );
  });
});
