import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

interface FooterColumn {
  titleKey: string;
  links: ReadonlyArray<{ labelKey: string }>;
}

const COLUMNS: ReadonlyArray<FooterColumn> = [
  {
    titleKey: 'footer.columns.buy.title',
    links: [
      { labelKey: 'footer.columns.buy.browse' },
      { labelKey: 'footer.columns.buy.byBody' },
      { labelKey: 'footer.columns.buy.byMonthly' },
      { labelKey: 'footer.columns.buy.compare' },
    ],
  },
  {
    titleKey: 'footer.columns.sell.title',
    links: [
      { labelKey: 'footer.columns.sell.instant' },
      { labelKey: 'footer.columns.sell.concierge' },
      { labelKey: 'footer.columns.sell.self' },
      { labelKey: 'footer.columns.sell.tradeIn' },
    ],
  },
  {
    titleKey: 'footer.columns.own.title',
    links: [
      { labelKey: 'footer.columns.own.finance' },
      { labelKey: 'footer.columns.own.insurance' },
      { labelKey: 'footer.columns.own.services' },
      { labelKey: 'footer.columns.own.maintenance' },
    ],
  },
  {
    titleKey: 'footer.columns.company.title',
    links: [
      { labelKey: 'footer.columns.company.how' },
      { labelKey: 'footer.columns.company.about' },
      { labelKey: 'footer.columns.company.reviews' },
      { labelKey: 'footer.columns.company.contact' },
      { labelKey: 'footer.columns.company.careers' },
    ],
  },
];

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <footer class="mt-16 bg-brand-900 pt-14 text-white/85">
      <div class="mx-auto grid w-full max-w-container gap-12 px-4 pb-10 sm:px-6 lg:grid-cols-[1.3fr_2fr] lg:gap-14">
        <div>
          <div class="mb-4 inline-flex items-center rounded-xl bg-white px-5 py-3" aria-hidden="true">
            <img src="assets/bm/logo.png" alt="" class="h-12 w-auto sm:h-14" />
          </div>
          <div class="font-display text-lg font-bold text-white">{{ 'app.company' | translate }}</div>
          <p class="mt-2 max-w-xs text-sm text-white/70">{{ 'footer.tagline' | translate }}</p>
          <div class="mt-5 flex flex-wrap gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-pill border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
              </svg>
              {{ 'footer.trust.inspection' | translate }}
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-pill border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M9 14 5 10l4-4M5 10h9a5 5 0 0 1 5 5v3" />
              </svg>
              {{ 'footer.trust.return' | translate }}
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-pill border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
              {{ 'footer.trust.delivery' | translate }}
            </span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-8 md:grid-cols-4">
          @for (col of columns; track col.titleKey) {
            <div>
              <h4 class="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-white">
                {{ col.titleKey | translate }}
              </h4>
              <ul class="flex flex-col gap-2.5 text-sm text-white/70">
                @for (link of col.links; track link.labelKey) {
                  <li>
                    <button
                      type="button"
                      class="text-left hover:text-white"
                    >
                      {{ link.labelKey | translate }}
                    </button>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      </div>
      <div class="mx-auto flex w-full max-w-container flex-wrap justify-between gap-4 border-t border-white/10 px-4 py-5 text-[13px] text-white/60 sm:px-6">
        <div>{{ 'footer.rights' | translate }}</div>
        <div class="flex flex-wrap gap-4">
          <button type="button" class="hover:text-white">{{ 'footer.legal.privacy' | translate }}</button>
          <button type="button" class="hover:text-white">{{ 'footer.legal.terms' | translate }}</button>
          <button type="button" class="hover:text-white">{{ 'footer.legal.citra' | translate }}</button>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  readonly columns = COLUMNS;
}
