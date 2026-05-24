import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import type {
  TestDriveLocation,
  TestDriveWindow,
} from '@behbehani-cpo/shared-types';
import {
  TestDriveService,
  newTestDriveIdempotencyKey,
  type SubmitTestDriveErrorCode,
} from '../../data/test-drive.service';
import { VdpTestDriveModalService } from './vdp-test-drive-modal.service';
import { DateStripComponent } from '../../shared/date-strip.component';
import {
  normalizeKwPhone,
} from './vdp-lead-callback-modal.component';

type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; code: SubmitTestDriveErrorCode };

const ERROR_KEY: Record<SubmitTestDriveErrorCode, string> = {
  rate_limited:  'vdp.testDrive.modal.errors.rateLimited',
  unavailable:   'vdp.testDrive.modal.errors.unavailable',
  validation:    'vdp.testDrive.modal.errors.generic',
  network_error: 'vdp.testDrive.modal.errors.network',
  unknown:       'vdp.testDrive.modal.errors.generic',
};

const WINDOWS: ReadonlyArray<TestDriveWindow> = ['morning', 'afternoon', 'evening'];
const LOCATIONS: ReadonlyArray<TestDriveLocation> = ['showroom', 'customer_address'];

/** Loose client-side check — server is source of truth. Accepts E.164 or KW
 *  local 8-digit forms. */
function isPlausiblePhone(raw: string): boolean {
  const v = raw.trim();
  if (!v) return false;
  if (/^\+\d{7,15}$/.test(v)) return true;
  if (/^\d{8}$/.test(v)) return true;
  if (/^0\d{8,9}$/.test(v)) return true;
  return false;
}

/** Returns tomorrow's date in YYYY-MM-DD (local), for the input min attribute. */
function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Full Test Drive booking modal — opened from `<app-vdp-pricing-card>`.
 * Sections: customer (name/phone/email) · when (date strip + window radio) ·
 * where (showroom vs customer address, conditional address input) · notes.
 *
 * - SSR-safe: all DOM access guarded by `isPlatformBrowser`.
 * - A11y: role=dialog, aria-modal, ESC closes, backdrop click closes, focus
 *   moves to first input on open.
 * - Idempotency: one key per OPEN, reused on retry so the server treats
 *   retries as the same intent.
 * - Brand-lock: white + Royal Blue only; red reserved for error alerts.
 */
