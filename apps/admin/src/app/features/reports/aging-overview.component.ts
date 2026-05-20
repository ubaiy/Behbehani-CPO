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
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, forkJoin, catchError, of, takeUntil } from 'rxjs';

import { formatKwd } from '@behbehani-cpo/shared-utils';
import { LISTING_STAGES } from '@behbehani-cpo/shared-types';
import type {
  AgingEngineStatusDto,
  AgingRunDto,
  AgingDistribution,
  AgingActiveDiscountListResponse,
  AppliedDiscountDto,
} from '@behbehani-cpo/shared-types';
import { AdminAgingService } from '@behbehani-cpo/data-access';
import { AdminCatalogService, CatalogBrand } from '@behbehani-cpo/data-access';

import { AdminRoleDirective } from '../../core/admin-role.directive';
import { STAGE_LABELS, STAGE_CHIP_CLASS, agingChipClass } from '../../core/listing-stage.util';

// ─── Bucket colour config ───────────────────────────────────────────────────

/** Tailwind background classes for each distribution bucket (index 0..7). */
const BUCKET_BG: readonly string[] = [
  'bg-blue-200',   // 0-7d
  'bg-blue-300',   // 8-19d
  'bg-blue-400',   // 20-29d
  'bg-blue-500',   // 30-44d
  'bg-red-300',    // 45-59d
  'bg-red-400',    // 60-89d
  'bg-red-500',    // 90-119d
  'bg-red-600',    // 120+d
];

// ─── Filter state ────────────────────────────────────────────────────────────

interface DiscountFilter {
  page: number;
  pageSize: number;
  stage: string;
  tierId: string;
  brandId: string;
  daysMin: number | undefined;
  daysMax: number | undefined;
  q: string;
}

function defaultFilter(): DiscountFilter {
  return { page: 1, pageSize: 25, stage: '', tierId: '', brandId: '', daysMin: undefined, daysMax: undefined, q: '' };
}

@Component({
  selector: 'admin-aging-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, AdminRoleDirective],
  templateUrl: './aging-overview.component.html',
})
export class AgingOverviewComponent implements OnInit, OnDestroy {
  // ─── Services ───────────────────────────────────────────────────────────────
  private readonly agingService = inject(AdminAgingService);
  private readonly catalogService = inject(AdminCatalogService);
  private readonly destroy$ = new Subject<void>();

  // ─── Exposed constants ───────────────────────────────────────────────────────
  protected readonly STAGE_CHIP_CLASS = STAGE_CHIP_CLASS;
  protected readonly stageLabels = STAGE_LABELS;
  protected readonly listingStages = LISTING_STAGES;
  protected readonly skeletonRows = Array.from({ length: 8 }, (_, i) => i);

  // ─── Loading & error signals ─────────────────────────────────────────────────
  protected readonly statusLoading = signal(true);
  protected readonly distLoading = signal(true);
  protected readonly discountsLoading = signal(true);
  protected readonly runsLoading = signal(true);
  protected readonly runNowLoading = signal(false);
  protected readonly pauseLoading = signal(false);
  protected readonly pageError = signal<string | null>(null);

  // ─── Data signals ────────────────────────────────────────────────────────────
  protected readonly status = signal<AgingEngineStatusDto | null>(null);
  protected readonly distribution = signal<AgingDistribution | null>(null);
  protected readonly discountResponse = signal<AgingActiveDiscountListResponse | null>(null);
  protected readonly runs = signal<AgingRunDto[]>([]);
  protected readonly brands = signal<CatalogBrand[]>([]);
  protected readonly historyOpen = signal(false);

  // ─── Filter signal ───────────────────────────────────────────────────────────
  protected readonly discountFilter = signal<DiscountFilter>(defaultFilter());

  // ─── Derived signals ─────────────────────────────────────────────────────────
  protected readonly engineActive = computed(() => {
    const s = this.status();
    return s !== null && s.enabled && !s.paused;
  });

  protected readonly enginePaused = computed(() => {
    const s = this.status();
    return s !== null && s.enabled && s.paused;
  });

  protected readonly engineDisabled = computed(() => {
    const s = this.status();
    return s !== null && !s.enabled;
  });

  protected readonly monthlyDiscount = computed(() => {
    const fils = this.status()?.totals?.monthlyDiscountAppliedFils;
    if (!fils) return 'KWD 0.000';
    return filsToKwdComputed(fils);
  });

  protected readonly distributionBuckets = computed(() => {
    return this.distribution()?.buckets ?? [];
  });

  protected readonly totalBucketCount = computed(() => {
    return this.distributionBuckets().reduce((sum, b) => sum + b.count, 0);
  });

  protected readonly discountItems = computed(() => {
    return this.discountResponse()?.items ?? [];
  });

  protected readonly discountTotal = computed(() => {
    return this.discountResponse()?.total ?? 0;
  });

