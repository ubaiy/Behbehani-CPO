import type { PushTokenInputDto } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

export type PushTokenErrorCode = 'TOKEN_OWNED_BY_OTHER_USER';

export class PushTokenError extends Error {
  constructor(public readonly code: PushTokenErrorCode, message: string) {
    super(message);
    this.name = 'PushTokenError';
  }
}

/**
 * Register a push token for the caller. Idempotent on `token`:
 *  - Brand new token → INSERT, return { alreadyRegistered: false }
 *  - Same token, same user → UPDATE lastSeenAt, return { alreadyRegistered: true }
 *  - Same token, DIFFERENT user → throw `TOKEN_OWNED_BY_OTHER_USER`
 *
 * The third case happens when a device is shared between accounts (sign-out + sign-in
 * as someone else on the same phone). FCM/APNs keep the same token; ownership transfer
 * needs an explicit re-claim — for now we throw and let the FE force a re-installation
 * or a notification-permission reset.
 *
 * Spec: CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.2 §3 + v1.4.3 §4.
 */
export async function registerToken(
  userId: string,
  input: PushTokenInputDto,
): Promise<{ alreadyRegistered: boolean }> {
  const existing = await prisma.pushToken.findUnique({
    where: { token: input.token },
    select: { id: true, userId: true },
  });

  if (existing) {
    if (existing.userId !== userId) {
      throw new PushTokenError(
        'TOKEN_OWNED_BY_OTHER_USER',
        'This device token is registered to another account',
      );
    }
    // Same user — bump lastSeenAt + refresh deviceLabel if provided.
    await prisma.pushToken.update({
      where: { id: existing.id },
      data: {
        lastSeenAt:  new Date(),
        deviceLabel: input.deviceLabel ?? undefined,
      },
    });
    return { alreadyRegistered: true };
  }

  await prisma.pushToken.create({
    data: {
      userId,
      token:       input.token,
      platform:    input.platform,
      deviceLabel: input.deviceLabel ?? null,
    },
  });
  return { alreadyRegistered: false };
}

/**
 * Unregister a push token. Idempotent — silently succeeds if the token doesn't
 * exist or belongs to another user (the latter prevents one customer from
 * un-registering another's token via a guessed-token attack). Per v1.4.3 §4
 * silent-204 semantic.
 */
export async function unregisterToken(userId: string, token: string): Promise<void> {
  await prisma.pushToken.deleteMany({
    where: { userId, token },
  });
}
