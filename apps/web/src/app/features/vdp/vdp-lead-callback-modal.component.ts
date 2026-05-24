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
  input,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LeadsService, newIdempotencyKey } from '../../data/leads.service';

type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; code: 'rate_limited' | 'idempotency_required' | 'validation' | 'network_error' | 'unknown' };

const ERROR_KEY: Record<string, string> = {
  rate_limited:         'vdp.leads.modal.errors.rateLimited',
  network_error:        'vdp.leads.modal.errors.network',
  validation:           'vdp.leads.modal.errors.invalidPhone',
  idempotency_required: 'vdp.leads.modal.errors.network',
  unknown:              'vdp.leads.modal.errors.network',
};

/** Trims input, accepts Kuwait local form (`9XXXXXXX` / `5XXXXXXX` /
 *  `6XXXXXXX` — 8 digits starting 5/6/9), Kuwait national w/ leading 0
 *  (`09XXXXXXX`), or any E.164 (`+...`). Returns E.164 best-effort. */
export function normalizeKwPhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  // Strip leading 0 if present (KW national prefix)
  const local = cleaned.replace(/^0+/, '');
  // 8-digit Kuwait mobile/landline -> prepend +965
  if (/^[1-9]\d{7}$/.test(local)) return `+965${local}`;
  // Already has 965 prefix without +
  if (/^965\d{7,8}$/.test(local)) return `+${local}`;
  return cleaned || raw;
}

/** Loose client-side check — server is the source of truth. Accepts E.164
 *  (7-15 digits after +) or KW local 8-digit. */
function isPlausiblePhone(raw: string): boolean {
  const v = raw.trim();
  if (!v) return false;
  if (/^\+\d{7,15}$/.test(v)) return true;
  if (/^\d{8}$/.test(v)) return true; // bare KW
  if (/^0\d{8,9}$/.test(v)) return true;
  return false;
}

/**
 * Thin lead-capture modal — opened from `<app-vdp-lead-actions>` Request
 * Callback button. Collects name + phone (email + message optional),
 * submits via `LeadsService`, shows success state inline.
 *
 * - SSR-safe: all DOM access guarded by `isPlatformBrowser`.
 * - A11y: role=dialog, aria-modal, ESC closes, backdrop click closes,
 *   focus moves to the first field on open.
 * - Idempotency: one key per OPEN of the modal, reused if the user retries
 *   after a failure — so the server treats it as the same intent.
 */