  protected readonly discountTotalPages = computed(() => {
    const total = this.discountTotal();
    const pageSize = this.discountFilter().pageSize;
    return Math.max(1, Math.ceil(total / pageSize));
  });

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadStatus();
    this.loadDistribution();
    this.loadDiscounts();
    this.loadRuns();
    this.catalogService.brands()
      .pipe(takeUntil(this.destroy$))
      .subscribe(b => this.brands.set(b));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Data loading ─────────────────────────────────────────────────────────────

  private loadStatus(): void {
    this.statusLoading.set(true);
    this.agingService.status()
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe(s => {
        this.status.set(s);
        this.statusLoading.set(false);
      });
  }

  private loadDistribution(): void {
    this.distLoading.set(true);
    this.agingService.distribution()
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe(d => {
        this.distribution.set(d);
        this.distLoading.set(false);
      });
  }

  private loadDiscounts(): void {
    this.discountsLoading.set(true);
    const f = this.discountFilter();
    this.agingService.listActiveDiscounts({
      page: f.page,
      pageSize: f.pageSize,
      stage: f.stage || undefined,
      tierId: f.tierId || undefined,
      brandId: f.brandId || undefined,
      daysMin: f.daysMin,
      daysMax: f.daysMax,
      q: f.q || undefined,
    })
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.discountResponse.set(res);
        this.discountsLoading.set(false);
      });
  }

  private loadRuns(): void {
    this.runsLoading.set(true);
    this.agingService.listRuns({ limit: 7 })
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe(r => {
        this.runs.set(r);
        this.runsLoading.set(false);
      });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  protected onRunNow(): void {
    this.runNowLoading.set(true);
    this.agingService.runNow({})
      .pipe(
        catchError(() => {
          this.pageError.set('Run now failed. Please try again.');
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.runNowLoading.set(false);
        this.loadStatus();
        this.loadRuns();
      });
  }

  protected onTogglePause(): void {
    const current = this.status();
    if (!current) return;
    this.pauseLoading.set(true);
    this.agingService.pause({ paused: !current.paused })
      .pipe(
        catchError(() => {
          this.pageError.set('Toggle pause failed. Please try again.');
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.pauseLoading.set(false);
        this.loadStatus();
      });
  }

  // ─── Filter handlers ─────────────────────────────────────────────────────────

  protected onFilterStageChange(stage: string): void {
    this.discountFilter.update(f => ({ ...f, stage, page: 1 }));
    this.loadDiscounts();
  }

  protected onFilterBrandChange(brandId: string): void {
    this.discountFilter.update(f => ({ ...f, brandId, page: 1 }));
    this.loadDiscounts();
  }

  protected onFilterTierChange(tierId: string): void {
    this.discountFilter.update(f => ({ ...f, tierId, page: 1 }));
    this.loadDiscounts();
  }

  protected onFilterDaysMin(val: number | undefined): void {
    this.discountFilter.update(f => ({ ...f, daysMin: val ?? undefined, page: 1 }));
    this.loadDiscounts();
  }

  protected onFilterDaysMax(val: number | undefined): void {
    this.discountFilter.update(f => ({ ...f, daysMax: val ?? undefined, page: 1 }));
    this.loadDiscounts();
  }

  protected resetDiscountFilter(): void {
    this.discountFilter.set(defaultFilter());
    this.loadDiscounts();
  }

  protected discountGoTo(page: number): void {
    this.discountFilter.update(f => ({ ...f, page }));
    this.loadDiscounts();
  }

  // ─── Toggle history ───────────────────────────────────────────────────────────

  protected toggleHistory(): void {
    this.historyOpen.update(v => !v);
  }

  // ─── Display helpers ──────────────────────────────────────────────────────────

  protected filsToKwd(filsString: string): string {
    const fils = Number(filsString);
    if (Number.isNaN(fils)) return '—';
    return formatKwd(fils / 1000);
  }

  protected formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  }

  protected formatDateTime(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  }

  /**
   * VIN masking: display last 6 chars of the (already partially masked) vinMasked field,
   * prefixed with bullet placeholders so total visible = 6 real chars.
   * Spec: "last 6 chars" with "dot-dot-dot-dot-dot-dot XXXXXX" pattern.
   */
  protected maskVin(vinMasked: string): string {
    const last6 = vinMasked.slice(-6);
    return `•••••••••${last6}`;
  }

  protected agingBadgeClass(days: number): string {
    if (days >= 45) return 'bg-red-50 text-red-700';
    if (days >= 20) return 'bg-blue-50 text-blue-700';
    return 'bg-slate-100 text-slate-600';
  }

  protected bucketBg(index: number): string {
    return BUCKET_BG[index] ?? 'bg-slate-300';
  }

  protected bucketPercent(count: number): number {
    const total = this.totalBucketCount();
    if (total === 0) return 0;
    return (count / total) * 100;
  }
}

/** Module-level helper (avoids template method binding issues). */
function filsToKwdComputed(filsString: string): string {
  const fils = Number(filsString);
  if (Number.isNaN(fils)) return '—';
  return formatKwd(fils / 1000);
}
