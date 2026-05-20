import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PLATFORM_ID } from '@angular/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import type { OfferStatus, PublicOfferView } from '@behbehani-cpo/shared-types';
import { OffersService, type GetOfferResult } from '../../../data/offers.service';

/**
 * Customer-facing Concierge offer page.
 *
 * Route: `/{locale}/sell/concierge/offer/:token`
 *
 * One component handles all states:
 *   - loading
 *   - active (canRespond=true)   → render the picker + Accept/Counter/Decline
 *   - accepted terminal          → success card with listingStockNumber
 *   - declined terminal          → quiet confirmation
 *   - expired (server)           → token past publicTokenExpiresAt
 *   - withdrawn (server)         → admin pulled the offer
 *   - countered_by_customer      → "we received your counter, BMC will reply within 24h"
 *   - countered_by_admin         → still respondable — the picker shows admin's new amount
 *   - not_found / network_error  → empty states
 *
 * Mockups: mockups/phase-4-offer/customer-offer-{view,accepted,declined,expired}.html.
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.0:
 *   §3 — accepted/declined are NOT thrown errors; they come back as 200 with
 *        canRespond=false and we switch to the read-only view.
 *   §16 D5 — accept atomically creates a draft Listing; success card surfaces
 *        the resulting listingStockNumber.
 *   §16 D1 — UNLIMITED counter rounds; never tell the customer "this is your only chance".
 */

type ViewState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: PublicOfferView }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'withdrawn' }
  | { kind: 'network_error' }
  | { kind: 'accepted'; data: PublicOfferView; listingStockNumber?: string }
  | { kind: 'declined'; data: PublicOfferView };

