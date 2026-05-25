import { prisma } from '../db/prisma';

/**
 * v1.5.34 — orphan-row reconciliation, closes A v1.5-D19 `[ASK A→B-7]`.
 *
 * Background: anonymous customers can submit the /sell concierge wizard
 * without signing in. The booking-create path (see
 * `inspections.service.ts#createConciergeInspection`) looks up an existing
 * User by mobile-or-email, and creates a *ghost* User (passwordHash=NULL) if
 * none matches. The InspectionReport row is linked to that ghost's id.
 *
 * When the customer later signs in / signs up with the same email or mobile,
 * the ghost-upgrade branch in `auth.service.ts#registerCustomer` already
 * handles the merge for the REGISTER path. But two gaps remain:
 *
 *   1. **Sign-in to a pre-existing real account** — if the customer signed
 *      up first, then later filled the wizard while logged out using the
 *      SAME email/mobile as their real account, `findCustomerByMobileOrEmail`
 *      finds the real user and links correctly. ✓ no problem there.
 *
 *      The real failure mode is when the wizard email/mobile *differs* from
 *      the real account's. A ghost user is created, the booking is linked to
 *      the ghost, and `/account/sell-bookings` (which queries
 *      `customerId = signedInUser.id`) returns empty.
 *
 *   2. **OTP-signin without prior register** — the OTP-signin flow doesn't
 *      go through ghost-upgrade; it just mints a session against an existing
 *      User. If that user is itself a ghost (passwordHash=NULL), no row
 *      needs reassignment. But ghosts can also collide with the new
 *      authenticated session in other ways — see scenario 1 above.
 *
 * Fix: after any successful authentication, look for *other* ghost users
 * whose email or mobile matches the authenticated user, then reassign all
 * orphan `InspectionReport.customerId` rows from those ghosts to the real
 * user. The OTP/password verification is the trust boundary — we only
 * reassign rows that match the identifiers the user just proved ownership of.
 *
 * Race-safety: `updateMany` is atomic. The function is idempotent — calling
 * it twice in a row finds zero ghosts the second time.
 *
 * Non-blocking by design: failures are logged but never propagated to the
 * caller; orphan reconciliation must never block sign-in/sign-up.
 *
 * Out of scope for v1.5.34: `Lead` + `TestDriveBooking` reconciliation.
 * Those tables have `customerEmail`/`customerPhone` columns but no
 * `customerId` FK; adding one requires a Prisma migration. Defer until a
 * follow-up if/when admin needs to surface those rows in /account/*.
 */
export async function reconcileOrphansToUser(userId: string): Promise<{
  ghostsMatched: number;
  inspectionReportsReassigned: number;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mobile: true },
    });
    if (!user) return { ghostsMatched: 0, inspectionReportsReassigned: 0 };
    if (!user.email && !user.mobile) {
      // No identifiers to match — nothing to do.
      return { ghostsMatched: 0, inspectionReportsReassigned: 0 };
    }

    // Find ghost users (passwordHash IS NULL) that share an identifier with
    // the real user, excluding the real user themselves. role=customer
    // mirrors `findCustomerByMobileOrEmail` so we don't accidentally hit
    // admins/inspectors. deletedAt=null skips tombstones.
    const orFilter: Array<{ email: string } | { mobile: string }> = [];
    if (user.email) orFilter.push({ email: user.email });
    if (user.mobile) orFilter.push({ mobile: user.mobile });

    const ghosts = await prisma.user.findMany({
      where: {
        id: { not: userId },
        role: 'customer',
        passwordHash: null,
        deletedAt: null,
        OR: orFilter,
      },
      select: { id: true },
    });

    if (ghosts.length === 0) {
      return { ghostsMatched: 0, inspectionReportsReassigned: 0 };
    }
    const ghostIds = ghosts.map((g) => g.id);

    // Reassign all InspectionReport rows from ghosts to the real user.
    // We do NOT delete the ghost User rows themselves — they may still be
    // referenced by other tables (Address, Document, etc. — none for ghosts
    // today, but cheap retention insurance for the future), and ghost rows
    // are harmless empty shells once their inspections are reassigned.
    const reassigned = await prisma.inspectionReport.updateMany({
      where: { customerId: { in: ghostIds } },
      data:  { customerId: userId, updatedAt: new Date() },
    });

    if (reassigned.count > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[orphan-reconcile] userId=${userId} matched ${ghosts.length} ghost(s), reassigned ${reassigned.count} InspectionReport row(s)`,
      );
    }

    return {
      ghostsMatched: ghosts.length,
      inspectionReportsReassigned: reassigned.count,
    };
  } catch (err) {
    // Never block sign-in/sign-up on this. Surface the error to logs so we
    // can spot regressions, then swallow.
    // eslint-disable-next-line no-console
    console.error('[orphan-reconcile] failed', { userId, err });
    return { ghostsMatched: 0, inspectionReportsReassigned: 0 };
  }
}
