import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { PublicCatalogService } from '../../../data/public-catalog.service';

@Component({
  selector: 'app-browse-by-brand',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
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
        <button type="button" class="link-arrow">
          {{ 'home.featured.viewAll' | translate }}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="dirArrow()" />
          </svg>
        </button>
      </header>
      <div class="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
        @for (brand of brands(); track brand.id) {
          <button
            type="button"
            class="group flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white p-4 text-center transition-all hover:-translate-y-1 hover:border-brand-700 hover:shadow-brand-blue sm:rounded-[20px] sm:px-4 sm:py-6"
          >
            <span
              class="mb-1 inline-grid h-14 w-14 place-items-center overflow-hidden rounded-full border border-line-2 bg-surface-soft p-2.5 text-brand-700 transition-transform group-hover:scale-105 group-hover:border-brand-700 group-hover:bg-white sm:h-[72px] sm:w-[72px] sm:p-3.5"
              aria-hidden="true"
            >
              @if (brand.logoUrl) {
                <img [src]="brand.logoUrl" alt="" loading="lazy" class="h-8 w-8 object-contain sm:h-10 sm:w-10" />
              } @else {
                <img
                  [src]="fallbackLogo(brand.slug)"
                  alt=""
                  loading="lazy"
                  class="h-8 w-8 object-contain sm:h-10 sm:w-10"
                />
              }
            </span>
            <span class="text-[13px] font-semibold text-ink sm:text-sm">
              {{ currentLocale() === 'ar' ? brand.nameAr : brand.nameEn }}
            </span>
            <span class="text-xs text-muted">{{ brand.listingCount }} {{ 'common.cars' | translate }}</span>
          </button>
        }
      </div>
    </section>
  `,
})
export class BrowseByBrandComponent {
  private readonly language = inject(LanguageService);
  private readonly catalog = inject(PublicCatalogService);
  readonly currentLocale = computed(() => this.language.current());
  readonly brands = toSignal(this.catalog.brands$(), { initialValue: [] });
  readonly dirArrow = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));

  /** Use Google Favicon CDN as a fallback when the brand has no logoUrl in DB. */
  fallbackLogo(slug: string): string {
    return `https://www.google.com/s2/favicons?domain=${slug}.com&sz=128`;
  }
}
