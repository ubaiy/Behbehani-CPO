import { prisma } from '../db/prisma';
import { recordAudit } from '../middleware/audit';
import type { WaitlistRequestDto, WaitlistResponseDto } from '@behbehani-cpo/shared-types';

/**
 * Self-service waitlist service.
 *
 * Per `CONCIERGE_INSPECTION_API_CONTRACT.md` v0.7 §2 item 3 — Session A's
 * thin public controller calls into this function. No notifications are
 * dispatched here; growth team mails the list out-of-band.
 *
 * Idempotent on (email): if the email is already on the list we no-op and
 * return `{ added: false }`. This lets A render the same "thanks, we'll be
 * in touch" success state without leaking whether the email was new.
 */
export async function addToWaitlist(
  dto: WaitlistRequestDto,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<WaitlistResponseDto> {
  const email = dto.email.trim().toLowerCase();
  const existing = await prisma.selfServiceWaitlist.findUnique({ where: { email } });
  if (existing) {
    return { added: false };
  }
  const row = await prisma.selfServiceWaitlist.create({
    data: {
      email,
      locale: dto.locale ?? null,
      referrer: dto.referrer ?? null,
    },
  });
  await recordAudit({
    actorId: null, // public — no authenticated actor
    action: 'waitlist.self_service.add',
    resource: 'notify.waitlist',
    resourceId: row.id,
    after: { email, locale: row.locale, referrer: row.referrer },
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
  });
  return { added: true };
}
