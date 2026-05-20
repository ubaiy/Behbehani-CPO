import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@behbehani-cpo/data-access';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { SignUpModalService } from './sign-up-modal.service';
import { SignInModalService } from './sign-in-modal.service';
import { OtpStepComponent } from './otp-step.component';
import type { AuthSession, PublicUser } from '@behbehani-cpo/shared-types';

type Step = 'form' | 'otp' | 'created' | 'upgraded';

@Component({
  selector: 'app-sign-up-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslateModule, OtpStepComponent],
  template: `
    @if (modal.isOpen()) {
      <div
        class="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-slide-up-fade"
        (click)="onBackdrop($event)"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        [attr.aria-label]="'auth.signUp.v2.heading' | translate"
      >
        <div class="relative w-full max-w-[460px] rounded-[20px] bg-white p-6 shadow-brand-lg sm:p-9 max-h-[90dvh] overflow-y-auto">

          <!-- Close -->
          <button
            type="button"
            (click)="close()"
            class="absolute end-4 top-4 inline-grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-cool hover:text-ink"
            [attr.aria-label]="'auth.close' | translate"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M6 6l12 12M6 18L18 6"/>
            </svg>
          </button>

          <!-- Logo -->
          <div class="mb-5 inline-flex items-center">
            <img src="assets/bm/logo.png" [alt]="'app.company' | translate" class="h-10 w-auto sm:h-12" />
          </div>

          <!-- ── STEP: form ─────────────────────────────────────────── -->
          @if (step() === 'form') {
            <h2 class="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
              {{ 'auth.signUp.v2.heading' | translate }}
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-muted">{{ 'auth.signUp.v2.sub' | translate }}</p>

            <div class="mt-5 space-y-4">
              <!-- Full name -->
              <label class="block">
                <span class="mb-1.5 block text-[13px] font-medium text-ink-2">{{ 'auth.signUp.v2.fullName' | translate }}</span>
                <input
                  type="text"
                  autocomplete="name"
                  [ngModel]="fullName()"
                  (ngModelChange)="fullName.set($event)"
                  [placeholder]="'auth.signUp.v2.fullNamePlaceholder' | translate"
                  class="block w-full rounded-lg border-[1.5px] border-line bg-white px-3.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-brand-700 min-h-[44px]"
                />
              </label>

              <!-- Mobile -->
              <label class="block">
                <span class="mb-1.5 block text-[13px] font-medium text-ink-2">{{ 'auth.signUp.v2.mobile' | translate }}</span>
                <div class="flex items-stretch overflow-hidden rounded-lg border-[1.5px] border-line transition-colors focus-within:border-brand-700">
                  <span class="inline-flex items-center min-h-[44px] bg-surface-cool px-3.5 text-sm font-semibold text-ink-2 border-e border-line">+965</span>
                  <input
                    type="tel"
                    inputmode="numeric"
                    autocomplete="tel-national"
                    [ngModel]="mobile()"
                    (ngModelChange)="mobile.set($event)"
                    placeholder="9999 1234"
                    class="flex-1 border-0 px-3.5 py-3 text-sm text-ink outline-none placeholder:text-muted-2 min-h-[44px]"
                  />
                </div>
                <p class="mt-1.5 text-[12px] text-muted">{{ 'auth.signUp.v2.mobileHint' | translate }}</p>
              </label>

              <!-- Email (optional) -->
              <label class="block">
                <span class="mb-1.5 block text-[13px] font-medium text-ink-2">
                  {{ 'auth.signUp.v2.email' | translate }}
                  <span class="text-muted-2 font-normal">({{ 'auth.signUp.v2.optional' | translate }})</span>
                </span>
                <input
                  type="email"
                  autocomplete="email"
                  [ngModel]="email()"
                  (ngModelChange)="email.set($event)"
                  placeholder="you@example.com"
                  class="block w-full rounded-lg border-[1.5px] border-line bg-white px-3.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-brand-700 min-h-[44px]"
                />
              </label>

              <!-- Password -->
              <label class="block">
                <span class="mb-1.5 block text-[13px] font-medium text-ink-2">{{ 'auth.signUp.v2.password' | translate }}</span>
                <div class="flex items-stretch overflow-hidden rounded-lg border-[1.5px] border-line transition-colors focus-within:border-brand-700">
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    autocomplete="new-password"
                    [ngModel]="password()"
                    (ngModelChange)="password.set($event)"
                    [placeholder]="'auth.signUp.v2.passwordPlaceholder' | translate"
                    class="flex-1 border-0 px-3.5 py-3 text-sm text-ink outline-none placeholder:text-muted-2 min-h-[44px]"
                  />
                  <button
                    type="button"
                    (click)="showPassword.update(v => !v)"
                    class="px-3.5 text-muted hover:text-ink"
                    [attr.aria-label]="showPassword() ? ('auth.hidePassword' | translate) : ('auth.showPassword' | translate)"
                  >
                    @if (showPassword()) {
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    } @else {
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    }
                  </button>
                </div>
                <!-- Strength bar -->
                @if (password().length > 0) {
                  <div class="mt-2 flex gap-1">
                    @for (seg of strengthSegments(); track $index) {
                      <div class="h-1 flex-1 rounded-full" [class]="seg"></div>
                    }
                  </div>
                  <p class="mt-1 text-[12px]" [class]="strengthLabel().color">{{ strengthLabel().text | translate }}</p>
                }
              </label>

              <!-- Confirm password -->
              <label class="block">
                <span class="mb-1.5 block text-[13px] font-medium text-ink-2">{{ 'auth.signUp.v2.confirmPassword' | translate }}</span>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  autocomplete="new-password"
                  [ngModel]="confirmPassword()"
                  (ngModelChange)="confirmPassword.set($event)"
                  [placeholder]="'auth.signUp.v2.confirmPasswordPlaceholder' | translate"
                  class="block w-full rounded-lg border-[1.5px] border-line bg-white px-3.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-brand-700 min-h-[44px]"
                  [class.border-red-500]="confirmPassword().length > 0 && confirmPassword() !== password()"
                />
              </label>

              <!-- Terms -->
              <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-soft p-3 hover:bg-white min-h-[44px]">
                <input
                  type="checkbox"
                  [ngModel]="termsAccepted()"
                  (ngModelChange)="termsAccepted.set($event)"
                  class="mt-1 h-4 w-4 flex-shrink-0 rounded border-line accent-brand-700"
                />
                <span class="text-[13px] leading-relaxed text-ink-2">
                  {{ 'auth.signUp.v2.termsPrefix' | translate }}
                  <a href="/en/legal/terms" target="_blank" class="font-semibold text-brand-700 hover:underline">{{ 'auth.signUp.v2.terms' | translate }}</a>
                  {{ 'auth.signUp.v2.and' | translate }}
                  <a href="/en/legal/privacy" target="_blank" class="font-semibold text-brand-700 hover:underline">{{ 'auth.signUp.v2.privacy' | translate }}</a>.
                </span>
              </label>
            </div>

            <!-- Error -->
            @if (error()) {
              <div class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                <p>{{ error() }}</p>
                @if (showSignInLink()) {
                  <button type="button" (click)="switchToSignIn()" class="mt-1 font-semibold underline">
                    {{ 'auth.signUp.v2.signInInstead' | translate }}
                  </button>
                }
              </div>
            }

            <!-- Submit -->
            <button
              type="button"
              (click)="submitForm()"
              [disabled]="submitting() || !canSubmit()"
              class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-6 py-3.5 text-[15px] font-bold text-white shadow-brand transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
            >
              @if (submitting()) {
                <svg class="animate-spin" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                <span>{{ 'auth.signUp.v2.submitting' | translate }}</span>
              } @else {
                <span>{{ 'auth.signUp.v2.submit' | translate }}</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                  <path [attr.d]="isRtl() ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'"/>
                </svg>
              }
            </button>

            <!-- Divider -->
            <div class="relative my-5 text-center text-xs text-muted">
              <span class="absolute inset-x-0 top-1/2 -z-10 h-px bg-line"></span>
              <span class="bg-white px-3">{{ 'auth.signUp.v2.divider' | translate }}</span>
            </div>

            <!-- OAuth row -->
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled
                title="Coming soon"
                class="relative inline-flex items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-line bg-white px-2 py-3 text-[13px] font-medium text-ink-2 cursor-not-allowed min-h-[44px]"
                [attr.aria-label]="'auth.social.googleComingSoon' | translate"
              >
                <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.32z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"/>
                </svg>
                <span>{{ 'auth.social.google' | translate }}</span>
                <span class="absolute -top-2 -end-1 text-[9px] bg-surface-cool text-muted px-1.5 py-0.5 rounded-full">soon</span>
              </button>
              <button
                type="button"
                disabled
                class="relative inline-flex items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-line bg-white px-2 py-3 text-[13px] font-medium text-muted-2 cursor-not-allowed min-h-[44px]"
                [attr.aria-label]="'auth.social.appleComingSoon' | translate"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#94A3B8" aria-hidden="true">
                  <path d="M17.6 12.6c0-3 2.5-4.5 2.6-4.5-1.4-2.1-3.6-2.4-4.4-2.4-1.9-.2-3.6 1.1-4.6 1.1-1 0-2.4-1.1-4-1-2 0-3.9 1.2-5 3-2.1 3.7-.5 9.1 1.5 12.1 1 1.5 2.2 3.1 3.8 3.1 1.5-.1 2.1-1 3.9-1 1.8 0 2.4 1 4 1 1.6 0 2.7-1.5 3.7-3 1.2-1.7 1.6-3.4 1.7-3.5-.1 0-3.2-1.2-3.2-4.9zM14.6 3.7c.8-1 1.4-2.4 1.2-3.7-1.2.1-2.6.8-3.5 1.8-.8.9-1.5 2.3-1.3 3.6 1.3.1 2.7-.7 3.6-1.7z"/>
                </svg>
                <span>{{ 'auth.social.apple' | translate }}</span>
                <span class="absolute -top-2 -end-1 text-[9px] bg-surface-cool text-muted px-1.5 py-0.5 rounded-full">soon</span>
              </button>
              <button
                type="button"
                disabled
                class="relative inline-flex items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-line bg-white px-2 py-3 text-[13px] font-medium text-muted-2 cursor-not-allowed min-h-[44px]"
                [attr.aria-label]="'auth.social.facebookComingSoon' | translate"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#94A3B8" aria-hidden="true">
                  <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>
                </svg>
                <span>{{ 'auth.social.facebook' | translate }}</span>
                <span class="absolute -top-2 -end-1 text-[9px] bg-surface-cool text-muted px-1.5 py-0.5 rounded-full">soon</span>
              </button>
            </div>

            <p class="mt-6 text-center text-[13px] text-muted">
              {{ 'auth.signUp.v2.haveAccount' | translate }}
              <button
                type="button"
                (click)="switchToSignIn()"
                class="font-semibold text-brand-700 hover:text-brand-800 ps-1 min-h-[44px]"
              >
                {{ 'auth.signUp.v2.signInLink' | translate }}
              </button>
            </p>
          } <!-- end form step -->

          <!-- ── STEP: otp ──────────────────────────────────────────── -->
          @if (step() === 'otp') {
            <app-otp-step
              [identifier]="otpIdentifier()"
              channel="sms"
              purpose="registration"
              (success)="onOtpSuccess($event)"
              (cancel)="step.set('form')"
            />
          }

          <!-- ── STEP: created ──────────────────────────────────────── -->
          @if (step() === 'created') {
            <div class="text-center py-4">
              <div class="inline-grid h-16 w-16 place-items-center rounded-full bg-brand-700 text-white mx-auto">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h2 class="mt-5 font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink">
                {{ 'auth.created.title' | translate }}
              </h2>
              <p class="mt-2 text-sm leading-relaxed text-muted">{{ 'auth.created.body' | translate }}</p>
              <button
                type="button"
                (click)="goToBookings()"
                class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-6 py-3.5 text-[15px] font-bold text-white shadow-brand transition-colors hover:bg-brand-800 min-h-[44px]"
              >
                {{ 'auth.created.cta' | translate }}
              </button>
            </div>
          }

          <!-- ── STEP: upgraded ─────────────────────────────────────── -->
          @if (step() === 'upgraded') {
            <div class="text-center py-4">
              <div class="inline-grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-700 mx-auto">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
              </div>
              <h2 class="mt-5 font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink">
                {{ 'auth.ghostUpgrade.title' | translate }}
              </h2>
              <p class="mt-2 text-sm leading-relaxed text-muted">{{ 'auth.ghostUpgrade.body' | translate }}</p>
              <button
                type="button"
                (click)="goToBookings()"
                class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-6 py-3.5 text-[15px] font-bold text-white shadow-brand transition-colors hover:bg-brand-800 min-h-[44px]"
              >
                {{ 'auth.ghostUpgrade.cta' | translate }}
              </button>
            </div>
          }

        </div>
      </div>
    }
  `,
})
export class SignUpModalComponent {
  readonly modal = inject(SignUpModalService);
  private readonly signInModal = inject(SignInModalService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isRtl = computed(() => this.language.current() === 'ar');

  // Step machine
  readonly step = signal<Step>('form');

  // Form state
  readonly fullName = signal('');
  readonly mobile = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly termsAccepted = signal(false);
  readonly showPassword = signal(false);

  // Submission state
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly showSignInLink = signal(false);
  readonly otpIdentifier = signal('');

  readonly canSubmit = computed(() => {
    if (this.submitting()) return false;
    if (this.fullName().trim().length < 2) return false;
    if (this.mobile().trim().length < 4) return false;
    if (this.password().length < 8) return false;
    if (this.password() !== this.confirmPassword()) return false;
    if (!this.termsAccepted()) return false;
    return true;
  });

  readonly strengthScore = computed(() => {
    const p = this.password();
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  });

  readonly strengthSegments = computed(() => {
    const score = this.strengthScore();
    return [0, 1, 2, 3].map(i =>
      i < score
        ? score <= 1 ? 'bg-red-400' : score === 2 ? 'bg-brand-200' : score === 3 ? 'bg-brand-500' : 'bg-brand-700'
        : 'bg-line'
    );
  });

  readonly strengthLabel = computed(() => {
    const score = this.strengthScore();
    if (score <= 1) return { text: 'auth.signUp.v2.passwordWeak', color: 'text-red-600 font-medium' };
    if (score === 2) return { text: 'auth.signUp.v2.passwordFair', color: 'text-brand-700 font-medium' };
    if (score === 3) return { text: 'auth.signUp.v2.passwordGood', color: 'text-brand-700 font-medium' };
    return { text: 'auth.signUp.v2.passwordStrong', color: 'text-brand-700 font-medium' };
  });

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      document.body.style.overflow = this.modal.isOpen() ? 'hidden' : '';
    });
  }

  close(): void { this.modal.close(); this.resetState(); }
  onBackdrop(e: MouseEvent): void { if (e.target === e.currentTarget) this.close(); }
  @HostListener('document:keydown.escape') onEscape(): void { if (this.modal.isOpen()) this.close(); }
  switchToSignIn(): void { this.modal.close(); this.signInModal.open(); }
  goToBookings(): void { this.modal.close(); void this.router.navigate(['/', this.language.current(), 'my-bookings']); }

  submitForm(): void {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.showSignInLink.set(false);

    const mobile = `+965${this.mobile().replace(/\s+/g, '')}`;
    this.otpIdentifier.set(mobile);

    this.auth.issueOtp(mobile, 'sms', 'registration').subscribe((result) => {
      this.submitting.set(false);
      if (result.kind === 'ok') {
        this.step.set('otp');
      } else if (result.kind === 'rate_limited') {
        this.error.set('auth.otp.errors.rateLimited');
      } else {
        this.error.set('auth.otp.errors.networkError');
      }
    });
  }

  onOtpSuccess(_result: { session: AuthSession; user: PublicUser }): void {
    this.auth.signUp({
      fullName: this.fullName().trim(),
      mobile: this.otpIdentifier(),
      email: this.email().trim() || undefined,
      password: this.password(),
    }).subscribe({
      next: (res) => {
        const kind = (res as unknown as { kind?: string }).kind;
        this.step.set(kind === 'upgraded' ? 'upgraded' : 'created');
      },
      error: () => this.step.set('created'),
    });
  }

  private resetState(): void {
    this.step.set('form'); this.fullName.set(''); this.mobile.set(''); this.email.set('');
    this.password.set(''); this.confirmPassword.set(''); this.termsAccepted.set(false);
    this.showPassword.set(false); this.submitting.set(false); this.error.set(null);
    this.showSignInLink.set(false); this.otpIdentifier.set('');
  }
}
