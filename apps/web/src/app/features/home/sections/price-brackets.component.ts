import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { PRICE_BRACKETS } from '../../../data/catalog.mock';

@Component({
  selector: 'app-price-brackets',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, RouterLink],
  template: `
    <section class="container-page section">
      <header class="mb-8">
        <div class="section-eyebrow">{{ 'home.prices.eyebrow' | translate }}</div>
        <h2 class="mt-2 font-display text-[clamp(28px,3.4vw,44px)] font-bold tracking-[-0.025em] text-ink">
          {{ 'home.prices.title' | translate }}
        </h2>
      </header>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        @for (bracket of brackets; track $index) {
          <!-- v1.5-D11b: was a dead <button> with no (click). Now navigates to /browse
               with budgetMinKwd + budgetMaxKwd seeded from the bracket's lo/hi range.
               The unbounded-upper bracket ("KWD 20K and above") sends only the min. -->
          <a
            [routerLink]="['/', currentLocale(), 'browse']"
            [queryParams]="queryParamsFor(bracket)"
            class="flex items-center justify-between rounded-[10px] border border-brand-100 bg-brand-50 px-6 py-[22px] text-ink transition-all hover:-translate-y-0.5 hover:border-brand-700 hover:bg-brand-700 hover:text-white active:scale-[0.98]"
          >
            <span class="text-base font-semibold">{{ labelFor(bracket) }}</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path [attr.d]="dirArrow()" />
            </svg>
          </a>
        }
      </div>
    </section>
  `,
})
export class PriceBracketsComponent {
  private readonly language = inject(LanguageService);
  readonly currentLocale = computed(() => this.language.current());
  readonly brackets = PRICE_BRACKETS;
  readonly dirArrow = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));

  /** Renders a localized price-bracket label without leaking translation keys into the template. */
  labelFor(bracket: (typeof PRICE_BRACKETS)[number]): string {
    if (bracket.labelLiteral) return bracket.labelLiteral;
    return this.currentLocale() === 'ar'
      ? bracket.labelKey === 'above'
        ? '٢٠٠٠٠ فأكثر'
        : 'أقل من ٣٠٠٠ د.ك'
      : bracket.labelKey === 'above'
        ? 'KWD 20K and above'
        : 'Under KWD 3,000';
  }

  /**
   * v1.5-D11b: build queryParams from the bracket's lo/hi.
   * - "Under KWD X" (lo=0) → only budgetMaxKwd
   * - "X – Y" (lo>0, hi<999999) → both budgetMinKwd + budgetMaxKwd
   * - "X+" (hi=999999, the unbounded bracket) → only budgetMinKwd
   * browse-page.seedFromQueryParams (v1.5-D11b) parses both.
   */
  queryParamsFor(bracket: (typeof PRICE_BRACKETS)[number]): Record<string, number> {
    const params: Record<string, number> = {};
    if (bracket.lo > 0) params['budgetMinKwd'] = bracket.lo;
    if (bracket.hi < 999999) params['budgetMaxKwd'] = bracket.hi;
    return params;
  }
}
