import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  AddressSuggestionService,
  type AddressSuggestion,
  type Governorate,
} from '../data/address-suggestion.service';

/**
 * Google-Places-style address typeahead. Bind `value` to the parent's address
 * string; we emit `(addressChange)` with the formatted text + derived
 * governorate when the user picks a suggestion. Also fires on raw text input
 * (no governorate yet) so the parent's signal stays in sync.
 *
 * Adapter pattern via AddressSuggestionService — currently backed by a static
 * KW seed; will swap to Google Places when the API key lands.
 */
@Component({
  selector: 'app-address-autocomplete',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="relative">
      <!-- Big brand-bordered input -->
      <div
        class="flex items-center gap-2 rounded-xl border-2 border-brand-200 bg-white px-4 py-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="text-brand-700 flex-shrink-0"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          #queryInput
          type="text"
          [value]="value()"
          (input)="onInput($any($event.target).value)"
          (focus)="onFocus()"
          [placeholder]="'sell.concierge.address.searchPh' | translate"
          class="flex-1 bg-transparent text-[14px] outline-none"
          autocomplete="off"
          [attr.aria-expanded]="open()"
          [attr.aria-controls]="listboxId"
          role="combobox"
        />
        @if (value()) {
          <button
            type="button"
            (click)="clear()"
            class="text-muted hover:text-ink-3 text-[11px] font-semibold"
            [attr.aria-label]="'sell.concierge.address.change' | translate"
          >
            ✕
          </button>
        }
      </div>

      <!-- Suggestions dropdown -->
      @if (open() && (suggestions().length > 0 || value().length > 0)) {
        <div
          [id]="listboxId"
          role="listbox"
          class="absolute left-0 right-0 mt-1 rounded-2xl border border-line bg-white shadow-brand z-10 overflow-hidden"
        >
          @for (s of suggestions(); track s.formatted; let i = $index) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="false"
              (click)="pick(s)"
              class="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-cool text-left"
              [class.border-t]="i > 0"
              [class.border-line]="i > 0"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="text-brand-700 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
                />
              </svg>
              <div class="flex-1 min-w-0">
                <div class="text-[14px] font-semibold text-ink truncate">{{ s.formatted }}</div>
                <div class="text-[12px] text-muted">
                  {{ s.area }} ·
                  {{ 'sell.concierge.governorates.' + s.governorate | translate }}
                </div>
              </div>
            </button>
          }
          @if (suggestions().length === 0 && value().length > 0) {
            <div class="px-4 py-3 text-[13px] text-muted">
              {{ 'sell.concierge.address.noResults' | translate }}
            </div>
          }
          <!-- Geolocation footer -->
          <div class="border-t border-line p-2 bg-surface-soft">
            <button
              type="button"
              (click)="useMyLocation()"
              [disabled]="locating()"
              class="w-full flex items-center justify-center gap-2 rounded-lg bg-white border border-brand-200 px-3 py-2 text-[13px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                />
              </svg>
              @if (locating()) {
                {{ 'sell.concierge.address.locating' | translate }}
              } @else {
                {{ 'sell.concierge.address.useLocation' | translate }}
              }
            </button>
            @if (locationError(); as err) {
              <p class="mt-1 text-[11px] text-red-600 text-center">{{ err }}</p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class AddressAutocompleteComponent {
  private readonly host = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly svc = inject(AddressSuggestionService);

  readonly value = input<string>('');

  readonly addressChange = output<{ formatted: string; governorate: Governorate | '' }>();

  readonly open = signal(false);
  readonly suggestions = signal<AddressSuggestion[]>([]);
  readonly locating = signal(false);
  readonly locationError = signal<string | null>(null);

  readonly listboxId = `addr-list-${Math.random().toString(36).slice(2, 9)}`;

  private debounceHandle: ReturnType<typeof setTimeout> | null = null;

  onFocus(): void {
    this.open.set(true);
    if (this.value().length >= 1 && this.suggestions().length === 0) {
      void this.runSearch(this.value());
    }
  }

  onInput(raw: string): void {
    /* Echo the typed string back to the parent immediately so the model stays
       in sync even before the user picks a suggestion. Governorate is cleared
       — it only gets a value when a suggestion is selected. */
    this.addressChange.emit({ formatted: raw, governorate: '' });
    this.open.set(true);
    this.locationError.set(null);

    if (this.debounceHandle) clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => {
      void this.runSearch(raw);
    }, 120);
  }

  private async runSearch(q: string): Promise<void> {
    if (q.trim().length < 1) {
      this.suggestions.set([]);
      return;
    }
    const results = await this.svc.search(q, 5);
    this.suggestions.set(results);
  }

  pick(s: AddressSuggestion): void {
    this.addressChange.emit({ formatted: s.formatted, governorate: s.governorate });
    this.suggestions.set([]);
    this.open.set(false);
  }

  clear(): void {
    this.addressChange.emit({ formatted: '', governorate: '' });
    this.suggestions.set([]);
    this.open.set(true);
  }

  useMyLocation(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const geo = (globalThis as { navigator?: Navigator }).navigator?.geolocation;
    if (!geo) {
      this.locationError.set('Geolocation not available in this browser.');
      return;
    }
    this.locating.set(true);
    this.locationError.set(null);
    geo.getCurrentPosition(
      async (pos) => {
        try {
          const guess = await this.svc.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          this.locating.set(false);
          if (guess) {
            this.pick(guess);
          } else {
            this.locationError.set('Could not match your location to an address.');
          }
        } catch {
          this.locating.set(false);
          this.locationError.set('Could not look up your location. Please type the address.');
        }
      },
      (err) => {
        this.locating.set(false);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Please type the address.'
            : 'Could not get your location. Please type the address.';
        this.locationError.set(msg);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: Event): void {
    if (!this.host.nativeElement.contains(ev.target as Node)) {
      this.open.set(false);
    }
  }
}
