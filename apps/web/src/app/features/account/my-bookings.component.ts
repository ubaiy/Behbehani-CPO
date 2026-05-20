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
import type { CustomerInspectionView, InspectionStatus } from '@behbehani-cpo/shared-types';
import {
  MeInspectionsService,
  type ListMyInspectionsResult,
} from '../../data/me-inspections.service';
import { SignInModalService } from '../auth/sign-in-modal.service';

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; items: CustomerInspectionView[]; total: number; page: number; pageSize: number }
  | { kind: 'empty' }
  | { kind: 'error'; reason: 'unauthenticated' | 'network_error' }
  | { kind: 'guest' };

const PAGE_SIZE = 20;

/** Fils → "KD X,XXX.XXX" — mirrors offer-page.component.ts */
function filsToKwd(fils: number | bigint | string, locale: 'en' | 'ar'): string {
  const num = typeof fils === 'bigint' ? Number(fils) : Number(fils);
  const kd = num / 1000;
  return `KD ${kd.toLocaleString(locale === 'ar' ? 'ar-KW' : 'en-KW', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

/** Days between now and a future ISO datetime, clamped to 0. */
function daysUntil(iso: string): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

/** Relative date — "2 days ago" style, SSR-safe. */
function relativeDate(iso: string, locale: 'en' | 'ar'): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return locale === 'ar' ? 'اليوم' : 'Today';
  if (days === 1) return locale === 'ar' ? 'أمس' : 'Yesterday';
  return locale === 'ar' ? `منذ ${days} أيام` : `${days} days ago`;
}

const STATUS_PILL: Record<InspectionStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-brand-100 text-brand-700',
  awaiting_inspector_signoff: 'bg-brand-100 text-brand-700',
  awaiting_customer_signature: 'bg-blue-100 text-brand-700',
  signed_off: 'bg-brand-50 text-brand-700 border border-brand-200',
};

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <!-- Back link -->
    <div class="container-page pt-6">
      <a [routerLink]="['/', locale(), 'account']" class="inline-flex items-center text-[13px] font-medium text-brand-700 hover:text-brand-900 hover:underline">
        {{ 'account.backToHub' | translate }}
      </a>
    </div>

    <!-- Hero -->
    <header class="py-6 sm:py-8">
      <div class="container-page max-w-3xl mx-auto">
        <div class="rounded-3xl p-6 sm:p-8 text-white" style="background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%);">
          <h1 class="font-display text-[clamp(24px,3vw,38px)] font-extrabold leading-tight tracking-[-0.025em] text-white">
            {{ 'account.myBookings.title' | translate }}
          </h1>
          <p class="mt-2 text-[14px] text-white/80">
            {{ 'account.myBookings.sub' | translate }}
          </p>
        </div>
      </div>
    </header>

    <main class="container-page py-8 sm:py-10 max-w-3xl mx-auto">

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
            {{ 'account.myBookings.signInRequired.body' | translate }}
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
            {{ 'account.myBookings.error.networkBody' | translate }}
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

      <!-- Empty state -->
      @if (state().kind === 'empty') {
        <div class="rounded-3xl border border-line bg-white p-8 text-center shadow-brand-sm">
          <div class="mx-auto inline-grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-700">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="3" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <h2 class="mt-4 font-display text-[22px] font-bold tracking-[-0.025em] text-ink">
            {{ 'account.myBookings.empty.title' | translate }}
          </h2>
          <p class="mt-2 text-[14px] text-muted">
            {{ 'account.myBookings.empty.body' | translate }}
          </p>
          <a
            [routerLink]="['/', locale(), 'sell', 'concierge']"
            class="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {{ 'account.myBookings.empty.cta' | translate }}
          </a>
        </div>
      }

      <!-- Booking list -->
      @if (okState(); as ok) {
        <ul class="space-y-4" role="list">
          @for (item of ok.items; track item.id) {
            <li class="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-brand-sm">

              <!-- Vehicle + ref row -->
              <div class="flex items-start gap-3">
                <span class="inline-grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 16l1.5-4h11L19 16M5 16h14v3H5zM7 19v2M17 19v2"/>
                  </svg>
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-[15px] font-semibold text-ink leading-snug">
                    {{ vehicleLine(item) }}
                  </p>
                  <div class="mt-1 flex flex-wrap items-center gap-2">
                    <a
                      [routerLink]="['/', locale(), 'sell', 'concierge', 'status', item.bookingRef]"
                      class="inline-flex items-center gap-1 rounded-pill bg-surface-soft border border-line px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink-2 hover:bg-white hover:border-brand-300 transition-colors min-h-[28px]"
                    >
                      {{ item.bookingRef }}
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                    </a>
                    <span
                      class="inline-flex min-h-[28px] items-center rounded-pill px-2.5 py-0.5 text-[11px] font-semibold"
                      [ngClass]="statusClass(item.status)"
                    >
                      {{ ('account.myBookings.statusPill.' + item.status) | translate }}
                    </span>
                  </div>
                </div>
                <span class="flex-shrink-0 text-[11px] text-muted">
                  {{ relDate(item.createdAt) }}
                </span>
              </div>

              <!-- Latest offer -->
              @if (item.latestOffer; as offer) {
                <div class="mt-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                  @if (isActiveOffer(offer.status)) {
                    <p class="text-[12px] font-semibold text-brand-800">
                      {{ 'account.myBookings.latestOffer.activeLabel'
                          | translate: { amount: offerAmount(offer), days: daysLeft(offer.validUntil) } }}
                    </p>
                    <a
                      [routerLink]="['/', locale(), 'sell', 'concierge', 'offer', offer.publicToken]"
                      class="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-pill bg-brand-700 px-4 py-1.5 text-[12px] font-bold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    >
                      {{ 'account.myBookings.viewOfferCta' | translate }}
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </a>
                  } @else {
                    <p class="text-[12px] font-semibold text-muted">
                      {{ 'account.myBookings.latestOffer.terminalLabel'
                          | translate: { status: offer.status } }}
                    </p>
                  }
                </div>
              }

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
export class MyBookingsComponent {
  private readonly api = inject(MeInspectionsService);
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
    // Set meta
    const setTitle = () =>
      this.titleService.setTitle(this.translate.instant('account.myBookings.metaTitle'));
    setTitle();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(setTitle);
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    // Re-fetch whenever session or page changes
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

    // When sign-in completes (isSignedIn flips true), re-fetch page 1
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

  vehicleLine(item: CustomerInspectionView): string {
    const v = item.vehicle;
    const parts = [v.year, v.brand, v.model].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '—';
  }

  statusClass(status: InspectionStatus): string {
    return STATUS_PILL[status] ?? 'bg-slate-100 text-slate-600';
  }

  relDate(iso: string): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    return relativeDate(iso, this.locale());
  }

  isActiveOffer(status: string): boolean {
    return !['accepted', 'declined', 'expired', 'withdrawn'].includes(status);
  }

  offerAmount(offer: CustomerInspectionView['latestOffer']): string {
    if (!offer) return '';
    // Prefer adminCounterAmountFils, else counterAmountFils, else amountFils
    return filsToKwd(offer.amountFils, this.locale());
  }

  daysLeft(iso: string): number {
    return daysUntil(iso);
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
      .listMyInspections({ page, pageSize: PAGE_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: ListMyInspectionsResult) => {
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
