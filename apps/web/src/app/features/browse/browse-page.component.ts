import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { PublicCatalogService } from '../../data/public-catalog.service';
import type { FeaturedCar } from '../../data/catalog.types';
import type { SavedSearchQueryPayload } from '@behbehani-cpo/shared-types';
import { CarCardComponent } from '../home/sections/car-card.component';
import { BrowseCarRowComponent } from './browse-car-row.component';
import {
  BROWSE_BOUNDS,
  BrowseFilterPanelComponent,
  defaultBrowseFilters,
  type BrowseFilters,
} from './browse-filter-panel.component';
import { HeartToggleService } from '../../data/heart-toggle.service';
import { SaveSearchModalService } from './save-search-modal.service';

type SortKey = 'best' | 'newest' | 'priceAsc' | 'priceDesc' | 'mileageAsc' | 'year';
type ViewMode = 'grid' | 'list';

const PAGE_SIZE = 12;

/** Maps BrowseFilters (camelCase, KWD price) → SavedSearchQueryPayload (snake_case, fils). */
function browseFiltersToPayload(f: BrowseFilters): SavedSearchQueryPayload {
  const d = defaultBrowseFilters();
  const p: SavedSearchQueryPayload = {};
  if (f.brands.length > 0) p.brands = [...f.brands];
  if (f.bodies.length > 0) p.body_types = [...f.bodies];
  if (f.transmission.length > 0) p.transmissions = f.transmission as SavedSearchQueryPayload['transmissions'];
  if (f.fuel.length > 0) p.fuel_types = f.fuel as SavedSearchQueryPayload['fuel_types'];
  if (f.inspected) p.inspection_flag = true;
  if (f.price[0] !== d.price[0]) p.price_min_fils = f.price[0] * 1000;
  if (f.price[1] !== d.price[1]) p.price_max_fils = f.price[1] * 1000;
  if (f.year[0] !== d.year[0]) p.year_min = f.year[0];
  if (f.year[1] !== d.year[1]) p.year_max = f.year[1];
  if (f.mileage[0] !== d.mileage[0]) p.mileage_min_km = f.mileage[0];
  if (f.mileage[1] !== d.mileage[1]) p.mileage_max_km = f.mileage[1];
  return p;
}

/**
 * Customer-facing Browse / Listings page. Pulls the public listings via
 * `PublicCatalogService.list$()` (max page-size 48 today) and applies filters,
 * sort, and pagination client-side. The filter panel covers all 17 mockup
 * sections; only those backed by data on `FeaturedCar` are functional —
 * `BrowseFilterPanelComponent` renders the rest as "Coming soon".
 */
