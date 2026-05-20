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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';

import type {
  OfferListFilter,
  OfferStatus,
  OfferSummaryDto,
} from '@behbehani-cpo/shared-types';
import { OFFER_STATUSES } from '@behbehani-cpo/shared-types';
import { OffersService, type OfferKpiDto } from '../offers.service';
import { OFFER_STATUS_CHIP_CLASS, OFFER_STATUS_LABELS, OFFER_TERMINAL_STATUSES } from '../shared/offer-labels';
import { OfferKpiStripComponent } from './offer-kpi-strip.component';

const FILTER_STATUS_PILLS: Array<{ label: string; value: OfferStatus | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Drafted', value: 'drafted' },
  { label: 'Sent', value: 'sent' },
  { label: 'Countered', value: 'countered_by_customer' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Expired', value: 'expired' },
];

function defaultFilter(): Partial<OfferListFilter> {
  return { page: 1, limit: 20 };
}

function formatKwd(fils: number): string {
  const kwd = fils / 1000;
  return `KD ${kwd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}`;
}

function validityLabel(validUntil: string, status: OfferStatus): string {
  if (OFFER_TERMINAL_STATUSES.has(status)) return '';
  const ms = new Date(validUntil).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return days === 1 ? '1 more day' : `${days} more days`;
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

const EMPTY_KPI: OfferKpiDto = {
  pendingResponse: 0,
  countersOpen: 0,
  acceptedThisWeek: 0,
  expiredThisWeek: 0,
};

@Component({
  selector: 'admin-offers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, OfferKpiStripComponent],
  template: `
    <div class="max-w-6xl mx-auto">

      <!-- Page heading -->
      <div class="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 class="text-xl font-semibold text-slate-800">Buy offers</h1>
          <p class="text-sm text-slate-500 mt-0.5">All Concierge inspection purchase offers across all stages.</p>
        </div>
      </div>

      <!-- KPI strip -->
      <admin-offer-kpi-strip [kpi]="kpi()" />

      <!-- Filters bar -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
        <div class="flex items-center gap-3 flex-wrap">
          <input
            type="search"
            placeholder="Search by ref, customer, or vehicle…"
            class="flex-1 min-w-[200px] text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[40px] bg-white"
            [ngModel]="filter().q ?? ''"
            (ngModelChange)="onSearchInput($event)"
          />
          <!-- Status filter pills -->
          <div class="flex items-center gap-1 flex-wrap">
            @for (pill of filterPills; track pill.label) {
              <button type="button"
                class="rounded-full px-3 py-1 text-xs font-semibold min-h-[32px] transition-colors"
                [class.bg-brand-700]="filter().status === pill.value"
                [class.text-white]="filter().status === pill.value"
                [class.shadow-sm]="filter().status === pill.value"
                [class.bg-white]="filter().status !== pill.value"
                [class.border]="filter().status !== pill.value"
                [class.border-slate-200]="filter().status !== pill.value"
                [class.text-slate-600]="filter().status !== pill.value"
                (click)="setStatus(pill.value)"
              >{{ pill.label }}</button>
            }
          </div>
          <!-- Sort -->
          <select
            class="text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[40px] bg-white text-slate-700"
            [ngModel]="sortOrder()"
            (ngModelChange)="sortOrder.set($event)"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="expires">Expires soonest</option>
          </select>
        </div>
      </div>

      <!-- Result count -->
      @if (!loading()) {
        <p class="text-xs text-slate-500 mb-3 px-0.5">
          Showing {{ items().length }} of {{ total() }} offers
        </p>
      }

      @if (error()) {
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
      }

      <!-- Offers table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <!-- Table header -->
        <div class="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <span>Booking / Customer / Vehicle</span>
          <span class="text-right w-24">Amount</span>
          <span class="text-center w-28">Status</span>
          <span class="text-right w-32">Validity</span>
          <span class="w-20"></span>
        </div>

        @if (loading()) {
          <!-- Skeleton rows -->
          @for (i of [0,1,2,3,4]; track i) {
            <div class="px-5 py-4 border-b border-slate-100" aria-hidden="true">
              <div class="flex items-center gap-4">
                <div class="flex-1 space-y-2">
                  <div class="animate-pulse h-3.5 rounded bg-slate-200 w-36"></div>
                  <div class="animate-pulse h-3 rounded bg-slate-100 w-48"></div>
                  <div class="animate-pulse h-3 rounded bg-slate-100 w-56"></div>
                </div>
                <div class="animate-pulse h-5 rounded bg-slate-200 w-20 hidden sm:block"></div>
                <div class="animate-pulse h-6 rounded-full bg-slate-200 w-20 hidden sm:block"></div>
                <div class="animate-pulse h-3 rounded bg-slate-200 w-20 hidden sm:block"></div>
                <div class="animate-pulse h-8 rounded-md bg-slate-200 w-14"></div>
              </div>
            </div>
          }
        }

        @if (!loading() && items().length === 0) {
          <div class="px-5 py-16 text-center">
            <svg class="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-sm font-medium text-slate-600">No offers match these filters.</p>
            <p class="text-xs text-slate-400 mt-1">Try clearing the status filter or adjusting your search.</p>
            <button type="button" class="mt-4 text-sm font-medium text-brand-600 hover:underline min-h-[44px]" (click)="resetFilters()">Reset filters</button>
          </div>
        }

        @for (offer of sortedItems(); track offer.id) {
          <div
            class="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 border-b border-slate-100 transition-colors"
            [class.bg-brand-50]="needsAction(offer)"
            [class.hover-bg-brand-50]="needsAction(offer)"
            [class.hover:bg-slate-50]="!needsAction(offer)"
            [class.opacity-70]="isTerminal(offer.status)"
          >
            <div>
              <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                <a [routerLink]="['/operations/offers', offer.id]"
                   class="text-sm font-semibold text-brand-700 hover:underline font-mono">
                  {{ offer.bookingRef }}
                </a>
                @if (needsAction(offer)) {
                  <span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-brand-100 text-brand-800 uppercase tracking-wide">Action needed</span>
                }
              </div>
              <p class="text-sm font-medium text-slate-800">{{ offer.customerFullName }}</p>
              <p class="text-xs text-slate-500">{{ offer.vehicleLabel }}</p>
            </div>

            <div class="text-right w-24">
              @if (offer.status === 'drafted') {
                <p class="text-sm font-bold text-slate-400 tabular-nums italic">Draft</p>
              } @else {
                <p class="text-sm font-bold text-slate-800 tabular-nums">{{ formatKwd(offer.offerAmountFils) }}</p>
              }
            </div>

            <div class="w-28 flex justify-center">
              <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border"
                [ngClass]="chipClass(offer.status)">
                {{ statusLabel(offer.status) }}
              </span>
            </div>

            <div class="text-right w-32">
              @if (isTerminal(offer.status)) {
                <p class="text-xs text-slate-500">{{ terminatedLabel(offer) }}</p>
              } @else if (offer.status === 'drafted') {
                <p class="text-xs text-slate-400 italic">Not sent yet</p>
              } @else {
                <p class="text-xs text-slate-600 font-medium">{{ validityLabel(offer.validUntil, offer.status) }}</p>
                <p class="text-xs text-slate-400">Exp. {{ formatDateShort(offer.validUntil) }}</p>
              }
            </div>

            <div class="w-20 flex justify-end">
              <a [routerLink]="['/operations/offers', offer.id]"
                class="rounded-md px-3 py-1.5 text-xs font-semibold min-h-[40px] inline-flex items-center shadow-sm transition-colors"
                [class.bg-brand-600]="needsAction(offer)"
                [class.text-white]="needsAction(offer)"
                [class.hover:bg-brand-700]="needsAction(offer)"
                [class.border]="!needsAction(offer)"
                [class.border-slate-300]="!needsAction(offer)"
                [class.bg-white]="!needsAction(offer)"
                [class.text-slate-700]="!needsAction(offer)"
              >View</a>
            </div>
          </div>
        }
      </div>

      <!-- Pagination -->
      @if (!loading() && totalPages() > 1) {
        <div class="flex items-center justify-between mt-4 text-sm">
          <p class="text-xs text-slate-500">Page {{ currentPage() }} of {{ totalPages() }} — {{ total() }} offers total</p>
          <div class="flex items-center gap-1">
            <button type="button"
              class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 min-h-[36px] disabled:opacity-40"
              [disabled]="currentPage() <= 1"
              (click)="goToPage(currentPage() - 1)">Previous</button>
            @for (pg of pageNumbers(); track pg) {
              @if (pg === -1) {
                <span class="px-1 text-xs text-slate-400">…</span>
              } @else {
                <button type="button"
                  class="rounded-md border px-3 py-1.5 text-xs font-semibold min-h-[36px] min-w-[36px]"
                  [class.border-brand-300]="pg === currentPage()"
                  [class.bg-brand-50]="pg === currentPage()"
                  [class.text-brand-700]="pg === currentPage()"
                  [class.border-slate-300]="pg !== currentPage()"
                  [class.bg-white]="pg !== currentPage()"
                  [class.text-slate-600]="pg !== currentPage()"
                  (click)="goToPage(pg)">{{ pg }}</button>
              }
            }
            <button type="button"
              class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 min-h-[36px] disabled:opacity-40"
              [disabled]="currentPage() >= totalPages()"
              (click)="goToPage(currentPage() + 1)">Next</button>
          </div>
        </div>
      }

    </div>
  `,
})
export class OffersListComponent implements OnInit, OnDestroy {
  private readonly service = inject(OffersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  protected readonly filterPills = FILTER_STATUS_PILLS;
  protected readonly OFFER_STATUSES = OFFER_STATUSES;

  protected readonly filter = signal<Partial<OfferListFilter>>(defaultFilter());
  protected readonly sortOrder = signal<'newest' | 'oldest' | 'expires'>('newest');
  protected readonly items = signal<OfferSummaryDto[]>([]);
  protected readonly total = signal<number>(0);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly kpi = signal<OfferKpiDto>(EMPTY_KPI);

  protected readonly currentPage = computed(() => this.filter().page ?? 1);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / (this.filter().limit ?? 20))),
  );
  protected readonly pageNumbers = computed<number[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  });

  protected readonly sortedItems = computed(() => {
    const list = [...this.items()];
    const order = this.sortOrder();
    if (order === 'oldest') return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (order === 'expires') return list.sort((a, b) => a.validUntil.localeCompare(b.validUntil));
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  protected formatKwd = formatKwd;
  protected validityLabel = validityLabel;
  protected formatDateShort = formatDateShort;
  protected initials = initials;

  protected statusLabel(status: OfferStatus): string {
    return OFFER_STATUS_LABELS[status];
  }

  protected chipClass(status: OfferStatus): string {
    return OFFER_STATUS_CHIP_CLASS[status];
  }

  protected needsAction(offer: OfferSummaryDto): boolean {
    return offer.status === 'countered_by_customer';
  }

  protected isTerminal(status: OfferStatus): boolean {
    return OFFER_TERMINAL_STATUSES.has(status);
  }

  protected terminatedLabel(offer: OfferSummaryDto): string {
    if (offer.status === 'accepted' && offer.respondedAt) {
      return `Accepted ${formatDateShort(offer.respondedAt)}`;
    }
    if (offer.status === 'declined' && offer.respondedAt) {
      return `Declined ${formatDateShort(offer.respondedAt)}`;
    }
    if (offer.status === 'expired') {
      return `Expired ${formatDateShort(offer.validUntil)}`;
    }
    if (offer.status === 'withdrawn') return 'Withdrawn';
    return '';
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const seeded: Partial<OfferListFilter> = { ...defaultFilter() };
    const q = params.get('q'); if (q) seeded.q = q;
    const status = params.get('status') as OfferStatus | null;
    if (status && (OFFER_STATUSES as readonly string[]).includes(status)) seeded.status = status;
    const page = params.get('page'); if (page) seeded.page = Number(page);
    this.filter.set(seeded);

    this.service.getKpi().pipe(takeUntil(this.destroy$)).subscribe({
      next: (kpi) => this.kpi.set(kpi),
      error: () => { /* KPI is non-critical; fail silently */ },
    });

    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => this.filter.update((f) => ({ ...f, q: q || undefined, page: 1 })));

    toObservable(this.filter, { injector: this.injector })
      .pipe(
        switchMap((f) => {
          this.loading.set(true);
          this.error.set(null);
          this.pushQueryParams(f);
          return this.service.list(f).pipe(
            catchError((err) => {
              this.error.set((err as Error)?.message ?? 'Failed to load offers.');
              return of({ data: [], total: 0, page: 1, limit: f.limit ?? 20 });
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        this.items.set(result.data);
        this.total.set(result.total);
        this.loading.set(false);
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  protected onSearchInput(q: string): void { this.searchSubject.next(q); }
  protected setStatus(status: OfferStatus | undefined): void { this.filter.update((f) => ({ ...f, status, page: 1 })); }
  protected resetFilters(): void { this.filter.set(defaultFilter()); }
  protected goToPage(page: number): void { this.filter.update((f) => ({ ...f, page })); }

  private pushQueryParams(f: Partial<OfferListFilter>): void {
    const queryParams: Record<string, string | number | undefined> = {};
    if (f.q) queryParams['q'] = f.q;
    if (f.status) queryParams['status'] = f.status;
    if (f.page && f.page !== 1) queryParams['page'] = f.page;
    void this.router.navigate(['/operations/offers'], { queryParams, replaceUrl: true });
  }
}