@Component({
  selector: 'app-sell-offer-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <!-- ─── HERO ───────────────────────────────────────────────────────── -->
    @if (heroState(); as h) {
      <header
        class="text-white"
        [class.bg-gradient-to-br]="true"
        [class.from-brand-900]="!h.accepted"
        [class.via-brand-700]="!h.accepted"
        [class.to-brand-600]="!h.accepted"
        [class.from-emerald-700]="h.accepted"
        [class.via-emerald-600]="h.accepted"
        [class.to-emerald-500]="h.accepted"
      >
        <div class="container-page py-10 sm:py-14">
          <div class="mx-auto max-w-2xl text-center">
            @if (h.greetingKey) {
              <p class="text-[14px] font-medium text-white/80 mb-2">
                {{ h.greetingKey | translate }}
              </p>
            }
            <h1 class="font-display text-[clamp(24px,3vw,38px)] font-extrabold leading-tight tracking-[-0.025em] text-white">
              {{ h.titleKey | translate: h.titleParams }}
            </h1>
            @if (h.subKey) {
              <p class="mt-2 text-[14px] text-white/85">
                {{ h.subKey | translate: h.subParams }}
              </p>
            }

            <!-- Offer amount hero — only when active or terminal-respondable views -->
            @if (h.amountKwd) {
              <div class="inline-block mt-6 bg-white/10 backdrop-blur rounded-2xl px-8 py-5 border border-white/20">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-white/70 mb-1">
                  {{ h.amountLabelKey | translate }}
                </p>
                <p class="font-display text-[clamp(36px,6vw,56px)] font-extrabold text-white tabular-nums tracking-tight leading-none">
                  {{ h.amountKwd }}
                </p>
                <p class="text-[12px] text-white/75 mt-1.5">{{ 'sell.offer.amountSub' | translate }}</p>
              </div>
            }

            <!-- Countdown chip — only when active and validUntil is in the future -->
            @if (h.validUntilLabel) {
              <div class="mt-5 inline-flex items-center gap-2 rounded-pill bg-brand-700/20 border border-brand-500/40 px-4 py-2 text-[12px] font-semibold text-white">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                {{ h.validUntilLabel }}
              </div>
            }
          </div>
        </div>
      </header>
    }

    <main class="container-page py-8 sm:py-10 max-w-2xl">

      <!-- ─── LOADING ─────────────────────────────────────────────────── -->
      @if (state().kind === 'loading') {
        <div
          class="rounded-3xl border border-line bg-white p-10 text-center text-[14px] text-muted shadow-brand-sm"
          aria-busy="true"
          aria-live="polite"
        >
          <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-600"></span>
          <span class="ml-2">{{ 'sell.offer.loading' | translate }}</span>
        </div>
      }

      <!-- ─── TERMINAL EMPTY STATES (not_found / expired / withdrawn / network_error) ── -->
      @if (terminalEmpty(); as t) {
        <div class="rounded-3xl border border-line bg-white p-8 text-center shadow-brand-sm">
          <div
            class="mx-auto inline-grid h-14 w-14 place-items-center rounded-full"
            [class.bg-brand-50]="t === 'expired' || t === 'network_error'"
            [class.text-brand-700]="t === 'expired' || t === 'network_error'"
            [class.bg-slate-100]="t === 'not_found' || t === 'withdrawn'"
            [class.text-slate-600]="t === 'not_found' || t === 'withdrawn'"
          >
            @switch (t) {
              @case ('expired') { <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> }
              @case ('withdrawn') { <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/></svg> }
              @case ('network_error') { <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9a16 16 0 0118 0M6 12a11 11 0 0112 0M9 15a6 6 0 016 0M12 18.5h.01"/></svg> }
              @case ('not_found') { <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg> }
            }
          </div>
          <h2 class="mt-4 font-display text-[22px] font-bold tracking-[-0.025em] text-ink">
            {{ ('sell.offer.terminal.' + t + '.title') | translate }}
          </h2>
          <p class="mt-2 text-[14px] text-muted">
            {{ ('sell.offer.terminal.' + t + '.sub') | translate }}
          </p>
          <a
            [routerLink]="['/', currentLocale(), 'sell']"
            class="mt-5 inline-flex items-center gap-2 rounded-pill bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {{ ('sell.offer.terminal.' + t + '.cta') | translate }}
          </a>
        </div>
      }

      <!-- ─── ACCEPTED CONFIRMATION ───────────────────────────────────── -->
      @if (acceptedState(); as a) {
        <div class="rounded-3xl border border-brand-200 bg-white p-6 sm:p-8 shadow-brand">
          <div class="text-center">
            <div class="mx-auto inline-grid h-16 w-16 place-items-center rounded-full bg-brand-700 text-white">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>
            </div>
            <h2 class="mt-4 font-display text-[24px] font-bold tracking-[-0.025em] text-ink">
              {{ 'sell.offer.accepted.title' | translate }}
            </h2>
            <p class="mt-2 text-[14px] text-muted">{{ 'sell.offer.accepted.sub' | translate }}</p>
          </div>

          <div class="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{{ 'sell.offer.accepted.amountLabel' | translate }}</div>
            <div class="mt-1 font-display text-[28px] font-extrabold text-ink tabular-nums">{{ displayAmount(a.data) }}</div>
            @if (a.listingStockNumber) {
              <div class="mt-3 text-[12px] text-muted">
                {{ 'sell.offer.accepted.stockNumberLabel' | translate }}
                <span class="font-mono font-semibold text-ink-2">{{ a.listingStockNumber }}</span>
              </div>
            }
          </div>

          <div class="mt-5 rounded-xl border border-line bg-surface-soft p-4">
            <p class="text-[13px] font-semibold text-ink-2 mb-2">{{ 'sell.offer.accepted.next.title' | translate }}</p>
            <ol class="text-[12px] text-ink-2 space-y-1 list-decimal pl-5">
              <li>{{ 'sell.offer.accepted.next.step1' | translate }}</li>
              <li>{{ 'sell.offer.accepted.next.step2' | translate }}</li>
              <li>{{ 'sell.offer.accepted.next.step3' | translate }}</li>
            </ol>
          </div>

          <a
            [routerLink]="['/', currentLocale()]"
            class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-5 py-3 text-[14px] font-bold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {{ 'sell.offer.accepted.home' | translate }}
          </a>
        </div>
      }

      <!-- ─── DECLINED CONFIRMATION ───────────────────────────────────── -->
      @if (declinedState(); as d) {
        <div class="rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-brand-sm">
          <div class="text-center">
            <div class="mx-auto inline-grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-600">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </div>
            <h2 class="mt-4 font-display text-[22px] font-bold tracking-[-0.025em] text-ink">
              {{ 'sell.offer.declined.title' | translate }}
            </h2>
            <p class="mt-2 text-[14px] text-muted">{{ 'sell.offer.declined.sub' | translate }}</p>
          </div>
          <div class="mt-5 flex flex-wrap gap-2 justify-center">
            <a
              [routerLink]="['/', currentLocale(), 'sell']"
              class="inline-flex items-center gap-2 rounded-pill bg-brand-700 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-800"
            >
              {{ 'sell.offer.declined.ctaSell' | translate }}
            </a>
            <a
              [routerLink]="['/', currentLocale(), 'browse']"
              class="inline-flex items-center gap-2 rounded-pill bg-white border border-line px-5 py-2.5 text-[13px] font-bold text-ink hover:bg-surface-cool"
            >
              {{ 'sell.offer.declined.ctaBuy' | translate }}
            </a>
          </div>
        </div>
      }

      <!-- ─── ACTIVE / COUNTERED VIEW (data present + not in a terminal local state) ── -->
      @if (offerData(); as o) {

        <!-- Vehicle summary -->
        <div class="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-brand-sm">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-muted mb-3">
            {{ 'sell.offer.vehicleLabel' | translate }}
          </p>
          <div class="flex items-start gap-3">
            <span class="inline-grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 16l1.5-4h11L19 16M5 16h14v3H5zM7 19v2M17 19v2"/></svg>
            </span>
            <div class="min-w-0">
              <p class="text-[15px] font-semibold text-ink truncate">{{ vehicleLine(o) }}</p>
              <p class="text-[12px] text-muted mt-0.5">{{ 'sell.offer.bookingRefShort' | translate }} {{ o.bookingRef }}</p>
            </div>
          </div>
        </div>

        <!-- Admin counter banner (when applicable) -->
        @if (o.status === 'countered_by_admin' && o.adminCounterAmountFils !== null) {
          <div class="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p class="text-[12px] font-semibold uppercase tracking-wider text-brand-700">
              {{ 'sell.offer.adminCounter.label' | translate }}
            </p>
            <p class="mt-1 font-display text-[22px] font-extrabold text-brand-900 tabular-nums">
              {{ filsToKwd(o.adminCounterAmountFils) }}
            </p>
            <p class="mt-1 text-[12px] text-brand-800">{{ 'sell.offer.adminCounter.sub' | translate }}</p>
          </div>
        }

        <!-- Customer counter waiting banner -->
        @if (o.status === 'countered_by_customer' && o.counterAmountFils !== null) {
          <div class="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p class="text-[12px] font-semibold uppercase tracking-wider text-brand-700">
              {{ 'sell.offer.yourCounter.label' | translate }}
            </p>
            <p class="mt-1 font-display text-[22px] font-extrabold text-brand-900 tabular-nums">
              {{ filsToKwd(o.counterAmountFils) }}
            </p>
            <p class="mt-1 text-[12px] text-brand-800">{{ 'sell.offer.yourCounter.sub' | translate }}</p>
          </div>
        }

        <!-- Active action picker — only when canRespond=true -->
        @if (o.canRespond) {
          <div class="mt-5 space-y-3">
            <button
              type="button"
              (click)="onAccept()"
              [disabled]="submitting()"
              class="block w-full text-center rounded-2xl bg-brand-700 px-6 py-4 text-[15px] font-bold text-white hover:bg-brand-800 active:scale-[0.99] min-h-[56px] shadow-brand transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {{ 'sell.offer.actions.accept' | translate: { amount: displayAmount(o) } }}
            </button>
            <a
              [routerLink]="['/', currentLocale(), 'sell', 'concierge', 'offer', token, 'counter']"
              class="block w-full text-center rounded-2xl border-2 border-brand-700 bg-white px-6 py-4 text-[15px] font-bold text-brand-700 hover:bg-brand-50 active:scale-[0.99] min-h-[56px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {{ 'sell.offer.actions.counter' | translate }}
            </a>
            <button
              type="button"
              (click)="onDecline()"
              [disabled]="submitting()"
              class="block w-full text-center px-6 py-3 text-[13px] font-medium text-muted hover:text-ink-2 min-h-[44px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-pill"
            >
              {{ 'sell.offer.actions.decline' | translate }}
            </button>
          </div>

          @if (submitError(); as err) {
            <p class="mt-3 text-[13px] text-red-600" role="alert">{{ err }}</p>
          }

          <p class="mt-5 text-center text-[11px] leading-relaxed text-muted">
            {{ 'sell.offer.finePrint' | translate }}
          </p>
        }

      }
    </main>
  `,
})
export class SellOfferPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(OffersService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly state = signal<ViewState>({ kind: 'loading' });
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly currentLocale = computed(() => this.language.current());

  token = '';

  ngOnInit(): void {
    const set = () => this.title.setTitle(this.translate.instant('sell.offer.metaTitle'));
    set();
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(set);
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.state.set({ kind: 'not_found' });
      return;
    }
    this.refetch();
  }

  /* ─── Hero state helper ─────────────────────────────────────────── */

  heroState(): {
    titleKey: string;
    titleParams?: Record<string, unknown>;
    subKey?: string;
    subParams?: Record<string, unknown>;
    greetingKey?: string;
    amountKwd?: string;
    amountLabelKey?: string;
    validUntilLabel?: string;
    accepted?: boolean;
  } | null {
    const s = this.state();
    if (s.kind === 'loading') return null;
    if (s.kind === 'ok' || s.kind === 'declined') {
      const o = s.data;
      const respondable = o.canRespond;
      const isCounterPending = o.status === 'countered_by_customer';
      return {
        greetingKey: respondable || isCounterPending ? 'sell.offer.hero.greeting' : undefined,
        titleKey: respondable
          ? 'sell.offer.hero.title'
          : isCounterPending
            ? 'sell.offer.hero.counterPendingTitle'
            : 'sell.offer.hero.historyTitle',
        titleParams: { vehicle: this.vehicleLine(o) },
        subKey: respondable ? 'sell.offer.hero.sub' : undefined,
        amountLabelKey: 'sell.offer.amountLabel',
        amountKwd: respondable ? this.displayAmount(o) : undefined,
        validUntilLabel: respondable ? this.formatValidUntilLabel(o.validUntil) : undefined,
      };
    }
    if (s.kind === 'accepted') {
      return {
        titleKey: 'sell.offer.hero.acceptedTitle',
        accepted: true,
      };
    }
    return null;
  }

  /* ─── State narrowing helpers ───────────────────────────────────── */

  offerData(): PublicOfferView | null {
    const s = this.state();
    return s.kind === 'ok' ? s.data : null;
  }

  acceptedState(): { data: PublicOfferView; listingStockNumber?: string } | null {
    const s = this.state();
    return s.kind === 'accepted' ? { data: s.data, listingStockNumber: s.listingStockNumber } : null;
  }

  declinedState(): { data: PublicOfferView } | null {
    const s = this.state();
    return s.kind === 'declined' ? { data: s.data } : null;
  }

  terminalEmpty(): 'not_found' | 'expired' | 'withdrawn' | 'network_error' | null {
    const s = this.state();
    if (s.kind === 'not_found' || s.kind === 'expired' || s.kind === 'withdrawn' || s.kind === 'network_error') {
      return s.kind;
    }
    return null;
  }

  /* ─── Render helpers ────────────────────────────────────────────── */

  vehicleLine(o: PublicOfferView): string {
    return o.vehicleLabel || '—';
  }

  /** Amount the customer is currently being asked to accept — admin's counter if present, otherwise the original. */
  displayAmount(o: PublicOfferView): string {
    if (o.status === 'countered_by_admin' && o.adminCounterAmountFils !== null) {
      return this.filsToKwd(o.adminCounterAmountFils);
    }
    return o.offerAmountKwd;
  }

  filsToKwd(fils: number): string {
    /* Kuwaiti Dinar has 3 decimal places (fils). Match the server's `KD X,XXX.XXX` format. */
    const kd = fils / 1000;
    return `KD ${kd.toLocaleString(this.currentLocale() === 'ar' ? 'ar-KW' : 'en-KW', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })}`;
  }

  formatValidUntilLabel(iso: string): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    const validUntil = new Date(iso);
    const now = Date.now();
    const diffMs = validUntil.getTime() - now;
    if (diffMs <= 0) return this.translate.instant('sell.offer.expired');
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const dateStr = validUntil.toLocaleDateString(this.currentLocale() === 'ar' ? 'ar-KW' : 'en-KW', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return this.translate.instant('sell.offer.validUntil', { days, hours, date: dateStr });
  }

  /* ─── Actions ───────────────────────────────────────────────────── */

  onAccept(): void {
    const o = this.offerData();
    if (!o || !o.canRespond || this.submitting()) return;
    /* Confirmation prompt — accept is terminal and creates a listing per §16 D5. */
    if (isPlatformBrowser(this.platformId)) {
      const confirmMsg = this.translate.instant('sell.offer.actions.acceptConfirm', {
        amount: this.displayAmount(o),
      });
      if (!window.confirm(confirmMsg)) return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.api
      .submit$(this.token, { action: 'accept' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.submitting.set(false);
        this.handleSubmit(res, o);
      });
  }

  onDecline(): void {
    const o = this.offerData();
    if (!o || !o.canRespond || this.submitting()) return;
    if (isPlatformBrowser(this.platformId)) {
      const confirmMsg = this.translate.instant('sell.offer.actions.declineConfirm');
      if (!window.confirm(confirmMsg)) return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.api
      .submit$(this.token, { action: 'decline' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.submitting.set(false);
        this.handleSubmit(res, o);
      });
  }

  /* ─── Refetch + reducer ─────────────────────────────────────────── */

  private refetch(): void {
    this.state.set({ kind: 'loading' });
    this.api
      .fetch$(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: GetOfferResult) => {
        switch (res.kind) {
          case 'ok':
            this.state.set({ kind: 'ok', data: res.data });
            break;
          case 'not_found':
          case 'expired':
          case 'withdrawn':
          case 'network_error':
            this.state.set({ kind: res.kind });
            break;
        }
      });
  }

  private handleSubmit(
    res: ReturnType<OffersService['submit$']> extends Observable<infer R> ? R : never,
    snapshot: PublicOfferView,
  ): void {
    switch (res.kind) {
      case 'ok':
        if (res.status === 'accepted') {
          this.state.set({
            kind: 'accepted',
            data: { ...snapshot, status: 'accepted' as OfferStatus },
            listingStockNumber: res.listingStockNumber,
          });
        } else if (res.status === 'declined') {
          this.state.set({ kind: 'declined', data: { ...snapshot, status: 'declined' as OfferStatus } });
        } else {
          /* countered_by_customer or other — re-fetch to get authoritative view. */
          this.refetch();
        }
        if (isPlatformBrowser(this.platformId)) window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'expired':
        this.state.set({ kind: 'expired' });
        break;
      case 'withdrawn':
        this.state.set({ kind: 'withdrawn' });
        break;
      case 'not_found':
        this.state.set({ kind: 'not_found' });
        break;
      case 'already_responded':
        this.submitError.set(this.translate.instant('sell.offer.errors.alreadyResponded'));
        this.refetch();
        break;
      case 'invalid_counter':
        this.submitError.set(this.translate.instant('sell.offer.errors.invalidCounter'));
        break;
      case 'error':
        this.submitError.set(res.message);
        break;
    }
  }
}

/* Local Observable type helper (avoid rxjs import in template-only types) */
type Observable<T> = import('rxjs').Observable<T>;
