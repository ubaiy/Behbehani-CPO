import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';

/**
 * Self-service listing wizard — STUB.
 *
 * The customer-facing self-service listing endpoint (POST /v1/public/listings)
 * isn't built yet. This page exists so the /sell/self-service route resolves
 * (and so the Compare-table CTA on the landing page doesn't 404), but it just
 * announces that the path is coming soon and routes users back to Concierge
 * (which IS wired end-to-end per CONCIERGE_INSPECTION_API_CONTRACT.md).
 *
 * When we ship the listing API, expand this into the 4-step wizard from
 * mockup page-sell.jsx SelfService (car info / photos / price / review).
 */
@Component({
  selector: 'app-sell-self-service-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule],
  template: `
    <header class="border-b border-line bg-surface-soft">
      <div class="container-page py-8 sm:py-10">
        <a
          [routerLink]="['/', currentLocale(), 'sell']"
          class="inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="backArrow()" />
          </svg>
          {{ 'sell.self.back' | translate }}
        </a>
        <div class="mt-3 inline-flex items-center gap-2 rounded-pill bg-white px-3 py-1 text-[11px] font-semibold text-ink-3 ring-1 ring-line">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
          {{ 'sell.self.badge' | translate }}
        </div>
        <h1 class="mt-4 font-display text-[clamp(24px,3vw,32px)] font-bold tracking-[-0.025em] text-ink">
          {{ 'sell.self.title' | translate }}
        </h1>
      </div>
    </header>

    <main class="container-page py-12 sm:py-20">
      <div class="mx-auto flex max-w-xl flex-col items-center text-center">
        <div class="inline-grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M5 8h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM8 8V6a4 4 0 0 1 8 0v2"/>
          </svg>
        </div>
        <h2 class="mt-5 font-display text-[clamp(22px,2.6vw,30px)] font-bold tracking-[-0.025em] text-ink">
          {{ 'sell.self.reviewStep.pending' | translate }}
        </h2>
        <p class="mt-3 text-[14px] text-muted">{{ 'sell.help.sub' | translate }}</p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            [routerLink]="['/', currentLocale(), 'sell', 'concierge']"
            class="inline-flex items-center gap-2 rounded-pill bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            {{ 'sell.compare.chooseConcierge' | translate }}
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="arrowPath()"/></svg>
          </a>
          <a
            href="tel:+96522282282"
            class="inline-flex items-center gap-2 rounded-pill border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-soft"
          >
            +965 22 282 282
          </a>
        </div>
      </div>
    </main>
  `,
})
export class SellSelfServicePageComponent {
  private readonly language = inject(LanguageService);
  readonly currentLocale = computed(() => this.language.current());
  readonly arrowPath = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));
  readonly backArrow = computed(() => (this.currentLocale() === 'ar' ? 'M10 6l6 6-6 6' : 'M14 6l-6 6 6 6'));
}
