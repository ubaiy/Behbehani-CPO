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
import { ActivatedRoute, Router } from '@angular/router';
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
  InspectionFilter,
  InspectionKind,
  InspectionListResponse,
  InspectionStatus,
  InspectionSummaryDto,
} from '@behbehani-cpo/shared-types';
import { INSPECTION_KINDS, INSPECTION_STATUSES } from '@behbehani-cpo/shared-types';
import { AdminInspectionsService } from '@behbehani-cpo/data-access';

import { KIND_LABELS, STATUS_LABELS } from '../shared/inspection-labels';
import {
  InspectionKpiStripComponent,
  type InspectionQueueKpi,
} from './inspection-kpi-strip.component';
import { InspectionTableComponent } from './inspection-table.component';

const PAGE_SIZES = [10, 25, 50, 100] as const;

function defaultFilter(): Partial<InspectionFilter> {
  return { page: 1, pageSize: 25 };
}

@Component({
  selector: 'admin-inspection-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, InspectionKpiStripComponent, InspectionTableComponent],
  template: `
    <div class="max-w-7xl mx-auto">
    <!-- ── Page header ──────────────────────────────────────────────── -->
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-semibold text-slate-800">Inspections</h1>
        <p class="text-sm text-slate-500 mt-0.5">
          @if (loading()) { Loading… }
          @else {
            {{ total() }} vehicles in the workflow
            @if (kpi().awaitingSignoff > 0) {
              · <span class="font-medium text-brand-700">{{ kpi().awaitingSignoff }} awaiting your sign-off</span>
            }
            @if (kpi().awaitingCustomerSig > 0) {
              · <span class="font-medium text-brand-700">{{ kpi().awaitingCustomerSig }} awaiting customer signature</span>
            }
          }
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px]">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          New Concierge request
        </button>
        <button type="button" class="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 min-h-[44px]">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Start CPO inspection
        </button>
      </div>
    </div>

    <!-- ── KPI strip ─────────────────────────────────────────────────── -->
    @if (!loading()) {
      <admin-inspection-kpi-strip [kpi]="kpi()" />
    }

    <!-- ── Filter strip ──────────────────────────────────────────────── -->
    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex-1 min-w-64">
          <label class="block text-xs font-medium text-slate-600 mb-1">Search</label>
          <input
            type="search"
            placeholder="Stock #, VIN, title, customer name/mobile…"
            class="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            [ngModel]="filter().q ?? ''"
            (ngModelChange)="onSearchInput($event)"
          />
        </div>
        <button type="button" class="text-sm text-slate-500 hover:text-brand-600 font-medium pb-0.5 min-h-[44px]" (click)="resetFilters()">Reset filters</button>
      </div>
      <div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        <span class="text-xs font-medium text-slate-500 mr-1">Kind:</span>
        <button type="button" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium min-h-[36px]"
          [class.bg-brand-600]="!filter().kind" [class.text-white]="!filter().kind"
          [class.bg-slate-100]="!!filter().kind" [class.text-slate-600]="!!filter().kind"
          [class.hover:bg-slate-200]="!!filter().kind"
          (click)="setKind(undefined)">All · {{ total() }}</button>
        @for (k of KINDS; track k) {
          <button type="button" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium min-h-[36px]"
            [class.bg-brand-600]="filter().kind === k" [class.text-white]="filter().kind === k"
            [class.bg-slate-100]="filter().kind !== k" [class.text-slate-600]="filter().kind !== k"
            [class.hover:bg-slate-200]="filter().kind !== k"
            (click)="setKind(k)">
            @if (k === 'cpo') {
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            } @else if (k === 'concierge') {
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            }
            {{ KIND_LABELS[k] }}
          </button>
        }
        <span class="text-xs font-medium text-slate-500 ml-4 mr-1">Status:</span>
        <button type="button" class="px-2.5 py-1 rounded-full text-xs font-medium min-h-[36px]"
          [class.bg-brand-600]="!filter().status" [class.text-white]="!filter().status"
          [class.bg-slate-100]="!!filter().status" [class.text-slate-600]="!!filter().status"
          (click)="setStatus(undefined)">All</button>
        @for (s of STATUSES; track s) {
          <button type="button" class="px-2.5 py-1 rounded-full text-xs font-medium min-h-[36px]"
            [class.bg-brand-600]="filter().status === s" [class.text-white]="filter().status === s"
            [class.bg-slate-100]="filter().status !== s" [class.text-slate-600]="filter().status !== s"
            (click)="setStatus(s)">{{ STATUS_LABELS[s] }}</button>
        }
      </div>
    </div>

    @if (error()) {
      <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
    }

    @if (!loading() && items().length === 0) {
      <div class="bg-white rounded-xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h3 class="text-base font-semibold text-slate-700 mb-1">No inspections match your filters</h3>
        <p class="text-sm text-slate-400 max-w-xs mb-6">Adjust the search or chip filters to widen the view.</p>
        <button type="button" class="text-sm font-medium text-brand-600 hover:underline" (click)="resetFilters()">Reset filters</button>
      </div>
    }

    @if (loading() || items().length > 0) {
      <admin-inspection-table [items]="items()" [loading]="loading()">
        <!-- Pagination footer projected into the table wrapper -->
        <div class="flex items-center justify-between px-4 py-3 border-t border-slate-200 flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-500" for="page-size-select">Rows per page:</label>
            <select id="page-size-select" class="text-xs rounded border border-slate-300 py-1 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              [ngModel]="currentPageSize()" (ngModelChange)="onPageSizeChange($event)">
              @for (size of pageSizes; track size) { <option [value]="size">{{ size }}</option> }
            </select>
          </div>
          <div class="flex items-center gap-1">
            <button type="button" class="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 min-h-[36px]"
              [disabled]="currentPage() <= 1" (click)="goToPage(currentPage() - 1)" aria-label="Previous page">‹</button>
            @for (pg of pageNumbers(); track pg) {
              @if (pg === -1) { <span class="px-1 text-xs text-slate-400">…</span> }
              @else {
                <button type="button" class="px-2.5 py-1 text-xs rounded border font-semibold min-h-[36px] min-w-[36px]"
                  [class.border-brand-600]="pg === currentPage()" [class.bg-brand-600]="pg === currentPage()"
                  [class.text-white]="pg === currentPage()" [class.border-slate-300]="pg !== currentPage()"
                  [class.bg-white]="pg !== currentPage()" [class.text-slate-700]="pg !== currentPage()"
                  (click)="goToPage(pg)">{{ pg }}</button>
              }
            }
            <button type="button" class="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[36px]"
              [disabled]="currentPage() >= totalPages()" (click)="goToPage(currentPage() + 1)" aria-label="Next page">›</button>
          </div>
        </div>
      </admin-inspection-table>
    }
    </div><!-- /max-w-7xl -->
  `,
})
export class InspectionListComponent implements OnInit, OnDestroy {
  private readonly service = inject(AdminInspectionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  protected readonly KINDS = INSPECTION_KINDS;
  protected readonly STATUSES = INSPECTION_STATUSES;
  protected readonly KIND_LABELS = KIND_LABELS;
  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly pageSizes = PAGE_SIZES;

  protected readonly filter = signal<Partial<InspectionFilter>>(defaultFilter());
  protected readonly items = signal<InspectionSummaryDto[]>([]);
  protected readonly total = signal<number>(0);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly currentPage = computed(() => this.filter().page ?? 1);
  protected readonly currentPageSize = computed(() => this.filter().pageSize ?? 25);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.currentPageSize())),
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

  protected readonly kpi = computed<InspectionQueueKpi>(() => {
    const all = this.items();
    let awaitingStart = 0, inProgress = 0, awaitingSignoff = 0, awaitingCustomerSig = 0, signedOffThisWeek = 0;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let scoreSum = 0, scoreCount = 0;
    for (const it of all) {
      if (it.status === 'draft') awaitingStart++;
      else if (it.status === 'in_progress') inProgress++;
      else if (it.status === 'awaiting_inspector_signoff') awaitingSignoff++;
      else if (it.status === 'awaiting_customer_signature') awaitingCustomerSig++;
      else if (it.status === 'signed_off' && new Date(it.updatedAt).getTime() > weekAgo) {
        signedOffThisWeek++;
        if (it.overallScore !== null) { scoreSum += it.overallScore; scoreCount++; }
      }
    }
    return {
      awaitingStart,
      inProgress,
      awaitingSignoff,
      awaitingCustomerSig,
      signedOffThisWeek,
      avgScoreThisWeek: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
      advisoryCountThisWeek: 0,
    };
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const seeded: Partial<InspectionFilter> = { ...defaultFilter() };
    const q = params.get('q'); if (q) seeded.q = q;
    const kind = params.get('kind') as InspectionKind | null;
    if (kind && (INSPECTION_KINDS as readonly string[]).includes(kind)) seeded.kind = kind;
    const status = params.get('status') as InspectionStatus | null;
    if (status && (INSPECTION_STATUSES as readonly string[]).includes(status)) seeded.status = status;
    const page = params.get('page'); if (page) seeded.page = Number(page);
    const pageSize = params.get('pageSize'); if (pageSize) seeded.pageSize = Number(pageSize);
    this.filter.set(seeded);

    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.filter.update(f => ({ ...f, q: q || undefined, page: 1 })));

    toObservable(this.filter, { injector: this.injector })
      .pipe(
        switchMap(f => {
          this.loading.set(true);
          this.error.set(null);
          this.pushQueryParams(f);
          return this.service.list(f).pipe(
            catchError(err => {
              this.error.set((err as Error)?.message ?? 'Failed to load inspections.');
              return of<InspectionListResponse>({ items: [], total: 0, page: 1, pageSize: f.pageSize ?? 25 });
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(result => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  protected onSearchInput(q: string): void { this.searchSubject.next(q); }
  protected setKind(kind: InspectionKind | undefined): void { this.filter.update(f => ({ ...f, kind, page: 1 })); }
  protected setStatus(status: InspectionStatus | undefined): void { this.filter.update(f => ({ ...f, status, page: 1 })); }
  protected resetFilters(): void { this.filter.set(defaultFilter()); }
  protected goToPage(page: number): void { this.filter.update(f => ({ ...f, page })); }
  protected onPageSizeChange(pageSize: number): void { this.filter.update(f => ({ ...f, pageSize: Number(pageSize), page: 1 })); }

  private pushQueryParams(f: Partial<InspectionFilter>): void {
    const queryParams: Record<string, string | number | undefined> = {};
    if (f.q) queryParams['q'] = f.q;
    if (f.kind) queryParams['kind'] = f.kind;
    if (f.status) queryParams['status'] = f.status;
    if (f.page && f.page !== 1) queryParams['page'] = f.page;
    if (f.pageSize && f.pageSize !== 25) queryParams['pageSize'] = f.pageSize;
    // BUG FIX (inspection-list.component.ts:pushQueryParams): use absolute path so
    // chip clicks never trigger Angular's relative-route resolution back to '/' (dashboard).
    // queryParamsHandling: '' was invalid; removed entirely.
    void this.router.navigate(['/operations/inspections'], { queryParams, replaceUrl: true });
  }
}
