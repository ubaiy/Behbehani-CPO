import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import type { PublicCatalogBrand, PublicCatalogBodyType } from '@behbehani-cpo/shared-types';
import { RangeSliderComponent } from '../../shared/range-slider.component';

/**
 * Filter state powering the Browse page. Sub-ranges are stored as [min, max].
 * Multi-select arrays are slug strings. The page applies these client-side
 * (and forwards the bare-minimum to the API for brand/body/maxBudget).
 */
export interface BrowseFilters {
  q: string;
  price: [number, number];
  year: [number, number];
  mileage: [number, number];
  brands: string[];
  bodies: string[];
  transmission: string[];
  fuel: string[];
  inspected: boolean;
}

export const BROWSE_BOUNDS = {
  price: [0, 50000] as [number, number],
  year: [2015, 2026] as [number, number],
  mileage: [0, 200000] as [number, number],
};

export function defaultBrowseFilters(): BrowseFilters {
  return {
    q: '',
    price: [...BROWSE_BOUNDS.price],
    year: [...BROWSE_BOUNDS.year],
    mileage: [...BROWSE_BOUNDS.mileage],
    brands: [],
    bodies: [],
    transmission: [],
    fuel: [],
    inspected: false,
  };
}

interface BodyTile {
  slug: string;
  pathSvg: string;
}

/** Body-type silhouette SVG paths (matches the JSX mockup's BODY_SVG map). */
const BODY_PATHS: Readonly<Record<string, string>> = {
  sedan: 'M5 30 Q7 25 12 24 L20 18 Q26 14 36 14 L48 14 Q58 14 64 20 L70 26 Q74 26 76 30 L76 34 L5 34 Z',
  suv: 'M6 28 Q8 22 14 22 L20 14 Q26 10 38 10 L52 10 Q62 10 68 16 L74 22 Q78 22 80 26 L80 34 L6 34 Z',
  coupe: 'M6 30 Q8 26 12 25 L24 16 Q34 13 46 14 L58 14 Q68 16 72 22 L76 28 L76 34 L6 34 Z',
  convertible: 'M6 30 Q8 26 12 25 L20 22 Q28 19 38 19 L52 19 Q60 19 64 22 L72 26 Q76 26 78 30 L78 34 L6 34 Z',
  pickup: 'M5 28 L18 28 L24 18 L40 18 L42 28 L80 28 L80 34 L5 34 Z',
  hatchback: 'M6 30 Q8 26 12 25 L22 16 Q28 14 38 14 L50 14 L68 28 L80 30 L80 34 L6 34 Z',
  van: 'M6 28 Q8 22 14 21 L18 14 Q24 11 40 11 L58 11 Q70 11 74 18 L78 24 L82 28 L82 34 L6 34 Z',
  wagon: 'M3 30 Q5 25 10 24 L18 18 Q24 14 36 14 L60 14 Q72 14 78 22 L82 30 L82 34 L3 34 Z',
};

const TRANSMISSION_VALUES = ['automatic', 'manual', 'cvt'];
const FUEL_VALUES = ['petrol', 'diesel', 'hybrid', 'electric'];

