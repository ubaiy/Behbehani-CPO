import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import {
  CreateConciergeInspectionSchema,
  type CreateConciergeInspectionDto,
  type CreateConciergeInspectionResponse,
  type PreferredWindow,
} from '@behbehani-cpo/shared-types';
import { SellBookingsService } from '../../data/sell-bookings.service';
import { SellWizardStateService, type VehicleDetails } from '../../data/sell-wizard-state.service';

/* ─── Form-state shape (UI-friendly; mapped to the DTO on submit) ────────── */

type WizardStep = 1 | 2 | 3;
type Governorate =
  | 'capital'
  | 'hawalli'
  | 'farwaniya'
  | 'mubarakAlKabeer'
  | 'ahmadi'
  | 'jahra';

interface FormState {
  /* Step 1 — Location & When */
  address: string;
  governorate: Governorate | '';
  notes: string;
  preferredDate: string;
  window: PreferredWindow | '';
  /* Step 2 — Contact */
  fullName: string;
  mobile: string;
  email: string;
  consent: boolean;
}

const EMPTY: FormState = {
  address: '',
  governorate: '',
  notes: '',
  preferredDate: '',
  window: '',
  fullName: '',
  mobile: '',
  email: '',
  consent: false,
};

const GOVERNORATES: ReadonlyArray<Governorate> = [
  'capital',
  'hawalli',
  'farwaniya',
  'mubarakAlKabeer',
  'ahmadi',
  'jahra',
];

const WINDOWS: ReadonlyArray<PreferredWindow> = ['morning', 'afternoon', 'evening'];

