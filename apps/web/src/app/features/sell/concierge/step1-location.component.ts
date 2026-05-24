import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { PreferredWindow } from '@behbehani-cpo/shared-types';
import { AddressAutocompleteComponent } from '../../../shared/address-autocomplete.component';
import { DateStripComponent } from '../../../shared/date-strip.component';
import type { Governorate as AddrGovernorate } from '../../../data/address-suggestion.service';

type Governorate =
  | 'capital' | 'hawalli' | 'farwaniya' | 'mubarakAlKabeer' | 'ahmadi' | 'jahra';

/**
 * Step 1 body — "Where + When" — two cards (location + schedule).
 * Pure presentational: receives signal slices via inputs, emits change events.
 * Parent (SellConciergePageComponent) owns FormState + validation.
 */
@Component({
  selector: 'app-concierge-step1-location',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    AddressAutocompleteComponent,
    DateStripComponent,
  ],
  template: `
    <!-- Card 1: Where -->
    <div class="rounded-3xl border border-line bg-white p-5 sm:p-7 shadow-brand-sm mb-5">
      <div class="mb-4">
        <h2 class="font-display text-[20px] font-bold tracking-[-0.025em] text-ink">{{ 'sell.concierge.location.title' | translate }}</h2>
        <p class="mt-1 text-[13px] text-muted">{{ 'sell.concierge.location.sub' | translate }}</p>
      </div>

      <app-address-autocomplete
        [value]="address()"
        (addressChange)="addressChange.emit($event)"
      />
      @if (showAddressError()) {
        <span class="mt-2 block text-[11px] font-medium text-red-600">{{ 'sell.concierge.validation.required' | translate }}</span>
      }

      <!-- Map preview -->
      @if (address()) {
        <div class="mt-4 rounded-2xl border border-line overflow-hidden">
          <div class="map-stub h-32 relative">
            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
              <div class="bg-brand-700 text-white rounded-full p-2 shadow-brand-sm">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>
              </div>
            </div>
            <div class="absolute bottom-2 left-2 text-[10px] bg-white/90 backdrop-blur px-2 py-0.5 rounded text-muted">
              {{ 'sell.concierge.address.mapCaption' | translate }}
            </div>
          </div>
          <div class="p-3 bg-white flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="text-[13px] font-semibold text-ink truncate">{{ address() }}</div>
              @if (governorate()) {
                <div class="text-[11px] text-muted">{{ 'sell.concierge.governorates.' + governorate() | translate }}</div>
              }
            </div>
            <button type="button" (click)="clearAddress.emit()" class="flex-shrink-0 text-[12px] font-semibold text-brand-700 hover:text-brand-800">
              {{ 'sell.concierge.address.change' | translate }}
            </button>
          </div>
        </div>
      }

      <!-- Collapsed notes -->
      <details class="mt-4 group">
        <summary class="cursor-pointer list-none flex items-center gap-2 text-[13px] font-semibold text-brand-700 hover:text-brand-800">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="transition-transform group-open:rotate-90" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          {{ 'sell.concierge.location.notesDetailsLabel' | translate }}
          <span class="text-[11px] font-normal text-muted">{{ 'sell.concierge.location.notesOptional' | translate }}</span>
        </summary>
        <textarea
          [ngModel]="notes()"
          (ngModelChange)="notesChange.emit($event)"
          name="notes"
          [placeholder]="'sell.concierge.location.notesPh' | translate"
          class="input mt-3 w-full min-h-[80px]"
          maxlength="500"
          rows="3"
        ></textarea>
        <span class="block text-end text-[11px] text-muted-2">{{ notes().length }}/500</span>
      </details>
    </div>

    <!-- Card 2: When -->
    <div class="rounded-3xl border border-line bg-white p-5 sm:p-7 shadow-brand-sm mb-5">
      <div class="mb-4">
        <h2 class="font-display text-[20px] font-bold tracking-[-0.025em] text-ink">{{ 'sell.concierge.location.when' | translate }}</h2>
        <p class="mt-1 text-[13px] text-muted">{{ 'sell.concierge.location.whenSub' | translate }}</p>
      </div>

      <div class="text-[12px] font-semibold text-ink-3 mb-2">{{ 'sell.concierge.location.dateStripLabel' | translate }}</div>
      <app-date-strip
        [value]="preferredDate()"
        [locale]="locale()"
        (dateChange)="dateChange.emit($event)"
      />

      <div class="mt-5">
        <div class="text-[12px] font-semibold text-ink-3 mb-2">{{ 'sell.concierge.location.windowSection' | translate }}</div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          @for (w of windowOpts; track w) {
            <button
              type="button"
              (click)="windowChange.emit(w)"
              [class]="windowCardClass(w)"
            >
              <div class="mb-1.5 flex items-center">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" class="text-brand-700" aria-hidden="true">
                  <path [attr.d]="windowIconPath(w)" />
                </svg>
              </div>
              <div class="text-[14px] font-bold" [class.text-brand-900]="window() === w" [class.text-ink]="window() !== w">
                {{ 'sell.concierge.location.window' + capitalize(w) | translate }}
              </div>
              <div class="text-[11px]" [class.text-brand-700]="window() === w" [class.text-muted]="window() !== w">
                {{ windowHours(w) }}
              </div>
            </button>
          }
        </div>
      </div>

      <p class="mt-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-[12px] text-brand-800">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" class="text-brand-700 flex-shrink-0 mt-0.5" aria-hidden="true"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9V5h2v4h4v2h-4v4H9v-4H5V9h4z"/></svg>
        {{ 'sell.concierge.steps.preferenceNote' | translate }}
      </p>
    </div>
  `,
  styles: [
    `
      .input {
        @apply h-11 w-full rounded-xl border border-line bg-surface-soft px-3 text-[14px] text-ink outline-none transition-colors focus:border-brand-500 focus:bg-white;
      }
      textarea.input {
        @apply min-h-[80px] py-2.5;
      }
      .map-stub {
        background:
          linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%),
          repeating-linear-gradient(45deg, rgba(30, 58, 138, 0.06) 0 1px, transparent 1px 12px);
        background-blend-mode: multiply;
      }
    `,
  ],
})
export class ConciergeStep1LocationComponent {
  readonly address = input<string>('');
  readonly governorate = input<Governorate | ''>('');
  readonly notes = input<string>('');
  readonly preferredDate = input<string>('');
  readonly window = input<PreferredWindow | ''>('');
  readonly locale = input<'en' | 'ar'>('en');
  readonly showAddressError = input<boolean>(false);

