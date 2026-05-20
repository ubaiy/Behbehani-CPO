import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap } from 'rxjs';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import type {
  ConciergeBookingStatus,
  InspectionStatus,
} from '@behbehani-cpo/shared-types';
import {
  SellBookingsService,
  type GetBookingStatusResult,
} from '../../data/sell-bookings.service';

/**
 * Customer-facing booking-status tracker.
 *
 * Route: `/{locale}/sell/concierge/status/:bookingRef`
 *
 * - Renders the slim `ConciergeBookingStatus` DTO from session B (no inspector
 *   PII, no internal notes).
 * - Polls GET /v1/public/concierge/inspections/:bookingRef every 30 seconds
 *   while the booking is non-terminal (status !== 'signed_off').
 * - Surfaces a "Sign now" CTA → /inspection-sign/:token when
 *   `signLinkAvailable` is true (the page itself doesn't know the token —
 *   the customer received it via SMS/email; we link to a "use your email link"
 *   instruction card instead).
 * - Reached two ways: redirected from a successful POST on /sell/concierge,
 *   or opened from the email confirmation B's notifications service sends.
 *
 * Owned by session A. See CONCIERGE_INSPECTION_API_CONTRACT.md v0.6 §3 (A3).
 */

type ViewState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: ConciergeBookingStatus }
  | { kind: 'not_found' }
  | { kind: 'network_error' }
  | { kind: 'error'; message: string };

const POLL_INTERVAL_MS = 30_000;
const TERMINAL_STATUSES: ReadonlySet<InspectionStatus> = new Set(['signed_off']);

