import type { FeatureWaitlistInputDto } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

/**
 * Subscribe (or no-op if already subscribed) to feature-launch notifications.
 *
 * Idempotent on the composite (featurePath, email) key. The optional `userId`
 * is captured when the request comes from an authenticated session so the
 * admin tooling can later cross-reference subscribers with active customers.
 */
export async function subscribe(
  input: FeatureWaitlistInputDto,
  ctx: { userId?: string | null } = {},
): Promise<{ alreadySubscribed: boolean }> {
  const existing = await prisma.featureWaitlist.findUnique({
    where: { featurePath_email: { featurePath: input.featurePath, email: input.email } },
    select: { id: true },
  });
  if (existing) {
    return { alreadySubscribed: true };
  }
  await prisma.featureWaitlist.create({
    data: {
      featurePath: input.featurePath,
      email:       input.email,
      userId:      ctx.userId ?? null,
    },
  });
  return { alreadySubscribed: false };
}
