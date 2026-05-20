// v1.4.2 locked the simpler shape; B's official Zod ships in v1.4 Day 1.
// Drop this file when @behbehani-cpo/shared-types publishes push-token.public.schemas.ts
//
// CHANGED from v0.3: removed deviceId (uuid), appVersion, locale fields.
// v1.4.2 §2 locked shape is: token + platform + deviceLabel? only.

import { z } from 'zod';

/**
 * Push-token registration schema — public surface for mobile push notification registration.
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.2 §2 LOCKED shape.
 *
 * Endpoints (Session B owns implementation):
 *   POST   /v1/public/notifications/push-token  — register/upsert device token (201 or 200)
 *   DELETE /v1/public/notifications/push-token/:token — unregister on logout (204, idempotent)
 *
 * Auth: requireCustomerSession (Bearer accessToken) on both endpoints.
 *
 * NOTE: Additive-only per CLAUDE.md and ARCHITECTURE.md §10 constraint 4.
 */

// ─── RegisterPushTokenSchema ──────────────────────────────────────────────────

export const RegisterPushTokenSchema = z.object({
  /**
   * Push registration token.
   * iOS: APNs device token or FCM registration token (via firebase-admin unified path)
   * Android: FCM registration token string
   */
  token: z.string().min(1),

  /**
   * Target platform. Determines which push provider the server routes to.
   *   ios     → APNs (via firebase-admin or direct APNs)
   *   android → FCM HTTP v1 API
   */
  platform: z.enum(['ios', 'android']),

  /**
   * Optional human-readable label for the device, e.g. "BehbehaniCPO/ios/1.0.0".
   * Server stores for debugging/support purposes.
   */
  deviceLabel: z.string().optional(),
});

export type RegisterPushTokenDto = z.infer<typeof RegisterPushTokenSchema>;

// ─── Legacy alias (v0.3 name) ─────────────────────────────────────────────────
// Kept temporarily so any existing import of RegisterDeviceTokenSchema still compiles.
// Remove when @behbehani-cpo/shared-types publishes push-token.public.schemas.ts.
/** @deprecated Use RegisterPushTokenSchema (v1.4.2 locked shape). */
export const RegisterDeviceTokenSchema = RegisterPushTokenSchema;
/** @deprecated Use RegisterPushTokenDto */
export type RegisterDeviceTokenDto = RegisterPushTokenDto;