@Component({
  selector: 'app-sell-concierge-status-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <!-- ─── HERO HEADER ──────────────────────────────────────────────── -->
    <header class="border-b border-line bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
      <div class="container-page py-8 sm:py-10">
        <a
          [routerLink]="['/', currentLocale(), 'sell']"
          class="inline-flex items-center gap-1 text-[13px] font-medium text-white/80 hover:text-white"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="backArrow()" />
          </svg>
          {{ 'sell.concierge.status.back' | translate }}
        </a>
        <h1 class="mt-4 font-display text-[clamp(24px,3.2vw,36px)] font-bold leading-tight tracking-[-0.025em] text-white">
          {{ 'sell.concierge.status.title' | translate }}
        </h1>
        <p class="mt-2 max-w-xl text-[14px] text-white/85 sm:text-[15px]">
          {{ 'sell.concierge.status.sub' | translate }}
        </p>
      </div>
    </header>

    <main class="container-page py-8 sm:py-10">
      <!-- ─── LOADING ──────────────────────────────────────────────── -->
      @if (state().kind === 'loading') {
        <div
          class="rounded-3xl border border-line bg-white p-10 text-center text-sm text-muted shadow-brand-sm"
          aria-busy="true"
          aria-live="polite"
        >
          <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-600"></span>
          <span class="ml-2">{{ 'sell.concierge.status.loading' | translate }}</span>
        </div>
      }

      <!-- ─── TERMINAL ERROR STATES ────────────────────────────────── -->
      @if (terminalState(); as t) {
        <div class="mx-auto max-w-xl rounded-3xl border border-line bg-white p-8 text-center shadow-brand-sm">
          <div
            class="mx-auto inline-grid h-14 w-14 place-items-center rounded-full"
            [class.bg-amber-50]="t === 'network_error'"
            [class.text-amber-700]="t === 'network_error'"
            [class.bg-surface-cool]="t !== 'network_error'"
            [class.text-ink-3]="t !== 'network_error'"
          >
            @switch (t) {
              @case ('network_error') {
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M3 9a16 16 0 0118 0M6 12a11 11 0 0112 0M9 15a6 6 0 016 0M12 18.5h.01" />
                </svg>
              }
              @default {
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9 9l6 6M15 9l-6 6" />
                </svg>
              }
            }
          </div>
          <h2 class="mt-4 font-display text-[22px] font-bold tracking-[-0.025em] text-ink">
            {{ ('sell.concierge.status.terminal.' + t + '.title') | translate }}
          </h2>
          <p class="mt-2 text-[14px] text-muted">
            {{ ('sell.concierge.status.terminal.' + t + '.sub') | translate }}
          </p>
          @if (t === 'network_error') {
            <button
              type="button"
              (click)="refreshNow()"
              class="mt-5 inline-flex items-center gap-2 rounded-pill bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {{ 'sell.concierge.status.terminal.network_error.cta' | translate }}
            </button>
          } @else {
            <a
              [routerLink]="['/', currentLocale(), 'sell']"
              class="mt-5 inline-flex items-center gap-2 rounded-pill bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {{ 'sell.concierge.status.terminal.not_found.cta' | translate }}
            </a>
          }
        </div>
      }

      <!-- ─── ACTIVE BOOKING CARD ──────────────────────────────────── -->
      @if (bookingData(); as data) {
        <!-- Lead: bookingRef + status pill -->
        <div class="mx-auto max-w-2xl">
          <div class="rounded-3xl border border-line bg-white shadow-brand-sm">
            <!-- Header row: ref + status -->
            <div class="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
              <div>
                <p class="text-[11px] uppercase tracking-wider text-muted">
                  {{ 'sell.concierge.status.bookingRefLabel' | translate }}
                </p>
                <p class="mt-0.5 font-display text-[20px] font-bold tabular-nums tracking-[-0.02em] text-ink">
                  {{ data.bookingRef }}
                </p>
              </div>
              <span
                class="inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
                [class.bg-amber-100]="!isTerminal(data.status)"
                [class.text-amber-800]="!isTerminal(data.status)"
                [class.bg-emerald-100]="isTerminal(data.status)"
                [class.text-emerald-800]="isTerminal(data.status)"
              >
                <span
                  class="inline-block h-1.5 w-1.5 rounded-full"
                  [class.bg-amber-500]="!isTerminal(data.status)"
                  [class.bg-emerald-500]="isTerminal(data.status)"
                  [class.animate-pulse]="!isTerminal(data.status)"
                ></span>
                {{ ('sell.concierge.status.pill.' + data.status) | translate }}
              </span>
            </div>

            <!-- Vehicle summary -->
            <div class="border-b border-line px-6 py-5">
              <p class="text-[11px] uppercase tracking-wider text-muted">
                {{ 'sell.concierge.status.vehicleLabel' | translate }}
              </p>
              <p class="mt-1 text-[16px] font-semibold text-ink">{{ vehicleLine(data) }}</p>
              <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                @if (data.vehicle.mileageKm !== null) {
                  <dt class="text-muted">{{ 'sell.concierge.status.mileage' | translate }}</dt>
                  <dd class="text-ink">{{ data.vehicle.mileageKm | number }} km</dd>
                }
                @if (data.vehicle.vinMasked) {
                  <dt class="text-muted">{{ 'sell.concierge.status.vin' | translate }}</dt>
                  <dd class="font-mono text-[12px] text-ink">{{ data.vehicle.vinMasked }}</dd>
                }
              </dl>
            </div>

            <!-- Schedule / preference -->
            @if (data.customerPreference; as pref) {
              <div class="border-b border-line px-6 py-5">
                <p class="text-[11px] uppercase tracking-wider text-muted">
                  {{ 'sell.concierge.status.scheduleLabel' | translate }}
                </p>
                <p class="mt-1 text-[15px] font-medium text-ink">
                  {{ formatDate(pref.preferredDate) }}
                  <span class="text-muted">·</span>
                  {{ ('sell.concierge.status.window.' + pref.window) | translate }}
                </p>
                <p class="mt-2 text-[12px] text-muted">
                  {{ 'sell.concierge.status.scheduleNote' | translate }}
                </p>
              </div>
            } @else {
              <div class="border-b border-line px-6 py-5">
                <p class="text-[11px] uppercase tracking-wider text-muted">
                  {{ 'sell.concierge.status.scheduleLabel' | translate }}
                </p>
                <p class="mt-1 text-[14px] text-muted">
                  {{ 'sell.concierge.status.noPreference' | translate }}
                </p>
              </div>
            }

            <!-- Inspector assignment -->
            <div class="border-b border-line px-6 py-5">
              <p class="text-[11px] uppercase tracking-wider text-muted">
                {{ 'sell.concierge.status.inspectorLabel' | translate }}
              </p>
              @if (data.inspectorAssigned) {
                <p class="mt-1 flex items-center gap-2 text-[15px] font-medium text-emerald-700">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  {{ 'sell.concierge.status.inspectorAssigned' | translate }}
                </p>
              } @else {
                <p class="mt-1 flex items-center gap-2 text-[14px] text-muted">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="10" cy="10" r="8" />
                    <path d="M10 6v4l2.5 1.5" />
                  </svg>
                  {{ 'sell.concierge.status.inspectorPending' | translate }}
                </p>
              }
              @if (data.inspectedAt) {
                <p class="mt-1 text-[12px] text-muted">
                  {{ 'sell.concierge.status.inspectedAt' | translate }}
                  <span class="text-ink">{{ formatDateTime(data.inspectedAt) }}</span>
                </p>
              }
            </div>

            <!-- Sign-now CTA (when link active) -->
            @if (data.signLinkAvailable) {
              <div class="bg-brand-50 px-6 py-5">
                <p class="text-[13px] font-semibold text-brand-800">
                  {{ 'sell.concierge.status.signReady.title' | translate }}
                </p>
                <p class="mt-1 text-[12px] text-brand-700">
                  {{ 'sell.concierge.status.signReady.sub' | translate }}
                </p>
              </div>
            }

            <!-- Footer: support contact -->
            <div class="rounded-b-3xl bg-surface-soft px-6 py-4">
              <p class="text-[12px] text-muted">
                {{ 'sell.concierge.status.support' | translate }}
                <a
                  href="tel:+96522282282"
                  class="font-semibold text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
                >
                  +965 22 282 282
                </a>
              </p>
            </div>
          </div>

          <!-- Quiet refresh hint -->
          @if (!isTerminal(data.status)) {
            <p class="mt-3 text-center text-[11px] text-muted" aria-live="polite">
              {{ 'sell.concierge.status.autoRefresh' | translate }}
            </p>
          }
        </div>
      }
    </main>
  `,
})
export class SellConciergeStatusPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly bookings = inject(SellBookingsService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<ViewState>({ kind: 'loading' });
  readonly currentLocale = computed(() => this.language.current());
  readonly backArrow = computed(() =>
    this.currentLocale() === 'ar' ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7',
  );

  private bookingRef = '';

  ngOnInit(): void {
    const set = () => this.title.setTitle(this.translate.instant('sell.concierge.status.metaTitle'));
    set();
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(set);
    /* Don't index the tracker — it's a per-booking surface. */
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    this.bookingRef = this.route.snapshot.paramMap.get('bookingRef') ?? '';
    if (!this.bookingRef) {
      this.state.set({ kind: 'not_found' });
      return;
    }

    /* Poll on a 30s timer until the booking reaches a terminal status.
       startWith(0) fires the first request immediately. */
    interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.bookings.getStatus$(this.bookingRef)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => this.applyFetch(res));
  }

  /* ─── State helpers ─────────────────────────────────────────────── */

  bookingData(): ConciergeBookingStatus | null {
    const s = this.state();
    return s.kind === 'ok' ? s.data : null;
  }

  terminalState(): 'not_found' | 'network_error' | null {
    const s = this.state();
    if (s.kind === 'not_found' || s.kind === 'network_error') return s.kind;
    return null;
  }

  isTerminal(status: InspectionStatus): boolean {
    return TERMINAL_STATUSES.has(status);
  }

  refreshNow(): void {
    this.state.set({ kind: 'loading' });
    this.bookings
      .getStatus$(this.bookingRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => this.applyFetch(res));
  }

  /* ─── Render helpers ────────────────────────────────────────────── */

  vehicleLine(data: ConciergeBookingStatus): string {
    const v = data.vehicle;
    const parts: Array<string | number> = [];
    if (v.year) parts.push(v.year);
    if (v.brand) parts.push(v.brand);
    if (v.model) parts.push(v.model);
    return parts.length > 0 ? parts.join(' ') : '—';
  }

  formatDate(iso: string): string {
    /* `iso` is YYYY-MM-DD on the preferredDate field (date-only) but we accept
       full ISO too. Build a Date from a plain YYYY-MM-DD so we don't trip
       UTC vs. local issues. */
    const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
    return d.toLocaleDateString(this.currentLocale() === 'ar' ? 'ar-KW' : 'en-KW', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString(this.currentLocale() === 'ar' ? 'ar-KW' : 'en-KW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /* ─── Fetch result reducer ──────────────────────────────────────── */

  private applyFetch(res: GetBookingStatusResult): void {
    switch (res.kind) {
      case 'ok':
        this.state.set({ kind: 'ok', data: res.data });
        break;
      case 'not_found':
      case 'network_error':
        this.state.set({ kind: res.kind });
        break;
      case 'error':
        this.state.set({ kind: 'error', message: res.message });
        break;
    }
  }
}
