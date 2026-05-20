import type {
  AdminOrderCancelDto,
  AdminOrderListQueryDto,
  AdminOrderListResponseDto,
  AdminOrderStatusUpdateDto,
  OrderDetailDto,
  OrderSummaryDto,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';
import { generateSaleContractPdf } from './sale-contract-pdf.service';
import { putObjectToS3 } from '../lib/s3';

export type AdminOrderErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'INVALID_STATUS_TRANSITION'
  | 'ORDER_ALREADY_TERMINAL';

export class AdminOrderError extends Error {
  constructor(public readonly code: AdminOrderErrorCode, message: string) {
    super(message);
    this.name = 'AdminOrderError';
  }
}

/** Project a Prisma Order row into the public summary shape. *Fils fields → BigInt-strings. */
function toSummary(row: {
  id: string;
  listingId: string;
  stockNumber: string;
  status: string;
  reservationAmountFils: bigint;
  totalAmountFils: bigint;
  paidAmountFils: bigint;
  reservationExpiresAt: Date;
  reservedAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
}): OrderSummaryDto {
  return {
    id:                     row.id,
    listingId:              row.listingId,
    stockNumber:            row.stockNumber,
    status:                 row.status as OrderSummaryDto['status'],
    reservationAmountFils:  row.reservationAmountFils.toString(),
    totalAmountFils:        row.totalAmountFils.toString(),
    paidAmountFils:         row.paidAmountFils.toString(),
    reservationExpiresAt:   row.reservationExpiresAt.toISOString(),
    reservedAt:             row.reservedAt.toISOString(),
    completedAt:            row.completedAt?.toISOString() ?? null,
    cancelledAt:            row.cancelledAt?.toISOString() ?? null,
  };
}

/** Admin paginated list of all orders, filterable by status + customerId. */
export async function listAllOrders(query: AdminOrderListQueryDto): Promise<AdminOrderListResponseDto> {
  const where = {
    ...(query.status     ? { status: query.status }         : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { reservedAt: 'desc' },
      take:    query.pageSize,
      skip:    (query.page - 1) * query.pageSize,
    }),
  ]);
  return {
    items:    rows.map(toSummary),
    total,
    page:     query.page,
    pageSize: query.pageSize,
  };
}

/** Admin: full order detail with payments. No ownership check (admin can read any order). */
export async function getAdminOrderDetail(orderId: string): Promise<OrderDetailDto> {
  const row = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: { orderBy: { initiatedAt: 'desc' } } },
  });
  if (!row) {
    throw new AdminOrderError('ORDER_NOT_FOUND', 'Order not found');
  }
  return {
    ...toSummary(row),
    payments: row.payments.map((p) => ({
      id:           p.id,
      amountFils:   p.amountFils.toString(),
      method:       p.method as OrderDetailDto['payments'][number]['method'],
      status:       p.status as OrderDetailDto['payments'][number]['status'],
      initiatedAt:  p.initiatedAt.toISOString(),
      paidAt:       p.paidAt?.toISOString()     ?? null,
      failedAt:     p.failedAt?.toISOString()   ?? null,
      refundedAt:   p.refundedAt?.toISOString() ?? null,
    })),
  };
}

/**
 * Admin can cancel any order NOT already in a terminal state.
 * Terminal states: 'completed', 'cancelled'.
 *
 * Restores Listing.stage to 'acquired' if no other live order holds it.
 * Refund handling is deferred to v1.6 Returns — this just marks the Order cancelled.
 */
export async function cancelOrderAsAdmin(
  adminUserId: string,
  orderId: string,
  input: AdminOrderCancelDto,
): Promise<OrderSummaryDto> {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, listingId: true },
  });
  if (!existing) {
    throw new AdminOrderError('ORDER_NOT_FOUND', 'Order not found');
  }
  if (existing.status === 'completed' || existing.status === 'cancelled') {
    throw new AdminOrderError('ORDER_ALREADY_TERMINAL', `Order is already ${existing.status}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: orderId },
      data:  { status: 'cancelled', cancelledAt: new Date(), cancellationReason: input.reason },
    });
    const stillReserved = await tx.order.count({
      where: {
        listingId: existing.listingId,
        status:    { in: ['reservation_pending', 'confirmed', 'payment_pending', 'paid'] },
      },
    });
    if (stillReserved === 0) {
      await tx.listing.update({ where: { id: existing.listingId }, data: { stage: 'acquired' } });
    }
    return o;
  });

  return toSummary(updated);
}

/**
 * Advance order status through delivery flow. Valid transitions:
 *   paid                → delivery_scheduled
 *   delivery_scheduled  → delivered
 *   delivered           → completed
 *
 * Any other transition throws INVALID_STATUS_TRANSITION.
 */
export async function updateOrderStatus(
  adminUserId: string,
  orderId: string,
  input: AdminOrderStatusUpdateDto,
): Promise<OrderSummaryDto> {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!existing) {
    throw new AdminOrderError('ORDER_NOT_FOUND', 'Order not found');
  }
  const validTransitions: Record<string, string[]> = {
    paid:               ['delivery_scheduled'],
    delivery_scheduled: ['delivered'],
    delivered:          ['completed'],
  };
  const allowed = validTransitions[existing.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw new AdminOrderError(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition from ${existing.status} to ${input.status}`,
    );
  }

  const data: Record<string, unknown> = { status: input.status };
  if (input.status === 'completed') data.completedAt = new Date();
  // TODO v1.4.x: persist `note` to an audit log row when admin AuditLog pattern is established.

  const updated = await prisma.order.update({
    where: { id: orderId },
    data,
  });

  if (input.status === 'completed') {
    try {
      const contractBytes = await generateSaleContractPdf({ orderId });
      const fileKey = `orders/${orderId}/contract.pdf`;
      await putObjectToS3(fileKey, contractBytes, 'application/pdf');
      await prisma.document.create({
        data: {
          customerId:    updated.customerId,
          kind:          'sale_contract',
          title:         `Sale contract — order ${updated.stockNumber}`,
          fileKey,
          mimeType:      'application/pdf',
          fileSizeBytes: contractBytes.length,
          orderId:       updated.id,
          uploadedById:  adminUserId || null,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[admin-order.service] sale_contract PDF gen failed', { orderId, err });
      // Do NOT roll back — the contract is supplementary; admin can re-trigger
      // via a separate endpoint in v1.4.x if needed.
    }
  }

  return toSummary(updated);
}