  readonly addressChange = output<{ formatted: string; governorate: AddrGovernorate | '' }>();
  readonly clearAddress = output<void>();
  readonly notesChange = output<string>();
  readonly dateChange = output<string>();
  readonly windowChange = output<PreferredWindow>();

  readonly windowOpts: ReadonlyArray<PreferredWindow> = ['morning', 'afternoon', 'evening'];

  capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  windowCardClass(w: PreferredWindow): string {
    const base = 'rounded-2xl px-4 py-4 text-left min-h-[88px] transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';
    if (this.window() === w) {
      return `${base} border-2 border-brand-700 bg-brand-50 ring-2 ring-brand-200`;
    }
    return `${base} border-2 border-line bg-white hover:border-brand-300`;
  }

  windowIconPath(w: PreferredWindow): string {
    switch (w) {
      case 'morning': return 'M5 17h14M12 3v2M5.6 5.6l1.4 1.4M18.4 5.6l-1.4 1.4M3 11h2M19 11h2M7 17a5 5 0 0110 0';
      case 'afternoon': return 'M12 4v2M12 18v2M4 12h2M18 12h2M5.6 5.6l1.4 1.4M16.9 16.9l1.5 1.5M5.6 18.4l1.4-1.4M16.9 7.1l1.5-1.5M12 8a4 4 0 110 8 4 4 0 010-8z';
      case 'evening': return 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z';
    }
  }

  windowHours(w: PreferredWindow): string {
    switch (w) {
      case 'morning': return '8 AM – 12 PM';
      case 'afternoon': return '12 – 4 PM';
      case 'evening': return '4 – 8 PM';
    }
  }
}
