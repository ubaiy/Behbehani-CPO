import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

interface ContactFields {
  fullName: string;
  mobile: string;
  email: string;
  consent: boolean;
}

/**
 * Step 2 body — "Contact". Two-way binding via output events so the parent
 * keeps a single FormState source of truth.
 */
@Component({
  selector: 'app-concierge-step2-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="rounded-3xl border border-line bg-white p-5 sm:p-7 shadow-brand-sm mb-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label class="flex flex-col gap-1.5 sm:col-span-2">
          <span class="text-[12px] font-semibold text-ink-3">{{ 'sell.concierge.contact.fullName' | translate }} *</span>
          <input
            type="text"
            [ngModel]="fields().fullName"
            (ngModelChange)="patch.emit({ fullName: $event })"
            name="fullName"
            [placeholder]="'sell.concierge.contact.fullNamePh' | translate"
            class="input"
            maxlength="200"
            autocomplete="name"
            [attr.aria-invalid]="errors().fullName"
            [attr.aria-describedby]="errors().fullName ? 'err-name' : null"
          />
          @if (errors().fullName) { <span id="err-name" class="text-[11px] font-medium text-red-600">{{ 'sell.concierge.validation.required' | translate }}</span> }
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-[12px] font-semibold text-ink-3">{{ 'sell.concierge.contact.mobile' | translate }} *</span>
          <div class="flex items-center rounded-xl border border-line bg-surface-soft focus-within:border-brand-500 focus-within:bg-white">
            <span class="inline-flex h-11 items-center border-e border-line px-3 text-[13px] font-semibold text-muted">+965</span>
            <input
              type="tel"
              inputmode="tel"
              [ngModel]="fields().mobile"
              (ngModelChange)="patch.emit({ mobile: $event })"
              name="mobile"
              [placeholder]="'sell.concierge.contact.mobilePh' | translate"
              class="h-11 flex-1 bg-transparent px-3 text-[14px] outline-none"
              maxlength="8"
              autocomplete="tel-national"
              [attr.aria-invalid]="errors().mobile"
              [attr.aria-describedby]="errors().mobile ? 'err-mobile' : null"
            />
          </div>
          @if (errors().mobile) { <span id="err-mobile" class="text-[11px] font-medium text-red-600">{{ 'sell.concierge.validation.mobile' | translate }}</span> }
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-[12px] font-semibold text-ink-3">{{ 'sell.concierge.contact.email' | translate }}</span>
          <input
            type="email"
            [ngModel]="fields().email"
            (ngModelChange)="patch.emit({ email: $event })"
            name="email"
            [placeholder]="'sell.concierge.contact.emailPh' | translate"
            class="input"
            autocomplete="email"
            [attr.aria-invalid]="errors().email"
            [attr.aria-describedby]="errors().email ? 'err-email' : null"
          />
          @if (errors().email) { <span id="err-email" class="text-[11px] font-medium text-red-600">{{ 'sell.concierge.validation.email' | translate }}</span> }
        </label>
      </div>

      <!-- Privacy trust micro-strip (mockup §step2 — brand-blue, not emerald) -->
      <div class="mt-5 flex items-center gap-2 text-[12px] bg-brand-50 rounded-lg px-3 py-2">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" class="text-brand-700 flex-shrink-0" aria-hidden="true"><path d="M10 1a3 3 0 00-3 3v3H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a3 3 0 00-3-3zm-1 6V4a1 1 0 112 0v3H9z"/></svg>
        <span class="text-brand-800"><strong class="text-brand-900">{{ 'sell.concierge.contact.privacyHeader' | translate }}</strong> {{ 'sell.concierge.contact.privacyBody' | translate }}</span>
      </div>

      <label class="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-soft p-3 hover:bg-white">
        <input
          type="checkbox"
          [ngModel]="fields().consent"
          (ngModelChange)="patch.emit({ consent: $event })"
          name="consent"
          class="mt-1 h-4 w-4 rounded border-line text-brand-700"
          [attr.aria-invalid]="errors().consent"
          [attr.aria-describedby]="errors().consent ? 'err-consent' : null"
        />
        <span class="text-[13px] leading-relaxed text-ink-2">{{ 'sell.concierge.contact.consent' | translate }}</span>
      </label>
      @if (errors().consent) { <span id="err-consent" class="mt-1 block text-[11px] font-medium text-red-600">{{ 'sell.concierge.validation.consent' | translate }}</span> }
    </div>
  `,
  styles: [
    `
      .input {
        @apply h-11 w-full rounded-xl border border-line bg-surface-soft px-3 text-[14px] text-ink outline-none transition-colors focus:border-brand-500 focus:bg-white;
      }
    `,
  ],
})
export class ConciergeStep2ContactComponent {
  readonly fields = input.required<ContactFields>();
  readonly errors = input<{ fullName: boolean; mobile: boolean; email: boolean; consent: boolean }>({
    fullName: false,
    mobile: false,
    email: false,
    consent: false,
  });

  readonly patch = output<Partial<ContactFields>>();
}

export type { ContactFields };