@Component({
  selector: 'app-browse-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    RouterLink,
    CarCardComponent,
    BrowseCarRowComponent,
    BrowseFilterPanelComponent,
  ],
  template: `
    <!-- HEAD: breadcrumb + title -->
    <header class="border-b border-line bg-surface-soft">
      <div class="mx-auto w-full max-w-container px-4 py-6 lg:px-6 lg:py-8">
        <nav class="mb-3 flex items-center gap-1.5 text-[12px] font-medium text-muted-2" [attr.aria-label]="'browse.breadcrumb' | translate">
          <a [routerLink]="['/', currentLocale()]" class="hover:text-brand-700">{{ 'nav.home' | translate }}</a>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'" /></svg>
          <span class="text-ink-2">{{ 'nav.buy' | translate }}</span>
        </nav>
        <h1 class="font-display text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.025em] text-ink">
          {{ pageTitle() }}
        </h1>
        <p class="mt-2 text-[14px] text-muted">
          {{ resultCount() }} {{ 'browse.subline' | translate }}
        </p>
      </div>
    </header>

    <div class="mx-auto w-full max-w-container px-4 py-6 lg:px-6 lg:py-8">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[296px_1fr]">
        <!-- Desktop sidebar -->
        <div class="hidden lg:block">
          <app-browse-filter-panel
            [filters]="filters()"
            [brands]="brands()"
            [bodyTypes]="bodyTypes()"
            (filtersChange)="filters.set($event)"
            (reset)="resetFilters()"
          />
        </div>

        <main>
          <!-- Toolbar -->
          <div class="mb-4 flex flex-wrap items-center gap-2.5">
            <button type="button" class="inline-flex items-center gap-1.5 rounded-pill border border-line-2 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-brand-sm lg:hidden" (click)="mobileFiltersOpen.set(true)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4" /></svg>
              {{ 'browse.filters' | translate }}
              @if (activeFilterCount() > 0) {
                <span class="inline-flex h-5 min-w-[20px] items-center justify-center rounded-pill bg-brand-700 px-1.5 text-[11px] font-bold text-white">{{ activeFilterCount() }}</span>
              }
            </button>

            <div class="flex flex-1 items-center gap-2 rounded-pill border border-line-2 bg-white px-3.5 py-2 shadow-brand-sm">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="text-muted" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>
              <input
                type="search"
                class="flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                [value]="filters().q"
                (input)="patchFilter({ q: $any($event.target).value })"
                [placeholder]="'browse.searchPlaceholder' | translate"
              />
              @if (filters().q) {
                <button type="button" class="text-muted hover:text-ink" (click)="patchFilter({ q: '' })" [attr.aria-label]="'browse.clearSearch' | translate">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                </button>
              }
            </div>

            <select class="rounded-pill border border-line-2 bg-white px-3 py-2 text-sm font-semibold text-ink shadow-brand-sm focus-visible:outline-2 focus-visible:outline-brand-700" [value]="sort()" (change)="sort.set($any($event.target).value)" [attr.aria-label]="'browse.sortBy' | translate">
              @for (s of sortOptions; track s[0]) {
                <option [value]="s[0]">{{ 'browse.sort.' + s[1] | translate }}</option>
              }
            </select>

            <div class="inline-flex overflow-hidden rounded-pill border border-line-2 bg-white shadow-brand-sm">
              <button type="button" class="px-3 py-2 text-muted-2 hover:bg-surface-soft" [class.bg-brand-700]="view() === 'grid'" [class.text-white]="view() === 'grid'" [class.!text-white]="view() === 'grid'" (click)="view.set('grid')" [attr.aria-label]="'browse.viewGrid' | translate" [attr.aria-pressed]="view() === 'grid'">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              </button>
              <button type="button" class="px-3 py-2 text-muted-2 hover:bg-surface-soft" [class.bg-brand-700]="view() === 'list'" [class.text-white]="view() === 'list'" [class.!text-white]="view() === 'list'" (click)="view.set('list')" [attr.aria-label]="'browse.viewList' | translate" [attr.aria-pressed]="view() === 'list'">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>

          <!-- Active chips + Save-search CTA — visible whenever any filter is active
               (chips array may be empty when filters arrive via URL params, but the
               CTA + Clear-all still need to render). -->
          @if (hasActiveFilters()) {
            <div class="mb-4 flex flex-wrap items-center gap-1.5">
              @for (chip of activeChips(); track chip.key) {
                <button type="button" class="inline-flex items-center gap-1 rounded-pill border border-line-2 bg-white px-2.5 py-1 text-[12px] font-semibold text-ink hover:border-brand-700 hover:text-brand-700" (click)="removeChip(chip.key)">
                  {{ chip.label }}
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                </button>
              }
              <button type="button" class="text-[12px] font-semibold text-brand-700 hover:text-brand-800" (click)="resetFilters()">
                {{ 'browse.clearAll' | translate }}
              </button>
              <button
                type="button"
                (click)="onSaveSearch()"
                class="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-4 py-2 text-[13px] font-semibold text-brand-700 hover:bg-brand-100 min-h-[44px]"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                {{ 'browse.saveSearchCta' | translate }}
              </button>
            </div>
          }

          <!-- Results -->
          @if (loading()) {
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              @for (n of [1,2,3,4,5,6]; track n) {
                <div class="aspect-[16/10] animate-pulse rounded-2xl bg-surface-cool"></div>
              }
            </div>
          } @else if (pagedResults().length === 0) {
            <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface-soft px-5 py-16 text-center">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.6" class="text-muted" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>
              <h3 class="font-display text-lg font-bold text-ink">{{ 'browse.empty.title' | translate }}</h3>
              <p class="max-w-sm text-sm text-muted">{{ 'browse.empty.sub' | translate }}</p>
              <button type="button" class="rounded-pill bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800" (click)="resetFilters()">
                {{ 'browse.empty.cta' | translate }}
              </button>
            </div>
          } @else if (view() === 'grid') {
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              @for (car of pagedResults(); track car.id) {
                <app-car-card [car]="car" />
              }
            </div>
          } @else {
            <div class="flex flex-col gap-4">
              @for (car of pagedResults(); track car.id) {
                <app-browse-car-row [car]="car" />
              }
            </div>
          }

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <nav class="mt-8 flex items-center justify-center gap-2" [attr.aria-label]="'browse.pagination' | translate">
              <button type="button" class="inline-flex items-center gap-1 rounded-pill border border-line-2 bg-white px-3 py-1.5 text-sm font-semibold text-ink-2 disabled:opacity-50" [disabled]="page() === 1" (click)="page.set(page() - 1)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="currentLocale() === 'ar' ? 'M10 6l6 6-6 6' : 'M14 6l-6 6 6 6'" /></svg>
                {{ 'browse.previous' | translate }}
              </button>
              <div class="flex items-center gap-1">
                @for (p of pageNumbers(); track p) {
                  <button type="button" class="min-w-[36px] rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors" [class.bg-brand-700]="p === page()" [class.text-white]="p === page()" [class.text-ink-2]="p !== page()" [class.hover:bg-surface-soft]="p !== page()" (click)="page.set(p)">
                    {{ p }}
                  </button>
                }
              </div>
              <button type="button" class="inline-flex items-center gap-1 rounded-pill border border-line-2 bg-white px-3 py-1.5 text-sm font-semibold text-ink-2 disabled:opacity-50" [disabled]="page() === totalPages()" (click)="page.set(page() + 1)">
                {{ 'browse.next' | translate }}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'" /></svg>
              </button>
            </nav>
          }
        </main>
      </div>
    </div>

    <!-- Mobile filter drawer -->
    @if (mobileFiltersOpen()) {
      <div class="fixed inset-0 z-50 bg-ink/40 lg:hidden" (click)="mobileFiltersOpen.set(false)">
        <aside class="absolute end-0 top-0 h-full w-full max-w-[360px] overflow-y-auto bg-white shadow-brand-lg" (click)="$event.stopPropagation()">
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-line-2 bg-white px-4 py-3">
            <h3 class="font-display text-lg font-bold text-ink">{{ 'browse.filters' | translate }}</h3>
            <button type="button" class="text-muted-2 hover:text-ink" (click)="mobileFiltersOpen.set(false)" [attr.aria-label]="'browse.close' | translate">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div class="p-2">
            <app-browse-filter-panel
              [filters]="filters()"
              [brands]="brands()"
              [bodyTypes]="bodyTypes()"
              (filtersChange)="filters.set($event)"
              (reset)="resetFilters()"
            />
          </div>
        </aside>
      </div>
    }
  `,
})
export class BrowsePageComponent {
  private readonly catalog = inject(PublicCatalogService);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly heartToggle = inject(HeartToggleService);
  private readonly saveSearchModal = inject(SaveSearchModalService);

