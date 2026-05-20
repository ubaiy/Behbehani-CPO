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
import { SignInModalService } from './sign-in-modal.service';
import { SignUpModalService } from './sign-up-modal.service';
import { OtpStepComponent } from './otp-step.component';
import type { AuthSession, PublicUser } from '@behbehani-cpo/shared-types';

type ActiveTab = 'password' | 'otp';
type IdentifierType = 'mobile' | 'email';

@Component({
  selector: 'app-sign-in-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslateModule, OtpStepComponent],
  template: `
    @if (modal.isOpen()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-slide-up-fade"
        (click)="onBackdrop($event)" role="dialog" aria-modal="true" tabindex="-1"
        [attr.aria-label]="'auth.signIn.v2.heading' | translate">
        <div class="relative w-full max-w-[460px] rounded-[20px] bg-white p-6 shadow-brand-lg sm:p-9 max-h-[90dvh] overflow-y-auto">

          <button type="button" (click)="close()" [attr.aria-label]="'auth.close' | translate"
            class="absolute end-4 top-4 inline-grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-cool hover:text-ink">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>

          <div class="mb-5 inline-flex items-center">
            <img src="assets/bm/logo.png" [alt]="'app.company' | translate" class="h-10 w-auto sm:h-12" />
          </div>

          <h2 class="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">{{ 'auth.signIn.v2.heading' | translate }}</h2>
          <p class="mt-2 text-sm leading-relaxed text-muted">{{ 'auth.signIn.v2.sub' | translate }}</p>

          @if (showOtpStep()) {
            <app-otp-step [identifier]="otpIdentifier()" [channel]="otpChannel()" purpose="signin"
              (success)="onOtpSuccess($event)" (cancel)="cancelOtpStep()"/>
          } @else {
            <div class="mt-6 flex gap-1 rounded-lg bg-surface-cool p-1" role="tablist">
              <button type="button" role="tab" [attr.aria-selected]="activeTab()==='password'" (click)="setTab('password')"
                class="flex-1 rounded-md py-2.5 text-sm font-medium transition-colors min-h-[44px]"
                [class.bg-white]="activeTab()==='password'" [class.text-ink]="activeTab()==='password'"
                [class.shadow-brand-sm]="activeTab()==='password'" [class.font-semibold]="activeTab()==='password'"
                [class.text-muted]="activeTab()!=='password'">{{ 'auth.signIn.v2.tabs.password' | translate }}</button>
              <button type="button" role="tab" [attr.aria-selected]="activeTab()==='otp'" (click)="setTab('otp')"
                class="flex-1 rounded-md py-2.5 text-sm font-medium transition-colors min-h-[44px]"
                [class.bg-white]="activeTab()==='otp'" [class.text-ink]="activeTab()==='otp'"
                [class.shadow-brand-sm]="activeTab()==='otp'" [class.font-semibold]="activeTab()==='otp'"
                [class.text-muted]="activeTab()!=='otp'">{{ 'auth.signIn.v2.tabs.otp' | translate }}</button>
            </div>

            @if (activeTab() === 'password') {
              <div class="mt-5 flex gap-3 text-[12px] font-semibold">
                <button type="button" (click)="setIdentifierType('mobile')"
                  class="flex items-center gap-1.5 pb-1 min-h-[44px]"
                  [class.text-brand-700]="identifierType()==='mobile'" [class.border-b-2]="identifierType()==='mobile'"
                  [class.border-brand-700]="identifierType()==='mobile'" [class.text-muted]="identifierType()!=='mobile'">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.34 1.9.66 2.81a2 2 0 01-.45 2.11L8 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.32 1.85.54 2.81.66A2 2 0 0122 16.92z"/></svg>
                  {{ 'auth.signIn.v2.mobileTab' | translate }}</button>
                <button type="button" (click)="setIdentifierType('email')"
                  class="flex items-center gap-1.5 pb-1 min-h-[44px]"
                  [class.text-brand-700]="identifierType()==='email'" [class.border-b-2]="identifierType()==='email'"
                  [class.border-brand-700]="identifierType()==='email'" [class.text-muted]="identifierType()!=='email'">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                  {{ 'auth.signIn.v2.emailTab' | translate }}</button>
              </div>

              @if (identifierType() === 'mobile') {
                <label class="mt-3 block">
                  <span class="mb-1.5 block text-[13px] font-medium text-ink-2">{{ 'auth.signIn.v2.mobileTab' | translate }}</span>
                  <div class="flex items-stretch overflow-hidden rounded-lg border-[1.5px] border-line transition-colors focus-within:border-brand-700">
                    <span class="inline-flex items-center min-h-[44px] bg-surface-cool px-3.5 text-sm font-semibold text-ink-2 border-e border-line">+965</span>
                    <input type="tel" inputmode="numeric" autocomplete="tel-national" [ngModel]="mobile()" (ngModelChange)="mobile.set($event)"
                      [placeholder]="'auth.signIn.v2.mobilePlaceholder' | translate"
                      class="flex-1 border-0 px-3.5 py-3 text-sm text-ink outline-none placeholder:text-muted-2 min-h-[44px]"/>
                  </div>
                </label>
              } @else {
                <label class="mt-3 block">
                  <span class="mb-1.5 block text-[13px] font-medium text-ink-2">{{ 'auth.signIn.v2.emailTab' | translate }}</span>
                  <input type="email" autocomplete="email" [ngModel]="email()" (ngModelChange)="email.set($event)"
                    [placeholder]="'auth.signIn.v2.identifierPlaceholder' | translate"
                    class="block w-full rounded-lg border-[1.5px] border-line bg-white px-3.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-brand-700 min-h-[44px]"/>
                </label>
              }

              <label class="mt-3 block">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-[13px] font-medium text-ink-2">{{ 'auth.signIn.v2.passwordLabel' | translate }}</span>
                  <a href="#" class="text-[12px] font-semibold text-brand-700 hover:text-brand-800">{{ 'auth.signIn.v2.forgot' | translate }}</a>
                </div>
                <div class="flex items-stretch overflow-hidden rounded-lg border-[1.5px] border-line transition-colors focus-within:border-brand-700">
                  <input [type]="showPassword() ? 'text' : 'password'" autocomplete="current-password"
                    [ngModel]="password()" (ngModelChange)="password.set($event)"
                    [placeholder]="'auth.signIn.v2.passwordPlaceholder' | translate"
                    class="flex-1 border-0 px-3.5 py-3 text-sm text-ink outline-none placeholder:text-muted-2 min-h-[44px]"/>
                  <button type="button" (click)="showPassword.update(v=>!v)" class="px-3.5 text-muted hover:text-ink"
                    [attr.aria-label]="showPassword() ? ('auth.hidePassword'|translate) : ('auth.showPassword'|translate)">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      @if (showPassword()) {<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                      } @else {<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>}
                    </svg>
                  </button>
                </div>
              </label>
              @if (error()) {<p class="mt-3 text-sm text-red-600" role="alert">{{ error() }}</p>}
              <button type="button" (click)="submitPassword()" [disabled]="submitting()||!canSubmitPassword()"
                class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-6 py-3.5 text-[15px] font-bold text-white shadow-brand transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]">
                <span>{{ (submitting() ? 'auth.signIn.v2.submitting' : 'auth.signIn.v2.submit') | translate }}</span>
                @if (!submitting()) {<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="isRtl() ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'"/></svg>}
              </button>

            } @else {
              <label class="mt-5 block">
                <span class="mb-1.5 block text-[13px] font-medium text-ink-2">{{ 'auth.signIn.v2.mobileTab' | translate }}</span>
                <div class="flex items-stretch overflow-hidden rounded-lg border-[1.5px] border-line transition-colors focus-within:border-brand-700">
                  <span class="inline-flex items-center min-h-[44px] bg-surface-cool px-3.5 text-sm font-semibold text-ink-2 border-e border-line">+965</span>
                  <input type="tel" inputmode="numeric" autocomplete="tel-national" [ngModel]="mobile()" (ngModelChange)="mobile.set($event)"
                    [placeholder]="'auth.signIn.v2.mobilePlaceholder' | translate"
                    class="flex-1 border-0 px-3.5 py-3 text-sm text-ink outline-none placeholder:text-muted-2 min-h-[44px]"/>
                </div>
                <p class="mt-1.5 text-[12px] text-muted">{{ 'auth.signIn.v2.smsCaptionHint' | translate }}</p>
              </label>
              <div class="mt-2 text-end">
                <button type="button" (click)="toggleOtpChannel()"
                  class="text-[12px] font-semibold text-brand-700 hover:text-brand-800 min-h-[44px] px-1">
                  {{ (otpChannel()==='sms' ? 'auth.signIn.v2.useEmailInstead' : 'auth.signIn.v2.useSmsInstead') | translate }}</button>
              </div>
              @if (otpChannel() === 'email') {
                <label class="mt-3 block">
                  <span class="mb-1.5 block text-[13px] font-medium text-ink-2">{{ 'auth.signIn.v2.emailTab' | translate }}</span>
                  <input type="email" autocomplete="email" [ngModel]="email()" (ngModelChange)="email.set($event)"
                    [placeholder]="'auth.signIn.v2.identifierPlaceholder' | translate"
                    class="block w-full rounded-lg border-[1.5px] border-line bg-white px-3.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-brand-700 min-h-[44px]"/>
                </label>
              }
              @if (error()) {<p class="mt-3 text-sm text-red-600" role="alert">{{ error() }}</p>}
              <button type="button" (click)="sendOtpCode()" [disabled]="submitting()||!canSendOtp()"
                class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-6 py-3.5 text-[15px] font-bold text-white shadow-brand transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]">
                <span>{{ (submitting() ? 'auth.signIn.v2.sendingCode' : 'auth.signIn.v2.sendCode') | translate }}</span>
                @if (!submitting()) {<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>}
              </button>
            }

            <div class="relative my-5 text-center text-xs text-muted">
              <span class="absolute inset-x-0 top-1/2 -z-10 h-px bg-line"></span>
              <span class="bg-white px-3">{{ 'auth.signIn.v2.divider' | translate }}</span>
            </div>

            <button type="button" (click)="signInWithGoogle()" [disabled]="submitting()"
              class="inline-flex w-full items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-line bg-white px-4 py-3 text-[14px] font-semibold text-brand-700 transition-colors hover:bg-surface-cool disabled:opacity-50 min-h-[44px]"
              [attr.aria-label]="'auth.signIn.v2.google' | translate">
              <svg viewBox="0 0 18 18" width="20" height="20" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.32z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"/>
              </svg>
              <span>{{ 'auth.signIn.v2.google' | translate }}</span>
            </button>
            @if (googleComingSoon()) {
              <p class="mt-2 text-center text-[12px] text-muted" role="status">{{ 'auth.signIn.v2.googleComingSoon' | translate }}</p>
            }

            <button
              type="button"
              disabled
              class="mt-2 relative inline-flex w-full items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-brand-200 bg-slate-100 px-4 py-3 text-[14px] font-semibold text-brand-700 cursor-not-allowed min-h-[44px]"
              [attr.aria-label]="'auth.signIn.v2.apple.label' | translate"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M17.6 12.6c0-3 2.5-4.5 2.6-4.5-1.4-2.1-3.6-2.4-4.4-2.4-1.9-.2-3.6 1.1-4.6 1.1-1 0-2.4-1.1-4-1-2 0-3.9 1.2-5 3-2.1 3.7-.5 9.1 1.5 12.1 1 1.5 2.2 3.1 3.8 3.1 1.5-.1 2.1-1 3.9-1 1.8 0 2.4 1 4 1 1.6 0 2.7-1.5 3.7-3 1.2-1.7 1.6-3.4 1.7-3.5-.1 0-3.2-1.2-3.2-4.9zM14.6 3.7c.8-1 1.4-2.4 1.2-3.7-1.2.1-2.6.8-3.5 1.8-.8.9-1.5 2.3-1.3 3.6 1.3.1 2.7-.7 3.6-1.7z"/></svg>
              <span>{{ 'auth.signIn.v2.apple.label' | translate }}</span>
              <span class="absolute -top-2 -end-2 rounded-full border border-brand-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-700">
                {{ 'auth.signIn.v2.apple.comingSoonPill' | translate }}
              </span>
            </button>
            <div class="mt-2 grid grid-cols-1 gap-2">
              <button type="button" disabled class="relative inline-flex items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-line bg-white px-2 py-3 text-[13px] font-medium text-muted-2 cursor-not-allowed min-h-[44px]" aria-label="Facebook — coming soon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#94A3B8" aria-hidden="true"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
                Facebook<span class="absolute -top-2 -end-1 text-[9px] bg-surface-cool text-muted px-1.5 py-0.5 rounded-full">soon</span>
              </button>
            </div>

            <p class="mt-6 text-center text-[13px] text-muted">
              {{ 'auth.signIn.v2.noAccount' | translate }}
              <button type="button" (click)="openSignUp()" class="font-semibold text-brand-700 hover:text-brand-800 ps-1 min-h-[44px]">{{ 'auth.signIn.v2.signUpLink' | translate }}</button>
            </p>
            <p class="mt-3 text-center text-[11px] leading-relaxed text-muted">{{ 'auth.legal' | translate }}</p>
          }
        </div>
      </div>
    }
  `,
})
export class SignInModalComponent {
  readonly modal = inject(SignInModalService);
  private readonly signUpModal = inject(SignUpModalService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isRtl = computed(() => this.language.current() === 'ar');
  readonly activeTab = signal<ActiveTab>('password');
  readonly identifierType = signal<IdentifierType>('mobile');
  readonly otpChannel = signal<'sms' | 'email'>('sms');
  readonly mobile = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly showOtpStep = signal(false);
  readonly otpIdentifier = signal('');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly googleComingSoon = signal(false);

  readonly canSubmitPassword = computed(() => {
    const hasId = this.identifierType() === 'mobile'
      ? this.mobile().trim().length >= 4
      : this.email().trim().includes('@');
    return hasId && this.password().length >= 1;
  });

  readonly canSendOtp = computed(() =>
    this.otpChannel() === 'sms'
      ? this.mobile().trim().length >= 4
      : this.email().trim().includes('@')
  );

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      document.body.style.overflow = this.modal.isOpen() ? 'hidden' : '';
    });
  }

  setTab(tab: ActiveTab): void { this.activeTab.set(tab); this.error.set(null); this.googleComingSoon.set(false); }
  setIdentifierType(t: IdentifierType): void { this.identifierType.set(t); this.error.set(null); }
  toggleOtpChannel(): void { this.otpChannel.update(c => c === 'sms' ? 'email' : 'sms'); this.error.set(null); }
  openSignUp(): void { this.modal.close(); this.signUpModal.open(); }

  close(): void { this.modal.close(); this.resetState(); }
  onBackdrop(e: MouseEvent): void { if (e.target === e.currentTarget) this.close(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.modal.isOpen()) this.close(); }

  submitPassword(): void {
    if (this.submitting() || !this.canSubmitPassword()) return;
    this.submitting.set(true); this.error.set(null);
    const obs = this.identifierType() === 'mobile'
      ? this.auth.signInWithMobile({ mobile: `+965${this.mobile().replace(/\s+/g, '')}`, password: this.password() })
      : this.auth.signInWithEmail({ email: this.email().trim(), password: this.password() });
    obs.subscribe({
      next: () => { this.submitting.set(false); this.modal.close(); void this.router.navigate(['/', this.language.current(), 'account']); },
      error: (err: { message?: string }) => { this.submitting.set(false); this.error.set(err.message ?? 'Sign-in failed.'); },
    });
  }

  sendOtpCode(): void {
    if (this.submitting() || !this.canSendOtp()) return;
    this.submitting.set(true); this.error.set(null);
    const identifier = this.otpChannel() === 'sms'
      ? `+965${this.mobile().replace(/\s+/g, '')}` : this.email().trim();
    this.auth.issueOtp(identifier, this.otpChannel(), 'signin').subscribe(result => {
      this.submitting.set(false);
      if (result.kind === 'ok') { this.otpIdentifier.set(identifier); this.showOtpStep.set(true); }
      else this.error.set(result.kind === 'rate_limited' ? 'auth.otp.errors.rateLimited' : 'auth.otp.errors.networkError');
    });
  }

  cancelOtpStep(): void { this.showOtpStep.set(false); this.error.set(null); }

  onOtpSuccess(_result: { session: AuthSession; user: PublicUser }): void {
    this.modal.close();
    void this.router.navigate(['/', this.language.current(), 'account']);
  }

  signInWithGoogle(): void { console.log('[SignIn] Google OAuth deferred — v1.2.x'); this.googleComingSoon.set(true); }

  private resetState(): void {
    this.activeTab.set('password'); this.identifierType.set('mobile'); this.otpChannel.set('sms');
    this.mobile.set(''); this.email.set(''); this.password.set(''); this.showPassword.set(false);
    this.showOtpStep.set(false); this.error.set(null); this.googleComingSoon.set(false); this.submitting.set(false);
  }
}
