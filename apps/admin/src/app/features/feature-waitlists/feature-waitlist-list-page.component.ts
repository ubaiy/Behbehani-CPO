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
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, takeUntil } from 'rxjs';

import type {
  AdminFeatureWaitlistEntryDto,
  AdminFeatureWaitlistListResponseDto,
  AdminFeatureWaitlistPathCounts,
} from '@behbehani-cpo/shared-types';
import { AdminFeatureWaitlistService } from '@behbehani-cpo/data-access';

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'admin-feature-waitlist-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-6xl mx-auto">

      <!-- ── Page header ──────────────────────────────────────────────────── -->
      <div class="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold text-slate-800">Feature Waitlists</h1>
          <p class="text-sm text-slate-500 mt-0.5">
            @if (loading()) { Loading… }
            @else { {{ total() }} subscriber{{ total() === 1 ? '' : 's' }} }
          </p>
        </div>

        <!-- Export button -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
          [disabled]="exporting() || loading()"
          (click)="triggerExport()"
          [attr.aria-label]="exporting() ? 'Export in progress…' : 'Export CSV'"
          title="Export current feature filter to CSV"
        >
          @if (exporting()) {
            <svg class="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Exporting…
          } @else {
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Export CSV
          }
        </button>
      </div>

      <!-- ── Feature path filter chips + search ─────────────────────────── -->
      <div class="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <span class="text-xs font-medium text-slate-500 mr-1">Feature:</span>
          <!-- "All" chip -->
          <button
            type="button"
            class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium min-h-[36px]"
            [class.bg-brand-600]="!activeFeaturePath()"
            [class.text-white]="!activeFeaturePath()"
            [class.bg-slate-100]="!!activeFeaturePath()"
            [class.text-slate-600]="!!activeFeaturePath()"
            [disabled]="loading() && !pathCounts()"
            (click)="setFeaturePath(undefined)"
          >
            All · {{ totalAcrossAll() }}
          </button>
          <!-- Per-path chips — only rendered once pathCounts loaded -->
          @for (entry of pathCountEntries(); track entry.path) {
            <button
              type="button"
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium min-h-[36px]"
              [class.bg-brand-600]="activeFeaturePath() === entry.path"
              [class.text-white]="activeFeaturePath() === entry.path"
              [class.bg-slate-100]="activeFeaturePath() !== entry.path"
              [class.text-slate-600]="activeFeaturePath() !== entry.path"
              [disabled]="loading()"
              (click)="setFeaturePath(entry.path)"
            >
              {{ formatPath(entry.path) }} · {{ entry.count }}
            </button>
          }
        </div>

        <!-- Search -->
        <div class="relative max-w-sm">
          <svg class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"/>
          </svg>
          <input
            type="search"
            placeholder="Search by email or feature path…"
            class="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[36px]"
            [ngModel]="searchInput()"
            (ngModelChange)="onSearchChange($event)"
            aria-label="Search feature waitlist"
          />
        </div>
      </div>

      <!-- ── Error banner ─────────────────────────────────────────────────── -->
      @if (listError()) {
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ listError() }}
        </div>
      }

      @if (exportError()) {
        <div class="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {{ exportError() }}
        </div>
      }

      <!-- ── Table ──────────────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">

        <!-- Loading skeleton -->
        @if (loading()) {
          <div class="divide-y divide-slate-100">
            @for (n of [1,2,3,4,5,6]; track n) {
              <div class="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div class="h-3 bg-slate-200 rounded w-40 shrink-0"></div>
                <div class="h-3 bg-slate-100 rounded w-32 shrink-0"></div>
                <div class="h-5 w-24 bg-slate-100 rounded-full shrink-0"></div>
                <div class="h-3 bg-slate-100 rounded w-28 shrink-0"></div>
              </div>
            }
          </div>
        }

        <!-- Empty state -->
        @if (!loading() && items().length === 0) {
          <div class="p-16 flex flex-col items-center justify-center text-center">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
              </svg>
            </div>
            <h3 class="text-base font-semibold text-slate-700 mb-1">No waitlist entries found</h3>
            <p class="text-sm text-slate-400 max-w-xs mb-5">
              @if (activeFeaturePath()) {
                No subscribers for <span class="font-mono">{{ activeFeaturePath() }}</span>.
              } @else if (searchInput()) {
                No entries match your search.
              } @else {
                No feature waitlist subscriptions yet.
              }
            </p>
            @if (activeFeaturePath() || searchInput()) {
              <button type="button" class="text-sm font-medium text-brand-600 hover:underline" (click)="clearFilters()">
                Clear filters
              </button>
            }
          </div>
        }

        <!-- Table rows -->
        @if (!loading() && items().length > 0) {
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left" aria-label="Feature waitlist entries">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50">
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Feature</th>
                  <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">User ID</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (entry of items(); track entry.id) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {{ entry.createdAt | date: 'dd MMM yyyy HH:mm' }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-medium text-slate-800 text-sm">{{ entry.email }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200 font-mono"
                        [title]="entry.featurePath"
                      >{{ formatPath(entry.featurePath) }}</span>
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-400 hidden sm:table-cell">
                      @if (entry.userId) {
                        <span class="font-mono truncate max-w-[120px] block" [title]="entry.userId">
                          {{ entry.userId.slice(0, 8) }}…
                        </span>
                      } @else {
                        <span class="text-slate-300 italic">Guest</span>
                      }
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
export class FeatureWaitlistListPageComponent implements OnInit, OnDestroy {
  private readonly waitlistService = inject(AdminFeatureWaitlistService);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  // ── Public helpers for template ────────────────────────────────────────────
  protected readonly Math = Math;

  // ── State ─────────────────────────────────────────────────────────────────
  protected readonly activeFeaturePath = signal<string | undefined>(undefined);
  protected readonly searchInput = signal<string>('');
  protected readonly currentPage = signal<number>(1);
  protected readonly currentPageSize = signal<number>(20);
  protected readonly items = signal<AdminFeatureWaitlistEntryDto[]>([]);
  protected readonly total = signal<number>(0);
  protected readonly pathCounts = signal<AdminFeatureWaitlistPathCounts | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly listError = signal<string | null>(null);
  protected readonly exporting = signal<boolean>(false);
  protected readonly exportError = signal<string | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────

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

  /** Sum of counts across all feature paths (shown on the "All" chip). */
  protected readonly totalAcrossAll = computed<number>(() => {
    const counts = this.pathCounts();
    if (!counts) return this.total();
    return Object.values(counts).reduce((acc, n) => acc + n, 0);
  });

  /** Sorted [path, count] pairs for filter chips — rendered once pathCounts arrive. */
  protected readonly pathCountEntries = computed<{ path: string; count: number }[]>(() => {
    const counts = this.pathCounts();
    if (!counts) return [];
    return Object.entries(counts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count);
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Reset to page 1 when feature path filter changes
    toObservable(this.activeFeaturePath, { injector: this.injector })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.fetchList();
      });

    toObservable(this.currentPage, { injector: this.injector })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchList());

    // Debounce search — 300ms, no duplicate requests for same term
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

  protected setFeaturePath(path: string | undefined): void {
    this.activeFeaturePath.set(path);
  }

  protected onSearchChange(value: string): void {
    this.searchInput.set(value);
    this.searchSubject$.next(value);
  }

  protected clearFilters(): void {
    this.searchInput.set('');
    this.activeFeaturePath.set(undefined);
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
  }

  /**
   * Trigger CSV export.
   * Button is disabled while exporting to prevent double-click churn.
   */
  protected triggerExport(): void {
    if (this.exporting()) return;

    this.exporting.set(true);
    this.exportError.set(null);

    this.waitlistService
      .exportWaitlist(this.activeFeaturePath())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.exporting.set(false);
          const featurePart = this.activeFeaturePath()
            ? this.activeFeaturePath()!.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/^_+/, '')
            : 'all';
          const date = new Date().toISOString().slice(0, 10);
          const filename = `waitlist-${featurePart}-${date}.csv`;

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        error: (err: unknown) => {
          this.exporting.set(false);
          const msg =
            (err as { error?: { message?: string }; message?: string })?.error?.message ??
            (err as { message?: string })?.message ??
            'Export failed. Please try again.';
          this.exportError.set(msg);
        },
      });
  }

  /**
   * Convert a featurePath slug to a human-readable label.
   * "/account/maintenance" → "maintenance"
   * "/financing"           → "financing"
   */
  protected formatPath(featurePath: string): string {
    const parts = featurePath.replace(/^\//, '').split('/');
    return parts[parts.length - 1] ?? featurePath;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private fetchList(): void {
    this.loading.set(true);
    this.listError.set(null);

    const query: Partial<{
      featurePath: string;
      search: string;
      page: number;
      pageSize: number;
    }> = {
      page:     this.currentPage(),
      pageSize: this.currentPageSize(),
    };

    const fp = this.activeFeaturePath();
    if (fp) query['featurePath'] = fp;

    const search = this.searchInput().trim();
    if (search) query['search'] = search;

    this.waitlistService
      .listWaitlist(query)
      .pipe(
        catchError((err: unknown) => {
          const msg =
            (err as { error?: { message?: string }; message?: string })?.error?.message ??
            (err as { message?: string })?.message ??
            'Failed to load waitlist entries.';
          this.listError.set(msg);
          return of<AdminFeatureWaitlistListResponseDto>({
            items:      [],
            total:      0,
            page:       this.currentPage(),
            pageSize:   this.currentPageSize(),
            pathCounts: {},
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.pathCounts.set(result.pathCounts);
        this.loading.set(false);
      });
  }
}