  readonly currentLocale = computed(() => this.language.current());

  /** Read once-on-mount query params to seed filters; subsequent edits live in component state. */
  readonly filters = signal<BrowseFilters>(this.seedFromQueryParams());
  readonly sort = signal<SortKey>('best');
  readonly view = signal<ViewMode>('grid');
  readonly page = signal(1);
  readonly mobileFiltersOpen = signal(false);

  readonly sortOptions: ReadonlyArray<[SortKey, string]> = [
    ['best', 'best'],
    ['newest', 'newest'],
    ['priceAsc', 'priceAsc'],
    ['priceDesc', 'priceDesc'],
    ['mileageAsc', 'mileageAsc'],
    ['year', 'year'],
  ];

  /** Fetch the whole result set once (server cap = pageSize 48). All
      filter/sort/pagination is client-side; cheap with our seed of ~12. */
  private readonly listResp = toSignal(
    this.catalog.list$({ pageSize: 48, sort: 'featured' }),
    { initialValue: [] as ReadonlyArray<FeaturedCar> }
  );
  readonly brands = toSignal(this.catalog.brands$(), { initialValue: [] });
  readonly bodyTypes = toSignal(this.catalog.bodyTypes$(), { initialValue: [] });

  readonly loading = computed(() => this.listResp().length === 0 && this.brands().length === 0);