@Component({
  selector: 'app-sell-concierge-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <!-- ─── HEADER ──────────────────────────────────────────────────── -->
    <header class="border-b border-line bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
      <div class="container-page py-8 sm:py-10">
        <a
          [routerLink]="['/', currentLocale(), 'sell', 'choose']"
          class="inline-flex items-center gap-1 text-[13px] font-medium text-white/80 hover:text-white"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="backArrow()" />
          </svg>
          {{ 'sell.concierge.back' | translate }}
        </a>
        <div class="mt-3 inline-flex items-center gap-2 rounded-pill bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>
          {{ 'sell.concierge.badge' | translate }}
        </div>
        <h1 class="mt-4 font-display text-[clamp(26px,3.4vw,40px)] font-bold leading-tight tracking-[-0.025em] text-white">
          {{ 'sell.concierge.title' | translate }}
        </h1>
        <p class="mt-2 max-w-xl text-[14px] text-white/85 sm:text-[15px]">{{ 'sell.concierge.sub' | translate }}</p>

        <!-- Stepper (1–3) -->
        @if (!successResp()) {
          <div class="mt-6">
            <div class="text-[12px] font-semibold text-white/70">
              {{ 'sell.concierge.stepCount' | translate: { current: step(), total: 3 } }}
            </div>
            <nav aria-label="Booking steps">
            <ol class="mt-2 flex flex-wrap gap-2 sm:gap-3">
              @for (n of [1, 2, 3]; track n) {
                <li class="flex flex-1 min-w-[120px] items-center gap-2 rounded-xl border border-white/15 px-3 py-2 backdrop-blur-sm" [attr.aria-current]="step() === n ? 'step' : null" [class.bg-white]="step() === n" [class.text-brand-700]="step() === n" [class.bg-white/10]="step() !== n" [class.text-white]="step() !== n">
                  <span class="inline-grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold" [class.bg-brand-700]="step() === n" [class.text-white]="step() === n" [class.bg-white/20]="step() !== n">
                    @if (step() > n) {
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
                    } @else {
                      {{ n }}
                    }
                  </span>
                  <span class="text-[12px] font-semibold">{{ stepLabelKey(n) | translate }}</span>
                </li>
              }
            </ol>
            </nav>
          </div>
        }
      </div>
    </header>

    <main class="bg-surface-soft">
      <div class="container-page py-8 sm:py-12">
        <!-- ─── SUCCESS CARD ──────────────────────────────────────── -->
        @if (successResp(); as r) {
          <div class="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white p-6 shadow-brand sm:p-10">
            <div class="inline-flex items-center gap-2 rounded-pill bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
              {{ 'sell.conciergeSuccess.badge' | translate }}
            </div>
            <h1 class="mt-4 font-display text-[clamp(22px,2.6vw,30px)] font-bold tracking-[-0.025em] text-ink">
              {{ 'sell.conciergeSuccess.title' | translate: { name: r.customerFullName } }}
            </h1>
            <p class="mt-2 text-[14px] text-muted">{{ 'sell.conciergeSuccess.sub' | translate }}</p>

            <div class="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
              <div class="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                {{ 'sell.conciergeSuccess.refLabel' | translate }}
              </div>
              <div class="mt-1 font-display text-[26px] font-bold tabular-nums text-ink">{{ r.bookingRef }}</div>
              <div class="mt-1 text-[12px] text-muted">{{ 'sell.conciergeSuccess.saveRef' | translate }}</div>
            </div>

            <div class="mt-6">
              <h2 class="text-[14px] font-bold uppercase tracking-wide text-ink-3">{{ 'sell.conciergeSuccess.next' | translate }}</h2>
              <ol class="mt-3 flex flex-col gap-3">
                @for (n of [1, 2, 3, 4]; track n) {
                  <li class="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
                    <span class="inline-grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand-700 text-[12px] font-bold text-white">{{ n }}</span>
                    <span class="text-[13px] leading-relaxed text-ink-2">{{ 'sell.conciergeSuccess.step' + n | translate }}</span>
                  </li>
                }
              </ol>
            </div>

            <a [routerLink]="['/', currentLocale()]" class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800">
              {{ 'sell.conciergeSuccess.home' | translate }}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="arrowPath()" /></svg>
            </a>
          </div>
        } @else {
          <!-- ─── WIZARD ────────────────────────────────────────────── -->
          <form class="mx-auto max-w-3xl rounded-3xl border border-line bg-white p-5 shadow-brand-sm sm:p-8" (ngSubmit)="next()" novalidate>
            <!-- Vehicle preview (always visible — set on the prior pages) -->
            @if (vehicle(); as v) {
              <div class="mb-6 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                <span class="inline-grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-brand-sm">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 16l1.5-4h11L19 16M5 16h14v3H5zM7 19v2M17 19v2"/></svg>
                </span>
                <div class="min-w-0 flex-1">
                  <div class="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{{ 'sell.concierge.yourCar' | translate }}</div>
                  <div class="mt-0.5 text-[14px] font-semibold text-ink">{{ vehicleSummary() }}</div>
                </div>
                <a
                  [routerLink]="['/', currentLocale(), 'sell', 'details']"
                  class="flex-shrink-0 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
                >
                  {{ 'sell.concierge.editCar' | translate }}
                </a>
              </div>
            }

            <!-- STEP 1: LOCATION & WHEN -->
            @if (step() === 1) {
              <h2 class="font-display text-[22px] font-bold tracking-[-0.025em] text-ink sm:text-[26px]">
                {{ 'sell.concierge.location.title' | translate }}
              </h2>
              <p class="mt-1 text-[13px] text-muted">{{ 'sell.concierge.location.sub' | translate }}</p>

              <p class="mb-4 mt-4 rounded-lg bg-brand-50 px-3 py-2 text-[12px] text-brand-800">
                {{ 'sell.concierge.steps.locationReassurance' | translate }}
              </p>

              <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5 sm:col-span-2">
                  <span class="text-[12px] font-semibold text-ink-3">{{ 'sell.concierge.location.address' | translate }} *</span>
                  <input type="text" [(ngModel)]="form().address" name="address" [placeholder]="'sell.concierge.location.addressPh' | translate" class="input" maxlength="280" [attr.aria-invalid]="hasError('address')" [attr.aria-describedby]="hasError('address') ? 'err-address' : null" />
                  @if (showFieldError('address')) { <span id="err-address" class="text-[11px] font-medium text-red-600">{{ 'sell.concierge.validation.required' | translate }}</span> }
                </label>

                <label class="flex flex-col gap-1.5">
                  <span class="text-[12px] font-semibold text-ink-3">{{ 'sell.concierge.location.governorate' | translate }}</span>
                  <select [(ngModel)]="form().governorate" name="governorate" class="input">
                    <option value="">—</option>
                    @for (g of governorates; track g) {
                      <option [value]="g">{{ 'sell.concierge.governorates.' + g | translate }}</option>
                    }
                  </select>
                </label>

                <label class="flex flex-col gap-1.5 sm:col-span-2">
                  <span class="text-[12px] font-semibold text-ink-3">{{ 'sell.concierge.location.notes' | translate }}</span>
                  <textarea [(ngModel)]="form().notes" name="notes" [placeholder]="'sell.concierge.location.notesPh' | translate" class="input min-h-[80px]" maxlength="500" rows="3"></textarea>
                  <span class="text-[11px] text-muted-2">{{ form().notes.length }}/500</span>
                </label>
              </div>

              <div class="mt-8 border-t border-line pt-6">
                <h3 class="font-display text-[18px] font-bold tracking-[-0.025em] text-ink">{{ 'sell.concierge.location.when' | translate }}</h3>
                <p class="mt-1 text-[13px] text-muted">{{ 'sell.concierge.location.whenSub' | translate }}</p>

                <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label class="flex flex-col gap-1.5">
                    <span class="text-[12px] font-semibold text-ink-3">{{ 'sell.concierge.location.date' | translate }}</span>
                    <input type="date" [(ngModel)]="form().preferredDate" name="preferredDate" [min]="minPreferredDate" [max]="maxPreferredDate" class="input" />
                  </label>
                  <fieldset role="group" aria-label="Preferred time window" class="flex flex-col gap-1.5">
                    <legend class="sr-only">{{ 'sell.concierge.location.window' | translate }}</legend>
                    <span class="text-[12px] font-semibold text-ink-3">{{ 'sell.concierge.location.window' | translate }}</span>
                    <div class="grid grid-cols-3 gap-2">
                      @for (w of windows; track w) {
                        <button type="button" (click)="setWindow(w)" class="rounded-xl border px-3 py-3 min-h-[44px] text-[12px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2" [class.border-brand-700]="form().window === w" [class.bg-brand-50]="form().window === w" [class.text-brand-700]="form().window === w" [class.border-line]="form().window !== w" [class.bg-white]="form().window !== w" [class.text-ink-3]="form().window !== w">
                          {{ 'sell.concierge.location.window' + capitalize(w) | translate }}
                        </button>
                      }
                    </div>
                  </fieldset>
                </div>
                <p class="mt-1 text-[11px] text-muted-2">{{ 'sell.concierge.steps.preferenceNote' | translate }}</p>
              </div>
            }

            <!-- STEP 2: CONTACT -->
            @if (step() === 2) {
              <h2 class="font-display text-[22px] font-bold tracking-[-0.025em] text-ink sm:text-[26px]">
                {{ 'sell.concierge.contact.title' | translate }}
              </h2>
              <p class="mt-1 text-[13px] text-muted">{{ 'sell.concierge.contact.sub' | translate }}</p>

              <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5">
                  <span class="text-[12px] font-semibold text-ink-3">{{ 'sell.concierge.contact.fullName' | translate }} *</span>
                  <input type="text" [(ngModel)]="form().fullName" name="fullName" [placeholder]="'sell.concierge.contact.fullNamePh' | translate" class="input" maxlength="200" autocomplete="name" [attr.aria-invalid]="hasError('fullName')" [attr.aria-describedby]="hasError('fullName') ? 'err-name' : null" />
                  @if (showFieldError('fullName')) { <span id="err-name" class="text-[11px] font-medium text-red-600">{{ 'sell.concierge.validation.required' | translate }}</span> }
                </label>

                <label class="flex flex-col gap-1.5">
                  <span class="text-[12px] font-semibold text-ink-3">{{ 'sell.concierge.contact.mobile' | translate }} *</span>
                  <div class="flex items-center rounded-xl border border-line bg-surface-soft focus-within:border-brand-500 focus-within:bg-white">
                    <span class="inline-flex h-11 items-center border-e border-line px-3 text-[13px] font-semibold text-muted">+965</span>
                    <input type="tel" inputmode="tel" [(ngModel)]="form().mobile" name="mobile" [placeholder]="'sell.concierge.contact.mobilePh' | translate" class="h-11 flex-1 bg-transparent px-3 text-[14px] outline-none" maxlength="8" autocomplete="tel-national" [attr.aria-invalid]="hasError('mobile')" [attr.aria-describedby]="hasError('mobile') ? 'err-mobile' : null" />
                  </div>
                  @if (showFieldError('mobile')) { <span id="err-mobile" class="text-[11px] font-medium text-red-600">{{ 'sell.concierge.validation.mobile' | translate }}</span> }
                </label>

                <label class="flex flex-col gap-1.5 sm:col-span-2">
                  <span class="text-[12px] font-semibold text-ink-3">{{ 'sell.concierge.contact.email' | translate }}</span>
                  <input type="email" [(ngModel)]="form().email" name="email" [placeholder]="'sell.concierge.contact.emailPh' | translate" class="input" autocomplete="email" [attr.aria-invalid]="hasError('email')" [attr.aria-describedby]="hasError('email') ? 'err-email' : null" />
                  @if (showFieldError('email')) { <span id="err-email" class="text-[11px] font-medium text-red-600">{{ 'sell.concierge.validation.email' | translate }}</span> }
                </label>
              </div>

              <label class="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-soft p-3 hover:bg-white">
                <input type="checkbox" [(ngModel)]="form().consent" name="consent" class="mt-1 h-4 w-4 rounded border-line text-brand-700" [attr.aria-invalid]="hasError('consent')" [attr.aria-describedby]="hasError('consent') ? 'err-consent' : null" />
                <span class="text-[13px] leading-relaxed text-ink-2">{{ 'sell.concierge.contact.consent' | translate }}</span>
              </label>
              @if (showFieldError('consent')) { <span id="err-consent" class="mt-1 block text-[11px] font-medium text-red-600">{{ 'sell.concierge.validation.consent' | translate }}</span> }
            }

            <!-- STEP 3: REVIEW + SUBMIT -->
            @if (step() === 3) {
              <h2 class="font-display text-[22px] font-bold tracking-[-0.025em] text-ink sm:text-[26px]">
                {{ 'sell.concierge.reviewStep.title' | translate }}
              </h2>
              <p class="mt-1 text-[13px] text-muted">{{ 'sell.concierge.reviewStep.sub' | translate }}</p>

              <dl class="mt-6 space-y-3">
                <div class="rounded-xl border border-line bg-surface-soft p-4">
                  <div class="flex items-center justify-between">
                    <dt class="text-[12px] font-semibold uppercase tracking-wide text-muted">{{ 'sell.concierge.reviewStep.locationSection' | translate }}</dt>
                    <button type="button" (click)="goToStep(1)" class="text-[12px] font-semibold text-brand-700 hover:text-brand-800">{{ 'sell.concierge.reviewStep.edit' | translate }}</button>
                  </div>
                  <dd class="mt-1.5 text-[14px] text-ink">{{ form().address }}</dd>
                  @if (form().notes) { <dd class="mt-1 text-[12px] text-muted">{{ form().notes }}</dd> }
                </div>
                <div class="rounded-xl border border-line bg-surface-soft p-4">
                  <div class="flex items-center justify-between">
                    <dt class="text-[12px] font-semibold uppercase tracking-wide text-muted">{{ 'sell.concierge.reviewStep.whenSection' | translate }}</dt>
                    <button type="button" (click)="goToStep(1)" class="text-[12px] font-semibold text-brand-700 hover:text-brand-800">{{ 'sell.concierge.reviewStep.edit' | translate }}</button>
                  </div>
                  <dd class="mt-1.5 text-[14px] text-ink">{{ whenSummary() }}</dd>
                </div>
                <div class="rounded-xl border border-line bg-surface-soft p-4">
                  <div class="flex items-center justify-between">
                    <dt class="text-[12px] font-semibold uppercase tracking-wide text-muted">{{ 'sell.concierge.reviewStep.contactSection' | translate }}</dt>
                    <button type="button" (click)="goToStep(2)" class="text-[12px] font-semibold text-brand-700 hover:text-brand-800">{{ 'sell.concierge.reviewStep.edit' | translate }}</button>
                  </div>
                  <dd class="mt-1.5 text-[14px] text-ink">{{ form().fullName }} · +965 {{ form().mobile }}</dd>
                  @if (form().email) { <dd class="mt-1 text-[12px] text-muted">{{ form().email }}</dd> }
                </div>
              </dl>

              @if (submitError()) {
                <div class="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{{ submitError() }}</div>
              }
            }

            <!-- Wizard footer (back / continue / submit) -->
            <footer class="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
              <button type="button" (click)="prev()" [disabled]="step() === 1 || submitting()" class="inline-flex items-center gap-1.5 rounded-pill border border-line bg-white px-4 py-3.5 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="backArrow()" /></svg>
                {{ 'sell.concierge.back2' | translate }}
              </button>
              @if (step() < 3) {
                <button type="submit" class="inline-flex items-center gap-1.5 rounded-pill bg-brand-700 px-5 py-3.5 text-[13px] font-semibold text-white hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                  {{ 'sell.concierge.continue' | translate }}
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="arrowPath()" /></svg>
                </button>
              } @else {
                <button type="button" (click)="submit()" [disabled]="submitting()" class="inline-flex items-center gap-1.5 rounded-pill bg-brand-700 px-5 py-3.5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                  @if (submitting()) {
                    <svg viewBox="0 0 24 24" width="14" height="14" class="animate-spin" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                    {{ 'sell.concierge.reviewStep.submitting' | translate }}
                  } @else {
                    {{ 'sell.concierge.reviewStep.submit' | translate }}
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
                  }
                </button>
              }
            </footer>
          </form>
        }
      </div>
    </main>
  `,
  styles: [
    `
      .input {
        @apply h-11 w-full rounded-xl border border-line bg-surface-soft px-3 text-[14px] text-ink outline-none transition-colors focus:border-brand-500 focus:bg-white;
      }
      textarea.input {
        @apply min-h-[80px] py-2.5;
      }
    `,
  ],
})
export class SellConciergePageComponent implements OnInit {
  private readonly language = inject(LanguageService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly bookings = inject(SellBookingsService);
  private readonly state = inject(SellWizardStateService);

  readonly currentLocale = computed(() => this.language.current());
  readonly arrowPath = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));
  readonly backArrow = computed(() => (this.currentLocale() === 'ar' ? 'M10 6l6 6-6 6' : 'M14 6l-6 6 6 6'));

  readonly governorates = GOVERNORATES;
  readonly windows = WINDOWS;

  readonly step = signal<WizardStep>(1);
  readonly form = signal<FormState>({ ...EMPTY });
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly successResp = signal<CreateConciergeInspectionResponse | null>(null);
  readonly attemptedStep = signal<Set<WizardStep>>(new Set());

  /** Vehicle handed off from /sell/details via SellWizardStateService. */
  readonly vehicle = computed(() => this.state.vehicle());

  /* Date constraints — tomorrow → 14 days out */
  readonly minPreferredDate = isoDate(daysFromNow(1));
  readonly maxPreferredDate = isoDate(daysFromNow(14));

  ngOnInit(): void {
    /* GUARD: can't book without a vehicle — bounce to details. */
    if (!this.state.hasVehicle()) {
      this.router.navigate(['/', this.currentLocale(), 'sell', 'details']);
      return;
    }

    const set = () => {
      const t = this.translate.instant('sell.concierge.metaTitle');
      this.title.setTitle(t);
      this.meta.updateTag({ name: 'description', content: this.translate.instant('sell.concierge.sub') });
    };
    set();
    this.translate.onLangChange.subscribe(set);
  }

  stepLabelKey(n: number): string {
    switch (n) {
      case 1: return 'sell.concierge.steps.location';
      case 2: return 'sell.concierge.steps.contact';
      case 3: return 'sell.concierge.steps.review';
      default: return '';
    }
  }

  setWindow(w: PreferredWindow): void {
    this.form.update((f) => ({ ...f, window: w }));
  }

  capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  goToStep(n: WizardStep): void {
    this.step.set(n);
    this.submitError.set(null);
  }

  prev(): void {
    const s = this.step();
    if (s > 1) this.step.set((s - 1) as WizardStep);
    this.submitError.set(null);
  }

  next(): void {
    const cur = this.step();
    this.attemptedStep.update((s) => new Set(s).add(cur));
    if (!this.isStepValid(cur)) return;
    if (cur < 3) this.step.set((cur + 1) as WizardStep);
  }

  /* Step-level validators — only the fields visible on the current step. */
  isStepValid(s: WizardStep): boolean {
    const f = this.form();
    if (s === 1) {
      return f.address.trim().length >= 3;
    }
    if (s === 2) {
      const mobileOk = /^[569]\d{7}$/.test(f.mobile.replace(/\s/g, ''));
      const emailOk = !f.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
      return f.fullName.trim().length >= 2 && mobileOk && emailOk && f.consent;
    }
    return true;
  }

  showFieldError(field: keyof FormState): boolean {
    const f = this.form();
    if (!this.attemptedStep().has(this.step())) return false;
    switch (field) {
      case 'address': return f.address.trim().length < 3;
      case 'fullName': return f.fullName.trim().length < 2;
      case 'mobile': return !/^[569]\d{7}$/.test(f.mobile.replace(/\s/g, ''));
      case 'email': return !!f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
      case 'consent': return !f.consent;
      default: return false;
    }
  }

  /** Used by `aria-invalid` / `aria-describedby`. Alias of `showFieldError`. */
  hasError(field: keyof FormState): boolean {
    return this.showFieldError(field);
  }

  vehicleSummary(): string {
    const v = this.vehicle();
    if (!v) return '';
    const km = `${v.mileageKm.toLocaleString()} km`;
    const price = v.askingPriceKwd
      ? ` · ${this.translate.instant('sell.concierge.suggestedShort')} KWD ${v.askingPriceKwd.toLocaleString()}`
      : '';
    return `${v.year} ${v.brandName} ${v.model}${v.trim ? ' ' + v.trim : ''} · ${km}${price}`.trim();
  }

  whenSummary(): string {
    const f = this.form();
    if (!f.preferredDate && !f.window) return '—';
    const w = f.window ? this.translate.instant('sell.concierge.location.window' + this.capitalize(f.window)) : '';
    return `${f.preferredDate}${w ? ' · ' + w : ''}`;
  }

  submit(): void {
    this.attemptedStep.update((s) => new Set(s).add(3));
    /* Re-validate every step before sending. */
    if (!this.isStepValid(1) || !this.isStepValid(2)) {
      this.submitError.set(this.translate.instant('sell.concierge.validation.required'));
      return;
    }
    const dto = this.toDto();
    if (!dto) {
      /* Lost the vehicle mid-flow (unlikely but possible). */
      this.router.navigate(['/', this.currentLocale(), 'sell', 'details']);
      return;
    }
    /* Final Zod parse on the client — catches any drift between the form
       constraints and the shared schema. */
    const parsed = CreateConciergeInspectionSchema.safeParse(dto);
    if (!parsed.success) {
      this.submitError.set(parsed.error.issues[0]?.message ?? 'Invalid form data');
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    this.bookings.bookConcierge$(parsed.data).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.kind === 'ok') {
          /* Clear shared state — a fresh flow should start clean — then
             hand off to the booking-status tracker. replaceUrl so back-button
             from the tracker doesn't re-trigger the wizard's POST. */
          this.state.clear();
          this.router.navigate(
            ['/', this.currentLocale(), 'sell', 'concierge', 'status', res.data.bookingRef],
            { replaceUrl: true },
          );
        } else if (res.kind === 'pending') {
          this.submitError.set(this.translate.instant('sell.concierge.reviewStep.endpointPending'));
        } else {
          this.submitError.set(this.translate.instant('sell.concierge.reviewStep.submitError'));
        }
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set(this.translate.instant('sell.concierge.reviewStep.submitError'));
      },
    });
  }

  private toDto(): CreateConciergeInspectionDto | null {
    const v: VehicleDetails | null = this.vehicle();
    if (!v) return null;
    const f = this.form();
    return {
      kind: 'concierge',
      customer: {
        fullName: f.fullName.trim(),
        mobile: f.mobile.replace(/\s/g, ''),
        email: f.email ? f.email.trim() : undefined,
      },
      vehicle: {
        year: v.year,
        brandName: v.brandName,
        modelName: v.model.trim(),
        mileageKm: v.mileageKm,
      },
      location: {
        address: f.address.trim(),
        governorate: f.governorate || undefined,
      },
      customerPreference:
        f.preferredDate && f.window
          ? { preferredDate: f.preferredDate, window: f.window }
          : undefined,
      notes: f.notes.trim() || undefined,
      customerDeclared: v.trim
        ? {
            trim: v.trim.trim() || undefined,
          }
        : undefined,
    };
  }
}

function daysFromNow(d: number): Date {
  const t = new Date();
  t.setUTCDate(t.getUTCDate() + d);
  return t;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
