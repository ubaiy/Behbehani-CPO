/**
 * Reservation expiry cleanup cron.
 *
 * Every 5 minutes: find Orders past reservationExpiresAt with status
 * 'reservation_pending' or 'confirmed' (no payment captured yet) and
 * auto-cancel them. Restores Listing.stage to 'acquired' where no other
 * active order still holds the listing.
 *
 * Spec: CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.2 §5 Day 4 + V1_4_ROADMAP §3.
 */

import { registerCron } from '../cron/cron-runner';
import { prisma } from '../db/prisma';

registerCron({
  name:     'order.reservation-expiry',
  schedule: '*/5 * * * *',
  handler:  async () => {
    const now = new Date();

    const expired = await prisma.order.findMany({
      where: {
        reservationExpiresAt: { lt: now },
        status:               { in: ['reservation_pending', 'confirmed'] },
      },
      select: { id: true, listingId: true },
    });

    if (expired.length === 0) return;

    for (const o of expired) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: o.id },
          data:  {
            status:             'cancelled',
            cancelledAt:        now,
            cancellationReason: 'reservation_expired',
          },
        });

        // Only restore listing stage if no other live orders hold it.
        const stillActive = await tx.order.count({
          where: {
            listingId: o.listingId,
            status:    { in: ['reservation_pending', 'confirmed', 'payment_pending', 'paid'] },
          },
        });
        if (stillActive === 0) {
          await tx.listing.update({
            where: { id: o.listingId },
            data:  { stage: 'acquired', reservedAt: null },
          });
        }
      });
    }

    // eslint-disable-next-line no-console
    console.log(`[cron] order.reservation-expiry processed ${expired.length} expired order(s)`);
  },
});
