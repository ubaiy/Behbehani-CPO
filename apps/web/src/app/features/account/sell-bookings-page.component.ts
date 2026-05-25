import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { AuthService } from '@behbehani-cpo/data-access';
import { fmtDate } from '@behbehani-cpo/shared-i18n';
import type { ConciergeBookingStatus, InspectionStatus } from '@behbehani-cpo/shared-types';
import {
  MeSellBookingsService,
  type ListMySellBookingsResult,
} from '../../data/me-sell-bookings.service';
import { SignInModalService } from '../auth/sign-in-modal.service';

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; items: ConciergeBookingStatus[]; total: number; page: number; pageSize: number }
  | { kind: 'empty' }
  | { kind: 'error'; reason: 'unauthenticated' | 'network_error' }
  | { kind: 'guest' };

const PAGE_SIZE = 20;

const STATUS_PILL: Record<InspectionStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-brand-100 text-brand-700',
  awaiting_inspector_signoff: 'bg-brand-100 text-brand-700',
  awaiting_customer_signature: 'bg-blue-100 text-brand-700',
  signed_off: 'bg-brand-50 text-brand-700 border border-brand-200',
};

@Component({
  selector: 'app-sell-bookings-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <!-- Compact hero header -->
    <header class="mb-6 rounded-3xl bg-gradient-to-br from-brand-50 via-white to-brand-50/40 border border-brand-100 px-6 py-5 flex items-center gap-4">
      <span class="inline-grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand-700 text-white shadow-brand-sm" aria-hidden="true">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 16l1.5-4h11L19 16M5 16h14v3H5zM7 19v2M17 19v2"/>
        </svg>
      </span>
      <div class="min-w-0">
        <h1 class="font-display text-[22px] sm:text-[26px] font-bold text-ink mb-0.5 tracking-[-0.02em]">
          {{ 'account.sellBookings.title' | translate }}
        </h1>
        <p class="text-[13px] text-muted">
          {{ 'account.sellBookings.sub' | translate }}
        </p>
      </div>
    </header>

    <main>

      <!-- Loading -->
      @if (state().kind === 'loading') {
        <div
          class="rounded-3xl border border-line bg-white p-10 text-center text-[14px] text-muted shadow-brand-sm"
          aria-busy="true"
          aria-live="polite"
        >
          <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-600"></span>
          <span class="ms-2">{{ 'sell.offer.loading' | translate }}</span>
        </div>
      }

      <!-- Guest gate -->
      @if (state().kind === 'guest') {
        <div class="rounded-3xl border border-line bg-white p-8 text-center shadow-brand-sm">
          <div class="mx-auto inline-grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </div>
          <h2 class="mt-4 font-display text-[22px] font-bold tracking-[-0.025em] text-ink">
            {{ 'account.myBookings.signInRequired.title' | translate }}
          </h2>
          <p class="mt-2 text-[14px] text-muted">
            {{ 'account.sellBookings.error.unauthenticated' | translate }}
          </p>
          <button
            type="button"
            (click)="onSignInClick()"
            class="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {{ 'nav.signIn' | translate }}
          </button>
        </div>
      }

      <!-- Network error -->
      @if (state().kind === 'error' && errorReason() === 'network_error') {
        <div class="rounded-3xl border border-line bg-white p-8 text-center shadow-brand-sm">
          <div class="mx-auto inline-grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 9a16 16 0 0118 0M6 12a11 11 0 0112 0M9 15a6 6 0 016 0M12 18.5h.01"/>
            </svg>
          </div>
          <h2 class="mt-4 font-display text-[22px] font-bold tracking-[-0.025em] text-ink">
            {{ 'account.myBookings.error.networkTitle' | translate }}
          </h2>
          <p class="mt-2 text-[14px] text-muted">
            {{ 'account.sellBookings.error.network' | translate }}
          </p>
          <button
            type="button"
            (click)="retry()"
            class="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {{ 'account.myBookings.error.retry' | translate }}
          </button>
        </div>
      }

      <!-- Unauthenticated error (API returned 401 despite guard) -->
      @if (state().kind === 'error' && errorReason() === 'unauthenticated') {
        <div class="rounded-3xl border border-line bg-white p-8 text-center shadow-brand-sm">
          <p class="text-[14px] text-muted">
            {{ 'account.sellBookings.error.unauthenticated' | translate }}
          </p>
        </div>
      }

      <!-- Empty state -->
      @if (state().kind === 'empty') {
        <div class="rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft/40 p-12 text-center shadow-brand-sm">
          <div class="mx-auto mb-5 w-20 h-20 rounded-3xl bg-brand-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" class="text-brand-700" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 16l1.5-4h11L19 16M5 16h14v3H5zM7 19v2M17 19v2"/>
            </svg>
          </div>
          <h2 class="font-display text-[18px] font-bold text-ink mb-2">
            {{ 'account.sellBookings.empty.title' | translate }}
          </h2>
          <p class="text-[14px] text-muted max-w-md mx-auto mb-6">
            {{ 'account.sellBookings.empty.body' | translate }}
          </p>
          <a
            [routerLink]="['/', locale(), 'sell']"
            class="inline-flex min-h-[48px] items-center gap-2 rounded-pill bg-brand-700 px-7 py-3 text-sm font-semibold text-white hover:bg-brand-800 transition-colors duration-150 active:scale-[0.98] active:transition-transform shadow-brand-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {{ 'account.sellBookings.empty.cta' | translate }}
          </a>
        </div>
      }

      <!-- Booking list -->
      @if (okState(); as ok) {
        <ul class="space-y-4" role="list">
          @for (item of ok.items; track item.bookingRef) {
            <li>
              <a
                [routerLink]="['/', locale(), 'sell', 'concierge', 'status', item.bookingRef]"
                class="block rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-brand-sm hover:shadow-brand hover:border-brand-200 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                [attr.aria-label]="'account.sellBookings.row.viewTracker' | translate"
              >
                <!-- Top row: vehicle title + bookingRef badge -->
                <div class="flex items-start gap-3">
                  <span class="inline-grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 16l1.5-4h11L19 16M5 16h14v3H5zM7 19v2M17 19v2"/>
                    </svg>
                  </span>
                  <div class="min-w-0 flex-1">
                    <h3 class="text-[15px] font-semibold text-ink leading-snug">
                      {{ vehicleLine(item) }}
                    </h3>
                    <div class="mt-1 flex flex-wrap items-center gap-2">
                      <!-- bookingRef badge -->
                      <span class="inline-flex items-center rounded-pill bg-surface-soft border border-line px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink-2 min-h-[28px]">
                        {{ item.bookingRef }}
                      </span>
                      <!-- Status chip -->
                      <span
                        class="inline-flex min-h-[28px] items-center rounded-pill px-2.5 py-0.5 text-[11px] font-semibold"
                        [ngClass]="statusClass(item.status)"
                      >
                        {{ ('account.sellBookings.status.' + item.status) | translate }}
                      </span>
                      <!-- Offer available pill -->
                      @if (item.relatedOfferToken) {
                        <span class="inline-flex min-h-[28px] items-center gap-1 rounded-pill bg-brand-700 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                            <path d="M9 12l2 2 4-4"/>
                            <circle cx="12" cy="12" r="9"/>
                          </svg>
                          {{ 'account.sellBookings.row.offerAvailable' | translate }}
                        </span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Meta row: dates + inspector -->
                <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
                  @if (item.customerPreference) {
                    <span>
                      {{ 'account.sellBookings.row.scheduled' | translate: { date: fmtPreferredDate(item.customerPreference.preferredDate) } }}
                    </span>
                  }
                  @if (item.inspector) {
                    <span class="flex items-center gap-1">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M4 21a8 8 0 0 1 16 0"/>
                      </svg>
                      {{ item.inspector.fullName }}
                    </span>
                  }
                  @if (item.cancelledAt) {
                    <span class="text-red-600 font-medium">
                      {{ fmtCancelledDate(item.cancelledAt) }}
                    </span>
                  }
                </div>
              </a>
            </li>
          }
        </ul>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              [disabled]="ok.page <= 1"
              (click)="goToPage(ok.page - 1)"
              class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-pill border border-line bg-white px-4 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {{ 'account.myBookings.pagination.prev' | translate }}
            </button>
            <span class="text-[13px] text-muted">
              {{ 'account.myBookings.pagination.pageOf' | translate: { page: ok.page, total: totalPages() } }}
            </span>
            <button
              type="button"
              [disabled]="ok.page >= totalPages()"
              (click)="goToPage(ok.page + 1)"
              class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-pill border border-line bg-white px-4 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {{ 'account.myBookings.pagination.next' | translate }}
            </button>
          </div>
        }
      }

    </main>
  `,
})
export class SellBookingsPageComponent {
  private readonly api = inject(MeSellBookingsService);
  private readonly auth = inject(AuthService);
  private readonly signInModal = inject(SignInModalService);
  private readonly language = inject(LanguageService);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly state = signal<State>({ kind: 'loading' });
  readonly locale = computed(() => this.language.current());

  private readonly currentPage = signal(1);

  constructor() {
    const setTitle = () =>
      this.titleService.setTitle(
        `${this.translate.instant('account.sellBookings.title')} · Behbehani Motors`,
      );
    setTitle();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(setTitle);
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    effect(() => {
      const signedIn = this.auth.isSignedIn();
      const page = this.currentPage();
      if (!signedIn) {
        this.state.set({ kind: 'guest' });
        if (isPlatformBrowser(this.platformId)) {
          this.signInModal.open();
        }
        return;
      }
      this.fetch(page);
    });

    toObservable(this.auth.isSignedIn)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((signedIn) => {
        if (signedIn) {
          this.currentPage.set(1);
        }
      });
  }

  /* ─── Helpers ─────────────────────────────────────────────────────────── */

  okState(): Extract<State, { kind: 'ok' }> | null {
    const s = this.state();
    return s.kind === 'ok' ? s : null;
  }

  errorReason(): 'unauthenticated' | 'network_error' | null {
    const s = this.state();
    return s.kind === 'error' ? s.reason : null;
  }

  totalPages(): number {
    const s = this.state();
    if (s.kind !== 'ok') return 1;
    return Math.max(1, Math.ceil(s.total / s.pageSize));
  }

  vehicleLine(item: ConciergeBookingStatus): string {
    const v = item.vehicle;
    const parts = [v.year, v.brand, v.model].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '—';
  }

  statusClass(status: InspectionStatus): string {
    return STATUS_PILL[status] ?? 'bg-slate-100 text-slate-600';
  }

  fmtPreferredDate(dateStr: string): string {
    return fmtDate(dateStr, this.locale(), 'medium');
  }

  fmtCancelledDate(isoStr: string): string {
    return fmtDate(isoStr, this.locale(), 'medium');
  }

  /* ─── Actions ─────────────────────────────────────────────────────────── */

  onSignInClick(): void {
    this.signInModal.open();
  }

  retry(): void {
    this.fetch(this.currentPage());
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  /* ─── Data loading ─────────────────────────────────────────────────────── */

  private fetch(page: number): void {
    this.state.set({ kind: 'loading' });
    this.api
      .listMySellBookings({ page, pageSize: PAGE_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: ListMySellBookingsResult) => {
        switch (res.kind) {
          case 'ok':
            this.state.set(
              res.items.length === 0
                ? { kind: 'empty' }
                : { kind: 'ok', items: res.items, total: res.total, page: res.page, pageSize: res.pageSize },
            );
            break;
          case 'unauthenticated':
            this.state.set({ kind: 'error', reason: 'unauthenticated' });
            break;
          case 'network_error':
            this.state.set({ kind: 'error', reason: 'network_error' });
            break;
        }
      });
  }
}
