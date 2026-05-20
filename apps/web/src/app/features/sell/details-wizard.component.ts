import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import type { PublicCatalogBrand } from '@behbehani-cpo/shared-types';
import { PublicCatalogService } from '../../data/public-catalog.service';
import { SellWizardStateService, type VehicleDetails } from '../../data/sell-wizard-state.service';

/* ─── Step model ────────────────────────────────────────────────────────── */

type StepId = 'make' | 'model' | 'year' | 'trim' | 'mileage' | 'price';

interface StepDef {
  id: StepId;
  /** i18n key under `sell.details.steps.<id>` for the pill label. */
  labelKey: string;
}

const STEPS: ReadonlyArray<StepDef> = [
  { id: 'make', labelKey: 'sell.details.steps.make' },
  { id: 'model', labelKey: 'sell.details.steps.model' },
  { id: 'year', labelKey: 'sell.details.steps.year' },
  { id: 'trim', labelKey: 'sell.details.steps.trim' },
  { id: 'mileage', labelKey: 'sell.details.steps.mileage' },
  { id: 'price', labelKey: 'sell.details.steps.price' },
];

/* ─── Brand catalogue (catalog brands + the wider "other brands" tail) ──── */

interface MakeOption {
  /** Canonical id used to look up models; only set for known brands. */
  id?: string;
  /** Display name (also used as object key for state). */
  name: string;
  nameAr?: string;
  /** Optional logo URL from the public catalog API. */
  logoUrl?: string | null;
  /** Slug for fallback favicon lookup. */
  slug?: string;
}

/** Brands beyond the catalog list, mirroring the mockup. Display only. */
const EXTRA_BRANDS: ReadonlyArray<{ name: string; nameAr?: string }> = [
  { name: 'Acura' },
  { name: 'Alfa Romeo' },
  { name: 'Aston Martin' },
  { name: 'BAIC' },
  { name: 'Bentley' },
  { name: 'BYD' },
  { name: 'Cadillac' },
  { name: 'Chery' },
  { name: 'Citroën' },
  { name: 'Dodge' },
  { name: 'Ferrari' },
  { name: 'Fiat' },
  { name: 'Geely' },
  { name: 'Genesis' },
  { name: 'Infiniti' },
  { name: 'Isuzu' },
  { name: 'Jaguar' },
  { name: 'Lamborghini' },
  { name: 'Lincoln' },
  { name: 'Maserati' },
  { name: 'Mazda' },
  { name: 'McLaren' },
  { name: 'Mini' },
  { name: 'Mitsubishi' },
  { name: 'Peugeot' },
  { name: 'Ram' },
  { name: 'Renault' },
  { name: 'Rolls-Royce' },
  { name: 'Skoda' },
  { name: 'Subaru' },
  { name: 'Suzuki' },
  { name: 'Volkswagen' },
  { name: 'Volvo' },
];

/** Models keyed by brand id (from catalog.mock). Falls back to ['Other']. */
const MODELS_BY_BRAND: Record<string, ReadonlyArray<string>> = {
  toyota: ['Camry', 'Corolla', 'Land Cruiser', 'RAV4', 'Hilux', 'Yaris', 'Fortuner', 'Avalon', 'Sequoia', 'FJ Cruiser'],
  lexus: ['LX 600', 'LX 570', 'RX 350', 'RX 500h', 'ES 350', 'NX 300', 'GX 460', 'IS 350', 'LS 500', 'UX 250h'],
  mercedes: ['C-Class', 'E-Class', 'S-Class', 'GLE', 'GLS', 'G-Class', 'GLA', 'GLC', 'CLA', 'AMG GT'],
  bmw: ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X6', 'X7', 'M3', 'M5', 'i7'],
  nissan: ['Patrol', 'Altima', 'Sunny', 'X-Trail', 'Pathfinder', 'Maxima', 'Sentra', 'Armada', 'Murano', '370Z'],
  ford: ['F-150', 'Mustang', 'Explorer', 'Edge', 'Escape', 'Bronco', 'Expedition', 'Ranger', 'EcoSport', 'Taurus'],
  /* Catalog id for Land Rover is `range`; mockup uses the same key. */
  range: ['Range Rover', 'Range Rover Sport', 'Defender', 'Discovery', 'Discovery Sport', 'Velar', 'Evoque'],
  porsche: ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster', 'Cayman'],
  honda: ['Accord', 'Civic', 'CR-V', 'Pilot', 'Odyssey', 'HR-V', 'Passport', 'Ridgeline'],
  audi: ['A3', 'A4', 'A6', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'RS6'],
  tesla: ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
  gmc: ['Yukon', 'Sierra', 'Acadia', 'Terrain', 'Canyon', 'Savana'],
  chevrolet: ['Tahoe', 'Suburban', 'Camaro', 'Corvette', 'Silverado', 'Equinox', 'Traverse', 'Malibu'],
  kia: ['Sportage', 'Sorento', 'Telluride', 'Seltos', 'Optima', 'K5', 'Rio', 'Picanto', 'Carnival'],
  hyundai: ['Sonata', 'Tucson', 'Santa Fe', 'Elantra', 'Palisade', 'Kona', 'Accent', 'Ioniq 5'],
  jeep: ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Gladiator', 'Compass', 'Renegade', 'Wagoneer'],
};

