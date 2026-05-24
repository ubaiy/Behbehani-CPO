import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import {
  CompareService,
  type CompareFetchState,
  type ListingCompareResponse,
  type ListingCompareRow,
} from '../../data/compare.service';
import { CompareSelectionService } from '../../data/compare-selection.service';
import { fmtKm, fmtKwd } from '../../data/kwd';
import type { ListingPublicDetail } from '../../data/public-catalog.service';

/**
 * v1.5-D17b — Customer-facing side-by-side listing comparison page.
 *
 * Layout:
 *  - Desktop: CSS grid `160px repeat(N,1fr)` — first column is the row label,
 *    remaining columns are one car each. Sticky header row with image, title
 *    and price. Cells where `row.differs === true` get a `bg-brand-50` accent.
 *  - Mobile (< sm): stack as N cards. "Highlight differences" toggle dims
 *    non-differing rows when on.
 *  - RTL: natural column reversal via the page's existing `dir="rtl"` setter.
 *  - Loading: skeleton table. Error: friendly state with "Back to Browse".
 */
@Component({
  selector: 'app-compare-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule, RouterLink],
  template: `
    <section class="mx-auto w-full max-w-container px-4 py-6 lg:px-6 lg:py-10">
      <!-- HEAD -->
      <header class="mb-6">
        <h1 class="font-display text-[clamp(24px,3vw,36px)] font-bold tracking-[-0.025em] text-ink">
          {{ 'compare.page.title' | translate }}
        </h1>
        <p class="mt-1.5 text-[14px] text-muted">
          {{ 'compare.page.sub' | translate }}
        </p>
      </header>

      @switch (state().kind) {
        @case ('loading') {
          <!-- Skeleton table -->
          <div class="overflow-hidden rounded-2xl border border-line bg-white">
            <div class="grid gap-2 p-4" [style.grid-template-columns]="'160px repeat(' + (slugCount() || 2) + ', 1fr)'">
              @for (n of skeletonRows; track n) {
                <div class="col-span-full h-8 animate-pulse rounded-md bg-surface-cool"></div>
              }
            </div>
          </div>
        }
        @case ('error') {
          <!-- Friendly error state -->
          <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface-soft px-5 py-16 text-center">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.6" class="text-muted" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <h3 class="font-display text-lg font-bold text-ink">
              {{ errorTitle() | translate }}
            </h3>
            @if (missingSlugsLabel(); as label) {
              <p class="max-w-md text-sm text-muted">{{ label }}</p>
            }
            <a
              [routerLink]="['/', currentLocale(), 'browse']"
              class="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              {{ 'browse.empty.cta' | translate }}
            </a>
          </div>
        }
        @case ('ok') {
          @let data = okValue();
          @if (data) {
            <!-- Legend + mobile toggle -->
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p class="text-[12px] text-muted">
                <span class="me-1.5 inline-block h-3 w-3 rounded-sm bg-brand-50 align-middle ring-1 ring-brand-200" aria-hidden="true"></span>
                {{ 'compare.diffHint' | translate }}
              </p>
              <label class="inline-flex items-center gap-2 text-[12px] font-semibold text-ink-2 sm:hidden">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-line-2 text-brand-700 focus-visible:ring-brand-500"
                  [checked]="dimSame()"
                  (change)="dimSame.set($any($event.target).checked)"
                />
                {{ 'compare.diffHint' | translate }}
              </label>
            </div>

            <!-- ── DESKTOP TABLE (sm and up) ── -->
            <div class="hidden sm:block">
              <div class="overflow-x-auto rounded-2xl border border-line bg-white shadow-brand-sm">
                <div class="min-w-fit">
                  <!-- Sticky header: image + title + price per car -->
                  <div
                    class="sticky top-0 z-10 grid gap-px border-b border-line bg-line"
                    [style.grid-template-columns]="gridTemplate(data.items.length)"
                  >
                    <div class="bg-surface-soft p-3"></div>
                    @for (item of data.items; track item.id) {
                      <div class="flex flex-col gap-2 bg-white p-3">
                        @if (item.heroPhotoUrl) {
                          <img
                            [src]="item.heroPhotoUrl"
                            alt=""
                            loading="lazy"
                            class="aspect-[16/10] w-full rounded-lg object-cover"
                          />
                        } @else {
                          <div class="aspect-[16/10] w-full rounded-lg bg-surface-cool" aria-hidden="true"></div>
                        }
                        <div class="text-[11px] font-medium text-muted">
                          {{ brandLabel(item) }} · {{ item.year }}
                        </div>
                        <h3 class="line-clamp-2 font-display text-[14px] font-bold leading-snug text-ink">
                          {{ titleLabel(item) }}
                        </h3>
                        <div class="font-display text-[16px] font-bold text-ink">
                          {{ priceLabel(item.priceFils) }}
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Spec rows -->
                  <div
                    class="grid gap-px bg-line"
                    [style.grid-template-columns]="gridTemplate(data.items.length)"
                  >
                    @for (row of data.rows; track row.key; let i = $index) {
                      <div
                        class="bg-surface-soft p-3 text-[12px] font-semibold uppercase tracking-wider text-muted-2"
                        [class.opacity-40]="dimSame() && !row.differs"
                      >
                        {{ rowLabel(row) }}
                      </div>
                      @for (value of row.values; track $index) {
                        <div
                          class="p-3 text-[13px] text-ink"
                          [class.bg-white]="!(row.differs)"
                          [class.bg-brand-50]="row.differs"
                          [class.text-brand-700]="row.differs"
                          [class.font-semibold]="row.differs"
                          [class.opacity-40]="dimSame() && !row.differs"
                        >
                          {{ formatValue(row.key, value) }}
                        </div>
                      }
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- ── MOBILE STACK (< sm) ── -->
            <div class="space-y-4 sm:hidden">
              @for (item of data.items; track item.id; let colIdx = $index) {
                <article class="overflow-hidden rounded-2xl border border-line bg-white shadow-brand-sm">
                  <div class="p-3">
                    @if (item.heroPhotoUrl) {
                      <img
                        [src]="item.heroPhotoUrl"
                        alt=""
                        loading="lazy"
                        class="aspect-[16/10] w-full rounded-lg object-cover"
                      />
                    } @else {
                      <div class="aspect-[16/10] w-full rounded-lg bg-surface-cool" aria-hidden="true"></div>
                    }
                    <div class="mt-3 text-[11px] font-medium text-muted">
                      {{ brandLabel(item) }} · {{ item.year }}
                    </div>
                    <h3 class="mt-0.5 font-display text-[15px] font-bold leading-snug text-ink">
                      {{ titleLabel(item) }}
                    </h3>
                    <div class="mt-2 font-display text-[18px] font-bold text-ink">
                      {{ priceLabel(item.priceFils) }}
                    </div>
                  </div>
                  <dl class="divide-y divide-line">
                    @for (row of data.rows; track row.key) {
                      <div
                        class="grid grid-cols-2 gap-3 px-3 py-2.5"
                        [class.bg-brand-50]="row.differs"
                        [class.opacity-40]="dimSame() && !row.differs"
                      >
                        <dt class="text-[12px] font-semibold text-muted-2">
                          {{ rowLabel(row) }}
                        </dt>
                        <dd
                          class="text-[13px] text-ink"
                          [class.text-brand-700]="row.differs"
                          [class.font-semibold]="row.differs"
                        >
                          {{ formatValue(row.key, row.values[colIdx]) }}
                        </dd>
                      </div>
                    }
                  </dl>
                </article>
              }
            </div>
          }
        }
      }
    </section>
  `,
})
export class ComparePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CompareService);
  private readonly selection = inject(CompareSelectionService);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currentLocale = computed(() => this.language.current());

  /** Last good slug count so the skeleton renders a sensible column count. */
  protected readonly slugCount = signal(0);

  protected readonly state = signal<CompareFetchState>({ kind: 'loading' });

  /** Mobile-only toggle to dim non-differing rows. Off by default. */
  protected readonly dimSame = signal(false);

  /** Six placeholder rows for the skeleton; cheap to render OnPush. */
  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5];

  constructor() {
    /* SEO — short title; no need to translate the page meta description as a
       compare URL with arbitrary slugs isn't an indexable canonical page. */
    this.meta.updateTag({ name: 'robots', content: 'noindex' });

    const setTitle = (): void => {
      this.titleService.setTitle(
        `${this.translate.instant('compare.page.title')} — Behbehani Motors`,
      );
    };
    setTitle();
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(setTitle);

    /* Read slugs query param reactively; refetch whenever it changes. */
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const raw = params.get('slugs') ?? '';
        const slugs = raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        if (slugs.length < 2 || slugs.length > 3) {
          this.slugCount.set(Math.max(2, slugs.length || 2));
          this.state.set({ kind: 'error', code: 'invalid_query' });
          return;
        }

        this.slugCount.set(slugs.length);
        this.api
          .fetch(slugs)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((s) => this.state.set(s));
      });

    /* v1.5-D18b — Selections are transient: once the user lands on /compare,
       clear the cart so the floating bar disappears AND the checkboxes on
       /browse and /account/favorites return to their unchecked state. */
    this.selection.clear();
  }

  /* ── Template helpers ──────────────────────────────────────────────── */

  protected okValue(): ListingCompareResponse | null {
    const s = this.state();
    return s.kind === 'ok' ? s.value : null;
  }

  protected gridTemplate(n: number): string {
    return `160px repeat(${n}, minmax(160px, 1fr))`;
  }

  protected errorTitle(): string {
    const s = this.state();
    if (s.kind !== 'error') return '';
    switch (s.code) {
      case 'not_found':
        return 'compare.error.notFound';
      case 'invalid_query':
        return 'compare.page.empty';
      case 'network_error':
        return 'compare.error.network';
      default:
        return 'compare.error.network';
    }
  }

  /** When the server returns `missingSlugs`, surface them inline. */
  protected missingSlugsLabel(): string | null {
    const s = this.state();
    if (s.kind !== 'error' || s.code !== 'not_found') return null;
    if (s.missingSlugs.length === 0) {
      return this.translate.instant('compare.page.missing');
    }
    return `${this.translate.instant('compare.page.missing')} ${s.missingSlugs.join(', ')}`;
  }

  protected rowLabel(row: ListingCompareRow): string {
    return this.currentLocale() === 'ar' ? row.labelAr : row.labelEn;
  }

  protected brandLabel(item: ListingPublicDetail): string {
    return this.currentLocale() === 'ar' ? item.brand.nameAr : item.brand.nameEn;
  }

  protected titleLabel(item: ListingPublicDetail): string {
    return (this.currentLocale() === 'ar' ? item.titleAr : null) ?? item.titleEn;
  }

  protected priceLabel(priceFils: string | number): string {
    const num = typeof priceFils === 'string' ? Number(priceFils) : priceFils;
    return fmtKwd(Math.round(num / 1000), this.currentLocale());
  }

  /** Cell-level formatter. Routes per row.key so the same value type can
   *  render different units (priceFils → KWD, mileageKm → "X km", booleans
   *  → check/dash, null → en-dash). */
  protected formatValue(key: string, value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    if (key === 'priceFils') {
      const n = typeof value === 'string' ? Number(value) : Number(value);
      if (!Number.isFinite(n)) return '—';
      return fmtKwd(Math.round(n / 1000), this.currentLocale());
    }
    if (key === 'mileageKm') {
      const n = typeof value === 'string' ? Number(value) : Number(value);
      if (!Number.isFinite(n)) return '—';
      return fmtKm(n, this.currentLocale());
    }
    if (typeof value === 'boolean') {
      /* Caller renders the literal string returned here. We use an en-dash
         for false and the unicode check mark; the spec calls for SVG but
         dropping a check character keeps the cell layout uniform with the
         string/number cells (no per-cell template branch). */
      return value ? '✓' : '—';
    }
    if (typeof value === 'number') {
      const tag = this.currentLocale() === 'ar' ? 'ar-KW' : 'en-KW';
      return new Intl.NumberFormat(tag).format(value);
    }
    /* String values: enum-ish codes the API returns (transmission, fuelType,
       drivetrain). Display capitalised; existing cards do the same. */
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      const TRANSLATABLE = new Set([
        'automatic',
        'manual',
        'cvt',
        'dct',
        'petrol',
        'diesel',
        'hybrid',
        'electric',
        'fwd',
        'rwd',
        'awd',
        'four_wd',
      ]);
      if (TRANSLATABLE.has(lower)) {
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return value;
    }
    return String(value);
  }
}
