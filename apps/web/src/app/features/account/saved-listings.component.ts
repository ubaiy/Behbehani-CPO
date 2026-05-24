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
import type { SavedListingSummary } from '@behbehani-cpo/shared-types';
import {
  SavedListingsService,
  type ListSavedListingsResult,
} from '../../data/saved-listings.service';
import { HeartToggleService } from '../../data/heart-toggle.service';
import { SignInModalService } from '../auth/sign-in-modal.service';

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; items: SavedListingSummary[]; total: number; page: number; pageSize: number }
  | { kind: 'empty' }
  | { kind: 'error'; reason: 'unauthenticated' | 'network_error' }
  | { kind: 'guest' };

const PAGE_SIZE = 20;

/** Fils (stored as bigint-string) → "KD X,XXX.XXX" */
function filsToKwd(fils: bigint | number | string, locale: 'en' | 'ar'): string {
  const num = Number(fils);
  const kd = num / 1000;
  return `KD ${kd.toLocaleString(locale === 'ar' ? 'ar-KW' : 'en-KW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })}`;
}

/** Relative "saved N days ago" helper — SSR-safe. */
function savedAgo(iso: string, locale: 'en' | 'ar'): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return locale === 'ar' ? 'اليوم' : 'Today';
  if (days === 1) return locale === 'ar' ? 'منذ يوم' : '1 day ago';
  return locale === 'ar' ? `منذ ${days} أيام` : `${days} days ago`;
}

