/**
 * Public leads controller — v1.5.25.
 *
 *   POST /v1/public/leads
 *
 * Anonymous, rate-limited 5/min/IP. Idempotency-Key header REQUIRED.
 * Zod validation via CreateLeadPublicInputSchema.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { CreateLeadPublicInputSchema } from '@behbehani-cpo/shared-types';
import { createLeadFromPublic } from './leads.service.js';
import { LeadError } from './leads.errors.js';

export const publicLeadsRouter = Router();

// 5 submissions per minute per IP — mirrors sensitiveActionLimiter pattern
const leadSubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', error: 'Too many requests. Please try again later.' },
});

/**
 * POST /v1/public/leads
 * Body: CreateLeadPublicInput (name, phone, optional email/message/listingId/source)
 * Header: Idempotency-Key (required, 5-min TTL enforced by DB unique constraint)
 */
publicLeadsRouter.post('/leads', leadSubmitLimiter, async (req, res, next) => {
  const ikey = req.header('Idempotency-Key');
  if (!ikey) {
    res.status(400).json({
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      error: 'Idempotency-Key header is required',
    });
    return;
  }

  try {
    const input = CreateLeadPublicInputSchema.parse(req.body);
    const lead = await createLeadFromPublic(input, {
      idempotencyKey: ikey,
      ipAddress:      req.ip ?? null,
      userAgent:      req.get('user-agent') ?? null,
    });

    res.status(201).json({
      id:        lead.id,
      status:    lead.status,
      createdAt: lead.createdAt,
    });
  } catch (err) {
    if (err instanceof LeadError) {
      res.status(err.status).json({ code: err.code, error: err.message });
      return;
    }
    next(err);
  }
});
