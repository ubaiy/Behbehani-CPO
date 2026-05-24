import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { CarCardComponent } from './car-card.component';
import { UiSelectComponent, type SelectOption } from '../../../shared/ui-select.component';
import { PublicCatalogService } from '../../../data/public-catalog.service';

@Component({
  selector: 'app-featured-cars',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, CarCardComponent, UiSelectComponent],
  template: `
    <section class="container-page section">
      <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="section-eyebrow">{{ 'home.featured.eyebrow' | translate }}</div>
          <h2 class="mt-2 font-display text-[clamp(28px,3.4vw,44px)] font-bold tracking-[-0.025em] text-ink">
            {{ 'home.featured.title' | translate }}
          </h2>
        </div>
        <button type="button" class="link-arrow" (click)="goToBrowse()">
          {{ 'home.featured.viewAll' | translate }}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="dirArrow()" />
          </svg>
        </button>
      </header>

      <!-- Sticky filter bar: sits just below the app header (top-0 / ~80px tall)
           so it remains reachable as user scrolls the featured grid. Backdrop-blur
           keeps content beneath legible without solid bleed. The wrapper has no
           overflow:hidden so the ui-select dropdown panel can paint past the
           rounded corner — visual radius is preserved per-cell on the first
           ui-select and the search button. -->
      <div class="sticky top-[80px] z-30 -mx-4 mb-3 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div
          class="grid divide-y divide-line rounded-[18px] border border-line bg-white/95 shadow-brand sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse"
        >
          <app-ui-select
            [label]="'home.featured.brand' | translate"
            [options]="brandOptions()"
            [value]="brand()"
            [placeholder]="'home.featured.anyBrand' | translate"
            (valueChange)="brand.set($event)"
          />
          <app-ui-select
            [label]="'home.featured.body' | translate"
            [options]="bodyOptions()"
            [value]="body()"
            [placeholder]="'home.featured.anyBody' | translate"
            (valueChange)="body.set($event)"
          />
          <app-ui-select
            [label]="'home.featured.maxBudget' | translate"
            [options]="budgetOptions"
            [value]="budget()"
            [placeholder]="'home.featured.any' | translate"
            (valueChange)="budget.set($event)"
          />
          <button
            type="button"
            class="flex items-center justify-center gap-2 rounded-b-[18px] bg-brand-700 px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-brand-600 active:scale-[0.98] sm:rounded-b-none sm:rounded-e-[18px] sm:px-8 sm:py-3.5"
            (click)="onSearch()"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <circle cx="11" cy="11" r="6" />
              <path d="m20 20-4.5-4.5" />
            </svg>
            <span>{{ 'home.featured.search' | translate }}</span>
          </button>
        </div>

        <!-- Filter chip preview row — shows selected filter values as removable
             chips. Empty when no filter selected (collapses to zero height to
             keep the sticky bar compact). -->
        @if (hasAnyFilter()) {
          <div class="mt-2 flex flex-wrap items-center gap-2">
            @for (chip of activeChips(); track chip.key) {
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-pill border border-line-2 bg-white px-3 py-1 text-[12px] font-semibold text-ink shadow-brand-sm transition-colors hover:border-brand-700 hover:text-brand-700"
                (click)="removeChip(chip.key)"
                [attr.aria-label]="('home.featured.removeFilter' | translate) + ' ' + chip.label"
              >
                <span>{{ chip.label }}</span>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            }
            <button
              type="button"
              class="text-[12px] font-semibold text-brand-700 hover:text-brand-800"
              (click)="clear()"
            >
              {{ 'home.featured.clearAll' | translate }}
            </button>
          </div>
        }
      </div>

      @if (cars().length === 0) {
        <div class="mt-6 flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-line bg-surface-soft px-5 py-14 text-center">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" class="text-muted" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          <p class="text-sm text-muted">{{ 'home.featured.empty' | translate }}</p>
          <button type="button" class="link-arrow" (click)="clear()">
            {{ 'home.featured.clear' | translate }}
          </button>
        </div>
      } @else {
        <div class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (car of cars(); track car.id) {
            <app-car-card [car]="car" />
          }
        </div>
      }
    </section>
  `,
})
export class FeaturedCarsComponent {
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly catalog = inject(PublicCatalogService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly currentLocale = computed(() => this.language.current());

  readonly brand = signal<string>('');
  readonly body = signal<string>('');
  readonly budget = signal<string>('');

  /** Initial dataset from /v1/public/listings/featured (falls back to mock). */
  private readonly featured = toSignal(this.catalog.featured$(), { initialValue: [] });
  private readonly allBrands = toSignal(this.catalog.brands$(), { initialValue: [] });
  private readonly allBodyTypes = toSignal(this.catalog.bodyTypes$(), { initialValue: [] });

  readonly dirArrow = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));

  readonly brandOptions = computed<ReadonlyArray<SelectOption>>(() => {
    const isAr = this.currentLocale() === 'ar';
    /* Drop brands with zero published listings — they're dead-end picks in a
       filter UI. Browse-by-Brand still shows all admin-active brands via the
       same endpoint; this filter is local to the dropdown. */
    return [
      { value: '', label: this.translate.instant('home.featured.anyBrand') },
      ...this.allBrands()
        .filter((b) => b.listingCount > 0)
        .map((b) => ({
          value: b.slug,
          label: `${isAr ? b.nameAr : b.nameEn} (${b.listingCount})`,
          iconUrl: b.logoUrl ?? brandFaviconUrl(b.slug),
        })),
    ];
  });

  readonly bodyOptions = computed<ReadonlyArray<SelectOption>>(() => {
    const isAr = this.currentLocale() === 'ar';
    return [
      { value: '', label: this.translate.instant('home.featured.anyBody') },
      ...this.allBodyTypes()
        .filter((b) => b.listingCount > 0)
        .map((b) => ({
          value: b.slug,
          label: `${isAr ? b.nameAr : b.nameEn} (${b.listingCount})`,
          iconUrl: BODY_ICONS[b.slug] ?? BODY_ICONS['sedan'],
        })),
    ];
  });

  /** Budget value encodes a range as `minKwd-maxKwd` (empty = open-ended). */
  readonly budgetOptions: ReadonlyArray<SelectOption> = [
    { value: '', label: 'Any' },
    { value: '0-5000', label: 'Under KWD 5,000' },
    { value: '5000-10000', label: 'KWD 5,000 – 10,000' },
    { value: '10000-15000', label: 'KWD 10,000 – 15,000' },
    { value: '15000-25000', label: 'KWD 15,000 – 25,000' },
    { value: '25000-', label: 'KWD 25,000+' },
  ];

  /** Local filter applied to the already-loaded featured set — no extra HTTP for first 8. */
  readonly cars = computed(() => {
    let pool = this.featured().slice();
    if (this.brand()) pool = pool.filter((c) => c.brand === this.brand());
    if (this.body()) pool = pool.filter((c) => c.body === this.body());
    const [minKwd, maxKwd] = parseBudgetRange(this.budget());
    if (minKwd > 0 || maxKwd < Number.POSITIVE_INFINITY) {
      pool = pool.filter((c) => c.price >= minKwd && c.price <= maxKwd);
    }
    return pool.slice(0, 8);
  });

  /** Has at least one of brand/body/budget been selected? Drives chip-row visibility. */
  readonly hasAnyFilter = computed(() => !!(this.brand() || this.body() || this.budget()));

  /** Removable chip preview row. Looks up display labels from the option list. */
  readonly activeChips = computed<ReadonlyArray<{ key: 'brand' | 'body' | 'budget'; label: string }>>(() => {
    const chips: Array<{ key: 'brand' | 'body' | 'budget'; label: string }> = [];
    if (this.brand()) {
      const opt = this.brandOptions().find((o) => o.value === this.brand());
      if (opt) chips.push({ key: 'brand', label: stripCount(opt.label) });
    }
    if (this.body()) {
      const opt = this.bodyOptions().find((o) => o.value === this.body());
      if (opt) chips.push({ key: 'body', label: stripCount(opt.label) });
    }
    if (this.budget()) {
      const opt = this.budgetOptions.find((o) => o.value === this.budget());
      if (opt) chips.push({ key: 'budget', label: opt.label });
    }
    return chips;
  });

  clear(): void {
    this.brand.set('');
    this.body.set('');
    this.budget.set('');
  }

  removeChip(key: 'brand' | 'body' | 'budget'): void {
    if (key === 'brand') this.brand.set('');
    else if (key === 'body') this.body.set('');
    else this.budget.set('');
  }

  /** Search button → navigate to /{locale}/browse with selected filters as query params. */
  onSearch(): void {
    void this.router.navigate(['/', this.currentLocale(), 'browse'], {
      queryParams: this.buildQueryParams(),
    });
  }

  /** "View all" → /{locale}/browse with current filter context preserved. */
  goToBrowse(): void {
    void this.router.navigate(['/', this.currentLocale(), 'browse'], {
      queryParams: this.buildQueryParams(),
    });
  }

  private buildQueryParams(): Record<string, string> {
    const qp: Record<string, string> = {};
    if (this.brand()) qp['brand'] = this.brand();
    if (this.body()) qp['body'] = this.body();
    const [, maxKwd] = parseBudgetRange(this.budget());
    if (maxKwd < Number.POSITIVE_INFINITY) qp['budgetMaxKwd'] = String(maxKwd);
    return qp;
  }

  onLogoError(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    const wrapper = img.parentElement;
    if (!wrapper || wrapper.querySelector('.brand-logo-fallback')) return;
    img.style.display = 'none';
    const initial = (img.alt || '?').trim().charAt(0).toUpperCase();
    const fallback = document.createElement('span');
    fallback.className = 'brand-logo-fallback inline-grid place-items-center w-4 h-4 rounded-full bg-brand-100 text-brand-700 text-[8px] font-bold';
    fallback.textContent = initial;
    fallback.setAttribute('aria-hidden', 'true');
    wrapper.appendChild(fallback);
  }
}

