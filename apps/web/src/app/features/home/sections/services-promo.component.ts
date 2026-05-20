import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { SERVICES } from '../../../data/catalog.mock';
import { fmtKwd } from '../../../data/kwd';

const ICON_PATHS: Record<string, string> = {
  sparkle: 'M12 3 13.8 9 20 10.2l-4.5 3.4L17 20l-5-3-5 3 1.5-6.4L4 10.2 10.2 9z',
  shield: 'M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z',
  doc: 'M6 2h9l5 5v15H6z M15 2v6h5',
  car: 'M5 14l2-5h10l2 5M3 14h18v5H3zM7 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  check: 'M9 12l2 2 5-5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  camera: 'M4 7h3l2-3h6l2 3h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
};

@Component({
  selector: 'app-services-promo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <section class="container-page section">
      <header class="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="section-eyebrow">{{ 'home.services.eyebrow' | translate }}</div>
          <h2 class="mt-2 font-display text-[clamp(28px,3.4vw,44px)] font-bold tracking-[-0.025em] text-ink">
            {{ 'home.services.title' | translate }}
          </h2>
        </div>
        <button type="button" class="link-arrow">
          {{ 'home.services.viewAll' | translate }}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="dirArrow()" />
          </svg>
        </button>
      </header>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        @for (svc of services; track svc.id) {
          <button
            type="button"
            class="flex flex-col items-center rounded-[10px] border border-line bg-white px-4 py-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand-700 hover:shadow-brand"
          >
            <div class="mb-3 inline-grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path [attr.d]="iconFor(svc.iconKey)" />
              </svg>
            </div>
            <h3 class="text-sm font-semibold text-ink">{{ 'home.services.items.' + svc.id | translate }}</h3>
            <div class="mt-1.5 text-xs text-muted">
              {{ 'common.from' | translate }} {{ price(svc.fromPrice) }}
            </div>
          </button>
        }
      </div>
    </section>
  `,
})
export class ServicesPromoComponent {
  private readonly language = inject(LanguageService);
  readonly currentLocale = computed(() => this.language.current());
  readonly services = SERVICES;
  readonly dirArrow = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));

  iconFor(key: string): string {
    return ICON_PATHS[key] ?? ICON_PATHS['sparkle'];
  }

  price(p: number): string {
    return fmtKwd(p, this.currentLocale());
  }
}
