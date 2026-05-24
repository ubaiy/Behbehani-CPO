import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { PublicCatalogService } from '../../../data/public-catalog.service';

/**
 * v1.5-D11c — Brand-slug → LOCAL bundled SVG path. SVGs crawled from Simple
 * Icons CDN (CC0 license) at build prep, tinted brand-900 (#1E3A8A) for
 * high contrast on the brand-50→100 chip background. Stored at:
 *   `apps/web/public/assets/brand-logos/<brand-slug>.svg` → served at
 *   `/assets/brand-logos/<brand-slug>.svg`
 *
 * Local bundling beats CDN-on-every-pageview: zero third-party dep, no
 * privacy leak, instant load, and they're cached by the Angular dev/prod
 * server like any other asset. To add a new brand: drop the SVG into the
 * directory + add the slug to this Set.
 *
 * For brand slugs NOT in this set, OR if the `<img>` errors (e.g. asset
 * removed without map update), the existing `(error)` handler swaps to the
 * polished letter-chip fallback.
 *
 * Aliases: some catalog slugs differ from the bundled filename (e.g. catalog
 * `mercedes` vs bundled `mercedes-benz.svg`). Aliases resolve to the same file.
 */
const BRAND_LOGO_AVAILABLE = new Set<string>([
  'bmw', 'mercedes-benz', 'toyota', 'lexus', 'audi', 'honda', 'hyundai',
  'kia', 'nissan', 'porsche', 'volkswagen', 'mazda', 'mitsubishi', 'ford',
  'chevrolet', 'cadillac', 'jeep', 'land-rover', 'mini', 'volvo', 'tesla',
  'subaru', 'ferrari', 'lamborghini', 'bentley', 'rolls-royce', 'alfa-romeo',
  'peugeot', 'renault', 'fiat', 'jaguar', 'infiniti', 'acura', 'buick',
  'gmc', 'mclaren', 'maserati', 'aston-martin',
]);

/** Catalog-slug → bundled-filename when they differ. */
const BRAND_SLUG_ALIASES: Record<string, string> = {
  mercedes: 'mercedes-benz',
  vw: 'volkswagen',
  landrover: 'land-rover',
  'range-rover': 'land-rover',
  rollsroyce: 'rolls-royce',
  alfaromeo: 'alfa-romeo',
  astonmartin: 'aston-martin',
};

/**
 * Browse by brand — grid of tappable brand tiles that jump to /browse with
 * the brand filter pre-applied. v1.5-D11b: real brand logos via Simple Icons
 * CDN for ~40 mapped brands; polished letter-chip fallback for the rest
 * (OR when the CDN request errors).
 */
@Component({
  selector: 'app-browse-by-brand',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, RouterLink],
  template: `
    <section class="container-page section">
      <header class="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="section-eyebrow">{{ 'home.brands.eyebrow' | translate }}</div>
          <h2 class="mt-2 font-display text-[clamp(28px,3.4vw,44px)] font-bold tracking-[-0.025em] text-ink">
            {{ 'home.brands.title' | translate }}
          </h2>
          <p class="mt-2 max-w-[560px] text-[15px] text-muted">{{ 'home.brands.sub' | translate }}</p>
        </div>
        <a
          [routerLink]="['/', currentLocale(), 'browse']"
          class="link-arrow"
        >
          {{ 'home.featured.viewAll' | translate }}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="dirArrow()" />
          </svg>
        </a>
      </header>
      <div class="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
        @for (brand of brands(); track brand.id) {
          <a
            [routerLink]="['/', currentLocale(), 'browse']"
            [queryParams]="{ brand: brand.slug }"
            class="group flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white p-4 text-center transition-all hover:-translate-y-1 hover:border-brand-700 hover:shadow-brand-blue sm:rounded-[20px] sm:px-4 sm:py-6"
          >
            <span
              class="logo-chip mb-1 inline-grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100 font-display text-[20px] font-bold text-brand-700 shadow-brand-sm transition-transform group-hover:scale-105 group-hover:from-brand-100 group-hover:to-brand-200 sm:h-[76px] sm:w-[76px] sm:text-[24px]"
            >
              @if (logoUrl(brand.slug); as src) {
                <!-- Real brand logo from Simple Icons CDN. (error) swaps in
                     the letter-chip fallback (handled inline via DOM mutation
                     in onLogoError below, SSR-safe). -->
                <img
                  [src]="src"
                  [alt]="brand.nameEn"
                  class="h-1/2 w-1/2 object-contain"
                  loading="lazy"
                  (error)="onLogoError($event, brand.nameEn)"
                />
              } @else {
                <span aria-hidden="true">{{ initial(brand.nameEn) }}</span>
              }
            </span>
            <span class="text-[13px] font-semibold text-ink sm:text-sm">
              {{ currentLocale() === 'ar' ? brand.nameAr : brand.nameEn }}
            </span>
            <span class="text-xs text-muted">{{ brand.listingCount }} {{ 'common.cars' | translate }}</span>
          </a>
        }
      </div>
    </section>
  `,
})
export class BrowseByBrandComponent {
  private readonly language = inject(LanguageService);
  private readonly catalog = inject(PublicCatalogService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly currentLocale = computed(() => this.language.current());
  readonly brands = toSignal(this.catalog.brands$(), { initialValue: [] });
  readonly dirArrow = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));

  /** First uppercase letter — drives the letter-chip glyph. Always EN so RTL
      pages still get a Latin initial which matches the brand's global identity. */
  initial(nameEn: string): string {
    return (nameEn || '?').trim().charAt(0).toUpperCase();
  }

  /**
   * v1.5-D11c: Resolves a brand slug to its local bundled SVG path, or null
   * when no logo is bundled (template falls back to letter chip).
   * Path: `/assets/brand-logos/<filename>.svg` (Angular serves apps/web/public
   * at the asset root automatically).
   */
  logoUrl(brandSlug: string): string | null {
    const lower = brandSlug.toLowerCase();
    const filename = BRAND_SLUG_ALIASES[lower] ?? lower;
    if (!BRAND_LOGO_AVAILABLE.has(filename)) return null;
    return `/assets/brand-logos/${filename}.svg`;
  }

  /**
   * v1.5-D11b: Replace the broken `<img>` with an inline letter chip. SSR-safe
   * via PLATFORM_ID. Pattern mirrors the brand-logo fallbacks shipped in v1.5-D2
   * across browse-filter-panel + sell/details-wizard + shared/ui-select.
   */
  onLogoError(event: Event, nameEn: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    const parent = img.parentElement;
    if (!parent || parent.querySelector('.brand-letter-fallback')) return;
    img.style.display = 'none';
    const letter = document.createElement('span');
    letter.className = 'brand-letter-fallback';
    letter.setAttribute('aria-hidden', 'true');
    letter.textContent = (nameEn || '?').trim().charAt(0).toUpperCase();
    parent.appendChild(letter);
  }
}
