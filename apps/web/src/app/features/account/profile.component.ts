import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { AuthService } from '@behbehani-cpo/data-access';
import { MeAccountService } from '../../data/me-account.service';
import { SignInModalService } from '../auth/sign-in-modal.service';

// ─── State union ─────────────────────────────────────────────────────────────

type PageState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'saving'; what: 'profile' | 'email' | 'mobile' | 'password' }
  | { kind: 'error'; reason: 'unauthenticated' | 'network_error' };

type EmailPanel =
  | { open: false }
  | { open: true; step: 'form' }
  | { open: true; step: 'otp'; newEmail: string; otpId: string; expiresAt: string };

type MobilePanel =
  | { open: false }
  | { open: true; step: 'form' }
  | { open: true; step: 'otp'; newMobile: string; otpId: string; expiresAt: string };

// ─── Password strength ───────────────────────────────────────────────────────

function passwordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score as 0 | 1 | 2 | 3 | 4;
}

const KUWAIT_MOBILE_RE = /^(?:\+?965)?[569]\d{7}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-account-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <!-- Guest gate -->
    @if (!auth.isSignedIn()) {
      <div class="rounded-3xl border border-line bg-white p-10 text-center shadow-brand-sm">
        <h1 class="font-display text-[20px] font-bold text-ink mb-2">
          {{ 'account.profile.title' | translate }}
        </h1>
        <p class="text-[14px] text-muted">{{ 'account.myBookings.signInRequired.body' | translate }}</p>
        <button
          type="button"
          (click)="signInModal.open()"
          class="mt-5 inline-flex min-h-[44px] items-center rounded-pill bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          {{ 'nav.signIn' | translate }}
        </button>
      </div>
    } @else {

      <!-- Compact hero header (Part C.4 — gradient bg + icon chip) -->
      <header class="mb-6 rounded-3xl bg-gradient-to-br from-brand-50 via-white to-brand-50/40 border border-brand-100 px-6 py-5 flex items-center gap-4">
        <span class="inline-grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand-700 text-white shadow-brand-sm" aria-hidden="true">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </span>
        <div class="min-w-0">
          <h1 class="font-display text-[22px] sm:text-[26px] font-bold text-ink mb-0.5 tracking-[-0.02em]">
            {{ 'account.shell.page.profile.title' | translate }}
          </h1>
          <p class="text-[13px] text-muted">
            {{ 'account.shell.page.profile.sub' | translate }}
          </p>
        </div>
      </header>

      <!-- Loading -->
      @if (state().kind === 'loading') {
        <div class="py-16 text-center text-muted text-[14px]" aria-busy="true">
          <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-600"></span>
          <span class="ms-2">{{ 'sell.offer.loading' | translate }}</span>
        </div>
      }

      <!-- Toast -->
      @if (toast()) {
        <div
          role="status"
          aria-live="polite"
          class="fixed bottom-6 end-6 z-50 flex items-center gap-3 rounded-2xl bg-brand-700 px-5 py-3 text-[13px] font-semibold text-white shadow-lg"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
          {{ toast() }}
        </div>
      }

      <!-- Cards -->
      @if (state().kind === 'ready' || state().kind === 'saving') {
        <main>
          <div class="space-y-6">

            <!-- ── Card 1: Identity ─────────────────────────────────────── -->
            <section class="rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft/40 p-6 shadow-brand">
              <h2 class="font-display text-[17px] sm:text-[18px] font-bold text-ink tracking-[-0.01em]">
                {{ 'account.profile.identity.title' | translate }}
              </h2>

              <!-- Avatar -->
              <div class="mt-5 flex items-center gap-4">
                @if (user()?.avatarUrl) {
                  <img
                    [src]="user()!.avatarUrl!"
                    alt=""
                    class="h-16 w-16 rounded-full object-cover ring-2 ring-brand-100"
                  />
                } @else {
                  <div class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[22px] font-bold text-brand-700 select-none">
                    {{ initials() }}
                  </div>
                }
                <div class="flex flex-wrap items-center gap-2">
                  <!-- v1.5-D8: live avatar upload (B v1.5.10 endpoint, 3-step S3 flow). -->
                  <label class="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-pill border border-line bg-white px-4 py-2 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft transition-colors"
                    [class.opacity-50]="isUploadingAvatar()"
                    [class.cursor-not-allowed]="isUploadingAvatar()">
                    @if (isUploadingAvatar()) {
                      <svg viewBox="0 0 24 24" width="14" height="14" class="animate-spin text-brand-700" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                      {{ 'account.profile.identity.uploadingCta' | translate }}
                    } @else {
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                      {{ 'account.profile.identity.uploadCta' | translate }}
                    }
                    <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" (change)="onAvatarFileSelected($event)" [disabled]="isUploadingAvatar()" />
                  </label>
                  @if (user()?.avatarUrl) {
                    <button
                      type="button"
                      (click)="onRemoveAvatar()"
                      [disabled]="state().kind === 'saving'"
                      class="inline-flex min-h-[44px] items-center rounded-pill border border-red-200 bg-white px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {{ 'account.profile.identity.removeCta' | translate }}
                    </button>
                  }
                </div>
              </div>

              <!-- Full name -->
              <div class="mt-5">
                <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">
                  {{ 'account.profile.identity.fullNameLabel' | translate }}
                </label>
                <div class="flex gap-3">
                  <input
                    type="text"
                    [(ngModel)]="fullNameDraft"
                    [placeholder]="'account.profile.identity.fullNamePlaceholder' | translate"
                    class="h-11 flex-1 rounded-xl border border-line px-4 text-[14px] text-ink outline-none transition-colors focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
                    maxlength="120"
                  />
                  <button
                    type="button"
                    (click)="onSaveName()"
                    [disabled]="!isNameDirty() || state().kind === 'saving'"
                    class="inline-flex min-h-[44px] items-center rounded-pill bg-brand-700 px-5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors"
                  >
                    {{ isSavingProfile() ? ('account.profile.identity.savingCta' | translate) : ('account.profile.identity.saveCta' | translate) }}
                  </button>
                </div>
              </div>

              <!-- Language preference -->
              <div class="mt-5">
                <p class="text-[13px] font-semibold text-ink-2 mb-2">
                  {{ 'account.profile.identity.localeLabel' | translate }}
                </p>
                <div class="flex gap-2" role="group">
                  <button
                    type="button"
                    (click)="onLocaleChange('en')"
                    [disabled]="state().kind === 'saving'"
                    class="inline-flex min-h-[44px] items-center rounded-pill px-5 text-[13px] font-semibold transition-colors disabled:opacity-50"
                    [class]="user()?.locale === 'en' ? 'bg-brand-700 text-white' : 'border border-line bg-white text-ink-2 hover:bg-surface-soft'"
                  >
                    English
                  </button>
                  <button
                    type="button"
                    (click)="onLocaleChange('ar')"
                    [disabled]="state().kind === 'saving'"
                    class="inline-flex min-h-[44px] items-center rounded-pill px-5 text-[13px] font-semibold transition-colors disabled:opacity-50"
                    [class]="user()?.locale === 'ar' ? 'bg-brand-700 text-white' : 'border border-line bg-white text-ink-2 hover:bg-surface-soft'"
                  >
                    العربية
                  </button>
                </div>
              </div>
            </section>

            <!-- ── Card 2: Email ────────────────────────────────────────── -->
            <section class="rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft/40 p-6 shadow-brand">
              <h2 class="font-display text-[17px] sm:text-[18px] font-bold text-ink tracking-[-0.01em]">
                {{ 'account.profile.email.title' | translate }}
              </h2>

              <div class="mt-4 flex flex-wrap items-center gap-3">
                <span class="text-[14px] text-ink">{{ user()?.email ?? '—' }}</span>
                @if (user()?.emailVerifiedAt) {
                  <span class="inline-flex items-center gap-1.5 rounded-pill bg-brand-50 px-3 py-1 text-[12px] font-semibold text-brand-700">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
                    {{ 'account.profile.email.verifiedPill' | translate }}
                  </span>
                } @else if (user()?.email) {
                  <span class="inline-flex items-center rounded-pill bg-brand-50 px-3 py-1 text-[12px] font-semibold text-brand-600">
                    {{ 'account.profile.email.notVerifiedPill' | translate }}
                  </span>
                }
                @if (!emailPanel().open) {
                  <button
                    type="button"
                    (click)="openEmailPanel()"
                    class="ms-auto inline-flex min-h-[44px] items-center rounded-pill border border-line bg-white px-4 py-2 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft transition-colors"
                  >
                    {{ 'account.profile.email.changeCta' | translate }}
                  </button>
                }
              </div>

              <!-- Email inline panel -->
              @if (emailPanel().open) {
                <div class="mt-5 rounded-2xl border border-brand-100 bg-brand-50/40 p-5">
                  @if (emailPanelStep() === 'form') {
                    <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">
                      {{ 'account.profile.email.newEmailLabel' | translate }}
                    </label>
                    <div class="flex gap-3">
                      <input
                        type="email"
                        [(ngModel)]="newEmailDraft"
                        [placeholder]="'account.profile.email.newEmailPlaceholder' | translate"
                        class="h-11 flex-1 rounded-xl border border-line px-4 text-[14px] text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
                        autocomplete="email"
                      />
                      <button
                        type="button"
                        (click)="onSendEmailCode()"
                        [disabled]="!isEmailValid() || state().kind === 'saving'"
                        class="inline-flex min-h-[44px] items-center rounded-pill bg-brand-700 px-5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors"
                      >
                        {{ isSavingEmail() ? ('account.profile.email.sendingCta' | translate) : ('account.profile.email.sendCodeCta' | translate) }}
                      </button>
                    </div>
                    @if (isEmailFormatHintShown()) {
                      <p class="mt-2 text-[12px] text-red-600" role="alert">
                        {{ 'account.profile.email.formatHint' | translate }}
                      </p>
                    } @else if (emailError()) {
                      <p class="mt-2 text-[12px] text-red-600" role="alert">{{ emailError() }}</p>
                    }
                    <button type="button" (click)="closeEmailPanel()" class="mt-3 text-[12px] font-semibold text-brand-700 hover:text-brand-800 min-h-[44px] px-2">
                      {{ 'account.profile.email.cancelCta' | translate }}
                    </button>
                  } @else if (emailPanelStep() === 'otp') {
                    <p class="text-[13px] font-semibold text-ink mb-3">
                      {{ 'account.profile.email.codeCaption' | translate }}
                    </p>
                    <div class="flex gap-3">
                      <input
                        type="text"
                        inputmode="numeric"
                        [(ngModel)]="emailOtpCode"
                        maxlength="6"
                        autocomplete="one-time-code"
                        class="h-11 w-36 rounded-xl border border-line px-4 text-center font-mono text-[18px] font-bold text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
                        placeholder="······"
                      />
                      <button
                        type="button"
                        (click)="onVerifyEmailCode()"
                        [disabled]="emailOtpCode.length < 6 || state().kind === 'saving'"
                        class="inline-flex min-h-[44px] items-center rounded-pill bg-brand-700 px-5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors"
                      >
                        {{ isSavingEmail() ? ('account.profile.email.sendingCta' | translate) : ('account.profile.email.sendCodeCta' | translate) }}
                      </button>
                    </div>
                    @if (emailError()) {
                      <p class="mt-2 text-[12px] text-red-600" role="alert">{{ emailError() }}</p>
                    }
                    <button type="button" (click)="closeEmailPanel()" class="mt-3 text-[12px] font-semibold text-brand-700 hover:text-brand-800 min-h-[44px] px-2">
                      {{ 'account.profile.email.cancelCta' | translate }}
                    </button>
                  }
                </div>
              }
            </section>

            <!-- ── Card 3: Mobile ──────────────────────────────────────── -->
            <section class="rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft/40 p-6 shadow-brand">
              <h2 class="font-display text-[17px] sm:text-[18px] font-bold text-ink tracking-[-0.01em]">
                {{ 'account.profile.mobile.title' | translate }}
              </h2>

              <div class="mt-4 flex flex-wrap items-center gap-3">
                <span class="text-[14px] text-ink">{{ user()?.mobile ?? '—' }}</span>
                @if (user()?.mobileVerifiedAt) {
                  <span class="inline-flex items-center gap-1.5 rounded-pill bg-brand-50 px-3 py-1 text-[12px] font-semibold text-brand-700">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
                    {{ 'account.profile.mobile.verifiedPill' | translate }}
                  </span>
                } @else if (user()?.mobile) {
                  <span class="inline-flex items-center rounded-pill bg-brand-50 px-3 py-1 text-[12px] font-semibold text-brand-600">
                    {{ 'account.profile.mobile.notVerifiedPill' | translate }}
                  </span>
                }
                @if (!mobilePanel().open) {
                  <button
                    type="button"
                    (click)="openMobilePanel()"
                    class="ms-auto inline-flex min-h-[44px] items-center rounded-pill border border-line bg-white px-4 py-2 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft transition-colors"
                  >
                    {{ 'account.profile.mobile.changeCta' | translate }}
                  </button>
                }
              </div>

              <!-- Mobile inline panel -->
              @if (mobilePanel().open) {
                <div class="mt-5 rounded-2xl border border-brand-100 bg-brand-50/40 p-5">
                  @if (mobilePanelStep() === 'form') {
                    <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">
                      {{ 'account.profile.mobile.newMobileLabel' | translate }}
                    </label>
                    <div class="flex gap-3">
                      <input
                        type="tel"
                        [(ngModel)]="newMobileDraft"
                        [placeholder]="'account.profile.mobile.newMobilePlaceholder' | translate"
                        class="h-11 flex-1 rounded-xl border border-line px-4 text-[14px] text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
                        autocomplete="tel"
                      />
                      <button
                        type="button"
                        (click)="onSendMobileCode()"
                        [disabled]="!isMobileValid() || state().kind === 'saving'"
                        class="inline-flex min-h-[44px] items-center rounded-pill bg-brand-700 px-5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors"
                      >
                        {{ isSavingMobile() ? ('account.profile.mobile.sendingCta' | translate) : ('account.profile.mobile.sendCodeCta' | translate) }}
                      </button>
                    </div>
                    @if (isMobileFormatHintShown()) {
                      <p class="mt-2 text-[12px] text-red-600" role="alert">
                        {{ 'account.profile.mobile.formatHint' | translate }}
                      </p>
                    } @else if (mobileError()) {
                      <p class="mt-2 text-[12px] text-red-600" role="alert">{{ mobileError() }}</p>
                    }
                    <button type="button" (click)="closeMobilePanel()" class="mt-3 text-[12px] font-semibold text-brand-700 hover:text-brand-800 min-h-[44px] px-2">
                      {{ 'account.profile.email.cancelCta' | translate }}
                    </button>
                  } @else if (mobilePanelStep() === 'otp') {
                    <p class="text-[13px] font-semibold text-ink mb-3">
                      {{ 'account.profile.mobile.codeCaption' | translate }}
                    </p>
                    <div class="flex gap-3">
                      <input
                        type="text"
                        inputmode="numeric"
                        [(ngModel)]="mobileOtpCode"
                        maxlength="6"
                        autocomplete="one-time-code"
                        class="h-11 w-36 rounded-xl border border-line px-4 text-center font-mono text-[18px] font-bold text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
                        placeholder="······"
                      />
                      <button
                        type="button"
                        (click)="onVerifyMobileCode()"
                        [disabled]="mobileOtpCode.length < 6 || state().kind === 'saving'"
                        class="inline-flex min-h-[44px] items-center rounded-pill bg-brand-700 px-5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors"
                      >
                        {{ isSavingMobile() ? ('account.profile.mobile.sendingCta' | translate) : ('account.profile.mobile.sendCodeCta' | translate) }}
                      </button>
                    </div>
                    @if (mobileError()) {
                      <p class="mt-2 text-[12px] text-red-600" role="alert">{{ mobileError() }}</p>
                    }
                    <button type="button" (click)="closeMobilePanel()" class="mt-3 text-[12px] font-semibold text-brand-700 hover:text-brand-800 min-h-[44px] px-2">
                      {{ 'account.profile.email.cancelCta' | translate }}
                    </button>
                  }
                </div>
              }
            </section>

            <!-- ── Card 4: Password ────────────────────────────────────── -->
            <section class="rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft/40 p-6 shadow-brand">
              <h2 class="font-display text-[17px] sm:text-[18px] font-bold text-ink tracking-[-0.01em]">
                {{ 'account.profile.password.title' | translate }}
              </h2>

              @if (!passwordPanelOpen()) {
                <div class="mt-4">
                  <button
                    type="button"
                    (click)="openPasswordPanel()"
                    class="inline-flex min-h-[44px] items-center rounded-pill border border-line bg-white px-5 py-2.5 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft transition-colors"
                  >
                    {{ user()?.hasPassword ? ('account.profile.password.changeCta' | translate) : ('account.profile.password.setCta' | translate) }}
                  </button>
                </div>
              } @else {
                <div class="mt-5 space-y-4">
                  @if (user()?.hasPassword) {
                    <div>
                      <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">
                        {{ 'account.profile.password.currentLabel' | translate }}
                      </label>
                      <input
                        type="password"
                        [ngModel]="currentPasswordDraft()"
                        (ngModelChange)="currentPasswordDraft.set($event)"
                        autocomplete="current-password"
                        class="h-11 w-full rounded-xl border border-line px-4 text-[14px] text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                  }

                  <div>
                    <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">
                      {{ 'account.profile.password.newLabel' | translate }}
                    </label>
                    <input
                      type="password"
                      [ngModel]="newPasswordDraft()"
                      (ngModelChange)="newPasswordDraft.set($event)"
                      autocomplete="new-password"
                      class="h-11 w-full rounded-xl border border-line px-4 text-[14px] text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
                    />
                    <!-- Strength meter -->
                    @if (newPasswordDraft()) {
                      <div class="mt-2 flex gap-1.5" role="progressbar" [attr.aria-valuenow]="pwStrength()" aria-valuemin="0" aria-valuemax="4">
                        @for (bar of [1,2,3,4]; track bar) {
                          <div
                            class="h-1.5 flex-1 rounded-full transition-colors"
                            [ngClass]="{
                              'bg-red-500':   bar <= pwStrength() && pwStrength() <= 1,
                              'bg-slate-400': bar <= pwStrength() && pwStrength() === 2,
                              'bg-brand-500': bar <= pwStrength() && pwStrength() === 3,
                              'bg-brand-700': bar <= pwStrength() && pwStrength() === 4,
                              'bg-slate-200': bar > pwStrength()
                            }"
                          ></div>
                        }
                      </div>
                      <p class="mt-1 text-[11px]" [class]="pwStrength() <= 1 ? 'text-red-500' : pwStrength() === 2 ? 'text-slate-600' : 'text-brand-700'">
                        {{ pwStrengthLabel() | translate }}
                      </p>
                    }
                  </div>

                  <div>
                    <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">
                      {{ 'account.profile.password.confirmLabel' | translate }}
                    </label>
                    <input
                      type="password"
                      [ngModel]="confirmPasswordDraft()"
                      (ngModelChange)="confirmPasswordDraft.set($event)"
                      autocomplete="new-password"
                      class="h-11 w-full rounded-xl border border-line px-4 text-[14px] text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>

                  @if (passwordError()) {
                    <p class="text-[12px] text-red-600" role="alert">{{ passwordError() | translate }}</p>
                  }

                  <div class="flex gap-3">
                    <button
                      type="button"
                      (click)="onChangePassword()"
                      [disabled]="!canSubmitPassword() || state().kind === 'saving'"
                      class="inline-flex min-h-[44px] items-center rounded-pill bg-brand-700 px-6 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors"
                    >
                      {{ isSavingPassword() ? ('account.profile.password.updatingCta' | translate) : ('account.profile.password.updateCta' | translate) }}
                    </button>
                    <button
                      type="button"
                      (click)="closePasswordPanel()"
                      class="inline-flex min-h-[44px] items-center rounded-pill border border-line bg-white px-5 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft transition-colors"
                    >
                      {{ 'account.profile.email.cancelCta' | translate }}
                    </button>
                  </div>
                </div>
              }
            </section>

          </div>
        </main>
      }

    }
  `,
})
export class AccountProfileComponent {
  // ─── Services ──────────────────────────────────────────────────────────────
  protected readonly auth = inject(AuthService);
  protected readonly signInModal = inject(SignInModalService);
  private readonly api = inject(MeAccountService);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  // ─── Page state ────────────────────────────────────────────────────────────
  readonly state = signal<PageState>({ kind: 'loading' });
  readonly toast = signal<string | null>(null);

  readonly locale = computed(() => this.language.current());
  readonly user = computed(() => this.auth.user());
  readonly initials = computed(() => {
    const name = this.user()?.fullName ?? '';
    return name.split(' ').map((w: string) => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';
  });

  // ─── Identity card ─────────────────────────────────────────────────────────
  fullNameDraft = '';
  /**
   * v1.5-D7 reactivity FIX: `fullNameDraft` is a plain field bound via
   * `[(ngModel)]`. A `computed()` only re-evaluates when SIGNAL deps change —
   * plain-field reads never trigger it, so the dirty check stayed cached at
   * `false` after initial load and Save button stayed disabled forever.
   * A plain method gets re-evaluated on every change detection cycle, which
   * ngModel triggers — so this returns fresh values as the user types.
   */
  isNameDirty(): boolean {
    return this.fullNameDraft.trim() !== (this.user()?.fullName ?? '') && this.fullNameDraft.trim().length > 0;
  }
  readonly isSavingProfile = computed(() => {
    const s = this.state();
    return s.kind === 'saving' && s.what === 'profile';
  });

  // ─── Email card ────────────────────────────────────────────────────────────
  readonly emailPanel = signal<EmailPanel>({ open: false });
  readonly emailPanelStep = computed(() => {
    const p = this.emailPanel();
    return p.open ? p.step : null;
  });
  newEmailDraft = '';
  emailOtpCode = '';
  readonly emailError = signal<string | null>(null);
  readonly isSavingEmail = computed(() => {
    const s = this.state();
    return s.kind === 'saving' && s.what === 'email';
  });
  /** v1.5-D7 added: format validation for the new-email field. Plain method
      so it re-evaluates on every CD cycle (ngModel triggers CD). */
  isEmailValid(): boolean {
    return EMAIL_RE.test(this.newEmailDraft.trim());
  }
  isEmailFormatHintShown(): boolean {
    /* Show the format hint only after the user has typed at least 3 chars —
       avoids flashing the error on empty/focus state. */
    const v = this.newEmailDraft.trim();
    return v.length >= 3 && !EMAIL_RE.test(v);
  }

  // ─── Mobile card ───────────────────────────────────────────────────────────
  readonly mobilePanel = signal<MobilePanel>({ open: false });
  readonly mobilePanelStep = computed(() => {
    const p = this.mobilePanel();
    return p.open ? p.step : null;
  });
  newMobileDraft = '';
  mobileOtpCode = '';
  /** v1.5-D7 FIX: was `computed()` — never re-fired because newMobileDraft is a
      plain field. Plain method re-runs every CD cycle (ngModel triggers CD). */
  isMobileValid(): boolean {
    return KUWAIT_MOBILE_RE.test(this.newMobileDraft.trim());
  }
  isMobileFormatHintShown(): boolean {
    const v = this.newMobileDraft.trim();
    return v.length >= 3 && !KUWAIT_MOBILE_RE.test(v);
  }
  readonly mobileError = signal<string | null>(null);
  readonly isSavingMobile = computed(() => {
    const s = this.state();
    return s.kind === 'saving' && s.what === 'mobile';
  });

  // ─── Password card ─────────────────────────────────────────────────────────
  readonly passwordPanelOpen = signal(false);
  readonly currentPasswordDraft = signal('');
  readonly newPasswordDraft = signal('');
  readonly confirmPasswordDraft = signal('');
  readonly passwordError = signal<string | null>(null);
  readonly pwStrength = computed(() => passwordStrength(this.newPasswordDraft()));
  readonly pwStrengthLabel = computed(() => {
    const s = this.pwStrength();
    if (s <= 1) return 'account.profile.password.strengthWeak';
    if (s === 2) return 'account.profile.password.strengthFair';
    if (s === 3) return 'account.profile.password.strengthGood';
    return 'account.profile.password.strengthStrong';
  });
  readonly canSubmitPassword = computed(() => {
    const np = this.newPasswordDraft();
    const cp = this.confirmPasswordDraft();
    const hasCurrentIfNeeded = !this.user()?.hasPassword || this.currentPasswordDraft().length > 0;
    return hasCurrentIfNeeded && np.length >= 8 && np === cp && this.pwStrength() >= 2;
  });
  readonly isSavingPassword = computed(() => {
    const s = this.state();
    return s.kind === 'saving' && s.what === 'password';
  });

  // ─── Constructor ───────────────────────────────────────────────────────────
  constructor() {
    // SSR-safe: open sign-in modal when guest
    effect(() => {
      if (isPlatformBrowser(this.platformId) && !this.auth.isSignedIn()) {
        this.signInModal.open();
      }
    });

    // Seed form draft when user loads
    effect(() => {
      const u = this.user();
      if (u && this.state().kind === 'loading') {
        this.fullNameDraft = u.fullName;
        this.state.set({ kind: 'ready' });
      }
    });

    // Page title
    const setTitle = () =>
      this.titleService.setTitle(this.translate.instant('account.profile.metaTitle'));
    setTitle();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(setTitle);
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  // ─── Identity actions ──────────────────────────────────────────────────────

  onSaveName(): void {
    const name = this.fullNameDraft.trim();
    if (!name || !this.isNameDirty()) return;
    this.state.set({ kind: 'saving', what: 'profile' });
    this.api.updateProfile({ fullName: name })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (res.kind === 'ok') {
          this.showToast(this.translate.instant('account.profile.identity.savedToast'));
        }
        this.state.set({ kind: 'ready' });
      });
  }

  onLocaleChange(locale: 'en' | 'ar'): void {
    if (this.user()?.locale === locale) return;
    this.state.set({ kind: 'saving', what: 'profile' });
    this.api.updateProfile({ locale })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.state.set({ kind: 'ready' }));
  }

  /**
   * v1.5-D8: live avatar upload wired against B v1.5.10's 3-step S3 flow.
   * Client-side guards (mime + size) catch bad files before the round-trip;
   * the 422 codes (AVATAR_TOO_LARGE / AVATAR_MIME_NOT_ALLOWED) are still
   * mapped server-side as defense-in-depth.
   */
  readonly isUploadingAvatar = signal(false);

  onAvatarFileSelected(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    /* Clear the input so re-selecting the same file re-triggers (change). */
    input.value = '';
    if (!file) return;

    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_BYTES = 5 * 1024 * 1024; // mirrors B env.MAX_AVATAR_BYTES default
    if (!ALLOWED_MIME.includes(file.type)) {
      this.showToast(this.translate.instant('account.profile.identity.uploadMimeError'));
      return;
    }
    if (file.size > MAX_BYTES) {
      this.showToast(this.translate.instant('account.profile.identity.uploadTooLargeError'));
      return;
    }
    if (file.size < 1024) {
      this.showToast(this.translate.instant('account.profile.identity.uploadTooLargeError'));
      return;
    }

    this.isUploadingAvatar.set(true);
    this.api.uploadAvatar(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.isUploadingAvatar.set(false);
        if (res.kind === 'ok') {
          this.showToast(this.translate.instant('account.profile.identity.uploadSuccess'));
        } else if (res.kind === 'too_large') {
          this.showToast(this.translate.instant('account.profile.identity.uploadTooLargeError'));
        } else if (res.kind === 'mime_rejected') {
          this.showToast(this.translate.instant('account.profile.identity.uploadMimeError'));
        } else {
          this.showToast(this.translate.instant('account.profile.identity.uploadFailedError'));
        }
      });
  }

  onRemoveAvatar(): void {
    this.state.set({ kind: 'saving', what: 'profile' });
    this.api.updateProfile({ avatarUrl: null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.state.set({ kind: 'ready' }));
  }

  // ─── Email actions ─────────────────────────────────────────────────────────

  openEmailPanel(): void {
    this.emailError.set(null);
    this.newEmailDraft = '';
    this.emailOtpCode = '';
    this.emailPanel.set({ open: true, step: 'form' });
  }

  closeEmailPanel(): void {
    this.emailPanel.set({ open: false });
    this.emailError.set(null);
  }

  onSendEmailCode(): void {
    const email = this.newEmailDraft.trim();
    if (!email) return;
    this.emailError.set(null);
    this.state.set({ kind: 'saving', what: 'email' });
    this.api.initiateEmailChange(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.state.set({ kind: 'ready' });
        if (res.kind === 'ok') {
          this.emailOtpCode = '';
          this.emailPanel.set({ open: true, step: 'otp', newEmail: email, otpId: res.otpId, expiresAt: res.expiresAt });
        } else if (res.kind === 'otp_rate_limited') {
          this.emailError.set(this.translate.instant('account.profile.errors.rateLimited'));
        } else {
          this.emailError.set(this.translate.instant('account.profile.errors.network'));
        }
      });
  }

  onVerifyEmailCode(): void {
    const panel = this.emailPanel();
    if (!panel.open || panel.step !== 'otp') return;
    const code = this.emailOtpCode.trim();
    if (code.length < 6) return;
    this.emailError.set(null);
    this.state.set({ kind: 'saving', what: 'email' });
    this.api.verifyEmailChange(panel.newEmail, code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.state.set({ kind: 'ready' });
        if (res.kind === 'ok') {
          this.closeEmailPanel();
          this.showToast(this.translate.instant('account.profile.email.successToast'));
        } else if (res.kind === 'otp_incorrect') {
          this.emailError.set(this.translate.instant('account.profile.errors.incorrect'));
          this.emailOtpCode = '';
        } else {
          this.emailError.set(this.translate.instant('account.profile.errors.network'));
        }
      });
  }

  // ─── Mobile actions ────────────────────────────────────────────────────────

  openMobilePanel(): void {
    this.mobileError.set(null);
    this.newMobileDraft = '';
    this.mobileOtpCode = '';
    this.mobilePanel.set({ open: true, step: 'form' });
  }

  closeMobilePanel(): void {
    this.mobilePanel.set({ open: false });
    this.mobileError.set(null);
  }

  onSendMobileCode(): void {
    const mobile = this.newMobileDraft.trim();
    if (!KUWAIT_MOBILE_RE.test(mobile)) return;
    this.mobileError.set(null);
    this.state.set({ kind: 'saving', what: 'mobile' });
    this.api.initiateMobileChange(mobile)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.state.set({ kind: 'ready' });
        if (res.kind === 'ok') {
          this.mobileOtpCode = '';
          this.mobilePanel.set({ open: true, step: 'otp', newMobile: mobile, otpId: res.otpId, expiresAt: res.expiresAt });
        } else if (res.kind === 'otp_rate_limited') {
          this.mobileError.set(this.translate.instant('account.profile.errors.rateLimited'));
        } else {
          this.mobileError.set(this.translate.instant('account.profile.errors.network'));
        }
      });
  }

  onVerifyMobileCode(): void {
    const panel = this.mobilePanel();
    if (!panel.open || panel.step !== 'otp') return;
    const code = this.mobileOtpCode.trim();
    if (code.length < 6) return;
    this.mobileError.set(null);
    this.state.set({ kind: 'saving', what: 'mobile' });
    this.api.verifyMobileChange(panel.newMobile, code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.state.set({ kind: 'ready' });
        if (res.kind === 'ok') {
          this.closeMobilePanel();
          this.showToast(this.translate.instant('account.profile.mobile.successToast'));
        } else if (res.kind === 'otp_incorrect') {
          this.mobileError.set(this.translate.instant('account.profile.errors.incorrect'));
          this.mobileOtpCode = '';
        } else {
          this.mobileError.set(this.translate.instant('account.profile.errors.network'));
        }
      });
  }

  // ─── Password actions ──────────────────────────────────────────────────────

  openPasswordPanel(): void {
    this.passwordError.set(null);
    this.currentPasswordDraft.set('');
    this.newPasswordDraft.set('');
    this.confirmPasswordDraft.set('');
    this.passwordPanelOpen.set(true);
  }

  closePasswordPanel(): void {
    this.passwordPanelOpen.set(false);
    this.passwordError.set(null);
  }

  onChangePassword(): void {
    const np = this.newPasswordDraft();
    if (np !== this.confirmPasswordDraft()) {
      this.passwordError.set('account.profile.password.mismatchError');
      return;
    }
    if (this.pwStrength() < 2) {
      this.passwordError.set('account.profile.password.weakError');
      return;
    }
    this.passwordError.set(null);
    this.state.set({ kind: 'saving', what: 'password' });
    const dto: { currentPassword?: string; newPassword: string } = { newPassword: np };
    if (this.user()?.hasPassword && this.currentPasswordDraft()) {
      dto.currentPassword = this.currentPasswordDraft();
    }
    this.api.changePassword(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.state.set({ kind: 'ready' });
        if (res.kind === 'ok') {
          this.closePasswordPanel();
          this.showToast(this.translate.instant('account.profile.password.successToast'));
        } else {
          this.passwordError.set('account.profile.errors.network');
        }
      });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private showToast(msg: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.toast.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3500);
  }
}
