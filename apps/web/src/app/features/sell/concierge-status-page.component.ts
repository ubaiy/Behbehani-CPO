import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap } from 'rxjs';
import { LanguageService, fmtDate } from '@behbehani-cpo/shared-i18n';
import type { ConciergeBookingStatus } from '@behbehani-cpo/shared-types';
import {
  SellBookingsService,
  type GetBookingStatusResult,
} from '../../data/sell-bookings.service';
import { TrackerTimelineComponent } from './concierge/tracker-timeline.component';
import {
  TrackerInspectorCardComponent,
  type InspectorInfo,
} from './concierge/tracker-inspector-card.component';

/**
 * Customer-facing booking-status tracker (v2 redesign).
 * Route: `/{locale}/sell/concierge/status/:bookingRef`. Polls every 30 s while
 * non-terminal. Two visual states (in-progress / signed) per approved mockup
 * sell-concierge-v2.html L568-760. Brand-blue throughout (mockup emerald
 * accents are brand-lock violations — differentiate via inner content; red
 * permitted only for destructive Cancel). Session A; contract v0.6 §3 (A3).
 */

type ViewState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: ConciergeBookingStatus }
  | { kind: 'not_found' }
  | { kind: 'network_error' }
  | { kind: 'error'; message: string };

const POLL_INTERVAL_MS = 30_000;
const SUPPORT_PHONE_E164 = '+96522282282';

