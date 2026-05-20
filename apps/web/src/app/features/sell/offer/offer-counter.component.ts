import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import type { PublicOfferView } from '@behbehani-cpo/shared-types';
import { OffersService } from '../../../data/offers.service';

/**
 * Customer counter-offer entry page.
 *
 * Route: `/{locale}/sell/concierge/offer/:token/counter`
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.0 §16 D1 (USER OVERRIDE):
 * counter-offer rounds are UNLIMITED. The "this is your only counter-offer
 * round" warning chip from the original mockup is REMOVED. Neutral copy
 * "BMC will respond within 24 hours" replaces it.
 *
 * On submit success the user is bounced back to the parent offer page, which
 * re-fetches and renders the read-only "you countered, awaiting reply" state
 * (status='countered_by_customer'). When BMC counters back, the parent page's
 * picker re-activates (status='countered_by_admin').
 */

interface FormState {
  amountKwd: string;   // user-entered, raw with commas
  notes: string;
}

@Component({
  selector: 'app-sell-offer-counter-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <!-- Page sits inside the locale shell — shell provides the storefront nav. -->
    <div class="min-h-screen bg-surface-soft">
      <!-- Hero -->
      <section class="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
        <div class="container-page py-10 sm:py-12">
          <div class="mx-auto max-w-lg">
            <a
              [routerLink]="['/', currentLocale(), 'sell', 'concierge', 'offer', token]"
              class="inline-flex items-center gap-1 text-[13px] font-medium text-white/80 hover:text-white mb-3"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><path [attr.d]="backArrow()" /></svg>
              {{ 'sell.offer.counter.back' | translate }}
            </a>
          <div class="text-center">
            <h1 class="font-display text-[clamp(24px,3vw,32px)] font-extrabold leading-tight tracking-[-0.025em] text-white">
              {{ 'sell.offer.counter.title' | translate }}
            </h1>
            @if (offerData(); as o) {
              <p class="mt-2 text-[14px] text-white/85">
                {{ 'sell.offer.counter.sub' | translate: { current: displayAmount(o) } }}
              </p>
            } @else {
              <p class="mt-2 text-[14px] text-white/85">{{ 'sell.offer.counter.subLoading' | translate }}</p>
            }
          </div>
          </div>
        </div>
      </section>

      <main class="container-page py-8 max-w-lg space-y-5">

        <!-- LOADING -->
        @if (loading()) {
          <div class="rounded-3xl border border-line bg-white p-10 text-center text-[14px] text-muted shadow-brand-sm" aria-busy="true">
            <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-600"></span>
            <span class="ml-2">{{ 'sell.offer.loading' | translate }}</span>
          </div>
        }

        <!-- TERMINAL: not-respondable (offer expired / withdrawn / already responded) -->
        @if (loadError(); as e) {
          <div class="rounded-3xl border border-line bg-white p-8 text-center shadow-brand-sm">
            <h2 class="font-display text-[20px] font-bold tracking-[-0.025em] text-ink">
              {{ ('sell.offer.terminal.' + e + '.title') | translate }}
            </h2>
            <p class="mt-2 text-[14px] text-muted">{{ 'sell.offer.counter.unavailable' | translate }}</p>
            <a
              [routerLink]="['/', currentLocale(), 'sell', 'concierge', 'offer', token]"
              class="mt-4 inline-flex items-center gap-2 rounded-pill bg-brand-700 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-800"
            >
              {{ 'sell.offer.counter.backToOffer' | translate }}
            </a>
          </div>
        }

        <!-- FORM -->
        @if (offerData(); as o) {

          <!-- Neutral reassurance line (replaces the deprecated "only round" warning per §16 D1) -->
          <div class="flex items-start gap-3 p-4 rounded-2xl border border-brand-200 bg-brand-50">
            <svg class="w-5 h-5 text-brand-700 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 2"/>
            </svg>
            <p class="text-[13px] text-brand-800">
              {{ 'sell.offer.counter.reassurance' | translate }}
            </p>
          </div>

          <!-- Counter amount card -->
          <div class="rounded-3xl border border-line bg-white p-6 shadow-brand-sm space-y-5">

            <!-- Amount -->
            <div>
              <label for="counter-amount" class="block text-[12px] font-semibold uppercase tracking-wider text-muted mb-2">
                {{ 'sell.offer.counter.amountLabel' | translate }}
              </label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-[20px] font-semibold text-muted-2 pointer-events-none">KD</span>
                <input
                  id="counter-amount"
                  type="text"
                  inputmode="decimal"
                  [value]="form().amountKwd"
                  (input)="onAmountInput($event)"
                  (keyup.enter)="submit()"
                  placeholder="0"
                  class="w-full pl-14 pr-4 py-4 font-display text-[28px] font-extrabold text-ink rounded-xl border-2 border-line bg-white focus:outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 min-h-[64px] tracking-tight tabular-nums"
                  [class.border-red-500]="amountError()"
                  [attr.aria-invalid]="amountError() ? 'true' : 'false'"
                  [attr.aria-describedby]="amountError() ? 'amount-err' : 'amount-hint'"
                />
              </div>
              <div class="flex items-center justify-between mt-2 text-[12px] text-muted-2">
                <span>{{ 'sell.offer.counter.ourOfferLabel' | translate }} <span class="font-semibold text-ink-2">{{ displayAmount(o) }}</span></span>
                <span id="amount-hint">{{ 'sell.offer.counter.hint' | translate }}</span>
              </div>
              @if (amountError(); as ae) {
                <p id="amount-err" class="mt-1 text-[12px] font-medium text-red-600" role="alert">{{ ae }}</p>
              }
            </div>

            <!-- Notes -->
            <div>
              <label for="counter-notes" class="block text-[12px] font-semibold uppercase tracking-wider text-muted mb-2">
                {{ 'sell.offer.counter.notesLabel' | translate }}
                <span class="font-normal normal-case text-muted-2">({{ 'sell.offer.counter.optional' | translate }})</span>
              </label>
              <textarea
                id="counter-notes"
                rows="4"
                maxlength="500"
                [value]="form().notes"
                (input)="onNotesInput($event)"
                [placeholder]="'sell.offer.counter.notesPh' | translate"
                class="w-full text-[14px] rounded-xl border border-line px-4 py-3 focus:outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 resize-none bg-white leading-relaxed"
              ></textarea>
              <div class="flex justify-end mt-1">
                <span class="text-[11px] text-muted-2 tabular-nums">{{ form().notes.length }}/500</span>
              </div>
              <p class="text-[11px] text-muted mt-0.5">{{ 'sell.offer.counter.notesHint' | translate }}</p>
            </div>
          </div>

          <!-- Response-time note -->
          <p class="flex items-center gap-2 text-[13px] text-muted px-1">
            <svg class="w-4 h-4 text-brand-700 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <span>{{ 'sell.offer.counter.responseTime' | translate }}</span>
          </p>

          @if (submitError(); as err) {
            <p class="text-[13px] text-red-600" role="alert">{{ err }}</p>
          }

          <!-- CTAs -->
          <div class="space-y-3 pb-6">
            <button
              type="button"
              (click)="submit()"
              [disabled]="submitting() || !canSubmit()"
              class="block w-full rounded-pill bg-brand-700 px-6 py-4 text-[15px] font-bold text-white hover:bg-brand-800 active:scale-[0.99] min-h-[56px] shadow-brand transition-all disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              @if (submitting()) {
                {{ 'sell.offer.counter.submitting' | translate }}
              } @else {
                {{ 'sell.offer.counter.submit' | translate }}
              }
            </button>
            <a
              [routerLink]="['/', currentLocale(), 'sell', 'concierge', 'offer', token]"
              class="block w-full text-center px-6 py-3 text-[13px] font-medium text-muted hover:text-ink-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-pill"
            >
              {{ 'sell.offer.counter.cancel' | translate }}
            </a>
          </div>
        }
      </main>
    </div>
  `,
})
export class SellOfferCounterPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(OffersService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly currentLocale = computed(() => this.language.current());
  readonly backArrow = computed(() =>
    this.currentLocale() === 'ar' ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7',
  );

  readonly loading = signal(true);
  readonly loadError = signal<'expired' | 'withdrawn' | 'not_found' | null>(null);
  readonly offerData = signal<PublicOfferView | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly amountError = signal<string | null>(null);

  readonly form = signal<FormState>({ amountKwd: '', notes: '' });

  token = '';

  ngOnInit(): void {
    const set = () => this.title.setTitle(this.translate.instant('sell.offer.counter.metaTitle'));
    set();
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(set);
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.loading.set(false);
      this.loadError.set('not_found');
      return;
    }

    this.api
      .fetch$(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.loading.set(false);
        switch (res.kind) {
          case 'ok':
            if (!res.data.canRespond) {
              /* Offer no longer respondable (already accepted/declined/waiting on BMC). Bounce back to view. */
              this.offerData.set(res.data);
              this.loadError.set('not_found');
              return;
            }
            this.offerData.set(res.data);
            break;
          case 'expired':
            this.loadError.set('expired');
            break;
          case 'withdrawn':
            this.loadError.set('withdrawn');
            break;
          case 'not_found':
          case 'network_error':
            this.loadError.set('not_found');
            break;
        }
      });
  }

  /* ─── Form handlers ─────────────────────────────────────────────── */

  onAmountInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    /* Allow digits + one decimal point. Strip everything else. */
    const raw = input.value.replace(/[^\d.]/g, '');
    const parts = raw.split('.');
    const intPart = (parts[0] ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = parts.length > 1 ? `${intPart}.${parts.slice(1).join('').slice(0, 3)}` : intPart;
    input.value = formatted;
    this.form.update((f) => ({ ...f, amountKwd: formatted }));
    if (this.amountError()) this.amountError.set(null);
  }

  onNotesInput(ev: Event): void {
    const textarea = ev.target as HTMLTextAreaElement;
    this.form.update((f) => ({ ...f, notes: textarea.value.slice(0, 500) }));
  }

  canSubmit(): boolean {
    const f = this.form();
    const fils = this.parseAmountToFils(f.amountKwd);
    return fils !== null && fils > 0;
  }

  submit(): void {
    if (this.submitting()) return;
    const o = this.offerData();
    if (!o) return;
    const fils = this.parseAmountToFils(this.form().amountKwd);
    if (fils === null || fils <= 0) {
      this.amountError.set(this.translate.instant('sell.offer.counter.errors.invalidAmount'));
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.api
      .submit$(this.token, {
        action: 'counter',
        counterAmountFils: fils,
        counterNotes: this.form().notes.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.submitting.set(false);
        switch (res.kind) {
          case 'ok':
            /* Bounce to the parent offer page which re-fetches and shows the
               "you countered, awaiting BMC reply" state. */
            this.router.navigate(
              ['/', this.currentLocale(), 'sell', 'concierge', 'offer', this.token],
              { replaceUrl: true },
            );
            break;
          case 'invalid_counter':
            this.amountError.set(this.translate.instant('sell.offer.counter.errors.invalidAmount'));
            break;
          case 'expired':
          case 'withdrawn':
          case 'not_found':
            this.loadError.set(res.kind === 'not_found' ? 'not_found' : res.kind);
            this.offerData.set(null);
            break;
          case 'already_responded':
            this.submitError.set(this.translate.instant('sell.offer.errors.alreadyResponded'));
            /* Bounce back to parent to surface the authoritative state. */
            this.router.navigate(
              ['/', this.currentLocale(), 'sell', 'concierge', 'offer', this.token],
              { replaceUrl: true },
            );
            break;
          case 'error':
            this.submitError.set(res.message);
            break;
        }
      });
  }

  /* ─── Render helpers ────────────────────────────────────────────── */

  displayAmount(o: PublicOfferView): string {
    if (o.status === 'countered_by_admin' && o.adminCounterAmountFils !== null) {
      return this.filsToKwd(o.adminCounterAmountFils);
    }
    return o.offerAmountKwd;
  }

  filsToKwd(fils: number): string {
    const kd = fils / 1000;
    return `KD ${kd.toLocaleString(this.currentLocale() === 'ar' ? 'ar-KW' : 'en-KW', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })}`;
  }

  /** Convert user-entered "1,234.500" or "1234" into integer fils (×1000). Returns null if invalid. */
  private parseAmountToFils(raw: string): number | null {
    if (!raw) return null;
    const clean = raw.replace(/,/g, '');
    if (!/^\d+(\.\d{1,3})?$/.test(clean)) return null;
    const kd = parseFloat(clean);
    if (Number.isNaN(kd) || kd <= 0) return null;
    return Math.round(kd * 1000);
  }
}
