import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { PublicUser } from '@behbehani-cpo/shared-types';

export type MobilePanelStep = 'form' | 'otp' | null;

/**
 * Mobile-change card with inline OTP panel.
 * Mirrors the email-change child's contract — parent owns state, child emits intents.
 */
@Component({
  selector: 'app-profile-mobile-change',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <section class="rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft/40 p-6 shadow-brand">
      <h2 class="font-display text-[17px] sm:text-[18px] font-bold text-ink tracking-[-0.01em]">
        {{ 'account.profile.mobile.title' | translate }}
      </h2>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <span class="text-[14px] text-ink">{{ user?.mobile ?? '—' }}</span>
        @if (user?.mobileVerifiedAt) {
          <span class="inline-flex items-center gap-1.5 rounded-pill bg-brand-50 px-3 py-1 text-[12px] font-semibold text-brand-700">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
            {{ 'account.profile.mobile.verifiedPill' | translate }}
          </span>
        } @else if (user?.mobile) {
          <span class="inline-flex items-center rounded-pill bg-brand-50 px-3 py-1 text-[12px] font-semibold text-brand-600">
            {{ 'account.profile.mobile.notVerifiedPill' | translate }}
          </span>
        }
        @if (panelStep === null) {
          <button
            type="button"
            (click)="openPanel.emit()"
            class="ms-auto inline-flex min-h-[44px] items-center rounded-pill border border-line bg-white px-4 py-2 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft transition-colors"
          >
            {{ 'account.profile.mobile.changeCta' | translate }}
          </button>
        }
      </div>

      @if (panelStep !== null) {
        <div class="mt-5 rounded-2xl border border-brand-100 bg-brand-50/40 p-5">
          @if (panelStep === 'form') {
            <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">
              {{ 'account.profile.mobile.newMobileLabel' | translate }}
            </label>
            <div class="flex gap-3">
              <input
                type="tel"
                [ngModel]="newMobileDraft"
                (ngModelChange)="newMobileDraftChange.emit($event)"
                [placeholder]="'account.profile.mobile.newMobilePlaceholder' | translate"
                class="h-11 flex-1 rounded-xl border border-line px-4 text-[14px] text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
                autocomplete="tel"
              />
              <button
                type="button"
                (click)="sendCode.emit()"
                [disabled]="!isMobileValid || isSaving"
                class="inline-flex min-h-[44px] items-center rounded-pill bg-brand-700 px-5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors"
              >
                {{ isSavingMobile ? ('account.profile.mobile.sendingCta' | translate) : ('account.profile.mobile.sendCodeCta' | translate) }}
              </button>
            </div>
            @if (isMobileFormatHintShown) {
              <p class="mt-2 text-[12px] text-red-600" role="alert">
                {{ 'account.profile.mobile.formatHint' | translate }}
              </p>
            } @else if (mobileError) {
              <p class="mt-2 text-[12px] text-red-600" role="alert">{{ mobileError }}</p>
            }
            <button type="button" (click)="closePanel.emit()" class="mt-3 text-[12px] font-semibold text-brand-700 hover:text-brand-800 min-h-[44px] px-2">
              {{ 'account.profile.email.cancelCta' | translate }}
            </button>
          } @else if (panelStep === 'otp') {
            <p class="text-[13px] font-semibold text-ink mb-3">
              {{ 'account.profile.mobile.codeCaption' | translate }}
            </p>
            <div class="flex gap-3">
              <input
                type="text"
                inputmode="numeric"
                [ngModel]="mobileOtpCode"
                (ngModelChange)="mobileOtpCodeChange.emit($event)"
                maxlength="6"
                autocomplete="one-time-code"
                class="h-11 w-36 rounded-xl border border-line px-4 text-center font-mono text-[18px] font-bold text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
                placeholder="······"
              />
              <button
                type="button"
                (click)="verifyCode.emit()"
                [disabled]="mobileOtpCode.length < 6 || isSaving"
                class="inline-flex min-h-[44px] items-center rounded-pill bg-brand-700 px-5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors"
              >
                {{ isSavingMobile ? ('account.profile.mobile.sendingCta' | translate) : ('account.profile.mobile.sendCodeCta' | translate) }}
              </button>
            </div>
            @if (mobileError) {
              <p class="mt-2 text-[12px] text-red-600" role="alert">{{ mobileError }}</p>
            }
            <button type="button" (click)="closePanel.emit()" class="mt-3 text-[12px] font-semibold text-brand-700 hover:text-brand-800 min-h-[44px] px-2">
              {{ 'account.profile.email.cancelCta' | translate }}
            </button>
          }
        </div>
      }
    </section>
  `,
})
export class ProfileMobileChangeComponent {
  @Input() user: PublicUser | null = null;
  @Input() panelStep: MobilePanelStep = null;
  @Input({ required: true }) newMobileDraft!: string;
  @Input({ required: true }) mobileOtpCode!: string;
  @Input() mobileError: string | null = null;
  @Input() isSaving = false;
  @Input() isSavingMobile = false;
  @Input() isMobileValid = false;
  @Input() isMobileFormatHintShown = false;

  @Output() newMobileDraftChange = new EventEmitter<string>();
  @Output() mobileOtpCodeChange = new EventEmitter<string>();
  @Output() openPanel = new EventEmitter<void>();
  @Output() closePanel = new EventEmitter<void>();
  @Output() sendCode = new EventEmitter<void>();
  @Output() verifyCode = new EventEmitter<void>();
}
