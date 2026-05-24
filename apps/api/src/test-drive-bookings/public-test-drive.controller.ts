/**
 * Public test drive bookings controller — v1.5.29.
 *
 *   POST /v1/public/test-drive-bookings
 *
 * Anonymous, rate-limited 5/min/IP. Idempotency-Key header REQUIRED.
 * Zod validation via CreateTestDriveBookingPublicInputSchema.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { CreateTestDriveBookingPublicInputSchema } from '@behbehani-cpo/shared-types';
import { createTestDriveBookingFromPublic } from './test-drive.service.js';
import { TestDriveError } from './test-drive.errors.js';

export const publicTestDriveRouter = Router();

// 5 submissions per minute per IP — mirrors sensitiveActionLimiter pattern
const testDriveSubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    code: 'RATE_LIMITED',
    error: 'Too many requests. Please try again later.',
  },
});

/**
 * POST /v1/public/test-drive-bookings
 * Body: CreateTestDriveBookingPublicInput
 * Header: Idempotency-Key (required)
 */
publicTestDriveRouter.post(
  '/test-drive-bookings',
  testDriveSubmitLimiter,
  async (req, res, next) => {
    const ikey = req.header('Idempotency-Key');
    if (!ikey) {
      res.status(400).json({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        error: 'Idempotency-Key header is required',
      });
      return;
    }

    try {
      const input = CreateTestDriveBookingPublicInputSchema.parse(req.body);
      const booking = await createTestDriveBookingFromPublic(
        input,
        req.ip ?? null,
        req.get('user-agent') ?? null,
        ikey,
      );

      res.status(201).json({
        id:        booking.id,
        status:    booking.status,
        createdAt: booking.createdAt,
      });
    } catch (err) {
      if (err instanceof TestDriveError) {
        res.status(err.status).json({ code: err.code, error: err.message });
        return;
      }
      next(err);
    }
  },
);
