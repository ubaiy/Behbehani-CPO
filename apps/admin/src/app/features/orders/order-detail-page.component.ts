import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, firstValueFrom, of, takeUntil } from 'rxjs';

import type {
  OrderDetailDto,
  OrderStatusValue,
  PaymentSummaryDto,
} from '@behbehani-cpo/shared-types';
import { AdminOrdersService } from '@behbehani-cpo/data-access';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatKwd(filsStr: string): string {
  const fils = Number(filsStr);
  if (isNaN(fils)) return '—';
  return `KWD ${(fils / 1000).toFixed(3)}`;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<OrderStatusValue, string> = {
  reservation_pending: 'Reservation Pending',
  confirmed:           'Confirmed',
  payment_pending:     'Payment Pending',
  paid:                'Paid',
  delivery_scheduled:  'Delivery Scheduled',
  delivered:           'Delivered',
  completed:           'Completed',
  cancelled:           'Cancelled',
};

const STATUS_PILL_CLASS: Record<OrderStatusValue, string> = {
  reservation_pending: 'bg-slate-100 text-slate-600 border-slate-200',
  confirmed:           'bg-brand-50 text-brand-700 border-brand-200',
  payment_pending:     'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid:                'bg-blue-50 text-blue-700 border-blue-200',
  delivery_scheduled:  'bg-blue-100 text-blue-800 border-blue-200',
  delivered:           'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed:           'bg-green-50 text-green-700 border-green-200',
  cancelled:           'bg-red-50 text-red-600 border-red-200',
};

/** Statuses that allow advancing to a next status. */
const STATUS_UPDATE_ALLOWED: OrderStatusValue[] = ['paid', 'delivery_scheduled', 'delivered'];

/** Statuses that do NOT allow cancellation. */
const TERMINAL_STATUSES: OrderStatusValue[] = ['completed', 'cancelled'];

/** Valid next-status transitions per spec: paid → delivery_scheduled → delivered → completed */
const NEXT_STATUSES: Partial<Record<OrderStatusValue, OrderStatusValue[]>> = {
  paid:               ['delivery_scheduled'],
  delivery_scheduled: ['delivered'],
  delivered:          ['completed'],
};

type ActionBusy = 'idle' | 'updating' | 'cancelling';

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'admin-order-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-4xl mx-auto">

      <!-- ── Back link ────────────────────────────────────────────────────── -->
      <div class="mb-4">
        <a
          routerLink="/orders"
          class="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline focus:outline-none focus:underline"
          aria-label="Back to order queue"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
          Order Queue
        </a>
      </div>

      <!-- ── Loading skeleton ──────────────────────────────────────────────── -->
      @if (loading()) {
        <div class="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-4">
          <div class="h-6 bg-slate-200 rounded w-1/3"></div>
          <div class="h-4 bg-slate-100 rounded w-1/2"></div>
          <div class="h-4 bg-slate-100 rounded w-2/3"></div>
        </div>
      }

      <!-- ── Load error ────────────────────────────────────────────────────── -->
      @if (!loading() && loadError()) {
        <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {{ loadError() }}
        </div>
      }

      @if (!loading() && order()) {
        <!-- ── Page header ──────────────────────────────────────────────── -->
        <div class="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 class="text-xl font-semibold text-slate-800">
              Order — Stock #{{ order()!.stockNumber }}
            </h1>
            <p class="text-xs font-mono text-slate-400 mt-0.5">{{ order()!.id }}</p>
          </div>
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border"
            [ngClass]="STATUS_PILL_CLASS[order()!.status]"
          >{{ STATUS_LABELS[order()!.status] }}</span>
        </div>

        <!-- ── Toast / success banner ─────────────────────────────────── -->
        @if (successMessage()) {
          <div
            class="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            role="status"
            aria-live="polite"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            {{ successMessage() }}
          </div>
        }

        <!-- ── Action error ────────────────────────────────────────────── -->
        @if (actionError()) {
          <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {{ actionError() }}
          </div>
        }

        <!-- ── Summary card ────────────────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 class="text-base font-semibold text-slate-800 mb-4">Order Summary</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt class="text-slate-500">Customer</dt>
              <dd class="font-medium text-slate-800 mt-0.5">
                Customer {{ order()!.id.slice(0, 8) }}…
              </dd>
            </div>
            <div>
              <dt class="text-slate-500">Listing ID</dt>
              <dd class="font-mono text-slate-700 mt-0.5">{{ order()!.listingId.slice(0, 8) }}…</dd>
            </div>
            <div>
              <dt class="text-slate-500">Stock Number</dt>
              <dd class="font-semibold text-slate-800 mt-0.5">{{ order()!.stockNumber }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Status</dt>
              <dd class="mt-0.5">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                  [ngClass]="STATUS_PILL_CLASS[order()!.status]"
                >{{ STATUS_LABELS[order()!.status] }}</span>
              </dd>
            </div>

            <!-- Amounts -->
            <div>
              <dt class="text-slate-500">Reservation Amount</dt>
              <dd class="font-medium text-slate-800 tabular-nums mt-0.5">
                {{ formatKwd(order()!.reservationAmountFils) }}
              </dd>
            </div>
            <div>
              <dt class="text-slate-500">Total Amount</dt>
              <dd class="font-semibold text-slate-800 tabular-nums mt-0.5">
                {{ formatKwd(order()!.totalAmountFils) }}
              </dd>
            </div>
            <div>
              <dt class="text-slate-500">Paid Amount</dt>
              <dd class="font-medium text-slate-800 tabular-nums mt-0.5">
                {{ formatKwd(order()!.paidAmountFils) }}
              </dd>
            </div>

            <!-- Dates -->
            <div>
              <dt class="text-slate-500">Reserved at</dt>
              <dd class="text-slate-700 mt-0.5">{{ order()!.reservedAt | date: 'dd MMM yyyy HH:mm' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Reservation Expires</dt>
              <dd class="text-slate-700 mt-0.5">{{ order()!.reservationExpiresAt | date: 'dd MMM yyyy HH:mm' }}</dd>
            </div>
            @if (order()!.completedAt) {
              <div>
                <dt class="text-slate-500">Completed at</dt>
                <dd class="text-slate-700 mt-0.5">{{ order()!.completedAt | date: 'dd MMM yyyy HH:mm' }}</dd>
              </div>
            }
            @if (order()!.cancelledAt) {
              <div>
                <dt class="text-slate-500">Cancelled at</dt>
                <dd class="text-slate-700 mt-0.5">{{ order()!.cancelledAt | date: 'dd MMM yyyy HH:mm' }}</dd>
              </div>
            }
          </dl>
        </div>

        <!-- ── Payments table ──────────────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200">
            <h2 class="text-base font-semibold text-slate-800">Payments</h2>
          </div>
          @if (order()!.payments.length === 0) {
            <p class="px-6 py-8 text-sm text-slate-400 text-center">No payments recorded for this order.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left" aria-label="Payments">
                <thead>
                  <tr class="border-b border-slate-200 bg-slate-50">
                    <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ID</th>
                    <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Method</th>
                    <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Amount</th>
                    <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Initiated</th>
                    <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Paid</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (pmt of order()!.payments; track pmt.id) {
                    <tr>
                      <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ pmt.id.slice(0, 8) }}…</td>
                      <td class="px-4 py-3 text-slate-700">{{ pmt.method }}</td>
                      <td class="px-4 py-3">
                        <span [ngClass]="paymentPillClass(pmt)"
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                        >{{ pmt.status }}</span>
                      </td>
                      <td class="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                        {{ formatKwd(pmt.amountFils) }}
                      </td>
                      <td class="px-4 py-3 text-xs text-slate-400 hidden md:table-cell whitespace-nowrap">
                        {{ pmt.initiatedAt | date: 'dd MMM yyyy HH:mm' }}
                      </td>
                      <td class="px-4 py-3 text-xs text-slate-400 hidden md:table-cell whitespace-nowrap">
                        {{ pmt.paidAt ? (pmt.paidAt | date: 'dd MMM yyyy HH:mm') : '—' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- ── Action panels ───────────────────────────────────────────── -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          <!-- Status update panel -->
          @if (canUpdateStatus()) {
            <div class="bg-white rounded-xl border border-brand-200 p-6" role="region" aria-label="Update order status">
              <h2 class="text-base font-semibold text-slate-800 mb-4">Update Status</h2>
              <form [formGroup]="statusForm" (ngSubmit)="submitStatusUpdate()" novalidate>
                <div class="mb-3">
                  <label class="block text-sm font-medium text-slate-700 mb-1" for="next-status">
                    Next Status <span class="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="next-status"
                    formControlName="status"
                    class="w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                    aria-required="true"
                  >
                    <option value="" disabled>Select next status…</option>
                    @for (ns of nextStatusOptions(); track ns) {
                      <option [value]="ns">{{ STATUS_LABELS[ns] }}</option>
                    }
                  </select>
                </div>
                <div class="mb-4">
                  <label class="block text-sm font-medium text-slate-700 mb-1" for="status-note">
                    Note <span class="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="status-note"
                    formControlName="note"
                    rows="3"
                    maxlength="500"
                    placeholder="Internal note about this status change…"
                    class="w-full px-3 py-2 text-sm rounded-md border border-slate-300 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500"
                  ></textarea>
                </div>
                <div class="flex justify-end">
                  <button
                    type="submit"
                    class="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    [disabled]="statusForm.invalid || actionBusy() !== 'idle'"
                  >
                    @if (actionBusy() === 'updating') {
                      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    }
                    Update Status
                  </button>
                </div>
              </form>
            </div>
          }

          <!-- Cancel panel -->
          @if (canCancel()) {
            <div class="bg-white rounded-xl border border-red-200 p-6" role="region" aria-label="Cancel order">
              <h2 class="text-base font-semibold text-slate-800 mb-1">Cancel Order</h2>
              <p class="text-xs text-slate-500 mb-4">Cancellation is permanent. A reason is required.</p>
              <form [formGroup]="cancelForm" (ngSubmit)="confirmCancel()" novalidate>
                <div class="mb-4">
                  <label class="block text-sm font-medium text-slate-700 mb-1" for="cancel-reason">
                    Reason <span class="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="cancel-reason"
                    formControlName="reason"
                    rows="3"
                    maxlength="500"
                    placeholder="Reason for cancellation (min 3 characters)…"
                    class="w-full px-3 py-2 text-sm rounded-md border border-slate-300 resize-y focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-required="true"
                  ></textarea>
                  @if (cancelForm.get('reason')?.invalid && cancelForm.get('reason')?.touched) {
                    <p class="mt-1 text-xs text-red-600">Reason is required (min 3 characters).</p>
                  }
                </div>

                <!-- Confirm overlay -->
                @if (showCancelConfirm()) {
                  <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <p class="font-semibold mb-2">Confirm cancellation?</p>
                    <p class="mb-3 text-xs">This cannot be undone. The order will be marked as cancelled.</p>
                    <div class="flex items-center gap-3">
                      <button
                        type="button"
                        class="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 min-h-[36px]"
                        [disabled]="actionBusy() !== 'idle'"
                        (click)="submitCancel()"
                      >
                        @if (actionBusy() === 'cancelling') {
                          <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        }
                        Yes, cancel order
                      </button>
                      <button
                        type="button"
                        class="text-xs font-medium text-slate-600 hover:text-slate-800 min-h-[36px] px-2"
                        (click)="dismissCancelConfirm()"
                      >Go back</button>
                    </div>
                  </div>
                }

                @if (!showCancelConfirm()) {
                  <div class="flex justify-end">
                    <button
                      type="submit"
                      class="inline-flex items-center rounded-md border border-red-300 bg-white px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                      [disabled]="cancelForm.invalid || actionBusy() !== 'idle'"
                    >
                      Cancel Order
                    </button>
                  </div>
                }
              </form>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class OrderDetailPageComponent implements OnInit, OnDestroy {
  private readonly ordersService = inject(AdminOrdersService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // ── Public constants for template ─────────────────────────────────────────
  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly STATUS_PILL_CLASS = STATUS_PILL_CLASS;
  protected readonly formatKwd = formatKwd;

  // ── State ─────────────────────────────────────────────────────────────────
  protected readonly orderId = signal<string>('');
  protected readonly order = signal<OrderDetailDto | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionBusy = signal<ActionBusy>('idle');
  protected readonly actionError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly showCancelConfirm = signal<boolean>(false);

  protected readonly canUpdateStatus = computed(() => {
    const o = this.order();
    return o !== null && STATUS_UPDATE_ALLOWED.includes(o.status);
  });

  protected readonly canCancel = computed(() => {
    const o = this.order();
    return o !== null && !TERMINAL_STATUSES.includes(o.status);
  });

  protected readonly nextStatusOptions = computed((): OrderStatusValue[] => {
    const o = this.order();
    if (!o) return [];
    return NEXT_STATUSES[o.status] ?? [];
  });

  // ── Forms ─────────────────────────────────────────────────────────────────
  protected readonly statusForm = this.fb.group({
    status: ['', Validators.required],
    note:   [''],
  });

  protected readonly cancelForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(3)]],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('orderId') ?? '';
    this.orderId.set(id);
    this.fetchOrder();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  protected paymentPillClass(pmt: PaymentSummaryDto): string {
    switch (pmt.status) {
      case 'succeeded': return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':    return 'bg-red-50 text-red-600 border-red-200';
      case 'refunded':  return 'bg-slate-100 text-slate-600 border-slate-200';
      default:          return 'bg-yellow-50 text-yellow-700 border-yellow-200'; // pending
    }
  }

  // ── Status update ─────────────────────────────────────────────────────────

  protected async submitStatusUpdate(): Promise<void> {
    if (this.statusForm.invalid) return;
    const { status, note } = this.statusForm.getRawValue() as { status: string; note: string };
    this.actionBusy.set('updating');
    this.actionError.set(null);
    this.successMessage.set(null);

    try {
      const body: { status: 'delivery_scheduled' | 'delivered' | 'completed'; note?: string } = {
        status: status as 'delivery_scheduled' | 'delivered' | 'completed',
      };
      if (note && note.trim()) body.note = note.trim();

      await firstValueFrom(
        this.ordersService.updateStatus(this.orderId(), body),
      );

      this.statusForm.reset({ status: '', note: '' });
      this.successMessage.set(`Order status updated to "${STATUS_LABELS[status as OrderStatusValue]}".`);
      this.fetchOrder();
    } catch (err: unknown) {
      const msg =
        (err as { error?: { message?: string }; message?: string })?.error?.message ??
        (err as { message?: string })?.message ??
        'Failed to update status.';
      this.actionError.set(msg);
    } finally {
      this.actionBusy.set('idle');
    }
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  protected confirmCancel(): void {
    if (this.cancelForm.invalid) return;
    this.showCancelConfirm.set(true);
  }

  protected dismissCancelConfirm(): void {
    this.showCancelConfirm.set(false);
  }

  protected async submitCancel(): Promise<void> {
    if (this.cancelForm.invalid) return;
    const { reason } = this.cancelForm.getRawValue() as { reason: string };
    this.actionBusy.set('cancelling');
    this.actionError.set(null);
    this.successMessage.set(null);

    try {
      await firstValueFrom(
        this.ordersService.cancelOrder(this.orderId(), { reason }),
      );

      this.cancelForm.reset({ reason: '' });
      this.showCancelConfirm.set(false);
      this.successMessage.set('Order has been cancelled.');
      this.fetchOrder();
    } catch (err: unknown) {
      const msg =
        (err as { error?: { message?: string }; message?: string })?.error?.message ??
        (err as { message?: string })?.message ??
        'Failed to cancel order.';
      this.actionError.set(msg);
      this.showCancelConfirm.set(false);
    } finally {
      this.actionBusy.set('idle');
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private fetchOrder(): void {
    const id = this.orderId();
    if (!id) return;

    this.loading.set(true);
    this.loadError.set(null);

    this.ordersService
      .getOrder(id)
      .pipe(
        catchError((err: unknown) => {
          const msg =
            (err as { error?: { message?: string }; message?: string })?.error?.message ??
            (err as { message?: string })?.message ??
            'Failed to load order.';
          this.loadError.set(msg);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        if (result) {
          this.order.set(result);
          // Reset action forms when order reloads
          this.statusForm.reset({ status: '', note: '' });
        }
        this.loading.set(false);
      });
  }
}