@Component({
  selector: 'app-browse-filter-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, RangeSliderComponent],
  template: `
    <aside
      class="overflow-y-auto overflow-x-hidden rounded-2xl border border-line bg-white p-1.5 lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-110px)]"
    >
      <div
        class="sticky top-0 z-10 flex items-center justify-between border-b border-line-2 bg-white px-3.5 py-3"
      >
        <h3 class="text-base font-bold text-ink">{{ 'browse.filters' | translate }}</h3>
        <button type="button" class="text-sm font-semibold text-brand-700 hover:text-brand-800" (click)="reset.emit()">
          {{ 'browse.clearAll' | translate }}
        </button>
      </div>

      <!-- PRICE -->
      <section class="border-b border-line-2">
        <button type="button" class="flex w-full items-center gap-1.5 px-3.5 py-3.5 text-start hover:bg-surface-soft" (click)="toggle('price')">
          <span class="flex-1 text-sm font-semibold text-ink">{{ 'browse.sections.price' | translate }}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="text-muted" [class.rotate-180]="isOpen('price')" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        @if (isOpen('price')) {
          <div class="px-3.5 pb-4">
            <app-range-slider
              [min]="bounds.price[0]"
              [max]="bounds.price[1]"
              [step]="500"
              [value]="filters().price"
              [format]="priceFormatter"
              [ariaLabelLow]="'browse.sections.price' | translate"
              (valueChange)="patch({ price: $event })"
            />
            <div class="mt-2.5 flex flex-wrap gap-1">
              @for (q of pricePresets; track q[0] + '-' + q[1]) {
                <button type="button" class="rounded-pill border border-line-2 bg-surface-soft px-2.5 py-1 text-[11px] font-semibold text-ink-2 hover:border-brand-700 hover:bg-brand-50 hover:text-brand-700" (click)="patch({ price: [q[0], q[1]] })">
                  {{ q[2] }}
                </button>
              }
            </div>
          </div>
        }
      </section>

      <!-- YEAR -->
      <section class="border-b border-line-2">
        <button type="button" class="flex w-full items-center gap-1.5 px-3.5 py-3.5 text-start hover:bg-surface-soft" (click)="toggle('year')">
          <span class="flex-1 text-sm font-semibold text-ink">{{ 'browse.sections.year' | translate }}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="text-muted" [class.rotate-180]="isOpen('year')" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        @if (isOpen('year')) {
          <div class="px-3.5 pb-4">
            <app-range-slider
              [min]="bounds.year[0]"
              [max]="bounds.year[1]"
              [step]="1"
              [value]="filters().year"
              [format]="yearFormatter"
              (valueChange)="patch({ year: $event })"
            />
          </div>
        }
      </section>

      <!-- MILEAGE -->
      <section class="border-b border-line-2">
        <button type="button" class="flex w-full items-center gap-1.5 px-3.5 py-3.5 text-start hover:bg-surface-soft" (click)="toggle('mileage')">
          <span class="flex-1 text-sm font-semibold text-ink">{{ 'browse.sections.mileage' | translate }}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="text-muted" [class.rotate-180]="isOpen('mileage')" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        @if (isOpen('mileage')) {
          <div class="px-3.5 pb-4">
            <app-range-slider
              [min]="bounds.mileage[0]"
              [max]="bounds.mileage[1]"
              [step]="5000"
              [value]="filters().mileage"
              [format]="kmFormatter"
              (valueChange)="patch({ mileage: $event })"
            />
          </div>
        }
      </section>

      <!-- MAKE & MODEL -->
      <section class="border-b border-line-2">
        <button type="button" class="flex w-full items-center gap-1.5 px-3.5 py-3.5 text-start hover:bg-surface-soft" (click)="toggle('make')">
          <span class="flex-1 text-sm font-semibold text-ink">{{ 'browse.sections.make' | translate }}</span>
          @if (filters().brands.length > 0) {
            <span class="inline-flex h-5 min-w-[20px] items-center justify-center rounded-pill bg-brand-700 px-1.5 text-[11px] font-bold text-white">{{ filters().brands.length }}</span>
          }
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="text-muted" [class.rotate-180]="isOpen('make')" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        @if (isOpen('make')) {
          <div class="px-3.5 pb-4">
            <div class="mb-2.5 flex items-center gap-2 rounded-[10px] border border-line-2 bg-surface-soft px-3 py-2">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="text-muted" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>
              <input type="text" [value]="brandSearch()" (input)="brandSearch.set($any($event.target).value)" [placeholder]="'browse.searchMakes' | translate" class="flex-1 border-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted" />
            </div>
            <div class="flex max-h-60 flex-col gap-1.5 overflow-y-auto pr-1">
              @for (b of filteredBrands(); track b.slug) {
                <label class="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[13px] hover:bg-surface-soft">
                  <input type="checkbox" class="size-4 accent-brand-700" [checked]="filters().brands.includes(b.slug)" (change)="toggleSlug('brands', b.slug)" />
                  <span class="inline-grid size-[22px] place-items-center rounded-full border border-line-2 bg-surface-soft p-0.5">
                    <img [src]="b.logoUrl ?? brandFavicon(b.slug)" alt="" loading="lazy" class="size-3.5 object-contain" />
                  </span>
                  <span class="flex-1 text-ink-2">{{ language.current() === 'ar' ? b.nameAr : b.nameEn }}</span>
                  <em class="text-[11px] not-italic text-muted-2">{{ b.listingCount }}</em>
                </label>
              }
              @if (filteredBrands().length === 0) {
                <p class="px-1.5 py-2 text-[12px] text-muted">{{ 'browse.noMatches' | translate }}</p>
              }
            </div>
          </div>
        }
      </section>

      <!-- BODY STYLE -->
      <section class="border-b border-line-2">
        <button type="button" class="flex w-full items-center gap-1.5 px-3.5 py-3.5 text-start hover:bg-surface-soft" (click)="toggle('body')">
          <span class="flex-1 text-sm font-semibold text-ink">{{ 'browse.sections.body' | translate }}</span>
          @if (filters().bodies.length > 0) {
            <span class="inline-flex h-5 min-w-[20px] items-center justify-center rounded-pill bg-brand-700 px-1.5 text-[11px] font-bold text-white">{{ filters().bodies.length }}</span>
          }
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="text-muted" [class.rotate-180]="isOpen('body')" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        @if (isOpen('body')) {
          <div class="px-3.5 pb-4">
            <div class="grid grid-cols-2 gap-1.5">
              @for (tile of bodyTiles(); track tile.slug) {
                <button
                  type="button"
                  class="flex flex-col items-center gap-1 rounded-[10px] border-[1.5px] bg-white px-2 py-3 text-[11px] font-semibold transition-all hover:-translate-y-0.5 hover:border-brand-700"
                  [class.border-line]="!filters().bodies.includes(tile.slug)"
                  [class.border-brand-700]="filters().bodies.includes(tile.slug)"
                  [class.bg-brand-50]="filters().bodies.includes(tile.slug)"
                  (click)="toggleSlug('bodies', tile.slug)"
                >
                  <svg viewBox="0 0 86 40" class="h-[26px] w-[56px] text-brand-700">
                    <path [attr.d]="tile.pathSvg" fill="currentColor" />
                    <circle cx="22" cy="34" r="4" fill="#0b1220" />
                    <circle cx="60" cy="34" r="4" fill="#0b1220" />
                  </svg>
                  <span class="text-ink">{{ bodyLabel(tile.slug) }}</span>
                </button>
              }
            </div>
          </div>
        }
      </section>

      <!-- TRANSMISSION -->
      <section class="border-b border-line-2">
        <button type="button" class="flex w-full items-center gap-1.5 px-3.5 py-3.5 text-start hover:bg-surface-soft" (click)="toggle('transmission')">
          <span class="flex-1 text-sm font-semibold text-ink">{{ 'browse.sections.transmission' | translate }}</span>
          @if (filters().transmission.length > 0) {
            <span class="inline-flex h-5 min-w-[20px] items-center justify-center rounded-pill bg-brand-700 px-1.5 text-[11px] font-bold text-white">{{ filters().transmission.length }}</span>
          }
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="text-muted" [class.rotate-180]="isOpen('transmission')" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        @if (isOpen('transmission')) {
          <div class="px-3.5 pb-4">
            <div class="flex flex-wrap gap-1">
              @for (t of transmissions; track t) {
                <button type="button" class="rounded-pill px-3 py-1.5 text-[12px] font-semibold transition-colors"
                  [class.border]="true"
                  [class.border-line-2]="!filters().transmission.includes(t)"
                  [class.bg-surface-soft]="!filters().transmission.includes(t)"
                  [class.text-ink-2]="!filters().transmission.includes(t)"
                  [class.border-brand-700]="filters().transmission.includes(t)"
                  [class.bg-brand-50]="filters().transmission.includes(t)"
                  [class.text-brand-700]="filters().transmission.includes(t)"
                  (click)="toggleSlug('transmission', t)">
                  {{ 'browse.transmissions.' + t | translate }}
                </button>
              }
            </div>
          </div>
        }
      </section>

      <!-- FUEL -->
      <section class="border-b border-line-2">
        <button type="button" class="flex w-full items-center gap-1.5 px-3.5 py-3.5 text-start hover:bg-surface-soft" (click)="toggle('fuel')">
          <span class="flex-1 text-sm font-semibold text-ink">{{ 'browse.sections.fuel' | translate }}</span>
          @if (filters().fuel.length > 0) {
            <span class="inline-flex h-5 min-w-[20px] items-center justify-center rounded-pill bg-brand-700 px-1.5 text-[11px] font-bold text-white">{{ filters().fuel.length }}</span>
          }
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="text-muted" [class.rotate-180]="isOpen('fuel')" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        @if (isOpen('fuel')) {
          <div class="px-3.5 pb-4">
            <div class="flex flex-wrap gap-1">
              @for (f of fuels; track f) {
                <button type="button" class="rounded-pill px-3 py-1.5 text-[12px] font-semibold transition-colors"
                  [class.border]="true"
                  [class.border-line-2]="!filters().fuel.includes(f)"
                  [class.bg-surface-soft]="!filters().fuel.includes(f)"
                  [class.text-ink-2]="!filters().fuel.includes(f)"
                  [class.border-brand-700]="filters().fuel.includes(f)"
                  [class.bg-brand-50]="filters().fuel.includes(f)"
                  [class.text-brand-700]="filters().fuel.includes(f)"
                  (click)="toggleSlug('fuel', f)">
                  {{ 'browse.fuels.' + f | translate }}
                </button>
              }
            </div>
          </div>
        }
      </section>

      <!-- TRUST -->
      <section class="border-b border-line-2">
        <button type="button" class="flex w-full items-center gap-1.5 px-3.5 py-3.5 text-start hover:bg-surface-soft" (click)="toggle('trust')">
          <span class="flex-1 text-sm font-semibold text-ink">{{ 'browse.sections.trust' | translate }}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="text-muted" [class.rotate-180]="isOpen('trust')" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        @if (isOpen('trust')) {
          <div class="px-3.5 pb-4">
            <label class="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-[13px] hover:bg-surface-soft">
              <input type="checkbox" class="size-4 accent-brand-700" [checked]="filters().inspected" (change)="patch({ inspected: $any($event.target).checked })" />
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="text-brand-700" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" /></svg>
              <span class="text-ink-2">{{ 'browse.trust.inspected' | translate }}</span>
            </label>
          </div>
        }
      </section>

      <!-- DISABLED SECTIONS — visually present per the mockup but marked "Coming soon"
           until the public DTO / filter schema gains the underlying fields. -->
      <section class="border-b border-line-2">
        <div class="px-3.5 py-3.5">
          <div class="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{{ 'browse.comingSoon' | translate }}</div>
          <div class="flex flex-wrap gap-1.5 text-[12px] text-muted-2">
            @for (k of comingSoonSections; track k) {
              <span class="inline-flex items-center gap-1 rounded-pill border border-line-2 bg-surface-soft px-2 py-0.5">
                {{ 'browse.sections.' + k | translate }}
              </span>
            }
          </div>
        </div>
      </section>
    </aside>
  `,
})
export class BrowseFilterPanelComponent {
  readonly filters = input.required<BrowseFilters>();
  readonly brands = input.required<ReadonlyArray<PublicCatalogBrand>>();
  readonly bodyTypes = input.required<ReadonlyArray<PublicCatalogBodyType>>();
  readonly filtersChange = output<BrowseFilters>();
  readonly reset = output<void>();

  readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  readonly bounds = BROWSE_BOUNDS;
  readonly transmissions = TRANSMISSION_VALUES;
  readonly fuels = FUEL_VALUES;
  readonly pricePresets: ReadonlyArray<[number, number, string]> = [
    [0, 5000, '≤ KWD 5K'],
    [5000, 10000, 'KWD 5-10K'],
    [10000, 20000, 'KWD 10-20K'],
    [20000, 50000, 'KWD 20K+'],
  ];
  readonly comingSoonSections = [
    'monthly', 'drive', 'cylinders', 'color', 'interior',
    'seats', 'specs', 'features', 'seller', 'warranty',
  ];

  /** Default-open sections (rest stay collapsed). */
  readonly openSet = signal(new Set(['price', 'year', 'mileage', 'make', 'body']));
  readonly brandSearch = signal('');

  readonly priceFormatter = (v: number): string => (v >= 1000 ? `KWD ${(v / 1000).toFixed(0)}k` : `KWD ${v}`);
  readonly yearFormatter = (v: number): string => String(v);
  readonly kmFormatter = (v: number): string => (v >= 1000 ? `${(v / 1000).toFixed(0)}k km` : `${v} km`);

  readonly bodyTiles = computed<ReadonlyArray<BodyTile>>(() =>
    this.bodyTypes()
      .filter((b) => BODY_PATHS[b.slug])
      .map((b) => ({ slug: b.slug, pathSvg: BODY_PATHS[b.slug] ?? BODY_PATHS['sedan']! }))
  );

  readonly filteredBrands = computed(() => {
    const q = this.brandSearch().trim().toLowerCase();
    const isAr = this.language.current() === 'ar';
    const all = this.brands();
    if (!q) return all;
    return all.filter((b) => (isAr ? b.nameAr : b.nameEn).toLowerCase().includes(q));
  });

  isOpen(key: string): boolean {
    return this.openSet().has(key);
  }

  toggle(key: string): void {
    const next = new Set(this.openSet());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.openSet.set(next);
  }

  patch(p: Partial<BrowseFilters>): void {
    this.filtersChange.emit({ ...this.filters(), ...p });
  }

  toggleSlug(key: 'brands' | 'bodies' | 'transmission' | 'fuel', value: string): void {
    const arr = this.filters()[key];
    const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
    this.patch({ [key]: next } as Partial<BrowseFilters>);
  }

  brandFavicon(slug: string): string {
    return `https://www.google.com/s2/favicons?domain=${slug}.com&sz=64`;
  }

  bodyLabel(slug: string): string {
    const bt = this.bodyTypes().find((b) => b.slug === slug);
    if (!bt) return slug;
    return this.language.current() === 'ar' ? bt.nameAr : bt.nameEn;
  }
}
