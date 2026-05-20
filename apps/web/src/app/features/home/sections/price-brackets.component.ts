import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { PRICE_BRACKETS } from '../../../data/catalog.mock';

@Component({
  selector: 'app-price-brackets',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
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
          <button
            type="button"
            class="flex items-center justify-between rounded-[10px] border border-brand-100 bg-brand-50 px-6 py-[22px] text-ink transition-all hover:-translate-y-0.5 hover:border-brand-700 hover:bg-brand-700 hover:text-white"
          >
            <span class="text-base font-semibold">{{ labelFor(bracket) }}</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path [attr.d]="dirArrow()" />
            </svg>
          </button>
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
}