@Component({
  selector: 'app-vdp-lead-callback-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslateModule],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-[110] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-slide-up-fade"
        (click)="onBackdrop($event)"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        [attr.aria-label]="'vdp.leads.modal.title' | translate"
      >
        <div class="relative w-full max-w-[460px] rounded-t-[20px] bg-white p-6 shadow-brand-lg sm:rounded-[20px] sm:p-7 max-h-[92dvh] overflow-y-auto">
          <button
            type="button"
            (click)="close()"
            [attr.aria-label]="'vdp.leads.modal.close' | translate"
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
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.35 1.84.59 2.8.72A2 2 0 0 1 22 16.92Z"/>
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="font-display text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink">
                  {{ (mode() === 'whatsapp' ? 'vdp.leads.modal.whatsappTitle' : 'vdp.leads.modal.title') | translate }}
                </h2>
                <p class="mt-1 text-sm text-muted">
                  {{ (mode() === 'whatsapp' ? 'vdp.leads.modal.whatsappSub' : 'vdp.leads.modal.sub') | translate }}
                </p>
              </div>
            </div>

            <form (ngSubmit)="onSubmit()" #f="ngForm" novalidate>
              <label class="mb-3 block">
                <span class="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-muted">
                  {{ 'vdp.leads.modal.name' | translate }}
                </span>
                <input
                  #firstField
                  type="text"
                  name="name"
                  [(ngModel)]="name"
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
                  {{ 'vdp.leads.modal.phone' | translate }}
                </span>
                <input
                  type="tel"
                  name="phone"
                  [(ngModel)]="phone"
                  required
                  inputmode="tel"
                  autocomplete="tel"
                  placeholder="+965 9XXX XXXX"
                  [disabled]="state().kind === 'submitting'"
                  class="block w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink shadow-brand-sm placeholder:text-muted-2 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-surface-cool disabled:opacity-60"
                />
              </label>

              <!-- v1.5-D18a: in whatsapp mode, skip email + message to keep
                   the gate to 2 fields. Submit immediately routes the user
                   to wa.me with their name/phone captured as a lead first. -->
              @if (mode() !== 'whatsapp') {
                <label class="mb-3 block">
                  <span class="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-muted">
                    {{ 'vdp.leads.modal.email' | translate }}
                    <span class="font-normal normal-case text-muted-2">({{ 'common.optional' | translate }})</span>
                  </span>
                  <input
                    type="email"
                    name="email"
                    [(ngModel)]="email"
                    maxlength="255"
                    autocomplete="email"
                    [disabled]="state().kind === 'submitting'"
                    class="block w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink shadow-brand-sm placeholder:text-muted-2 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-surface-cool disabled:opacity-60"
                  />
                </label>

                <label class="mb-4 block">
                  <span class="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-muted">
                    {{ 'vdp.leads.modal.message' | translate }}
                    <span class="font-normal normal-case text-muted-2">({{ 'common.optional' | translate }})</span>
                  </span>
                  <textarea
                    name="message"
                    [(ngModel)]="message"
                    rows="3"
                    maxlength="500"
                    [disabled]="state().kind === 'submitting'"
                    class="block w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink shadow-brand-sm placeholder:text-muted-2 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-surface-cool disabled:opacity-60"
                  ></textarea>
                </label>
              }

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
                {{ (mode() === 'whatsapp' ? 'vdp.leads.modal.whatsappSubmit' : 'vdp.leads.modal.submit') | translate }}
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
                  {{ 'vdp.leads.modal.success.title' | translate }}
                </h2>
                <p class="mt-1 text-sm text-muted">{{ 'vdp.leads.modal.success.body' | translate }}</p>
              </div>
              <button
                type="button"
                (click)="close()"
                class="mt-2 inline-flex items-center justify-center rounded-pill bg-brand-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-800 min-h-[44px]"
              >
                {{ 'vdp.leads.modal.close' | translate }}
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class VdpLeadCallbackModalComponent {
  /** Controlled-open: parent toggles this. */
  readonly open = input.required<boolean>();
  /** Optional listing UUID to attach to the lead. */
  readonly listingId = input<string | undefined>(undefined);
  /** v1.5-D18a — `'callback'` (default) renders the full form; `'whatsapp'`
   *  hides email + message and emits `submitted` on success so the parent
   *  can open wa.me with real customer details captured as a lead first. */
  readonly mode = input<'callback' | 'whatsapp'>('callback');

  /** Fired when the user dismisses the modal (X, backdrop, ESC, or success
   *  Close). Parent should set `[open]="false"`. */
  readonly closed = output<void>();
  /** v1.5-D18a — Fired immediately after a successful lead POST. In
   *  `whatsapp` mode the parent uses this to close the modal + open wa.me. */
  readonly submitted = output<void>();

  private readonly leads = inject(LeadsService);
  private readonly platformId = inject(PLATFORM_ID);

  // ── Form fields (ngModel) ──────────────────────────────────────────────────
  name = '';
  phone = '';
  email = '';
  message = '';

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
    // Lock body scroll + reset form whenever modal opens.
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const isOpen = this.open();
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (isOpen) {
        this.resetForm();
        // Defer focus to next tick — Angular renders the field after this
        // effect runs.
        setTimeout(() => this.firstField?.nativeElement?.focus(), 50);
      }
    });
  }

  private resetForm(): void {
    this.name = '';
    this.phone = '';
    this.email = '';
    this.message = '';
    this.state.set({ kind: 'idle' });
    this.formError.set(null);
    this.currentKey = newIdempotencyKey();
  }

  onSubmit(): void {
    this.formError.set(null);

    const name = this.name.trim();
    const rawPhone = this.phone.trim();

    if (name.length < 2) {
      this.formError.set('vdp.leads.modal.errors.required');
      return;
    }
    if (!isPlausiblePhone(rawPhone)) {
      this.formError.set('vdp.leads.modal.errors.invalidPhone');
      return;
    }

    const phone = normalizeKwPhone(rawPhone);
    const key = this.currentKey ?? newIdempotencyKey();
    this.currentKey = key;

    this.state.set({ kind: 'submitting' });

    const isWhatsApp = this.mode() === 'whatsapp';
    this.leads
      .submitLead({
        name,
        phone,
        // In whatsapp mode email + message are hidden; send nothing.
        email: isWhatsApp ? undefined : (this.email.trim() || undefined),
        message: isWhatsApp ? undefined : (this.message.trim() || undefined),
        listingId: this.listingId() || undefined,
        channel: isWhatsApp ? 'vdp_whatsapp' : 'vdp_callback',
        idempotencyKey: key,
      })
      .subscribe((s) => {
        if (s.kind === 'loading') return;
        if (s.kind === 'ok') {
          // v1.5-D18a — In whatsapp mode the parent handles the next step
          // (open wa.me + close modal), so we skip the in-modal success
          // screen entirely and fire the event instead.
          if (isWhatsApp) {
            this.submitted.emit();
          } else {
            this.state.set({ kind: 'success' });
          }
        } else {
          this.state.set({ kind: 'error', code: s.code });
        }
      });
  }

  close(): void {
    this.closed.emit();
  }

  onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }
}
