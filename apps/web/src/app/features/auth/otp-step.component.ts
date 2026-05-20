import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  QueryList,
  ViewChildren,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@behbehani-cpo/data-access';
import type { AuthSession, PublicUser } from '@behbehani-cpo/shared-types';

@Component({
  selector: 'app-otp-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <div class="mt-8">
      <!-- Phone icon header -->
      <div class="inline-grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.34 1.9.66 2.81a2 2 0 01-.45 2.11L8 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.32 1.85.54 2.81.66A2 2 0 0122 16.92z"/>
        </svg>
      </div>

      <h2 class="mt-4 font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink">
        {{ 'auth.otp.heading' | translate }}
      </h2>
      <p class="mt-1 text-sm text-muted">
        {{ 'auth.otp.caption' | translate : { identifier: identifier, channel: channel } }}
      </p>
    </div>

    <!-- 6-cell OTP input -->
    <div class="mt-6 flex gap-2 justify-center" role="group" [attr.aria-label]="'auth.otp.heading' | translate">
      @for (cell of cells; track $index; let i = $index) {
        <input
          #cellInput
          type="text"
          inputmode="numeric"
          maxlength="1"
          autocomplete="one-time-code"
          [attr.aria-label]="'Digit ' + (i + 1)"
          [value]="cells[i]"
          (input)="onInput($event, i)"
          (keydown)="onKeydown($event, i)"
          (paste)="onPaste($event)"
          class="w-12 h-14 text-center text-[20px] font-bold tabular-nums border-[1.5px] rounded-xl outline-none transition-colors
                 border-line focus:border-brand-700 focus:ring-2 focus:ring-brand-100 placeholder:text-muted-2"
          [class.border-brand-700]="focusIndex() === i"
          [class.ring-2]="focusIndex() === i"
          [class.ring-brand-100]="focusIndex() === i"
          [class.border-red-500]="otpError() !== null"
          placeholder="•"
          style="min-height:44px"
        />
      }
    </div>

    <!-- Inline error -->
    @if (otpError()) {
      <p class="mt-3 text-center text-sm text-red-600" role="alert">{{ otpError() }}</p>
    }

    <!-- Resend row -->
    <p class="mt-4 text-center text-[12px] text-muted">
      @if (resendCountdown() > 0) {
        {{ 'auth.otp.resendIn' | translate : { seconds: resendCountdown() } }}
      } @else {
        <button
          type="button"
          (click)="resend()"
          [disabled]="resending()"
          class="font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-50 min-h-[44px]"
        >
          {{ 'auth.otp.resend' | translate }}
        </button>
      }
    </p>

    <!-- Use other channel -->
    <p class="mt-2 text-center text-[12px] text-muted">
      <button
        type="button"
        (click)="cancel.emit()"
        class="text-brand-700 hover:text-brand-800 font-semibold min-h-[44px] px-2"
      >
        {{ 'auth.otp.useChannel' | translate : { channel: otherChannel() } }}
      </button>
    </p>

    <!-- Verify button (visible only when submitting) -->
    @if (submitting()) {
      <div class="mt-5 flex justify-center">
        <svg class="animate-spin text-brand-700" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" aria-label="Verifying" role="img">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
      </div>
    }

    <p class="mt-4 text-center text-[11px] leading-relaxed text-muted">
      {{ 'auth.otp.expireNote' | translate }}
    </p>
  `,
})
export class OtpStepComponent implements OnInit, OnDestroy {
  @Input({ required: true }) identifier!: string;
  @Input({ required: true }) channel!: 'sms' | 'email';
  @Input({ required: true }) purpose!: 'registration' | 'signin' | 'mobile_verify' | 'email_change';

  @Output() readonly success = new EventEmitter<{ session: AuthSession; user: PublicUser }>();
  @Output() readonly cancel = new EventEmitter<void>();

  @ViewChildren('cellInput') cellInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly cells: string[] = ['', '', '', '', '', ''];
  readonly focusIndex = signal(0);
  readonly otpError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly resending = signal(false);
  readonly resendCountdown = signal(60);

  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startCountdown();
    this.focusCellSafe(0);
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  otherChannel(): string {
    return this.channel === 'sms' ? 'email' : 'SMS';
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');
    if (!raw) {
      this.cells[index] = '';
      input.value = '';
      return;
    }
    this.cells[index] = raw[0];
    input.value = raw[0];
    this.otpError.set(null);

    if (index < 5) {
      this.focusCellSafe(index + 1);
    } else {
      this.submitIfComplete();
    }
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      if (this.cells[index]) {
        this.cells[index] = '';
        (event.target as HTMLInputElement).value = '';
      } else if (index > 0) {
        this.focusCellSafe(index - 1);
      }
    }
    if (event.key === 'ArrowLeft' && index > 0) this.focusCellSafe(index - 1);
    if (event.key === 'ArrowRight' && index < 5) this.focusCellSafe(index + 1);
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < 6; i++) {
      this.cells[i] = digits[i] ?? '';
    }
    this.syncInputValues();
    this.otpError.set(null);
    this.submitIfComplete();
  }

  resend(): void {
    if (this.resending() || this.resendCountdown() > 0) return;
    this.resending.set(true);
    this.otpError.set(null);
    this.auth.issueOtp(this.identifier, this.channel, this.purpose).subscribe((result) => {
      this.resending.set(false);
      if (result.kind === 'ok') {
        this.cells.fill('');
        this.syncInputValues();
        this.startCountdown();
        this.focusCellSafe(0);
      }
    });
  }

  private submitIfComplete(): void {
    const code = this.cells.join('');
    if (code.length < 6) return;
    if (this.submitting()) return;
    this.submitting.set(true);
    this.otpError.set(null);

    this.auth.verifyOtp(this.identifier, this.channel, this.purpose, code).subscribe((result) => {
      this.submitting.set(false);
      if (result.kind === 'ok') {
        this.success.emit({ session: result.session, user: result.user });
        return;
      }
      const key =
        result.kind === 'incorrect' || result.kind === 'not_found' || result.kind === 'already_used'
          ? 'auth.otp.errors.incorrect'
          : result.kind === 'expired'
          ? 'auth.otp.errors.expired'
          : result.kind === 'locked'
          ? 'auth.otp.errors.locked'
          : 'auth.otp.errors.networkError';
      this.otpError.set(key);
      this.cells.fill('');
      this.syncInputValues();
      this.focusCellSafe(0);
    });
  }

  private focusCellSafe(index: number): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.focusIndex.set(index);
    setTimeout(() => {
      const inputs = this.cellInputs?.toArray();
      if (inputs?.[index]) inputs[index].nativeElement.focus();
    }, 0);
  }

  private syncInputValues(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const inputs = this.cellInputs?.toArray();
    if (!inputs) return;
    inputs.forEach((ref, i) => {
      ref.nativeElement.value = this.cells[i] ?? '';
    });
  }

  private startCountdown(): void {
    this.clearCountdown();
    this.resendCountdown.set(60);
    if (!isPlatformBrowser(this.platformId)) return;
    this.countdownInterval = setInterval(() => {
      const current = this.resendCountdown();
      if (current <= 1) {
        this.resendCountdown.set(0);
        this.clearCountdown();
      } else {
        this.resendCountdown.set(current - 1);
      }
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}