/* ---------- helpers ---------- */

/** Google's favicon CDN — same fallback Browse-by-Brand uses. */
function brandFaviconUrl(slug: string): string {
  return `https://www.google.com/s2/favicons?domain=${slug}.com&sz=64`;
}

/** Parse `"5000-10000"` / `"25000-"` / `""` into [minKwd, maxKwd]. */
function parseBudgetRange(value: string): [number, number] {
  if (!value) return [0, Number.POSITIVE_INFINITY];
  const [lo, hi] = value.split('-');
  const min = lo ? Number(lo) : 0;
  const max = hi ? Number(hi) : Number.POSITIVE_INFINITY;
  return [min, max];
}

/** Drop "(count)" suffix from select labels so chips don't include "(12)". */
function stripCount(label: string): string {
  return label.replace(/\s*\(\d+\)\s*$/, '');
}

/** Inline body-type icons as data URIs so they ride along without extra HTTP. */
const BODY_ICONS: Readonly<Record<string, string>> = {
  sedan: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16h18M5 16l1.5-4.5A3 3 0 0 1 9.4 9.5h5.2a3 3 0 0 1 2.9 2L19 16M9 16v2M15 16v2"/><circle cx="8" cy="17.5" r="1.5"/><circle cx="16" cy="17.5" r="1.5"/></svg>'
  ),
  suv: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16h18M4 16l1-7h14l1 7M9 9v7M15 9v7M9 16v2M15 16v2"/><circle cx="8" cy="17.5" r="1.5"/><circle cx="16" cy="17.5" r="1.5"/></svg>'
  ),
  coupe: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h18M5 17 7 12c.7-1.5 2.2-2.5 3.8-2.5h2.4c1.6 0 3.1 1 3.8 2.5l2 5M9 17v1.5M15 17v1.5"/><circle cx="8" cy="18" r="1.4"/><circle cx="16" cy="18" r="1.4"/></svg>'
  ),
  hatchback: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16h18M5 16l1.5-4.5A3 3 0 0 1 9.4 9.5h5.2c1 0 1.7.6 2.4 1.5l3 5M9 16v2M15 16v2"/><circle cx="8" cy="17.5" r="1.5"/><circle cx="16" cy="17.5" r="1.5"/></svg>'
  ),
  pickup: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16h18M5 16l1-5h6v5M12 11h7l1 5M9 16v2M16 16v2"/><circle cx="8" cy="17.5" r="1.5"/><circle cx="17" cy="17.5" r="1.5"/></svg>'
  ),
  van: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="16" height="8" rx="1.5"/><path d="M19 11l2 2v3h-2M3 16v2M19 16v2M11 8v8"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></svg>'
  ),
  wagon: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16h18M4 16l1-6h14l1 6M5 10h14M9 16v2M16 16v2"/><circle cx="8" cy="17.5" r="1.5"/><circle cx="16" cy="17.5" r="1.5"/></svg>'
  ),
  convertible: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h18M4 17l1-3 2-2h10l3 5M9 17v1.5M15 17v1.5"/><circle cx="8" cy="18" r="1.4"/><circle cx="16" cy="18" r="1.4"/></svg>'
  ),
};

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