@Component({
  selector: 'app-vdp-test-drive-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslateModule, DateStripComponent],
  template: `
    @if (modal.isOpen()) {
      <div
        class="fixed inset-0 z-[110] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-slide-up-fade"
        (click)="onBackdrop($event)"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        [attr.aria-label]="'vdp.testDrive.modal.title' | translate"
      >
        <div class="relative w-full max-w-[520px] rounded-t-[20px] bg-white p-6 shadow-brand-lg sm:rounded-[20px] sm:p-7 max-h-[92dvh] overflow-y-auto">
          <button
            type="button"
            (click)="close()"
            [attr.aria-label]="'vdp.testDrive.modal.close' | translate"
            class="absolute end-4 top-4 inline-grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-cool hover:text-ink"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M6 6l12 12M6 18L18 6"/>
            </svg>
          </button>

          @if (state().kind !== 'success') {
            <div class="mb-5 flex items-start gap-3">
              <div class="inline-grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-brand-700/10 text-brand-700">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M5 17h2l2-6h6l2 6h2l-2-7h-1l-1-3H9L8 10H7l-2 7zM7 17a2 2 0 1 0 4 0M13 17a2 2 0 1 0 4 0"/>
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="font-display text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink">
                  {{ 'vdp.testDrive.modal.title' | translate }}
                </h2>
                <p class="mt-1 text-sm text-muted">{{ 'vdp.testDrive.modal.sub' | translate }}</p>
              </div>
            </div>

            <form (ngSubmit)="onSubmit()" #f="ngForm" novalidate>
              <!-- ── Customer ──────────────────────────────────────────── -->
              <h3 class="mt-1 mb-2 text-[12px] font-semibold uppercase tracking-wider text-brand-700">
                {{ 'vdp.testDrive.modal.sections.customer' | translate }}
              </h3>

              <label class="mb-3 block">
                <span class="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-muted">
                  {{ 'vdp.testDrive.modal.fields.name' | translate }}
                </span>
                <input
                  #firstField
                  type="text"
                  name="customerName"
                  [(ngModel)]="customerName"
                  required
                  minlength="2"
                  maxlength="120"
                  autocomplete="name"
                  [disabled]="state().kind === 'submitting'"
                  class="block w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink shadow-brand-sm placeholder:text-muted-2 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-surface-cool disabled:opacity-60"
                />
              </label>

              <label class="mb-3 block">
                <span class="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-muted">
                  {{ 'vdp.testDrive.modal.fields.phone' | translate }}
                </span>
                <input
                  type="tel"
                  name="customerPhone"
                  [(ngModel)]="customerPhone"
                  required
                  inputmode="tel"
                  autocomplete="tel"
                  placeholder="+965 9XXX XXXX"
                  [disabled]="state().kind === 'submitting'"
                  class="block w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink shadow-brand-sm placeholder:text-muted-2 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-surface-cool disabled:opacity-60"
                />
              </label>

              <label class="mb-4 block">
                <span class="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-muted">
                  {{ 'vdp.testDrive.modal.fields.email' | translate }}
                  <span class="font-normal normal-case text-muted-2">({{ 'common.optional' | translate }})</span>
                </span>
                <input
                  type="email"
                  name="customerEmail"
                  [(ngModel)]="customerEmail"
                  maxlength="255"
                  autocomplete="email"
                  [disabled]="state().kind === 'submitting'"
                  class="block w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink shadow-brand-sm placeholder:text-muted-2 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-surface-cool disabled:opacity-60"
                />
              </label>

              <!-- ── When ──────────────────────────────────────────────── -->
              <h3 class="mt-2 mb-2 text-[12px] font-semibold uppercase tracking-wider text-brand-700">
                {{ 'vdp.testDrive.modal.sections.when' | translate }}
              </h3>

              <div class="mb-3">
                <span class="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-muted">
                  {{ 'vdp.testDrive.modal.fields.date' | translate }}
                </span>
                <app-date-strip
                  [value]="preferredDate()"
                  [locale]="locale()"
                  [startOffset]="1"
                  [count]="14"
                  (dateChange)="onDateChange($event)"
                />
                <input
                  type="date"
                  name="preferredDate"
                  [ngModel]="preferredDate()"
                  (ngModelChange)="onDateChange($event)"
                  [min]="minDate"
                  [disabled]="state().kind === 'submitting'"
                  class="mt-2 block w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-ink shadow-brand-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-surface-cool disabled:opacity-60"
                />
              </div>

              <div class="mb-4">
                <span class="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-muted">
                  {{ 'vdp.testDrive.modal.fields.window' | translate }}
                </span>
                <div role="radiogroup" [attr.aria-label]="'vdp.testDrive.modal.fields.window' | translate" class="grid grid-cols-3 gap-2">
                  @for (w of windows; track w) {
                    <button
                      type="button"
                      role="radio"
                      [attr.aria-checked]="preferredWindow() === w"
                      (click)="preferredWindow.set(w)"
                      [disabled]="state().kind === 'submitting'"
                      [class]="windowBtnClass(w)"
                    >
                      {{ ('vdp.testDrive.modal.windows.' + w) | translate }}
                    </button>
                  }
                </div>
              </div>

              <!-- ── Where ─────────────────────────────────────────────── -->
              <h3 class="mt-2 mb-2 text-[12px] font-semibold uppercase tracking-wider text-brand-700">
                {{ 'vdp.testDrive.modal.sections.where' | translate }}
              </h3>

              <div class="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                @for (loc of locations; track loc) {
                  <button
                    type="button"
                    role="radio"
                    [attr.aria-checked]="location() === loc"
                    (click)="setLocation(loc)"
                    [disabled]="state().kind === 'submitting'"
                    [class]="locationBtnClass(loc)"
                  >
                    <span class="text-[14px] font-semibold">
                      {{ ('vdp.testDrive.modal.location.' + loc) | translate }}
                    </span>
                  </button>
                }
              </div>

              @if (location() === 'customer_address') {
                <label class="mb-4 block">
                  <span class="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-muted">
                    {{ 'vdp.testDrive.modal.fields.addressLine' | translate }}
                  </span>
                  <textarea
                    name="addressLine"
                    [(ngModel)]="addressLine"
                    rows="2"
                    maxlength="500"
                    [disabled]="state().kind === 'submitting'"
                    class="block w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink shadow-brand-sm placeholder:text-muted-2 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-surface-cool disabled:opacity-60"
                  ></textarea>
                </label>
              }

              <!-- ── Notes ─────────────────────────────────────────────── -->
              <h3 class="mt-2 mb-2 text-[12px] font-semibold uppercase tracking-wider text-brand-700">
                {{ 'vdp.testDrive.modal.sections.notes' | translate }}
              </h3>

              <label class="mb-4 block">
                <span class="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-muted">
                  {{ 'vdp.testDrive.modal.fields.notes' | translate }}
                  <span class="font-normal normal-case text-muted-2">({{ 'common.optional' | translate }})</span>
                </span>
                <textarea
                  name="customerNotes"
                  [(ngModel)]="customerNotes"
                  rows="3"
                  maxlength="1000"
                  [disabled]="state().kind === 'submitting'"
                  class="block w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink shadow-brand-sm placeholder:text-muted-2 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-surface-cool disabled:opacity-60"
                ></textarea>
              </label>

              <!-- ── Error band ────────────────────────────────────────── -->
              @if (errorKey()) {
                <p class="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {{ errorKey()! | translate }}
                </p>
              }
              @if (formError()) {
                <p class="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {{ formError()! | translate }}
                </p>
              }

              <button
                type="submit"
                [disabled]="state().kind === 'submitting'"
                class="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-6 py-3.5 text-[15px] font-bold text-white shadow-brand hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
              >
                @if (state().kind === 'submitting') {
                  <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                }
                {{ 'vdp.testDrive.modal.submit' | translate }}
              </button>
            </form>
          } @else {
            <div class="flex flex-col items-center gap-4 py-8 text-center">
              <div class="inline-grid h-14 w-14 place-items-center rounded-full bg-brand-700/10 text-brand-700">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                  <circle cx="12" cy="12" r="9"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
              </div>
              <div>
                <h2 class="font-display text-[20px] font-bold text-ink">
                  {{ 'vdp.testDrive.modal.success.title' | translate }}
                </h2>
                <p class="mt-1 text-sm text-muted">{{ 'vdp.testDrive.modal.success.body' | translate }}</p>
              </div>
              <button
                type="button"
                (click)="close()"
                class="mt-2 inline-flex items-center justify-center rounded-pill bg-brand-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-800 min-h-[44px]"
              >
                {{ 'vdp.testDrive.modal.close' | translate }}
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class VdpTestDriveModalComponent {
  protected readonly modal = inject(VdpTestDriveModalService);
  private readonly testDrive = inject(TestDriveService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly language = inject(LanguageService);

  // ── Static lookups for the template ────────────────────────────────────────
  readonly windows = WINDOWS;
  readonly locations = LOCATIONS;
  readonly minDate = tomorrowIso();

  readonly locale = computed<'en' | 'ar'>(() => this.language.current());

  // ── Form fields ────────────────────────────────────────────────────────────
  customerName = '';
  customerPhone = '';
  customerEmail = '';
  addressLine = '';
  customerNotes = '';

  /** Signals for fields that drive template branches / shared components. */
  readonly preferredDate = signal<string>(this.minDate);
  readonly preferredWindow = signal<TestDriveWindow>('morning');
  readonly location = signal<TestDriveLocation>('showroom');

  readonly state = signal<FormState>({ kind: 'idle' });
  readonly errorKey = computed(() => {
    const s = this.state();
    return s.kind === 'error' ? ERROR_KEY[s.code] ?? ERROR_KEY['unknown'] : null;
  });
  readonly formError = signal<string | null>(null);

  /** Generated once per OPEN — reused on retry so the server idempotency
   *  check actually does its job. */
  private currentKey: string | null = null;

  @ViewChild('firstField') firstField?: ElementRef<HTMLInputElement>;

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const isOpen = this.modal.isOpen();
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (isOpen) {
        this.resetForm();
        setTimeout(() => this.firstField?.nativeElement?.focus(), 50);
      }
    });
  }

  private resetForm(): void {
    this.customerName = '';
    this.customerPhone = '';
    this.customerEmail = '';
    this.addressLine = '';
    this.customerNotes = '';
    this.preferredDate.set(this.minDate);
    this.preferredWindow.set('morning');
    this.location.set('showroom');
    this.state.set({ kind: 'idle' });
    this.formError.set(null);
    this.currentKey = newTestDriveIdempotencyKey();
  }

  onDateChange(iso: string): void {
    this.preferredDate.set(iso);
  }

  setLocation(loc: TestDriveLocation): void {
    this.location.set(loc);
    if (loc === 'showroom') {
      // Clear address when switching back to showroom to avoid stale data.
      this.addressLine = '';
    }
  }

  onSubmit(): void {
    this.formError.set(null);

    const name = this.customerName.trim();
    const rawPhone = this.customerPhone.trim();
    const date = this.preferredDate();
    const loc = this.location();
    const addr = this.addressLine.trim();

    if (name.length < 2) {
      this.formError.set('vdp.testDrive.modal.errors.required');
      return;
    }
    if (!isPlausiblePhone(rawPhone)) {
      this.formError.set('vdp.testDrive.modal.errors.invalidPhone');
      return;
    }
    if (!date || date < this.minDate) {
      this.formError.set('vdp.testDrive.modal.errors.invalidDate');
      return;
    }
    if (loc === 'customer_address' && addr.length === 0) {
      this.formError.set('vdp.testDrive.modal.errors.addressRequired');
      return;
    }

    const phone = normalizeKwPhone(rawPhone);
    const key = this.currentKey ?? newTestDriveIdempotencyKey();
    this.currentKey = key;

    this.state.set({ kind: 'submitting' });

    this.testDrive
      .submitBooking(
        {
          customerName: name,
          customerPhone: phone,
          customerEmail: this.customerEmail.trim() || undefined,
          preferredDate: date,
          preferredWindow: this.preferredWindow(),
          location: loc,
          addressLine: loc === 'customer_address' ? addr : undefined,
          customerNotes: this.customerNotes.trim() || undefined,
          listingId: this.modal.listingId() ?? undefined,
        },
        key,
      )
      .subscribe((s) => {
        if (s.kind === 'loading') return;
        if (s.kind === 'ok') {
          this.state.set({ kind: 'success' });
        } else {
          this.state.set({ kind: 'error', code: s.code });
        }
      });
  }

  close(): void {
    this.modal.close();
  }

  onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modal.isOpen()) this.close();
  }

  // ── Template helpers ───────────────────────────────────────────────────────

  windowBtnClass(w: TestDriveWindow): string {
    const base =
      'rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 min-h-[44px] disabled:cursor-not-allowed disabled:opacity-60';
    const selected = 'border-brand-700 bg-brand-50 text-brand-700';
    const unselected = 'border-line bg-white text-ink hover:border-brand-300';
    return `${base} ${this.preferredWindow() === w ? selected : unselected}`;
  }

  locationBtnClass(loc: TestDriveLocation): string {
    const base =
      'flex items-center justify-center rounded-xl border px-4 py-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 min-h-[54px] disabled:cursor-not-allowed disabled:opacity-60';
    const selected = 'border-brand-700 bg-brand-50 text-brand-700';
    const unselected = 'border-line bg-white text-ink hover:border-brand-300';
    return `${base} ${this.location() === loc ? selected : unselected}`;
  }
}
