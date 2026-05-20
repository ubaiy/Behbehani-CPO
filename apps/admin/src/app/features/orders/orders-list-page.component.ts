import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, takeUntil } from 'rxjs';

import type {
  OrderSummaryDto,
  OrderStatusValue,
  AdminOrderListResponseDto,
} from '@behbehani-cpo/shared-types';
import { AdminOrdersService } from '@behbehani-cpo/data-access';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatKwd(filsStr: string): string {
  const fils = Number(filsStr);
  if (isNaN(fils)) return '—';
  return `KWD ${(fils / 1000).toFixed(3)}`;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES: OrderStatusValue[] = [
  'reservation_pending',
  'confirmed',
  'payment_pending',
  'paid',
  'delivery_scheduled',
  'delivered',
  'completed',
  'cancelled',
];

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

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'admin-orders-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-6xl mx-auto">

      <!-- ── Page header ──────────────────────────────────────────────────── -->
      <div class="mb-5">
        <h1 class="text-xl font-semibold text-slate-800">Order Queue</h1>
        <p class="text-sm text-slate-500 mt-0.5">
          @if (loading()) { Loading… }
          @else { {{ total() }} order{{ total() === 1 ? '' : 's' }} }
        </p>
      </div>

      <!-- ── Status filter chips ──────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium text-slate-500 mr-1">Status:</span>
          <button
            type="button"
            class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium min-h-[36px]"
            [class.bg-brand-600]="!activeStatus()"
            [class.text-white]="!activeStatus()"
            [class.bg-slate-100]="!!activeStatus()"
            [class.text-slate-600]="!!activeStatus()"
            (click)="setStatus(undefined)"
          >
            All · {{ total() }}
          </button>
          @for (s of STATUSES; track s) {
            <button
              type="button"
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium min-h-[36px]"
              [class.bg-brand-600]="activeStatus() === s"
              [class.text-white]="activeStatus() === s"
              [class.bg-slate-100]="activeStatus() !== s"
              [class.text-slate-600]="activeStatus() !== s"
              (click)="setStatus(s)"
            >
              {{ STATUS_LABELS[s] }}
            </button>
          }
        </div>
      </div>

      <!-- ── Error banner ─────────────────────────────────────────────────── -->
      @if (listError()) {
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ listError() }}
        </div>
      }

      <!-- ── Orders table ──────────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">

        <!-- Loading skeleton -->
        @if (loading()) {
          <div class="divide-y divide-slate-100">
            @for (n of [1,2,3,4,5,6]; track n) {
              <div class="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div class="h-3 bg-slate-200 rounded w-24 shrink-0"></div>
                <div class="h-3 bg-slate-100 rounded w-28 shrink-0"></div>
                <div class="h-3 bg-slate-100 rounded w-16 shrink-0"></div>
                <div class="h-5 w-28 bg-slate-100 rounded-full shrink-0"></div>
                <div class="h-3 bg-slate-100 rounded w-20 shrink-0"></div>
                <div class="h-3 bg-slate-100 rounded w-28 shrink-0 hidden sm:block"></div>
              </div>
            }
          </div>
        }

        <!-- Empty state -->
        @if (!loading() && items().length === 0) {
          <div class="p-16 flex flex-col items-center justify-center text-center">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/>
              </svg>
            </div>
            <h3 class="text-base font-semibold text-slate-700 mb-1">No orders found</h3>
            <p class="text-sm text-slate-400 max-w-xs mb-5">
              @if (activeStatus()) {
                No {{ STATUS_LABELS[activeStatus()!] }} orders at this time.
              } @else {
                No orders have been placed yet.
              }
            </p>
            @if (activeStatus()) {
              <button type="button" class="text-sm font-medium text-brand-600 hover:underline" (click)="setStatus(undefined)">
                Clear filter
              </button>
            }
          </div>
        }

        <!-- Table -->
        @if (!loading() && items().length > 0) {
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left" aria-label="Orders list">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50">
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Order ID</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock #</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Total</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Reserved at</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide sr-only">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (order of items(); track order.id) {
                  <tr
                    class="hover:bg-slate-50 transition-colors cursor-pointer"
                    (click)="viewOrder(order.id)"
                    role="row"
                  >
                    <td class="px-4 py-3 font-mono text-xs text-brand-700 font-semibold">
                      <a
                        [routerLink]="['/orders', order.id]"
                        class="hover:underline focus:outline-none focus:underline"
                        (click)="$event.stopPropagation()"
                        [attr.aria-label]="'View order ' + order.id.slice(0, 8)"
                      >{{ order.id.slice(0, 8) }}…</a>
                    </td>
                    <td class="px-4 py-3 text-slate-500 text-xs">
                      Customer {{ order.id.slice(0, 8) }}…
                    </td>
                    <td class="px-4 py-3 text-slate-700 font-medium">{{ order.stockNumber }}</td>
                    <td class="px-4 py-3">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                        [ngClass]="STATUS_PILL_CLASS[order.status]"
                      >{{ STATUS_LABELS[order.status] }}</span>
                    </td>
                    <td class="px-4 py-3 text-right text-slate-700 font-medium tabular-nums">
                      {{ formatKwd(order.totalAmountFils) }}
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-400 hidden sm:table-cell whitespace-nowrap">
                      {{ order.reservedAt | date: 'dd MMM yyyy HH:mm' }}
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button
                        type="button"
                        class="text-xs font-medium text-brand-600 hover:underline min-h-[36px] px-2"
                        (click)="viewOrder(order.id); $event.stopPropagation()"
                        [attr.aria-label]="'View order ' + order.id.slice(0, 8)"
                      >View</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- ── Pagination footer ──────────────────────────────────────────── -->
          <div class="flex items-center justify-between px-4 py-3 border-t border-slate-200 flex-wrap gap-2">
            <p class="text-xs text-slate-500">
              {{ (currentPage() - 1) * currentPageSize() + 1 }}–{{ Math.min(currentPage() * currentPageSize(), total()) }}
              of {{ total() }}
            </p>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 min-h-[36px]"
                [disabled]="currentPage() <= 1"
                (click)="goToPage(currentPage() - 1)"
                aria-label="Previous page"
              >‹</button>
              @for (pg of pageNumbers(); track pg) {
                @if (pg === -1) {
                  <span class="px-1 text-xs text-slate-400">…</span>
                } @else {
                  <button
                    type="button"
                    class="px-2.5 py-1 text-xs rounded border font-semibold min-h-[36px] min-w-[36px]"
                    [class.border-brand-600]="pg === currentPage()"
                    [class.bg-brand-600]="pg === currentPage()"
                    [class.text-white]="pg === currentPage()"
                    [class.border-slate-300]="pg !== currentPage()"
                    [class.bg-white]="pg !== currentPage()"
                    [class.text-slate-700]="pg !== currentPage()"
                    (click)="goToPage(pg)"
                    [attr.aria-current]="pg === currentPage() ? 'page' : null"
                  >{{ pg }}</button>
                }
              }
              <button
                type="button"
                class="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[36px]"
                [disabled]="currentPage() >= totalPages()"
                (click)="goToPage(currentPage() + 1)"
                aria-label="Next page"
              >›</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class OrdersListPageComponent implements OnInit, OnDestroy {
  private readonly ordersService = inject(AdminOrdersService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();

  // ── Public constants for template ─────────────────────────────────────────
  protected readonly STATUSES = ALL_STATUSES;
  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly STATUS_PILL_CLASS = STATUS_PILL_CLASS;
  protected readonly formatKwd = formatKwd;
  protected readonly Math = Math;

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly activeStatus = signal<OrderStatusValue | undefined>(undefined);
  protected readonly currentPage = signal<number>(1);
  protected readonly currentPageSize = signal<number>(20);
  protected readonly items = signal<OrderSummaryDto[]>([]);
  protected readonly total = signal<number>(0);
  protected readonly loading = signal<boolean>(true);
  protected readonly listError = signal<string | null>(null);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.currentPageSize())),
  );

  protected readonly pageNumbers = computed<number[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
      pages.push(p);
    }
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    toObservable(this.activeStatus, { injector: this.injector })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.fetchList();
      });

    toObservable(this.currentPage, { injector: this.injector })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchList());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  protected setStatus(status: OrderStatusValue | undefined): void {
    this.activeStatus.set(status);
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
  }

  protected viewOrder(orderId: string): void {
    this.router.navigate(['/orders', orderId]);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private fetchList(): void {
    this.loading.set(true);
    this.listError.set(null);

    const query: Parameters<AdminOrdersService['listOrders']>[0] = {
      page:     this.currentPage(),
      pageSize: this.currentPageSize(),
    };
    const status = this.activeStatus();
    if (status !== undefined && status !== null) {
      query.status = status;
    }

    this.ordersService
      .listOrders(query)
      .pipe(
        catchError((err: unknown) => {
          const msg =
            (err as { error?: { message?: string }; message?: string })?.error?.message ??
            (err as { message?: string })?.message ??
            'Failed to load orders.';
          this.listError.set(msg);
          return of<AdminOrderListResponseDto>({
            items: [],
            total: 0,
            page: this.currentPage(),
            pageSize: this.currentPageSize(),
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      });
  }
}
