// TODO: insert plan selection (Bronze/Silver/Gold) between this page and the
// concierge booking form once pricing is finalised. The mockup defines the
// page at `/sell/plan-concierge` and `/sell/plan-self`; we go straight to
// `/sell/concierge` for now because there is no payments backend yet.

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { SellWizardStateService } from '../../data/sell-wizard-state.service';

interface CardFeature {
  /** i18n key under sell.choose.{conciergeFeatures|selfFeatures} */
  key: string;
}

const CONCIERGE_FEATURES: ReadonlyArray<CardFeature> = [
  { key: 'sell.choose.conciergeFeatures.inspect' },
  { key: 'sell.choose.conciergeFeatures.offer' },
  { key: 'sell.choose.conciergeFeatures.handle' },
  { key: 'sell.choose.conciergeFeatures.moi' },
  { key: 'sell.choose.conciergeFeatures.network' },
];

const SELF_FEATURES: ReadonlyArray<CardFeature> = [
  { key: 'sell.choose.selfFeatures.upload' },
  { key: 'sell.choose.selfFeatures.offer' },
  { key: 'sell.choose.selfFeatures.handle' },
  { key: 'sell.choose.selfFeatures.masked' },
  { key: 'sell.choose.selfFeatures.boost' },
];

@Component({
  selector: 'app-sell-choose-option',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule],
  template: `
    <!-- ─── HEADER ──────────────────────────────────────────────────── -->
    <header class="sticky top-0 z-20 border-b border-line bg-white shadow-sm">
      <div class="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4">
        <button
          type="button"
          (click)="goBack()"
          class="inline-grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-soft"
          [attr.aria-label]="'sell.choose.header.back' | translate"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="backArrow()" />
          </svg>
        </button>
        <h1 class="line-clamp-1 text-center font-display text-[14px] font-bold tracking-[-0.01em] text-ink sm:text-[15px]">
          {{ 'sell.choose.header.title' | translate }}
        </h1>
        <button
          type="button"
          (click)="exit()"
          class="inline-grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-soft"
          [attr.aria-label]="'sell.choose.header.exit' | translate"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Decorative banner (matches mockup cso-banner) -->
    <div class="h-24 bg-gradient-to-br from-brand-50 via-white to-brand-100/60" aria-hidden="true"></div>

    <main class="bg-surface-soft">
      <div class="mx-auto max-w-4xl px-4 pb-12 -mt-12 sm:-mt-14">
        <!-- ─── TWO CARDS ───────────────────────────────────────────── -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <!-- CONCIERGE -->
          <article class="flex flex-col rounded-3xl border-2 border-brand-200 ring-1 ring-brand-100 bg-white p-6 shadow-brand-sm">
            <div class="flex items-start justify-between">
              <span class="inline-flex items-center gap-1 rounded-pill bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>
                {{ 'sell.choose.recommended' | translate }}
              </span>
            </div>
            <h2 class="mt-3 font-display text-[20px] font-bold tracking-[-0.02em] text-ink">
              {{ 'sell.choose.concierge.title' | translate }}
            </h2>
            <p class="mt-1 text-[13px] text-muted">{{ 'sell.choose.concierge.subtitle' | translate }}</p>

            <hr class="my-5 border-line" />

            <ul class="flex flex-col gap-2.5">
              @for (f of conciergeFeatures; track f.key) {
                <li class="flex items-start gap-2.5 text-[13px] text-ink-2">
                  <span class="inline-grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <span class="leading-relaxed">{{ f.key | translate }}</span>
                </li>
              }
            </ul>

            <div class="mt-6 flex flex-col gap-2">
              <button
                type="button"
                (click)="chooseConcierge()"
                class="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-5 py-3 text-[14px] font-semibold text-white hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                {{ 'sell.choose.concierge.cta' | translate }}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="arrowPath()" /></svg>
              </button>
              <div class="flex items-center justify-center gap-1.5 text-[12px] text-muted">
                <span>{{ 'sell.choose.startingAt' | translate }}</span>
                <strong class="font-semibold text-ink-2">{{ 'sell.choose.concierge.priceLabel' | translate }}</strong>
              </div>
            </div>
          </article>

          <!-- SELF-SERVICE -->
          <article class="flex flex-col rounded-3xl border border-line bg-white p-6 shadow-brand-sm opacity-95">
            <div class="flex items-start justify-between gap-2">
              <span class="inline-flex items-center gap-1 rounded-pill bg-surface-soft px-2.5 py-1 text-[11px] font-semibold text-ink-2">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>
                {{ 'sell.choose.mostControl' | translate }}
              </span>
              <span class="inline-flex items-center bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-pill">
                {{ 'sell.choose.selfService.comingSoon' | translate }}
              </span>
            </div>
            <h2 class="mt-3 font-display text-[20px] font-bold tracking-[-0.02em] text-ink-2">
              {{ 'sell.choose.self.title' | translate }}
            </h2>
            <p class="mt-1 text-[13px] text-muted">{{ 'sell.choose.self.subtitle' | translate }}</p>

            <hr class="my-5 border-line" />

            <ul class="flex flex-col gap-2.5">
              @for (f of selfFeatures; track f.key) {
                <li class="flex items-start gap-2.5 text-[13px] text-ink-2">
                  <span class="inline-grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-surface-soft text-ink-2">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <span class="leading-relaxed">{{ f.key | translate }}</span>
                </li>
              }
            </ul>

            <div class="mt-6 flex flex-col gap-2">
              @if (notifyState() === 'done') {
                <p class="rounded-2xl bg-brand-50 px-4 py-3 text-center text-[13px] font-medium text-brand-700">
                  {{ 'sell.choose.selfService.notify.done' | translate }}
                </p>
              } @else {
                <form
                  (ngSubmit)="submitNotify()"
                  class="flex flex-col gap-2"
                  novalidate
                >
                  <label class="sr-only" for="self-notify-email">
                    {{ 'sell.choose.selfService.notify.label' | translate }}
                  </label>
                  <div class="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="self-notify-email"
                      type="email"
                      inputmode="email"
                      autocomplete="email"
                      [value]="notifyEmail()"
                      (input)="onNotifyEmailInput($event)"
                      [placeholder]="'sell.choose.selfService.notify.placeholder' | translate"
                      [attr.aria-invalid]="notifyState() === 'error' ? 'true' : null"
                      class="min-w-0 flex-1 rounded-pill border border-line bg-white px-4 py-2.5 text-[13px] text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    />
                    <button
                      type="submit"
                      [disabled]="notifyState() === 'submitting'"
                      class="inline-flex items-center justify-center gap-2 rounded-pill border border-brand-700 bg-white px-5 py-2.5 text-[13px] font-semibold text-brand-700 transition hover:bg-brand-50 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    >
                      {{ 'sell.choose.selfService.notify.cta' | translate }}
                    </button>
                  </div>
                  @if (notifyState() === 'error') {
                    <p class="text-[12px] text-rose-600" role="alert">
                      {{ 'sell.choose.selfService.notify.invalid' | translate }}
                    </p>
                  }
                </form>
              }
              <div class="flex items-center justify-center gap-1.5 text-[12px] text-muted">
                <span>{{ 'sell.choose.startingAt' | translate }}</span>
                <strong class="font-semibold text-ink-2">{{ 'sell.choose.self.priceLabel' | translate }}</strong>
              </div>
            </div>
          </article>
        </div>

        <!-- ─── NEED HELP CARD ──────────────────────────────────────── -->
        <div class="mt-8 rounded-3xl border border-line bg-white p-6 text-center shadow-brand-sm">
          <div class="mx-auto inline-grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
            </svg>
          </div>
          <h3 class="mt-3 font-display text-[18px] font-bold tracking-[-0.02em] text-ink">{{ 'sell.choose.help.title' | translate }}</h3>
          <p class="mx-auto mt-1 max-w-md text-[13px] text-muted">{{ 'sell.choose.help.sub' | translate }}</p>
          <button
            type="button"
            (click)="requestCallback()"
            class="mt-4 inline-flex items-center gap-2 rounded-pill border border-line bg-white px-5 py-2.5 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {{ 'sell.choose.help.cta' | translate }}
          </button>
        </div>
      </div>
    </main>
  `,
})
export class SellChooseOptionComponent implements OnInit {
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly state = inject(SellWizardStateService);