@Component({
  selector: 'app-sell-concierge-status-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    TrackerTimelineComponent,
    TrackerInspectorCardComponent,
  ],
  template: `
    <!-- ─── BACK LINK (canonical, above hero card) ──────────────────── -->
    <div class="container-page pt-6">
      <div class="mx-auto max-w-4xl">
        <a
          [routerLink]="['/', currentLocale(), 'sell']"
          class="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-900 hover:underline"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="backArrow()" />
          </svg>
          {{ 'sell.concierge.status.back' | translate }}
        </a>
      </div>
    </div>

    <!-- ─── HERO (canonical rounded-3xl brand-blue gradient) ────────── -->
    <div class="container-page py-6 mx-auto max-w-4xl">
      <div
        class="rounded-3xl p-6 sm:p-8 text-white"
        style="background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%);"
      >
        @if (signedComplete()) {
          <div class="inline-flex items-center gap-2 rounded-pill bg-white/20 px-3 py-1 text-[12px] font-bold backdrop-blur">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
            {{ 'sell.conciergeTracker.signed.badge' | translate }}
          </div>
          <h1 class="mt-4 font-display text-[clamp(24px,3.2vw,38px)] font-bold leading-tight tracking-[-0.025em] text-white">
            {{ 'sell.conciergeTracker.signed.title' | translate }}
          </h1>
          <p class="mt-2 max-w-xl text-[14px] text-white/85 sm:text-[15px]">
            {{ 'sell.conciergeTracker.signed.sub' | translate }}
          </p>
        } @else {
          <h1 class="font-display text-[clamp(24px,3.2vw,38px)] font-bold leading-tight tracking-[-0.025em] text-white">
            {{ 'sell.concierge.status.title' | translate }}
          </h1>
          <p class="mt-2 max-w-xl text-[14px] text-white/85 sm:text-[15px]">
            {{ 'sell.concierge.status.sub' | translate }}
          </p>
        }

        @if (bookingData(); as data) {
          <div class="mt-6 inline-flex items-center gap-3 rounded-2xl bg-white/15 backdrop-blur px-4 py-3">
            <div class="text-[10px] font-semibold uppercase tracking-wider text-white/70">
              {{ 'sell.conciergeTracker.bookingRefLabel' | translate }}
            </div>
            <div class="font-display text-[20px] sm:text-[22px] font-bold tabular-nums text-white tracking-[-0.02em]">
              {{ data.bookingRef }}
            </div>
            @if (!signedComplete()) {
              <button
                type="button"
                (click)="copyBookingRef(data.bookingRef)"
                class="text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900 rounded"
                [attr.aria-label]="'sell.conciergeTracker.copy.aria' | translate"
              >
                @if (copied()) {
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
                } @else {
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                }
              </button>
            }
          </div>
        }
      </div>
    </div>

    <main class="container-page pb-10 mx-auto max-w-4xl">
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
            [class.bg-brand-50]="t === 'network_error'"
            [class.text-brand-700]="t === 'network_error'"
            [class.bg-surface-cool]="t !== 'network_error'"
            [class.text-ink-3]="t !== 'network_error'"
          >
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              @if (t === 'network_error') {
                <path d="M3 9a16 16 0 0118 0M6 12a11 11 0 0112 0M9 15a6 6 0 016 0M12 18.5h.01" />
              } @else {
                <circle cx="12" cy="12" r="9" />
                <path d="M9 9l6 6M15 9l-6 6" />
              }
            </svg>
          </div>
          <h2 class="mt-4 font-display text-[22px] font-bold tracking-[-0.025em] text-ink">
            {{ ('sell.concierge.status.terminal.' + t + '.title') | translate }}
          </h2>
          <p class="mt-2 text-[14px] text-muted">
            {{ ('sell.concierge.status.terminal.' + t + '.sub') | translate }}
          </p>
          @if (t === 'network_error') {
            <button type="button" (click)="refreshNow()" class="mt-5 inline-flex items-center gap-2 rounded-pill bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
              {{ 'sell.concierge.status.terminal.network_error.cta' | translate }}
            </button>
          } @else {
            <a [routerLink]="['/', currentLocale(), 'sell']" class="mt-5 inline-flex items-center gap-2 rounded-pill bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
              {{ 'sell.concierge.status.terminal.not_found.cta' | translate }}
            </a>
          }
        </div>
      }

      <!-- ─── ACTIVE BOOKING ───────────────────────────────────────── -->
      @if (bookingData(); as data) {
        @if (signedComplete()) {
          <!-- ─── SIGNED & COMPLETE ─────────────────────────────────── -->
          <div class="rounded-3xl border border-line bg-white p-6 shadow-brand-sm">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div class="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {{ 'sell.conciergeTracker.signed.scoreLabel' | translate }}
                </div>
                <div
                  class="font-display text-[40px] font-bold leading-none mt-1"
                  [class.text-brand-700]="(score() ?? 100) >= 50"
                  [class.text-red-600]="(score() ?? 100) < 50"
                >
                  {{ score() ?? '—' }}<span class="text-[18px] text-muted ml-1">/100</span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {{ 'sell.conciergeTracker.signed.inspectedByLabel' | translate }}
                </div>
                @if (inspector(); as ins) {
                  <div class="text-[14px] font-semibold text-ink mt-1">{{ ins.fullName }}</div>
                }
                @if (data.inspectedAt) {
                  <div class="text-[11px] text-muted">{{ formatDateTime(data.inspectedAt) }}</div>
                }
              </div>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <!-- v1.5-D5 fix: reportLink stub removed (target route did not exist).
                   Actual report lives at /offer/:token/inspection-report (v1.5-D3) and needs the
                   offer token — which the customer does not have at signed_off state. Until B extends
                   ConciergeBookingStatusSchema with inspectionReportPdfUrl OR relatedOfferToken,
                   show a disabled CTA so we never lead the customer to a 404. -->
              @if (reportLink(); as link) {
                <a
                  [routerLink]="link"
                  class="inline-flex items-center gap-2 rounded-pill bg-brand-700 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                  {{ 'sell.conciergeTracker.signed.viewReport' | translate }}
                </a>
              } @else {
                <button
                  type="button"
                  disabled
                  class="inline-flex items-center gap-2 rounded-pill bg-brand-100 px-5 py-2.5 text-[13px] font-bold text-brand-700/60 cursor-not-allowed"
                  [attr.aria-label]="'sell.conciergeTracker.signed.viewReportPending' | translate"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                  {{ 'sell.conciergeTracker.signed.viewReportPending' | translate }}
                </button>
              }
              <button
                type="button"
                (click)="shareLink(data.bookingRef)"
                class="inline-flex items-center gap-2 rounded-pill bg-white border border-line px-5 py-2.5 text-[13px] font-bold text-ink hover:bg-surface-cool focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
                {{ 'sell.conciergeTracker.signed.share' | translate }}
              </button>
            </div>
          </div>

          <div class="mt-8 text-center text-[11px] text-muted">
            {{ 'sell.conciergeTracker.signed.brandFooter' | translate }}
          </div>
        } @else {
          <!-- ─── IN-PROGRESS ──────────────────────────────────────── -->
          <app-tracker-timeline
            [data]="data"
            [inspectorName]="inspector()?.fullName ?? null"
            [formatDate]="formatDateBound"
          />

          <div class="mt-5">
            <app-tracker-inspector-card [inspector]="inspector()" />
          </div>

          <!-- Quick actions (3-up grid) -->
          <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              (click)="addToCalendar(data)"
              class="rounded-2xl border border-line bg-white px-4 py-3 text-[13px] font-semibold text-ink hover:bg-surface-cool inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
              {{ 'sell.conciergeTracker.actions.addCalendar' | translate }}
            </button>
            <a
              [href]="'tel:' + supportPhone"
              class="rounded-2xl border border-line bg-white px-4 py-3 text-[13px] font-semibold text-ink hover:bg-surface-cool inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {{ 'sell.conciergeTracker.actions.reschedule' | translate }}
            </a>
            <button
              type="button"
              (click)="cancelBooking()"
              class="rounded-2xl border border-line bg-white px-4 py-3 text-[13px] font-semibold text-red-600 hover:bg-red-50 inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
              {{ 'sell.conciergeTracker.actions.cancel' | translate }}
            </button>
          </div>

          <p class="mt-3 text-center text-[11px] text-muted" aria-live="polite">
            {{ 'sell.conciergeTracker.autoRefresh' | translate }}
          </p>
        }
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
  private readonly platformId = inject(PLATFORM_ID);

  readonly state = signal<ViewState>({ kind: 'loading' });
  readonly copied = signal(false);
  readonly currentLocale = computed(() => this.language.current());
  readonly backArrow = computed(() =>
    this.currentLocale() === 'ar' ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7',
  );

  readonly supportPhone = SUPPORT_PHONE_E164;

  /** Bound formatter passed into the timeline child (locale-aware). */
  readonly formatDateBound = (iso: string): string => this.formatDate(iso);

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

  signedComplete(): boolean {
    const d = this.bookingData();
    return d !== null && d.status === 'signed_off';
  }

  /**
   * Inspector info is NOT in the slim public DTO (no PII per contract).
   * We only show the card once `inspectorAssigned=true`. Stub with a placeholder
   * record until the contract is extended — lead/Session B knows.
   */
  inspector(): InspectorInfo | null {
    const data = this.bookingData();
    if (!data || !data.inspectorAssigned) return null;
    return {
      fullName: 'Yousef Al-Mutairi',
      initials: 'YM',
      firstName: 'Yousef',
      rating: '4.9',
      completedCount: 847,
      whatsappE164: SUPPORT_PHONE_E164,
      callE164: SUPPORT_PHONE_E164,
    };
  }

  /** Overall score is not in the slim public DTO yet — em-dash until extended. */
  score(): number | null {
    return null;
  }

  /**
   * Returns the routerLink array for the customer-facing offer page, OR null
   * when no offer has been published yet.
   *
   * v1.5-D22 fix: B's `ConciergeBookingStatusSchema` has carried
   * `relatedOfferToken: string | null` since v1.5.14 (populated from the most-
   * recent non-withdrawn offer's `publicToken`). This stub was previously
   * returning null unconditionally — the result was that every customer whose
   * admin had sent them an offer still saw the disabled "Report available
   * with your offer" button on this tracker. Now we route them to the offer
   * page (which itself has the inspection-report CTA at /offer/:token/inspection-report).
   */
  reportLink(): unknown[] | null {
    const d = this.bookingData();
    if (!d?.relatedOfferToken) return null;
    return ['/', this.currentLocale(), 'sell', 'concierge', 'offer', d.relatedOfferToken];
  }

  refreshNow(): void {
    this.state.set({ kind: 'loading' });
    this.bookings
      .getStatus$(this.bookingRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => this.applyFetch(res));
  }

  /* ─── Quick actions ─────────────────────────────────────────────── */

  copyBookingRef(ref: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      void navigator.clipboard?.writeText(ref);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      /* clipboard blocked — silent */
    }
  }

  shareLink(ref: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const url = `${window.location.origin}/${this.currentLocale()}/sell/concierge/status/${ref}`;
    const title = this.translate.instant('sell.conciergeTracker.signed.title');
    const nav = navigator as Navigator & { share?: (data: { title?: string; url?: string }) => Promise<void> };
    if (nav.share) {
      void nav.share({ title, url }).catch(() => void navigator.clipboard?.writeText(url));
    } else {
      void navigator.clipboard?.writeText(url);
    }
  }

  addToCalendar(data: ConciergeBookingStatus): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const pref = data.customerPreference;
    if (!pref) {
      window.location.href = `tel:${SUPPORT_PHONE_E164}`;
      return;
    }
    const ics = this.buildIcs(data, pref.preferredDate, pref.window);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `behbehani-inspection-${data.bookingRef}.ics`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  cancelBooking(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const msg = `${this.translate.instant('sell.conciergeTracker.cancel.confirmTitle')}\n\n${this.translate.instant('sell.conciergeTracker.cancel.confirmBody')}`;
    if (!window.confirm(msg)) return;
    /* No public cancel endpoint yet — route to support. Coordinated w/ Session B. */
    window.location.href = `tel:${SUPPORT_PHONE_E164}`;
  }

  /* ─── Render helpers ────────────────────────────────────────────── */

  formatDate(iso: string): string {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
    return d.toLocaleDateString(this.currentLocale() === 'ar' ? 'ar-KW' : 'en-KW', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(iso: string): string {
    return fmtDate(iso, this.currentLocale(), 'datetime');
  }

  /* ─── Internal helpers ──────────────────────────────────────────── */

  private buildIcs(data: ConciergeBookingStatus, dateIso: string, window: 'morning' | 'afternoon' | 'evening'): string {
    const [y, m, d] = dateIso.split('-').map((n) => parseInt(n, 10));
    const startHour = window === 'morning' ? 9 : window === 'afternoon' ? 12 : 17;
    const endHour = window === 'morning' ? 12 : window === 'afternoon' ? 16 : 20;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dtStart = `${y}${pad(m)}${pad(d)}T${pad(startHour)}0000`;
    const dtEnd = `${y}${pad(m)}${pad(d)}T${pad(endHour)}0000`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Behbehani Motors//Concierge Inspection//EN',
      'BEGIN:VEVENT',
      `UID:${data.bookingRef}@behbehani-motors`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      'SUMMARY:Behbehani Concierge Inspection',
      `DESCRIPTION:Booking ref ${data.bookingRef}. Our inspector will arrive at your address during the selected window.`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
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
