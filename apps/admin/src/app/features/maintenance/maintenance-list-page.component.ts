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
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, takeUntil } from 'rxjs';

import type {
  AdminMaintenanceRequestListResponseDto,
  AdminMaintenanceRequestSummaryDto,
  MaintenanceRequestStatus,
  MaintenanceStatusCounts,
} from '@behbehani-cpo/shared-types';
import { AdminMaintenanceService } from '@behbehani-cpo/data-access';

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES: MaintenanceRequestStatus[] = [
  'pending_review',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
];

const STATUS_LABELS: Record<MaintenanceRequestStatus, string> = {
  pending_review: 'Pending Review',
  scheduled:      'Scheduled',
  in_progress:    'In Progress',
  completed:      'Completed',
  cancelled:      'Cancelled',
};

const STATUS_PILL_CLASS: Record<MaintenanceRequestStatus, string> = {
  pending_review: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  scheduled:      'bg-blue-50 text-blue-700 border-blue-200',
  in_progress:    'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed:      'bg-green-50 text-green-700 border-green-200',
  cancelled:      'bg-red-50 text-red-600 border-red-200',
};

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'admin-maintenance-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-6xl mx-auto">

      <!-- ── Page header ──────────────────────────────────────────────────── -->
      <div class="mb-5">
        <h1 class="text-xl font-semibold text-slate-800">Maintenance Requests</h1>
        <p class="text-sm text-slate-500 mt-0.5">
          @if (loading()) { Loading… }
          @else { {{ total() }} request{{ total() === 1 ? '' : 's' }} }
        </p>
      </div>

      <!-- ── Status filter chips with counts ────────────────────────────── -->
      <div class="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div class="flex flex-wrap items-center gap-2 mb-3">
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
              @if (statusCounts()) {
                · {{ statusCounts()![s] }}
              }
            </button>
          }
        </div>

        <!-- ── Search ──────────────────────────────────────────────────── -->
        <div class="relative max-w-sm">
          <svg class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"/>
          </svg>
          <input
            type="search"
            placeholder="Search by customer name, mobile or email…"
            class="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[36px]"
            [ngModel]="searchInput()"
            (ngModelChange)="onSearchChange($event)"
            aria-label="Search maintenance requests"
          />
        </div>
      </div>

      <!-- ── Error banner ─────────────────────────────────────────────────── -->
      @if (listError()) {
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ listError() }}
        </div>
      }

      <!-- ── Table ──────────────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">

        <!-- Loading skeleton -->
        @if (loading()) {
          <div class="divide-y divide-slate-100">
            @for (n of [1,2,3,4,5,6]; track n) {
              <div class="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div class="h-3 bg-slate-200 rounded w-32 shrink-0"></div>
                <div class="h-3 bg-slate-100 rounded w-24 shrink-0"></div>
                <div class="h-3 bg-slate-100 rounded w-20 shrink-0"></div>
                <div class="h-5 w-28 bg-slate-100 rounded-full shrink-0"></div>
                <div class="h-3 bg-slate-100 rounded w-20 shrink-0"></div>
              </div>
            }
          </div>
        }

        <!-- Empty state -->
        @if (!loading() && items().length === 0) {
          <div class="p-16 flex flex-col items-center justify-center text-center">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>
              </svg>
            </div>
            <h3 class="text-base font-semibold text-slate-700 mb-1">No maintenance requests found</h3>
            <p class="text-sm text-slate-400 max-w-xs mb-5">
              @if (activeStatus()) {
                No {{ STATUS_LABELS[activeStatus()!] }} requests at this time.
              } @else if (searchInput()) {
                No requests match your search.
              } @else {
                No maintenance requests have been submitted yet.
              }
            </p>
            @if (activeStatus() || searchInput()) {
              <button type="button" class="text-sm font-medium text-brand-600 hover:underline" (click)="clearFilters()">
                Clear filters
              </button>
            }
          </div>
        }

        <!-- Table -->
        @if (!loading() && items().length > 0) {
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left" aria-label="Maintenance requests list">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50">
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Governorate</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Preferred Date</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Submitted</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide sr-only">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (req of items(); track req.id) {
                  <tr
                    class="hover:bg-slate-50 transition-colors cursor-pointer"
                    (click)="viewRequest(req.id)"
                    role="row"
                  >
                    <td class="px-4 py-3">
                      <div class="font-medium text-slate-800 text-sm">{{ req.customer.fullName }}</div>
                      @if (req.customer.mobile) {
                        <div class="text-xs text-slate-400 mt-0.5">{{ req.customer.mobile }}</div>
                      }
                    </td>
                    <td class="px-4 py-3 text-slate-600 text-sm capitalize">
                      {{ req.governorate.replace('_', ' ') }}
                    </td>
                    <td class="px-4 py-3 text-slate-600 text-sm capitalize">
                      {{ req.concernCategory.replace('_', ' ') }}
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                        [ngClass]="STATUS_PILL_CLASS[req.status]"
                      >{{ STATUS_LABELS[req.status] }}</span>
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell whitespace-nowrap">
                      {{ req.preferredDate | date: 'dd MMM yyyy' }}
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-400 hidden md:table-cell whitespace-nowrap">
                      {{ req.createdAt | date: 'dd MMM yyyy HH:mm' }}
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button
                        type="button"
                        class="text-xs font-medium text-brand-600 hover:underline min-h-[36px] px-2"
                        (click)="viewRequest(req.id); $event.stopPropagation()"
                        [attr.aria-label]="'View request from ' + req.customer.fullName"
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
              >&#8249;</button>
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
              >&#8250;</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class MaintenanceListPageComponent implements OnInit, OnDestroy {
  private readonly maintenanceService = inject(AdminMaintenanceService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  // ── Public constants for template ─────────────────────────────────────────
  protected readonly STATUSES = ALL_STATUSES;
  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly STATUS_PILL_CLASS = STATUS_PILL_CLASS;
  protected readonly Math = Math;

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly activeStatus = signal<MaintenanceRequestStatus | undefined>(undefined);
  protected readonly searchInput = signal<string>('');
  protected readonly currentPage = signal<number>(1);
  protected readonly currentPageSize = signal<number>(20);
  protected readonly items = signal<AdminMaintenanceRequestSummaryDto[]>([]);
  protected readonly total = signal<number>(0);
  protected readonly statusCounts = signal<MaintenanceStatusCounts | null>(null);
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
    // Reset to page 1 when filter/status changes
    toObservable(this.activeStatus, { injector: this.injector })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.fetchList();
      });

    toObservable(this.currentPage, { injector: this.injector })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchList());

    // Debounce search input
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.fetchList();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  protected setStatus(status: MaintenanceRequestStatus | undefined): void {
    this.activeStatus.set(status);
  }

  protected onSearchChange(value: string): void {
    this.searchInput.set(value);
    this.searchSubject$.next(value);
  }

  protected clearFilters(): void {
    this.searchInput.set('');
    this.activeStatus.set(undefined);
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
  }

  protected viewRequest(id: string): void {
    this.router.navigate(['/operations/maintenance', id]);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private fetchList(): void {
    this.loading.set(true);
    this.listError.set(null);

    const query: Record<string, unknown> = {
      page:     this.currentPage(),
      pageSize: this.currentPageSize(),
    };
    const status = this.activeStatus();
    if (status) query['status'] = status;
    const search = this.searchInput().trim();
    if (search) query['search'] = search;

    this.maintenanceService
      .listRequests(query as Parameters<AdminMaintenanceService['listRequests']>[0])
      .pipe(
        catchError((err: unknown) => {
          const msg =
            (err as { error?: { message?: string }; message?: string })?.error?.message ??
            (err as { message?: string })?.message ??
            'Failed to load maintenance requests.';
          this.listError.set(msg);
          return of<AdminMaintenanceRequestListResponseDto>({
            items: [],
            total: 0,
            page: this.currentPage(),
            pageSize: this.currentPageSize(),
            statusCounts: {
              pending_review: 0,
              scheduled: 0,
              in_progress: 0,
              completed: 0,
              cancelled: 0,
            },
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.statusCounts.set(result.statusCounts);
        this.loading.set(false);
      });
  }
}