const TRIM_OPTIONS: ReadonlyArray<string> = [
  'Base', 'SE', 'SR', 'XLE', 'XSE', 'Sport', 'Limited', 'Premium', 'GT', 'M Sport', 'AMG',
];

const MILEAGE_PRESETS: ReadonlyArray<{ label: string; min: number }> = [
  { label: '0–30,000', min: 0 },
  { label: '30,000–60,000', min: 30000 },
  { label: '60,000–100,000', min: 60000 },
  { label: '100,000–150,000', min: 100000 },
  { label: '150,000+', min: 150000 },
];

const PRICE_PRESETS: ReadonlyArray<number> = [3000, 5000, 8000, 12000, 20000];

const MIN_YEAR = 1997;
const MAX_YEAR = 2026;

interface DraftData {
  make: string;
  makeId: string | null;
  model: string;
  year: number | null;
  trim: string;
  mileage: number | null;
  price: number | null;
}

const EMPTY_DRAFT: DraftData = {
  make: '',
  makeId: null,
  model: '',
  year: null,
  trim: '',
  mileage: null,
  price: null,
};

@Component({
  selector: 'app-sell-details-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <!-- ─── HEADER ──────────────────────────────────────────────────── -->
    <header class="sticky top-0 z-20 border-b border-line bg-white shadow-sm">
      <div class="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <button
          type="button"
          (click)="goBack()"
          class="inline-grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-soft"
          [attr.aria-label]="'sell.details.header.back' | translate"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="backArrow()" />
          </svg>
        </button>
        <h1 class="font-display text-[15px] font-bold tracking-[-0.01em] text-ink">{{ 'sell.details.header.title' | translate }}</h1>
        <button
          type="button"
          (click)="exit()"
          class="inline-grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-soft"
          [attr.aria-label]="'sell.details.header.exit' | translate"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </header>

    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ autoAdvanceMsg() }}</div>

    <!-- ─── STEP PILLS ──────────────────────────────────────────────── -->
    <div class="border-b border-line bg-white">
      <div class="mx-auto max-w-2xl px-4 py-3">
        <ol class="flex gap-2 overflow-x-auto pb-1" role="tablist">
          @for (s of steps; track s.id; let i = $index) {
            <li>
              <button
                type="button"
                (click)="goToStep(i)"
                [disabled]="!isStepReachable(i)"
                [class.bg-brand-700]="step() === i"
                [class.text-white]="step() === i"
                [class.bg-brand-50]="step() !== i && isStepFilled(i)"
                [class.text-brand-700]="step() !== i && isStepFilled(i)"
                [class.bg-surface-soft]="step() !== i && !isStepFilled(i)"
                [class.text-ink-2]="step() !== i && !isStepFilled(i)"
                class="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                @if (step() !== i && isStepFilled(i)) {
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                }
                <span>{{ s.labelKey | translate }}</span>
                @if (step() !== i && isStepFilled(i)) {
                  <strong class="ms-1 truncate font-semibold">{{ filledValueLabel(i) }}</strong>
                }
              </button>
            </li>
          }
        </ol>
      </div>
    </div>

    <!-- ─── STEP BODY ───────────────────────────────────────────────── -->
    <main class="bg-surface-soft">
      <div class="mx-auto max-w-2xl px-4 pb-12 pt-6 sm:pt-8">
        <h2 class="font-display text-[22px] font-bold tracking-[-0.02em] text-ink sm:text-[26px]">
          {{ stepPromptKey() | translate }}
        </h2>

        <!-- STEP: MAKE -->
        @if (currentStepId() === 'make') {
          <div class="mt-5 rounded-2xl border border-line bg-white p-4 shadow-brand-sm">
            <div class="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface-soft px-3 focus-within:border-brand-500 focus-within:bg-white">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" class="text-muted" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                [(ngModel)]="searchTerm"
                (ngModelChange)="search.set($event)"
                [placeholder]="'sell.details.search.makePlaceholder' | translate"
                class="h-full flex-1 bg-transparent text-[14px] outline-none"
              />
            </div>
            <div class="mt-3 max-h-[60vh] divide-y divide-line overflow-y-auto">
              @if (allMakes().length === 0) {
                @for (i of skeletonSlots; track i) {
                  <div class="h-20 rounded-2xl bg-surface-soft animate-pulse" aria-hidden="true"></div>
                }
              }
              @for (m of filteredMakes(); track m.name) {
                <button type="button" (click)="selectMake(m)" class="flex w-full items-center gap-3 py-2.5 text-start hover:bg-surface-soft">
                  <span
                    class="mb-1 inline-grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-full border border-line-2 bg-surface-soft p-2.5 text-brand-700"
                    aria-hidden="true"
                  >
                    @if (m.logoUrl) {
                      <img [src]="m.logoUrl" alt="" loading="lazy" class="h-8 w-8 object-contain" />
                    } @else if (m.slug) {
                      <img [src]="fallbackLogo(m.slug)" alt="" loading="lazy" class="h-8 w-8 object-contain" />
                    } @else {
                      <span class="text-[13px] font-bold text-brand-700">{{ m.name.charAt(0) }}</span>
                    }
                  </span>
                  <span class="text-[14px] font-medium text-ink">{{ localizedMakeLabel(m) }}</span>
                </button>
              } @empty {
                <div class="flex flex-col items-center gap-2 py-10 text-center">
                  <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8" class="text-muted-2" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <p class="text-[13px] text-muted">{{ 'sell.details.search.empty' | translate: { q: search() } }}</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- STEP: MODEL -->
        @if (currentStepId() === 'model') {
          <div class="mt-5 rounded-2xl border border-line bg-white p-4 shadow-brand-sm">
            <div class="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface-soft px-3 focus-within:border-brand-500 focus-within:bg-white">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" class="text-muted" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                [(ngModel)]="searchTerm"
                (ngModelChange)="search.set($event)"
                [placeholder]="'sell.details.search.modelPlaceholder' | translate"
                class="h-full flex-1 bg-transparent text-[14px] outline-none"
              />
            </div>
            <div class="mt-3 max-h-[60vh] divide-y divide-line overflow-y-auto">
              @for (mo of filteredModels(); track mo) {
                <button type="button" (click)="selectModel(mo)" class="flex w-full items-center gap-3 py-2.5 text-start hover:bg-surface-soft">
                  <span class="inline-grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 16l1.5-4h11L19 16M5 16h14v3H5zM7 19v2M17 19v2"/></svg>
                  </span>
                  <span class="text-[14px] font-medium text-ink">{{ mo }}</span>
                </button>
              }
            </div>
          </div>
        }

        <!-- STEP: YEAR -->
        @if (currentStepId() === 'year') {
          <div class="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6">
            @for (y of yearOptions; track y) {
              <button
                type="button"
                (click)="selectYear(y)"
                class="rounded-xl border border-line bg-white px-3 py-3 text-[14px] font-semibold text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
              >
                {{ y }}
              </button>
            }
          </div>
        }

        <!-- STEP: TRIM -->
        @if (currentStepId() === 'trim') {
          <div class="mt-5 divide-y divide-line rounded-2xl border border-line bg-white shadow-brand-sm">
            @for (t of trimOptions; track t) {
              <button
                type="button"
                (click)="selectTrim(t)"
                class="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-surface-soft"
              >
                <span class="inline-grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/></svg>
                </span>
                <span class="text-[14px] font-medium text-ink">{{ t }}</span>
              </button>
            }
          </div>
        }

        <!-- STEP: MILEAGE -->
        @if (currentStepId() === 'mileage') {
          <div class="mt-5 space-y-4">
            <label class="flex flex-col gap-1.5">
              <span class="text-[12px] font-semibold uppercase tracking-wide text-muted">{{ 'sell.details.mileage.label' | translate }}</span>
              <div class="flex items-stretch overflow-hidden rounded-2xl border border-line bg-white shadow-brand-sm focus-within:border-brand-500">
                <input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  max="999999"
                  [(ngModel)]="mileageInput"
                  (keyup.enter)="commitMileage()"
                  [placeholder]="'0'"
                  class="h-14 flex-1 bg-transparent px-4 font-display text-[24px] font-bold text-ink outline-none"
                />
                <span class="inline-flex items-center px-4 text-[14px] font-semibold text-muted">km</span>
              </div>
            </label>

            <div class="flex flex-wrap gap-2">
              @for (p of mileagePresets; track p.label) {
                <button
                  type="button"
                  (click)="applyMileagePreset(p.min)"
                  class="rounded-pill border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {{ p.label }} km
                </button>
              }
            </div>

            <button
              type="button"
              (click)="commitMileage()"
              [disabled]="!isMileageValid()"
              class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-5 py-3.5 text-[14px] font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ 'sell.details.continue' | translate }}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="arrowPath()" /></svg>
            </button>
          </div>
        }

        <!-- STEP: PRICE -->
        @if (currentStepId() === 'price') {
          <div class="mt-5 space-y-4">
            <label class="flex flex-col gap-1.5">
              <span class="text-[12px] font-semibold uppercase tracking-wide text-muted">{{ 'sell.details.price.label' | translate }}</span>
              <div class="flex items-stretch overflow-hidden rounded-2xl border border-line bg-white shadow-brand-sm focus-within:border-brand-500">
                <span class="inline-flex items-center px-4 text-[14px] font-semibold text-muted">KWD</span>
                <input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  max="999999"
                  [(ngModel)]="priceInput"
                  (keyup.enter)="commitPrice()"
                  [placeholder]="'0'"
                  class="h-14 flex-1 bg-transparent px-2 font-display text-[24px] font-bold text-ink outline-none"
                />
              </div>
            </label>

            <div class="flex items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="mt-0.5 flex-shrink-0 text-brand-700" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8h.01M11 12h1v5h1" />
              </svg>
              <p class="text-[13px] leading-relaxed text-ink-2">
                {{ 'sell.details.priceHint.neutral' | translate }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              @for (p of pricePresets; track p) {
                <button
                  type="button"
                  (click)="applyPricePreset(p)"
                  class="rounded-pill border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  KWD {{ p | number }}
                </button>
              }
            </div>

            <button
              type="button"
              (click)="commitPrice()"
              [disabled]="!isPriceValid()"
              class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-5 py-3.5 text-[14px] font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ 'sell.details.price.continueCta' | translate }}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="arrowPath()" /></svg>
            </button>
          </div>
        }
      </div>
    </main>
  `,
})
export class SellDetailsWizardComponent implements OnInit {
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly state = inject(SellWizardStateService);
  private readonly catalog = inject(PublicCatalogService);
  private readonly apiBrands = toSignal(this.catalog.brands$(), {
    initialValue: [] as ReadonlyArray<PublicCatalogBrand>,
  });
  readonly skeletonSlots: ReadonlyArray<number> = [0, 1, 2, 3, 4, 5, 6, 7];

  /** Google Favicon CDN fallback when the brand has no `logoUrl`. */
  fallbackLogo(slug: string): string {
    return `https://www.google.com/s2/favicons?domain=${slug}.com&sz=128`;
  }

  readonly currentLocale = computed(() => this.language.current());
  readonly arrowPath = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));
  readonly backArrow = computed(() => (this.currentLocale() === 'ar' ? 'M10 6l6 6-6 6' : 'M14 6l-6 6 6 6'));

  readonly steps = STEPS;
  readonly trimOptions = TRIM_OPTIONS;
  readonly mileagePresets = MILEAGE_PRESETS;
  readonly pricePresets = PRICE_PRESETS;
  readonly autoAdvanceMsg = signal('');

  readonly yearOptions: ReadonlyArray<number> = (() => {
    const out: number[] = [];
    for (let y = MAX_YEAR; y >= MIN_YEAR; y--) out.push(y);
    return out;
  })();

  readonly allMakes = computed<ReadonlyArray<MakeOption>>(() => {
    const map = new Map<string, MakeOption>();
    /* API brands first — they win on duplicates (real logos + canonical slug). */
    for (const b of this.apiBrands()) {
      map.set(b.nameEn.toLowerCase(), {
        id: b.slug,
        slug: b.slug,
        name: b.nameEn,
        nameAr: b.nameAr,
        logoUrl: b.logoUrl,
      });
    }
    /* Append EXTRA_BRANDS that aren't already covered by the API (de-dupe by name lowercased). */
    for (const e of EXTRA_BRANDS) {
      const key = e.name.toLowerCase();
      if (!map.has(key)) map.set(key, { name: e.name, nameAr: e.nameAr });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly step = signal(0);
  readonly draft = signal<DraftData>({ ...EMPTY_DRAFT });
  readonly search = signal('');

  /* ngModel binds for the typed steps — kept as plain fields and pushed to
     `draft` only on Continue/select. Two-way binding for `<input>` works
     fine against properties; we don't need signals for these. */
  searchTerm = '';
  mileageInput: number | null = null;
  priceInput: number | null = null;

  readonly currentStepId = computed<StepId>(() => STEPS[this.step()].id);

  readonly stepPromptKey = computed(() => `sell.details.prompts.${this.currentStepId()}`);

  readonly filteredMakes = computed<ReadonlyArray<MakeOption>>(() => {
    const list = this.allMakes();
    const q = this.search().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.nameAr ?? '').toLowerCase().includes(q),
    );
  });

  readonly filteredModels = computed<ReadonlyArray<string>>(() => {
    const id = this.draft().makeId;
    const list: ReadonlyArray<string> = id && MODELS_BY_BRAND[id] ? MODELS_BY_BRAND[id] : ['Other'];
    const q = this.search().trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => m.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    const setMeta = () => {
      this.title.setTitle(this.translate.instant('sell.details.metaTitle'));
      this.meta.updateTag({
        name: 'description',
        content: this.translate.instant('sell.details.metaDescription'),
      });
    };
    setMeta();
    this.translate.onLangChange.subscribe(setMeta);

    /* Restore from state-service first (covers refresh mid-flow). */
    const existing = this.state.vehicle();
    if (existing) {
      this.draft.set({
        make: existing.brandName,
        makeId: existing.brandId ?? null,
        model: existing.model,
        year: existing.year,
        trim: existing.trim,
        mileage: existing.mileageKm,
        price: existing.askingPriceKwd ?? null,
      });
      this.mileageInput = existing.mileageKm;
      this.priceInput = existing.askingPriceKwd ?? null;
      /* Land on the price step so the user finalises; if they want to go
         back, the pills are clickable. */
      this.step.set(STEPS.length - 1);
      return;
    }

    /* Pre-populate make from ?brand=<slug> query param (from sell-landing).
       Note: API may not be loaded yet on first paint, but query-param matching
       still works once the brands signal hydrates — for the initial visit from
       sell-landing we accept best-effort matching against whatever is loaded. */
    const brandParam = this.route.snapshot.queryParamMap.get('brand');
    if (brandParam) {
      const brand = this.allMakes().find((m) => m.id === brandParam);
      if (brand) {
        this.draft.update((d) => ({ ...d, make: brand.name, makeId: brand.id ?? null }));
        this.step.set(1);
      }
    }
  }

  /* ─── Step navigation ───────────────────────────────────────────── */

  goBack(): void {
    if (this.step() === 0) {
      this.router.navigate(['/', this.currentLocale(), 'sell']);
      return;
    }
    this.step.update((s) => s - 1);
    this.search.set('');
    this.searchTerm = '';
  }

  exit(): void {
    this.router.navigate(['/', this.currentLocale(), 'sell']);
  }

  goToStep(i: number): void {
    if (!this.isStepReachable(i)) return;
    this.step.set(i);
    this.search.set('');
    this.searchTerm = '';
  }

  isStepFilled(i: number): boolean {
    const d = this.draft();
    switch (STEPS[i].id) {
      case 'make': return !!d.make;
      case 'model': return !!d.model;
      case 'year': return d.year !== null;
      case 'trim': return !!d.trim;
      case 'mileage': return d.mileage !== null;
      case 'price': return d.price !== null;
    }
  }

  /** Filled steps are always reachable; the very next unfilled step is too. */
  isStepReachable(i: number): boolean {
    if (this.isStepFilled(i)) return true;
    /* allow current step and the first unfilled step after a contiguous
       filled prefix */
    for (let j = 0; j < i; j++) {
      if (!this.isStepFilled(j)) return false;
    }
    return true;
  }

  filledValueLabel(i: number): string {
    const d = this.draft();
    switch (STEPS[i].id) {
      case 'make': return d.make;
      case 'model': return d.model;
      case 'year': return d.year !== null ? String(d.year) : '';
      case 'trim': return d.trim;
      case 'mileage': return d.mileage !== null ? `${d.mileage.toLocaleString()} km` : '';
      case 'price': return d.price !== null ? `KWD ${d.price.toLocaleString()}` : '';
    }
  }

  /* ─── Step actions ──────────────────────────────────────────────── */

  localizedMakeLabel(m: MakeOption): string {
    if (this.currentLocale() === 'ar' && m.nameAr) return m.nameAr;
    return m.name;
  }

  selectMake(m: MakeOption): void {
    this.draft.update((d) => ({
      ...d,
      make: m.name,
      makeId: m.id ?? null,
      /* Reset downstream model if the brand changed. */
      model: d.makeId === (m.id ?? null) ? d.model : '',
    }));
    this.announceAdvance(this.localizedMakeLabel(m));
    this.advance();
  }

  selectModel(model: string): void {
    this.draft.update((d) => ({ ...d, model }));
    this.announceAdvance(model);
    this.advance();
  }

  selectYear(year: number): void {
    this.draft.update((d) => ({ ...d, year }));
    this.announceAdvance(String(year));
    this.advance();
  }

  selectTrim(trim: string): void {
    this.draft.update((d) => ({ ...d, trim }));
    this.announceAdvance(trim);
    this.advance();
  }

  private announceAdvance(value: string): void {
    const nextIdx = this.step() + 1;
    const nextStep =
      nextIdx < STEPS.length ? this.translate.instant(STEPS[nextIdx].labelKey) : '';
    this.autoAdvanceMsg.set(
      this.translate.instant('sell.details.aria.advanced', { value, nextStep }),
    );
  }

  applyMileagePreset(min: number): void {
    this.mileageInput = min;
  }

  applyPricePreset(p: number): void {
    this.priceInput = p;
  }

  isMileageValid(): boolean {
    return typeof this.mileageInput === 'number' && this.mileageInput >= 0 && this.mileageInput <= 999999;
  }

  isPriceValid(): boolean {
    return typeof this.priceInput === 'number' && this.priceInput > 0 && this.priceInput <= 999999;
  }

  commitMileage(): void {
    if (!this.isMileageValid()) return;
    this.draft.update((d) => ({ ...d, mileage: this.mileageInput }));
    this.advance();
  }

  commitPrice(): void {
    if (!this.isPriceValid()) return;
    this.draft.update((d) => ({ ...d, price: this.priceInput }));
    this.advance();
  }

  /** Move to the next step, or persist + navigate if we just finished. */
  private advance(): void {
    this.search.set('');
    this.searchTerm = '';
    const cur = this.step();
    if (cur < STEPS.length - 1) {
      this.step.set(cur + 1);
      return;
    }
    /* Last step done — persist & jump to choose-option. */
    const d = this.draft();
    if (
      d.make &&
      d.model &&
      typeof d.year === 'number' &&
      d.trim &&
      typeof d.mileage === 'number'
    ) {
      const vehicle: VehicleDetails = {
        brandId: d.makeId ?? undefined,
        brandName: d.make,
        model: d.model,
        year: d.year,
        trim: d.trim,
        mileageKm: d.mileage,
        askingPriceKwd: typeof d.price === 'number' ? d.price : undefined,
      };
      this.state.setVehicle(vehicle);
      this.router.navigate(['/', this.currentLocale(), 'sell', 'choose']);
    }
  }
}
