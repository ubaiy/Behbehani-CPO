import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import type { ListingFilter, ListingStage } from '@behbehani-cpo/shared-types';
import { LISTING_STAGES } from '@behbehani-cpo/shared-types';
import { STAGE_LABELS, STAGE_CHIP_CLASS } from '../../../core/listing-stage.util';

interface Brand {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  logoUrl: string | null;
}

interface Model {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  trims: Array<{ id: string; name: string }>;
}

interface BodyType {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
}

/**
 * Filter bar for the listing list page.
 * Emits granular change events so the parent can apply debounce to search
 * and eager updates to selects/chips.
 */
@Component({
  selector: 'admin-listing-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-4">

      <!-- ── Row 1: search / brand / model / year / stage / reset ── -->
      <div class="flex flex-wrap items-end gap-3">

        <!-- Search -->
        <div class="flex-1 min-w-48">
          <label class="block text-xs font-medium text-slate-600 mb-1" for="listing-search">Search</label>
          <div class="relative">
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              id="listing-search"
              type="search"
              placeholder="VIN, stock #, title…"
              class="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white placeholder-slate-400"
              [ngModel]="searchValue()"
              (ngModelChange)="onSearchChange($event)"
            />
          </div>
        </div>

        <!-- Brand -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1" for="listing-brand">Brand</label>
          <select
            id="listing-brand"
            class="py-1.5 pl-3 pr-7 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700"
            [ngModel]="filter.brandId ?? ''"
            (ngModelChange)="onBrandSelect($event)"
          >
            <option value="">All Brands</option>
            @for (b of brands; track b.id) {
              <option [value]="b.id">{{ b.nameEn }}</option>
            }
          </select>
        </div>

        <!-- Model (cascades from brand) -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1" for="listing-model">Model</label>
          <select
            id="listing-model"
            class="py-1.5 pl-3 pr-7 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 disabled:opacity-50"
            [disabled]="!filter.brandId || models.length === 0"
            [ngModel]="filter.modelId ?? ''"
            (ngModelChange)="onModelSelect($event)"
          >
            <option value="">All Models</option>
            @for (m of models; track m.id) {
              <option [value]="m.id">{{ m.nameEn }}</option>
            }
          </select>
        </div>

        <!-- Year range -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Year</label>
          <div class="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="From"
              min="1990"
              [max]="maxYearBound"
              class="w-20 py-1.5 px-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-center"
              [ngModel]="filter.minYear ?? null"
              (ngModelChange)="onMinYearChange($event)"
            />
            <span class="text-slate-400 text-sm">–</span>
            <input
              type="number"
              placeholder="To"
              [min]="filter.minYear ?? 1990"
              [max]="maxYearBound"
              class="w-20 py-1.5 px-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-center"
              [ngModel]="filter.maxYear ?? null"
              (ngModelChange)="onMaxYearChange($event)"
            />
          </div>
        </div>

        <!-- Stage select -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1" for="listing-stage">Stage</label>
          <select
            id="listing-stage"
            class="py-1.5 pl-3 pr-7 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700"
            [ngModel]="filter.stage ?? ''"
            (ngModelChange)="onStageSelect($event)"
          >
            <option value="">All Stages</option>
            @for (s of LISTING_STAGES; track s) {
              <option [value]="s">{{ STAGE_LABELS[s] }}</option>
            }
          </select>
        </div>

        <!-- Reset -->
        <div class="flex items-end pb-0.5">
          <button
            type="button"
            class="text-sm text-slate-500 hover:text-brand-600 font-medium whitespace-nowrap"
            (click)="reset.emit()"
          >
            Reset filters
          </button>
        </div>
      </div>

      <!-- ── Row 2: body type chips + price range ─────────── -->
      <div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        <span class="text-xs font-medium text-slate-500 mr-1">Body type:</span>

        <!-- "All" chip -->
        <button
          type="button"
          class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
          [class.bg-brand-600]="!filter.bodyTypeId"
          [class.text-white]="!filter.bodyTypeId"
          [class.bg-slate-100]="!!filter.bodyTypeId"
          [class.text-slate-600]="!!filter.bodyTypeId"
          [class.hover:bg-slate-200]="!!filter.bodyTypeId"
          (click)="onBodyTypeSelect(undefined)"
        >All</button>

        @for (bt of bodyTypes; track bt.id) {
          <button
            type="button"
            class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            [class.bg-brand-600]="filter.bodyTypeId === bt.id"
            [class.text-white]="filter.bodyTypeId === bt.id"
            [class.bg-slate-100]="filter.bodyTypeId !== bt.id"
            [class.text-slate-600]="filter.bodyTypeId !== bt.id"
            [class.hover:bg-slate-200]="filter.bodyTypeId !== bt.id"
            (click)="onBodyTypeSelect(bt.id)"
          >{{ bt.nameEn }}</button>
        }

        <!-- Featured tri-state filter -->
        <span class="text-xs font-medium text-slate-500 ml-3 mr-1 inline-flex items-center gap-1">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.293z"/></svg>
          Featured:
        </span>
        <button type="button"
                class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                [class.bg-brand-600]="filter.featured === undefined" [class.text-white]="filter.featured === undefined"
                [class.bg-slate-100]="filter.featured !== undefined" [class.text-slate-600]="filter.featured !== undefined" [class.hover:bg-slate-200]="filter.featured !== undefined"
                (click)="onFeaturedSelect(undefined)">All</button>
        <button type="button"
                class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                [class.bg-brand-600]="filter.featured === true" [class.text-white]="filter.featured === true"
                [class.bg-slate-100]="filter.featured !== true" [class.text-slate-600]="filter.featured !== true" [class.hover:bg-slate-200]="filter.featured !== true"
                (click)="onFeaturedSelect(true)">Featured</button>
        <button type="button"
                class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                [class.bg-brand-600]="filter.featured === false" [class.text-white]="filter.featured === false"
                [class.bg-slate-100]="filter.featured !== false" [class.text-slate-600]="filter.featured !== false" [class.hover:bg-slate-200]="filter.featured !== false"
                (click)="onFeaturedSelect(false)">Not featured</button>

        <!-- Price range (KWD — converted to/from fils at boundary) -->
        <div class="ml-auto flex items-center gap-2">
          <span class="text-xs font-medium text-slate-500">Price (KWD):</span>
          <input
            type="number"
            placeholder="Min"
            min="0"
            class="w-24 py-1 px-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 text-center"
            [ngModel]="minPriceKwd()"
            (ngModelChange)="onMinPriceKwdChange($event)"
          />
          <span class="text-slate-400 text-xs">–</span>
          <input
            type="number"
            placeholder="Max"
            min="0"
            class="w-24 py-1 px-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 text-center"
            [ngModel]="maxPriceKwd()"
            (ngModelChange)="onMaxPriceKwdChange($event)"
          />
        </div>
      </div>

    </div>
  `,
})
export class ListingFiltersComponent implements OnChanges, OnDestroy {
  @Input() brands: Brand[] = [];
  @Input() models: Model[] = [];
  @Input() bodyTypes: BodyType[] = [];
  @Input() filter: Partial<ListingFilter> = {};

  @Output() readonly filterChange = new EventEmitter<Partial<ListingFilter>>();
  @Output() readonly brandChange = new EventEmitter<string | undefined>();
  @Output() readonly reset = new EventEmitter<void>();

  protected readonly LISTING_STAGES = LISTING_STAGES;
  protected readonly STAGE_LABELS = STAGE_LABELS;
  protected readonly STAGE_CHIP_CLASS = STAGE_CHIP_CLASS;
  protected readonly maxYearBound = new Date().getFullYear() + 1;

  /** Local signal for the search box so we can show what's typed immediately. */
  protected readonly searchValue = signal<string>('');

  /** KWD display values derived from fils in filter input. */
  protected readonly minPriceKwd = signal<number | null>(null);
  protected readonly maxPriceKwd = signal<number | null>(null);

  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor() {
    // Debounce the search stream and emit as filter change
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => {
      this.filterChange.emit({ q: q || undefined });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filter']) {
      // Sync search display value
      this.searchValue.set(this.filter.q ?? '');
      // Sync KWD display values from fils
      this.minPriceKwd.set(
        this.filter.minPriceFils != null ? this.filter.minPriceFils / 1000 : null
      );
      this.maxPriceKwd.set(
        this.filter.maxPriceFils != null ? this.filter.maxPriceFils / 1000 : null
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearchChange(q: string): void {
    this.searchValue.set(q);
    this.searchSubject.next(q);
  }

  protected onBrandSelect(brandId: string): void {
    this.brandChange.emit(brandId || undefined);
  }

  protected onModelSelect(modelId: string): void {
    this.filterChange.emit({ modelId: modelId || undefined });
  }

  protected onBodyTypeSelect(bodyTypeId: string | undefined): void {
    this.filterChange.emit({ bodyTypeId });
  }

  protected onStageSelect(stage: string): void {
    this.filterChange.emit({ stage: (stage as ListingStage) || undefined });
  }

  protected onFeaturedSelect(featured: boolean | undefined): void {
    this.filterChange.emit({ featured });
  }

  protected onMinYearChange(value: number | null): void {
    this.filterChange.emit({ minYear: value ?? undefined });
  }

  protected onMaxYearChange(value: number | null): void {
    this.filterChange.emit({ maxYear: value ?? undefined });
  }

  /**
   * Price boundary: UI works in KWD, API expects fils (KWD * 1000).
   * Convert at this boundary so the parent filter signal always holds fils.
   */
  protected onMinPriceKwdChange(kwd: number | null): void {
    this.minPriceKwd.set(kwd);
    this.filterChange.emit({
      minPriceFils: kwd != null && kwd >= 0 ? Math.round(kwd * 1000) : undefined,
    });
  }

  protected onMaxPriceKwdChange(kwd: number | null): void {
    this.maxPriceKwd.set(kwd);
    this.filterChange.emit({
      maxPriceFils: kwd != null && kwd >= 0 ? Math.round(kwd * 1000) : undefined,
    });
  }
}
