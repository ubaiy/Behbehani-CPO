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
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
  takeUntil,
} from 'rxjs';

import type {
  AuditLogFilter,
  AuditLogEntryDto,
  AuditLogListResponse,
} from '@behbehani-cpo/shared-types';
import { AdminAuditLogService } from '@behbehani-cpo/data-access';
import { AdminUsersService } from '@behbehani-cpo/data-access';
import { AdminRoleDirective } from '../../core/admin-role.directive';
import {
  DATE_PILLS,
  DIFF_TABS,
  PAGE_SIZES,
  actionChipClassFor,
  computeDiff,
  defaultAuditFilter as defaultFilter,
  formatAuditRelative,
  formatAuditTime,
  initialsFromName,
  isoForPreset,
  type ActorSuggestion,
  type DatePreset,
  type DiffLine,
  type DiffTab,
  type SortOption,
} from './audit-log.helpers';

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'admin-audit-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, AdminRoleDirective],
  templateUrl: './audit-log.component.html',
})
export class AdminAuditLogComponent implements OnInit, OnDestroy {
  // ─── Services ────────────────────────────────────────────────────────────────
  private readonly auditService = inject(AdminAuditLogService);
  private readonly usersService = inject(AdminUsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  // Captured at construction time to satisfy NG0203 in toObservable()
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();

  // ─── Exposed constants ───────────────────────────────────────────────────────
  protected readonly pageSizes = PAGE_SIZES;
  protected readonly skeletonRows = Array.from({ length: 8 }, (_, i) => i);
  protected readonly datePills = DATE_PILLS;
  protected readonly diffTabs = DIFF_TABS;
  protected readonly computeDiff = computeDiff;
  protected readonly initials = initialsFromName;
  protected readonly formatTime = formatAuditTime;
  protected readonly formatRelative = formatAuditRelative;
  protected readonly actionChipClass = actionChipClassFor;

  // ─── State signals ───────────────────────────────────────────────────────────
  protected readonly filter = signal<Partial<AuditLogFilter>>(defaultFilter());
  protected readonly items = signal<AuditLogEntryDto[]>([]);
  protected readonly total = signal<number>(0);
  protected readonly filteredFrom = signal<number>(0);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly exportError = signal<string | null>(null);
  protected readonly actions = signal<string[]>([]);
  protected readonly resources = signal<string[]>([]);
  protected readonly expandedId = signal<string | null>(null);
  protected readonly activeTab = signal<DiffTab>('diff');
  protected readonly openMenuId = signal<string | null>(null);
  protected readonly actorQuery = signal<string>('');
  protected readonly actorSuggestions = signal<ActorSuggestion[]>([]);
  protected readonly selectedActor = signal<ActorSuggestion | null>(null);
  protected readonly activeDatePreset = signal<DatePreset | null>(null);
  protected readonly customDateFrom = signal<string>('');
  protected readonly customDateTo = signal<string>('');

  // ─── Derived signals ──────────────────────────────────────────────────────────
  protected readonly currentPage = computed(() => this.filter().page ?? 1);
  protected readonly currentPageSize = computed(() => this.filter().pageSize ?? 25);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.currentPageSize()))
  );
  protected readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.currentPage() - 1) * this.currentPageSize() + 1
  );
  protected readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.currentPageSize(), this.total())
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

  // ─── Debounced actor search ───────────────────────────────────────────────────
  private readonly actorSearchSubject = new Subject<string>();
  private readonly resourceIdSubject = new Subject<string>();

  ngOnInit(): void {
    this.seedFilterFromUrl();
    this.loadVocabulary();
    this.setupActorSearch();
    this.setupReactiveFilter();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Initialisation helpers ───────────────────────────────────────────────────

  private seedFilterFromUrl(): void {
    const params = this.route.snapshot.queryParamMap;
    const seeded: Partial<AuditLogFilter> = { ...defaultFilter() };

    const actorId = params.get('actorId');
    if (actorId) {
      seeded.actorId = actorId;
      // If jumping from the users list we only have the ID initially;
      // the actor name will resolve lazily via the suggestions mechanism.
    }
    const actorQ = params.get('actorQ');
    if (actorQ) { seeded.actorQ = actorQ; this.actorQuery.set(actorQ); }
    const action = params.get('action');
    if (action) seeded.action = action;
    const resource = params.get('resource');
    if (resource) seeded.resource = resource;
    const resourceId = params.get('resourceId');
    if (resourceId) seeded.resourceId = resourceId;
    const outcome = params.get('outcome');
    if (outcome) seeded.outcome = outcome as AuditLogFilter['outcome'];
    const dateFrom = params.get('dateFrom');
    if (dateFrom) seeded.dateFrom = dateFrom;
    const dateTo = params.get('dateTo');
    if (dateTo) seeded.dateTo = dateTo;
    const sort = params.get('sort') as SortOption | null;
    if (sort) seeded.sort = sort;
    const page = params.get('page');
    if (page) seeded.page = Number(page);
    const pageSize = params.get('pageSize');
    if (pageSize) seeded.pageSize = Number(pageSize);

    this.filter.set(seeded);
  }

  private loadVocabulary(): void {
    this.auditService.listActions().pipe(takeUntil(this.destroy$)).subscribe({
      next: r => this.actions.set(r.actions),
      error: err => console.error('[AuditLog] listActions failed', err),
    });
    this.auditService.listResources().pipe(takeUntil(this.destroy$)).subscribe({
      next: r => this.resources.set(r.resources),
      error: err => console.error('[AuditLog] listResources failed', err),
    });
  }

  private setupActorSearch(): void {
    this.actorSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q || q.length < 2) { this.actorSuggestions.set([]); return of(null); }
        return this.usersService.list({ q, pageSize: 10 }).pipe(
          catchError(() => of(null)),
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe(resp => {
      if (!resp) return;
      this.actorSuggestions.set(
        resp.items.map(u => ({
          id: u.id,
          name: u.fullName,
          email: u.email,
        })),
      );
    });

    this.resourceIdSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(id => {
      this.filter.update(f => ({ ...f, resourceId: id || undefined, page: 1 }));
    });
  }

  private setupReactiveFilter(): void {
    // Pass injector explicitly — ngOnInit is outside Angular's injection context
    toObservable(this.filter, { injector: this.injector })
      .pipe(
        switchMap(f => {
          this.loading.set(true);
          this.error.set(null);
          this.pushQueryParams(f);
          return this.auditService.list(f).pipe(
            catchError(err => {
              this.error.set((err as Error)?.message ?? 'Failed to load audit log.');
              const empty: AuditLogListResponse = {
                items: [],
                total: 0,
                filteredFrom: 0,
                page: f.page ?? 1,
                pageSize: f.pageSize ?? 25,
              };
              return of(empty);
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(result => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.filteredFrom.set(result.filteredFrom);
        this.loading.set(false);
      });
  }

  // ─── Filter handlers ──────────────────────────────────────────────────────────

  protected onActorQueryChange(q: string): void {
    this.actorQuery.set(q);
    this.actorSearchSubject.next(q);
    if (!q) {
      this.selectedActor.set(null);
      this.filter.update(f => ({ ...f, actorId: undefined, actorQ: undefined, page: 1 }));
    }
  }

  protected selectActor(actor: ActorSuggestion): void {
    this.selectedActor.set(actor);
    this.actorQuery.set('');
    this.actorSuggestions.set([]);
    this.filter.update(f => ({ ...f, actorId: actor.id, actorQ: undefined, page: 1 }));
  }

  protected clearActor(): void {
    this.selectedActor.set(null);
    this.actorQuery.set('');
    this.actorSuggestions.set([]);
    this.filter.update(f => ({ ...f, actorId: undefined, actorQ: undefined, page: 1 }));
  }

  protected onActionChange(action: string): void {
    this.filter.update(f => ({ ...f, action: action || undefined, page: 1 }));
  }

  protected onResourceChange(resource: string): void {
    this.filter.update(f => ({ ...f, resource: resource || undefined, page: 1 }));
  }

  protected onResourceIdChange(resourceId: string): void {
    this.resourceIdSubject.next(resourceId);
  }

  protected onDatePreset(preset: DatePreset): void {
    this.activeDatePreset.set(preset);
    if (preset === 'custom') return; // wait for user to fill date pickers
    const { dateFrom, dateTo } = isoForPreset(preset);
    this.filter.update(f => ({ ...f, dateFrom, dateTo, page: 1 }));
  }

  protected onCustomDateFrom(val: string): void {
    this.customDateFrom.set(val);
    if (val && this.customDateTo()) {
      this.filter.update(f => ({
        ...f,
        dateFrom: new Date(val).toISOString(),
        dateTo: new Date(this.customDateTo() + 'T23:59:59').toISOString(),
        page: 1,
      }));
    }
  }

  protected onCustomDateTo(val: string): void {
    this.customDateTo.set(val);
    if (val && this.customDateFrom()) {
      this.filter.update(f => ({
        ...f,
        dateFrom: new Date(this.customDateFrom()).toISOString(),
        dateTo: new Date(val + 'T23:59:59').toISOString(),
        page: 1,
      }));
    }
  }

  protected onOutcome(outcome: AuditLogFilter['outcome']): void {
    this.filter.update(f => ({
      ...f,
      outcome: outcome === 'all' ? undefined : outcome,
      page: 1,
    }));
  }

  protected onSortChange(sort: SortOption): void {
    this.filter.update(f => ({ ...f, sort, page: 1 }));
  }

  protected resetFilters(): void {
    this.selectedActor.set(null);
    this.actorQuery.set('');
    this.actorSuggestions.set([]);
    this.activeDatePreset.set(null);
    this.customDateFrom.set('');
    this.customDateTo.set('');
    this.filter.set(defaultFilter());
  }

  // ─── Pagination ───────────────────────────────────────────────────────────────

  protected goToPage(page: number): void {
    this.filter.update(f => ({ ...f, page }));
  }

  protected onPageSizeChange(pageSize: number): void {
    this.filter.update(f => ({ ...f, pageSize, page: 1 }));
  }

  // ─── Row expand / tabs ────────────────────────────────────────────────────────

  protected toggleExpand(id: string): void {
    if (this.expandedId() === id) {
      this.expandedId.set(null);
    } else {
      this.expandedId.set(id);
      this.activeTab.set('diff');
    }
    this.closeMenu();
  }

  protected setTab(tab: DiffTab): void {
    this.activeTab.set(tab);
  }

  // ─── Row menu ────────────────────────────────────────────────────────────────

  protected toggleMenu(id: string): void {
    this.openMenuId.update(cur => (cur === id ? null : id));
  }

  protected closeMenu(): void {
    this.openMenuId.set(null);
  }

  protected copyEntryJson(entry: AuditLogEntryDto): void {
    void navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
  }

  // ─── CSV export ───────────────────────────────────────────────────────────────

  protected onExportCsv(): void {
    const { page: _p, pageSize: _ps, ...exportFilter } = this.filter();
    // Go through HttpClient so the auth interceptor attaches the Bearer token.
    // A plain window.open would skip the interceptor and the API would 401 →
    // forced sign-out on a separate tab. (Reviewer C2.)
    this.auditService
      .exportCsv(exportFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const iso = new Date().toISOString().slice(0, 10);
          AdminAuditLogService.downloadBlob(blob, `audit-log-${iso}.csv`);
        },
        error: (err) => {
          // 413 = result set exceeded the synchronous cap (10k rows).
          const msg =
            err?.status === 413
              ? 'Export too large — narrow the date range and try again.'
              : 'Export failed. Please try again.';
          console.error('[audit-log] export failed', err);
          // No toast infra yet — surface via the existing error banner signal
          // if the component has one; otherwise the console.error is the only
          // user feedback for now.
          this.exportError.set(msg);
          setTimeout(() => this.exportError.set(null), 5000);
        },
      });
  }

  protected onRefresh(): void {
    // Nudge filter identity to trigger a re-fetch
    this.filter.update(f => ({ ...f }));
  }

  // ─── URL sync ─────────────────────────────────────────────────────────────────

  private pushQueryParams(f: Partial<AuditLogFilter>): void {
    const qp: Record<string, string | number | undefined> = {};
    if (f.actorId) qp['actorId'] = f.actorId;
    if (f.actorQ) qp['actorQ'] = f.actorQ;
    if (f.action) qp['action'] = f.action;
    if (f.resource) qp['resource'] = f.resource;
    if (f.resourceId) qp['resourceId'] = f.resourceId;
    if (f.outcome) qp['outcome'] = f.outcome;
    if (f.dateFrom) qp['dateFrom'] = f.dateFrom;
    if (f.dateTo) qp['dateTo'] = f.dateTo;
    if (f.sort && f.sort !== 'newest') qp['sort'] = f.sort;
    if (f.page && f.page !== 1) qp['page'] = f.page;
    if (f.pageSize && f.pageSize !== 25) qp['pageSize'] = f.pageSize;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      replaceUrl: true,
      queryParamsHandling: '',
    });
  }

}