@Component({
  selector: 'app-saved-listings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <!-- Compact hero header (Part C.4) -->
    <header class="mb-6 rounded-3xl bg-gradient-to-br from-brand-50 via-white to-brand-50/40 border border-brand-100 px-6 py-5 flex items-center gap-4">
      <span class="inline-grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand-700 text-white shadow-brand-sm" aria-hidden="true">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
      </span>
      <div class="min-w-0">
        <h1 class="font-display text-[22px] sm:text-[26px] font-bold text-ink mb-0.5 tracking-[-0.02em]">
          {{ 'account.shell.page.savedCars.title' | translate }}
        </h1>
        <p class="text-[13px] text-muted">
          {{ 'account.shell.page.savedCars.sub' | translate }}
        </p>
      </div>
    </header>

    <main>
      <div>

        <!-- Loading -->
        @if (state().kind === 'loading') {
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
            @for (n of [1,2,3,4,5,6]; track n) {
              <div class="aspect-[4/3] animate-pulse rounded-2xl bg-surface-cool"></div>
            }
          </div>
        }

        <!-- Guest gate -->
        @if (state().kind === 'guest') {
          <div class="rounded-3xl border border-line bg-white p-8 text-center shadow-brand-sm">
            <div class="mx-auto inline-grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </div>
            <h2 class="mt-4 font-display text-[22px] font-bold tracking-[-0.025em] text-ink">
              {{ 'account.savedListings.signInRequired.title' | translate }}
            </h2>
            <p class="mt-2 text-[14px] text-muted">
              {{ 'account.savedListings.signInRequired.body' | translate }}
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
              {{ 'account.savedListings.error.networkTitle' | translate }}
            </h2>
            <p class="mt-2 text-[14px] text-muted">
              {{ 'account.savedListings.error.networkBody' | translate }}
            </p>
            <button
              type="button"
              (click)="retry()"
              class="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {{ 'account.savedListings.error.retry' | translate }}
            </button>
          </div>
        }

        <!-- Empty state (illustrated SVG: heart + car) -->
        @if (state().kind === 'empty') {
          <div class="rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft/40 p-12 text-center shadow-brand-sm">
            <div class="mx-auto mb-5 w-20 h-20 rounded-3xl bg-brand-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" class="text-brand-700" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </div>
            <h2 class="font-display text-[18px] font-bold text-ink mb-2">
              {{ 'account.savedListings.empty.title' | translate }}
            </h2>
            <p class="text-[14px] text-muted max-w-md mx-auto mb-6">
              {{ 'account.savedListings.empty.body' | translate }}
            </p>
            <a
              [routerLink]="['/', locale(), 'browse']"
              class="inline-flex min-h-[48px] items-center gap-2 rounded-pill bg-brand-700 px-7 py-3 text-sm font-semibold text-white hover:bg-brand-800 transition-colors duration-150 active:scale-[0.98] active:transition-transform shadow-brand-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {{ 'account.savedListings.empty.cta' | translate }}
            </a>
          </div>
        }

        <!-- Saved listings grid -->
        @if (okState(); as ok) {
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (item of ok.items; track item.listingId) {
              <article class="rounded-2xl border border-line bg-white overflow-hidden hover:shadow-brand-sm group">
                <!-- Image + heart -->
                <a
                  [routerLink]="['/', locale(), 'browse', item.stockNumber]"
                  class="block relative"
                  [attr.aria-label]="cardTitle(item)"
                >
                  @if (item.heroPhotoUrl) {
                    <img
                      [src]="item.heroPhotoUrl"
                      alt=""
                      loading="lazy"
                      class="aspect-[4/3] w-full object-cover"
                    />
                  } @else {
                    <div class="aspect-[4/3] bg-gradient-to-br from-slate-200 to-slate-300 grid place-items-center" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#94A3B8" stroke-width="1.5">
                        <path d="M5 16l1.5-4h11L19 16M5 16h14v3H5zM7 19v2M17 19v2"/>
                      </svg>
                    </div>
                  }
                </a>
                <!-- Heart button -->
                <button
                  type="button"
                  class="absolute top-3 end-3 inline-grid h-11 w-11 place-items-center rounded-full bg-white shadow-brand-sm hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  style="position:absolute;top:0.75rem;inset-inline-end:0.75rem"
                  (click)="unsave($event, item.listingId)"
                  [attr.aria-label]="'account.savedListings.card.unsave' | translate"
                  [attr.title]="'account.savedListings.card.unsave' | translate"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="#DC2626" stroke="#DC2626" stroke-width="2" aria-hidden="true">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                </button>
                <!-- Stock number pill -->
                <div class="relative">
                  <span class="absolute start-3 bottom-3 inline-flex items-center rounded-pill bg-ink/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                    {{ item.stockNumber }}
                  </span>
                </div>
                <!-- Card body -->
                <a
                  [routerLink]="['/', locale(), 'browse', item.stockNumber]"
                  class="block p-4"
                >
                  <div class="text-[15px] font-bold text-ink truncate">{{ cardTitle(item) }}</div>
                  <div class="mt-3 flex items-end justify-between">
                    <div>
                      <div class="font-display font-bold text-[18px] text-ink tabular-nums">
                        {{ priceLabel(item) }}
                      </div>
                    </div>
                    <span class="text-[11px] text-muted">
                      {{ savedAgoLabel(item.savedAt) }}
                    </span>
                  </div>
                </a>
              </article>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                [disabled]="ok.page <= 1"
                (click)="goToPage(ok.page - 1)"
                class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-pill border border-line bg-white px-4 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                {{ 'account.savedListings.pagination.prev' | translate }}
              </button>
              <span class="text-[13px] text-muted">
                {{ 'account.savedListings.pagination.pageOf' | translate: { page: ok.page, total: totalPages() } }}
              </span>
              <button
                type="button"
                [disabled]="ok.page >= totalPages()"
                (click)="goToPage(ok.page + 1)"
                class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-pill border border-line bg-white px-4 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                {{ 'account.savedListings.pagination.next' | translate }}
              </button>
            </div>
          }
        }

      </div>
    </main>
  `,
})
export class SavedListingsComponent {
  private readonly api = inject(SavedListingsService);
  private readonly auth = inject(AuthService);
  private readonly heartToggle = inject(HeartToggleService);
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
      this.titleService.setTitle(this.translate.instant('account.savedListings.metaTitle'));
    setTitle();
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(setTitle);
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
        if (signedIn) this.currentPage.set(1);
      });
  }

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

  cardTitle(item: SavedListingSummary): string {
    return (this.locale() === 'ar' ? item.titleAr : null) ?? item.titleEn;
  }

  priceLabel(item: SavedListingSummary): string {
    return filsToKwd(item.priceFils, this.locale());
  }

  savedAgoLabel(iso: string): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    return savedAgo(iso, this.locale());
  }

  onSignInClick(): void {
    this.signInModal.open();
  }

  retry(): void {
    this.fetch(this.currentPage());
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  unsave(event: Event, listingId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.heartToggle.toggle(listingId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((outcome) => {
      if (outcome === 'unsaved') {
        // Refresh the page to remove the card from the list
        this.fetch(this.currentPage());
      }
    });
  }

  private fetch(page: number): void {
    this.state.set({ kind: 'loading' });
    this.api
      .listSavedListings({ page, pageSize: PAGE_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: ListSavedListingsResult) => {
        switch (res.kind) {
          case 'ok':
            this.state.set(
              res.items.length === 0
                ? { kind: 'empty' }
                : { kind: 'ok', items: res.items, total: res.total, page: res.page, pageSize: res.pageSize },
            );
            // Hydrate heart-toggle set so browse cards are in sync
            this.heartToggle.hydrate(res.items.map((i) => i.listingId));
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
