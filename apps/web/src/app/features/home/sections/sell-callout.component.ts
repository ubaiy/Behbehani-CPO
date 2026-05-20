import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';

interface SellPath {
  id: 'instant' | 'concierge' | 'self';
  iconPath: string;
}

const PATHS: ReadonlyArray<SellPath> = [
  {
    id: 'instant',
    iconPath: 'M12 2v3M12 19v3M5 12H2M22 12h-3M19 5l-2 2M7 17l-2 2M19 19l-2-2M7 7 5 5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  },
  {
    id: 'concierge',
    iconPath: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  },
  {
    id: 'self',
    iconPath: 'M4 6h16M4 12h16M4 18h10',
  },
];

@Component({
  selector: 'app-sell-callout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <section class="container-page section">
      <div class="grid overflow-hidden rounded-[24px] bg-brand-700 text-white lg:min-h-[460px] lg:grid-cols-[1fr_1.4fr]">
        <div class="relative min-h-[200px] overflow-hidden bg-brand-900">
          <img
            src="https://images.unsplash.com/photo-1542362567-b07e54358753?w=1400&q=80"
            alt=""
            class="absolute inset-0 h-full w-full object-cover opacity-70"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-gradient-to-br from-transparent to-brand-700/60"></div>
        </div>
        <div class="flex flex-col justify-center gap-4 p-6 sm:p-10 lg:p-12">
          <h2 class="max-w-[480px] text-[26px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[32px]">
            {{ 'home.sell.title' | translate }}
          </h2>
          <div class="mt-2 flex flex-col gap-3">
            @for (p of paths; track p.id) {
              <button
                type="button"
                class="group flex items-center gap-4 rounded-xl border border-white/15 bg-white/[0.08] p-4 text-start transition-all hover:translate-x-1 hover:bg-white/[0.16]"
              >
                <span class="inline-grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-white/15" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <path [attr.d]="p.iconPath" />
                  </svg>
                </span>
                <div class="flex-1">
                  <h3 class="text-[15px] font-semibold text-white">
                    {{ 'home.sell.' + p.id + '.title' | translate }}
                  </h3>
                  <p class="mt-0.5 text-[13px] text-white/70">{{ 'home.sell.' + p.id + '.sub' | translate }}</p>
                </div>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path [attr.d]="dirArrow()" />
                </svg>
              </button>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class SellCalloutComponent {
  private readonly language = inject(LanguageService);
  readonly currentLocale = computed(() => this.language.current());
  readonly paths = PATHS;
  readonly dirArrow = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));
}
