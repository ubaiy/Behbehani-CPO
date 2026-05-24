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
import { ConciergeStep1LocationComponent } from './concierge/step1-location.component';
import { ConciergeStep2ContactComponent, type ContactFields } from './concierge/step2-contact.component';
import { ConciergeStep3ReviewComponent } from './concierge/step3-review.component';
import { ConciergeSuccessCardComponent } from './concierge/success-card.component';
import type { Governorate as AddrGovernorate } from '../../data/address-suggestion.service';

/* ─── Form-state shape (UI-friendly; mapped to the DTO on submit) ────────── */

type WizardStep = 1 | 2 | 3;
type Governorate =
  | 'capital' | 'hawalli' | 'farwaniya' | 'mubarakAlKabeer' | 'ahmadi' | 'jahra';

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
  address: '', governorate: '', notes: '', preferredDate: '', window: '',
  fullName: '', mobile: '', email: '', consent: false,
};

@Component({
  selector: 'app-sell-concierge-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    ConciergeStep1LocationComponent,
    ConciergeStep2ContactComponent,
    ConciergeStep3ReviewComponent,
    ConciergeSuccessCardComponent,
  ],
  template: `
    <!-- BACK LINK (above hero) -->
    <div class="container-page pt-6">
      <div class="mx-auto max-w-4xl">
        <a
          [routerLink]="['/', currentLocale(), 'sell', 'choose']"
          class="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-900 hover:underline"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="backArrow()" /></svg>
          {{ 'sell.concierge.back' | translate }}
        </a>
      </div>
    </div>

    <!-- HERO (canonical rounded-3xl card with brand gradient) -->
    <div class="container-page py-6 mx-auto max-w-4xl">
      <div
        class="rounded-3xl p-6 sm:p-8 text-white"
        style="background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%);"
      >
        <div class="inline-flex items-center gap-2 rounded-pill bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>
          {{ 'sell.concierge.badge' | translate }}
        </div>
        <h1 class="mt-3 font-display text-[clamp(24px,3vw,38px)] font-extrabold leading-tight tracking-[-0.025em] text-white">
          {{ heroTitleKey() | translate }}
        </h1>
        <p class="mt-2 max-w-xl text-[14px] text-white/80 sm:text-[15px]">{{ heroSubKey() | translate }}</p>

        <!-- Trust strip — brand-locked white check icons (NOT emerald) -->
        <div class="mt-5 flex flex-wrap gap-2 text-[12px] font-semibold">
          @for (key of trustKeys; track key) {
            <span class="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1.5 backdrop-blur text-white">
              <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" class="text-white" aria-hidden="true"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
              {{ key | translate }}
            </span>
          }
        </div>

        <!-- Stepper -->
        @if (!successResp()) {
          <div class="mt-6">
            <div class="text-[12px] font-semibold text-white/70">
              {{ 'sell.concierge.stepCount' | translate: { current: step(), total: 3 } }}
            </div>
            <nav [attr.aria-label]="'sell.concierge.stepsNav' | translate">
              <ol class="mt-2 flex flex-wrap gap-2 sm:gap-3">
                @for (n of [1, 2, 3]; track n) {
                  <li
                    [attr.aria-current]="step() === n ? 'step' : null"
                    [class]="stepPillClass(n)"
                  >
                    <span [class]="stepBadgeClass(n)">
                      @if (step() > n) {
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
                      } @else { {{ n }} }
                    </span>
                    <span class="text-[12px] font-semibold">{{ stepLabelKey(n) | translate }}</span>
                  </li>
                }
              </ol>
            </nav>
          </div>
        }
      </div>
    </div>

    <main class="bg-surface-soft">
      <div class="container-page py-8 sm:py-12 max-w-3xl mx-auto">
        @if (successResp(); as r) {
          <app-concierge-success-card
            [customerName]="r.customerFullName"
            [bookingRef]="r.bookingRef"
            [locale]="currentLocale()"
            [arrowPath]="arrowPath()"
          />
        } @else {
          <!-- WIZARD -->
          <form (ngSubmit)="next()" novalidate>
            <!-- Vehicle preview -->
            @if (vehicle(); as v) {
              <div class="mb-5 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                <span class="inline-grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-brand-sm">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 16l1.5-4h11L19 16M5 16h14v3H5zM7 19v2M17 19v2"/></svg>
                </span>
                <div class="min-w-0 flex-1">
                  <div class="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{{ 'sell.concierge.yourCar' | translate }}</div>
                  <div class="mt-0.5 text-[14px] font-semibold text-ink">{{ vehicleSummary() }}</div>
                </div>
                <a [routerLink]="['/', currentLocale(), 'sell', 'details']" class="flex-shrink-0 text-[12px] font-semibold text-brand-700 hover:text-brand-800">{{ 'sell.concierge.editCar' | translate }}</a>
              </div>
            }

            @if (step() === 1) {
              <app-concierge-step1-location
                [address]="form().address"
                [governorate]="form().governorate"
                [notes]="form().notes"
                [preferredDate]="form().preferredDate"
                [window]="form().window"
                [locale]="currentLocale()"
                [showAddressError]="showFieldError('address')"
                (addressChange)="onAddressChange($event)"
                (clearAddress)="clearAddress()"
                (notesChange)="patch({ notes: $event })"
                (dateChange)="patch({ preferredDate: $event })"
                (windowChange)="patch({ window: $event })"
              />
            }

            @if (step() === 2) {
              <app-concierge-step2-contact
                [fields]="contactFields()"
                [errors]="contactErrors()"
                (patch)="patch($event)"
              />
            }

            @if (step() === 3) {
              <app-concierge-step3-review
                [vehicleText]="vehicleSummary()"
                [locationText]="locationSummary()"
                [whenText]="whenSummary()"
                [contactText]="contactSummary()"
                [locale]="currentLocale()"
                (edit)="goToStep($event)"
              />
              @if (submitError()) {
                <div class="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{{ submitError() }}</div>
              }
            }

            <!-- Footer (back / continue / submit) -->
            <div class="flex items-center justify-between gap-3 mt-6">
              @if (step() > 1) {
                <button type="button" (click)="prev()" [disabled]="submitting()" class="text-[13px] font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                  ← {{ 'sell.concierge.back2' | translate }}
                </button>
              } @else {
                <span></span>
              }
              @if (step() < 3) {
                <button type="submit" class="inline-flex items-center gap-2 rounded-pill bg-brand-700 px-6 py-3.5 text-[14px] font-bold text-white hover:bg-brand-800 shadow-brand focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                  {{ continueLabel() | translate }}
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="arrowPath()" /></svg>
                </button>
              } @else {
                <button type="button" (click)="submit()" [disabled]="submitting()" class="inline-flex items-center gap-2 rounded-pill bg-brand-700 px-7 py-4 text-[15px] font-bold text-white hover:bg-brand-800 shadow-brand disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                  @if (submitting()) {
                    <svg viewBox="0 0 24 24" width="14" height="14" class="animate-spin" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                    {{ 'sell.concierge.reviewStep.submitting' | translate }}
                  } @else {
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
                    {{ 'sell.concierge.reviewStep.submit' | translate }}
                  }
                </button>
              }
            </div>

            @if (step() === 3) {
              <p class="mt-4 text-center text-[11px] text-muted">{{ 'sell.concierge.reviewStep.footnote' | translate }}</p>
            }
          </form>
        }
      </div>
    </main>
  `,
})
export class SellConciergePageComponent implements OnInit {
  private readonly language = inject(LanguageService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly bookings = inject(SellBookingsService);
  private readonly state = inject(SellWizardStateService);

  readonly currentLocale = computed(() => this.language.current() as 'en' | 'ar');
  readonly arrowPath = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));
  readonly backArrow = computed(() => (this.currentLocale() === 'ar' ? 'M10 6l6 6-6 6' : 'M14 6l-6 6 6 6'));

  readonly trustKeys = [
    'sell.concierge.hero.trustFree',
    'sell.concierge.hero.trustInspect',
    'sell.concierge.hero.trustOffer',
  ];

  readonly step = signal<WizardStep>(1);
  readonly form = signal<FormState>({ ...EMPTY });
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly successResp = signal<CreateConciergeInspectionResponse | null>(null);
  readonly attemptedStep = signal<Set<WizardStep>>(new Set());

  readonly vehicle = computed(() => this.state.vehicle());

  readonly heroTitleKey = computed(() => {
    if (this.step() === 2) return 'sell.concierge.contact.title2';
    if (this.step() === 3) return 'sell.concierge.reviewStep.title2';
    return 'sell.concierge.title';
  });
  readonly heroSubKey = computed(() => {
    if (this.step() === 2) return 'sell.concierge.contact.sub2';
    if (this.step() === 3) return 'sell.concierge.reviewStep.sub2';
    return 'sell.concierge.sub';
  });
  readonly continueLabel = computed(() =>
    this.step() === 2 ? 'sell.concierge.continueReview' : 'sell.concierge.continue',
  );

  /* Step 2 — projections fed into the child component */
  readonly contactFields = computed<ContactFields>(() => {
    const f = this.form();
    return { fullName: f.fullName, mobile: f.mobile, email: f.email, consent: f.consent };
  });

  readonly contactErrors = computed(() => ({
    fullName: this.showFieldError('fullName'),
    mobile: this.showFieldError('mobile'),
    email: this.showFieldError('email'),
    consent: this.showFieldError('consent'),
  }));

  ngOnInit(): void {
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

  stepPillClass(n: number): string {
    const base = 'flex flex-1 min-w-[120px] items-center gap-2 rounded-xl px-3 py-2 transition-colors';
    return this.step() === n
      ? `${base} bg-white text-brand-700 shadow-brand-sm`
      : `${base} border border-white/30 text-white bg-white/10 backdrop-blur-sm`;
  }

  stepBadgeClass(n: number): string {
    const base = 'inline-grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold';
    return this.step() === n
      ? `${base} bg-brand-700 text-white`
      : `${base} bg-white/30 text-white`;
  }

  capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

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

  /* Address-autocomplete + generic patch */
  onAddressChange(e: { formatted: string; governorate: AddrGovernorate | '' }): void {
    this.form.update((f) => ({
      ...f,
      address: e.formatted,
      governorate: e.governorate as Governorate | '',
    }));
  }

  clearAddress(): void {
    this.form.update((f) => ({ ...f, address: '', governorate: '' }));
  }

  patch(p: Partial<FormState>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  /* Validation */
  isStepValid(s: WizardStep): boolean {
    const f = this.form();
    if (s === 1) return f.address.trim().length >= 3;
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

  /* Summaries */
  vehicleSummary(): string {
    const v = this.vehicle();
    if (!v) return '';
    const km = `${v.mileageKm.toLocaleString()} km`;
    const price = v.askingPriceKwd
      ? ` · ${this.translate.instant('sell.concierge.suggestedShort')} KWD ${v.askingPriceKwd.toLocaleString()}`
      : '';
    return `${v.year} ${v.brandName} ${v.model}${v.trim ? ' ' + v.trim : ''} · ${km}${price}`.trim();
  }

  locationSummary(): string {
    const f = this.form();
    if (!f.address) return '—';
    const gov = f.governorate
      ? ` · ${this.translate.instant('sell.concierge.governorates.' + f.governorate)}`
      : '';
    return `${f.address}${gov}`;
  }

  whenSummary(): string {
    const f = this.form();
    if (!f.preferredDate && !f.window) return '—';
    const w = f.window ? this.translate.instant('sell.concierge.location.window' + this.capitalize(f.window)) : '';
    return `${f.preferredDate}${w ? ' · ' + w : ''}`;
  }

  contactSummary(): string {
    const f = this.form();
    if (!f.fullName && !f.mobile) return '—';
    return `${f.fullName} · +965 ${f.mobile}`;
  }

  submit(): void {
    this.attemptedStep.update((s) => new Set(s).add(3));
    if (!this.isStepValid(1) || !this.isStepValid(2)) {
      this.submitError.set(this.translate.instant('sell.concierge.validation.required'));
      return;
    }
    const dto = this.toDto();
    if (!dto) {
      this.router.navigate(['/', this.currentLocale(), 'sell', 'details']);
      return;
    }
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
      customerDeclared: v.trim ? { trim: v.trim.trim() || undefined } : undefined,
    };
  }
}

