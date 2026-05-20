import { z } from 'zod';

/** v1.4.2 §3 — push notification token registry. */

export const PushPlatformSchema = z.enum(['ios', 'android']);
export type PushPlatform = z.infer<typeof PushPlatformSchema>;

export const PushTokenInputSchema = z.object({
  token:       z.string().min(20).max(512),  // APNs hex tokens ~64 chars, FCM tokens ~163 chars
  platform:    PushPlatformSchema,
  deviceLabel: z.string().max(200).optional(),
});
export type PushTokenInputDto = z.infer<typeof PushTokenInputSchema>;

/** 201 response when a new token is registered. */
export const PushTokenRegisteredResponseSchema = z.object({
  registered: z.literal(true),
});
export type PushTokenRegisteredResponseDto = z.infer<typeof PushTokenRegisteredResponseSchema>;

/** 200 response when the token already existed (lastSeenAt bumped). */
export const PushTokenAlreadyResponseSchema = z.object({
  registered:        z.literal(false),
  alreadyRegistered: z.literal(true),
});
export type PushTokenAlreadyResponseDto = z.infer<typeof PushTokenAlreadyResponseSchema>;

export const PUSH_TOKEN_ERROR_CODES = [
  'INVALID_PUSH_TOKEN',
  'TOKEN_OWNED_BY_OTHER_USER',
] as const;
export type PushTokenErrorCode = (typeof PUSH_TOKEN_ERROR_CODES)[number];