  readonly currentLocale = computed(() => this.language.current());
  readonly arrowPath = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));
  readonly backArrow = computed(() => (this.currentLocale() === 'ar' ? 'M10 6l6 6-6 6' : 'M14 6l-6 6 6 6'));

  readonly conciergeFeatures = CONCIERGE_FEATURES;
  readonly selfFeatures = SELF_FEATURES;

  /* Self-service is soft-gated: capture interest while the flow is built.
     Network POST is intentionally unwired — UI-only stub for now. */
  readonly notifyEmail = signal('');
  readonly notifyState = signal<'idle' | 'submitting' | 'done' | 'error'>('idle');

  onNotifyEmailInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.notifyEmail.set(value);
    if (this.notifyState() === 'error') {
      this.notifyState.set('idle');
    }
  }

  submitNotify(): void {
    const email = this.notifyEmail().trim();
    if (!email || !email.includes('@')) {
      this.notifyState.set('error');
      return;
    }
    /* TODO: POST to /v1/public/sell/self-service/notify once endpoint exists. */
    this.notifyState.set('done');
  }

  ngOnInit(): void {
    /* GUARD: can't deep-link here without a vehicle — bounce to details. */
    if (!this.state.hasVehicle()) {
      this.router.navigate(['/', this.currentLocale(), 'sell', 'details']);
      return;
    }
    const setMeta = () => {
      this.title.setTitle(this.translate.instant('sell.choose.metaTitle'));
      this.meta.updateTag({
        name: 'description',
        content: this.translate.instant('sell.choose.metaDescription'),
      });
    };
    setMeta();
    this.translate.onLangChange.subscribe(setMeta);
  }

  goBack(): void {
    this.router.navigate(['/', this.currentLocale(), 'sell', 'details']);
  }

  exit(): void {
    this.router.navigate(['/', this.currentLocale(), 'sell']);
  }

  chooseConcierge(): void {
    this.state.setPlan('concierge');
    this.router.navigate(['/', this.currentLocale(), 'sell', 'concierge']);
  }

  /* Stub — callback request flow not yet wired. Surfacing nothing is better
     than a broken submit; keeping the UI element so the layout matches the
     approved mockup. */
  requestCallback(): void {
    /* TODO: route through a real lead-capture endpoint. */
  }
}