  readonly filteredResults = computed(() => this.applyFilters(this.listResp(), this.filters()));
  readonly sortedResults = computed(() => this.applySort(this.filteredResults(), this.sort()));
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.sortedResults().length / PAGE_SIZE)));
  readonly pagedResults = computed(() => {
    const p = this.page();
    const start = (p - 1) * PAGE_SIZE;
    return this.sortedResults().slice(start, start + PAGE_SIZE);
  });
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });
  readonly resultCount = computed(() => this.sortedResults().length);

  readonly pageTitle = computed(() => {
    const brands = this.filters().brands;
    if (brands.length === 1) {
      const b = this.brands().find((x) => x.slug === brands[0]);
      if (b) {
        const name = this.currentLocale() === 'ar' ? b.nameAr : b.nameEn;
        return this.translate.instant('browse.titleBrand', { brand: name });
      }
    }
    return this.translate.instant('browse.titleAll');
  });

  readonly activeFilterCount = computed(() => this.activeChips().length);

  readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    const d = defaultBrowseFilters();
    return (
      f.brands.length > 0 ||
      f.bodies.length > 0 ||
      f.transmission.length > 0 ||
      f.fuel.length > 0 ||
      f.inspected !== d.inspected ||
      f.q.trim().length > 0 ||
      f.price[0] !== d.price[0] ||
      f.price[1] !== d.price[1] ||
      f.year[0] !== d.year[0] ||
      f.year[1] !== d.year[1] ||
      f.mileage[0] !== d.mileage[0] ||
      f.mileage[1] !== d.mileage[1]
    );
  });

  readonly activeChips = computed<ReadonlyArray<{ key: string; label: string }>>(() => {
    const f = this.filters();
    const out: { key: string; label: string }[] = [];
    const isAr = this.currentLocale() === 'ar';
    for (const slug of f.brands) {
      const b = this.brands().find((x) => x.slug === slug);
      if (b) out.push({ key: 'brand:' + slug, label: isAr ? b.nameAr : b.nameEn });
    }
    for (const slug of f.bodies) {
      const b = this.bodyTypes().find((x) => x.slug === slug);
      if (b) out.push({ key: 'body:' + slug, label: isAr ? b.nameAr : b.nameEn });
    }
    for (const t of f.transmission) out.push({ key: 'trans:' + t, label: this.translate.instant('browse.transmissions.' + t) });
    for (const fl of f.fuel) out.push({ key: 'fuel:' + fl, label: this.translate.instant('browse.fuels.' + fl) });
    if (f.price[0] > BROWSE_BOUNDS.price[0] || f.price[1] < BROWSE_BOUNDS.price[1]) {
      out.push({ key: 'price', label: `KWD ${f.price[0]} – ${f.price[1] === BROWSE_BOUNDS.price[1] ? '50K+' : f.price[1]}` });
    }
    if (f.year[0] > BROWSE_BOUNDS.year[0] || f.year[1] < BROWSE_BOUNDS.year[1]) {
      out.push({ key: 'year', label: `${f.year[0]} – ${f.year[1]}` });
    }
    if (f.mileage[0] > BROWSE_BOUNDS.mileage[0] || f.mileage[1] < BROWSE_BOUNDS.mileage[1]) {
      out.push({ key: 'mileage', label: `${(f.mileage[0] / 1000).toFixed(0)}k – ${(f.mileage[1] / 1000).toFixed(0)}k km` });
    }
    if (f.inspected) out.push({ key: 'inspected', label: this.translate.instant('browse.trust.inspected') });
    return out;
  });

  constructor() {
    /* SEO: keep the title fresh as the user filters. */
    effect(() => {
      this.title.setTitle(`${this.pageTitle()} — Behbehani Motors`);
      this.meta.updateTag({ name: 'description', content: this.translate.instant('browse.metaDescription') });
    });
    /* Reset to page 1 whenever the filter or sort changes. */
    effect(() => {
      this.filters();
      this.sort();
      this.page.set(1);
    });

    /* Hydrate heart-toggle for the current page of results. */
    effect(() => {
      const ids = this.pagedResults().map((c) => c.id);
      this.heartToggle.hydrate(ids);
    });
  }

  patchFilter(p: Partial<BrowseFilters>): void {
    this.filters.update((f) => ({ ...f, ...p }));
  }

  resetFilters(): void {
    this.filters.set(defaultBrowseFilters());
  }

  onSaveSearch(): void {
    const payload = browseFiltersToPayload(this.filters());
    this.saveSearchModal.open(payload);
  }

  removeChip(key: string): void {
    const f = { ...this.filters() };
    if (key === 'price') f.price = [...BROWSE_BOUNDS.price];
    else if (key === 'year') f.year = [...BROWSE_BOUNDS.year];
    else if (key === 'mileage') f.mileage = [...BROWSE_BOUNDS.mileage];
    else if (key === 'inspected') f.inspected = false;
    else if (key.startsWith('brand:')) f.brands = f.brands.filter((x) => x !== key.slice(6));
    else if (key.startsWith('body:')) f.bodies = f.bodies.filter((x) => x !== key.slice(5));
    else if (key.startsWith('trans:')) f.transmission = f.transmission.filter((x) => x !== key.slice(6));
    else if (key.startsWith('fuel:')) f.fuel = f.fuel.filter((x) => x !== key.slice(5));
    this.filters.set(f);
  }

  private seedFromQueryParams(): BrowseFilters {
    const f = defaultBrowseFilters();
    const q = this.route.snapshot.queryParamMap;
    const brand = q.get('brand');
    if (brand) f.brands = [brand];
    const body = q.get('body');
    if (body) f.bodies = [body];
    const search = q.get('q');
    if (search) f.q = search;
    const budgetMin = q.get('budgetMinKwd');
    const budgetMax = q.get('budgetMaxKwd');
    /* v1.5-D11b: support both ends so price-bracket buttons on /home can pass
       full ranges (e.g. "KWD 6K – 10K") and the unbounded-upper bracket
       ("KWD 20K and above") with only budgetMinKwd set. */
    if (budgetMin || budgetMax) {
      f.price = [budgetMin ? Number(budgetMin) : 0, budgetMax ? Number(budgetMax) : 999999];
    }
    return f;
  }

  private applyFilters(cars: ReadonlyArray<FeaturedCar>, f: BrowseFilters): FeaturedCar[] {
    const q = f.q.trim().toLowerCase();
    return cars.filter((c) => {
      if (c.price < f.price[0] || c.price > f.price[1]) return false;
      if (c.year < f.year[0] || c.year > f.year[1]) return false;
      if (c.mileage < f.mileage[0] || c.mileage > f.mileage[1]) return false;
      if (f.brands.length && !f.brands.includes(c.brand)) return false;
      if (f.bodies.length && !f.bodies.includes(c.body)) return false;
      if (f.transmission.length && !f.transmission.includes(c.transmission.toLowerCase())) return false;
      if (f.fuel.length && !f.fuel.includes(c.fuel.toLowerCase())) return false;
      if (f.inspected && !c.inspected) return false;
      if (q) {
        const hay = `${c.brand} ${c.model} ${c.year}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  private applySort(cars: ReadonlyArray<FeaturedCar>, sort: SortKey): FeaturedCar[] {
    const arr = [...cars];
    switch (sort) {
      case 'priceAsc':
        return arr.sort((a, b) => a.price - b.price);
      case 'priceDesc':
        return arr.sort((a, b) => b.price - a.price);
      case 'mileageAsc':
        return arr.sort((a, b) => a.mileage - b.mileage);
      case 'year':
        return arr.sort((a, b) => b.year - a.year);
      case 'newest':
        return arr.sort((a, b) => b.id.localeCompare(a.id));
      case 'best':
      default:
        return arr.sort((a, b) => (b.inspected ? 1 : 0) - (a.inspected ? 1 : 0));
    }
  }
}
