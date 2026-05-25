import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, isLocale, type Locale } from '@behbehani-cpo/shared-i18n';
import { AuthService } from '@behbehani-cpo/data-access';
import { FooterComponent } from './footer.component';
import { SignInModalService } from '../features/auth/sign-in-modal.service';
import { SignUpModalService } from '../features/auth/sign-up-modal.service';
import { CheckoutModalService } from '../features/checkout/checkout-modal.service';
import { SaveSearchModalService } from '../features/browse/save-search-modal.service';
/* v1.5-D15 bundle reduction: the four overlay modals are imported lazily via
   `@defer (when …)` instead of eager `imports:[]`. Each modal's chunk is only
   fetched the FIRST time its service's `isOpen()` flips to true. They were the
   biggest single contributor to the initial-bundle budget overshoot. */
import { SignInModalComponent } from '../features/auth/sign-in-modal.component';
import { SignUpModalComponent } from '../features/auth/sign-up-modal.component';
import { CheckoutModalComponent } from '../features/checkout/checkout-modal.component';
import { SaveSearchModalComponent } from '../features/browse/save-search-modal.component';
/* v1.5-D17b: global compare-cart floating bar — visible across /browse,
   /account/favorites and home so the user's selection survives navigation. */
import { CompareFloatingBarComponent } from '../features/compare/compare-floating-bar.component';

interface NavItem {
  id: string;
  segment: string;
  labelKey: string;
}

const NAV: ReadonlyArray<NavItem> = [
  { id: 'buy', segment: 'browse', labelKey: 'nav.buy' },
  { id: 'sell', segment: 'sell', labelKey: 'nav.sell' },
  { id: 'finance', segment: 'finance', labelKey: 'nav.finance' },
  { id: 'services', segment: 'services', labelKey: 'nav.services' },
  { id: 'dealers', segment: 'dealers', labelKey: 'nav.dealers' },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslateModule, FooterComponent, SignInModalComponent, SignUpModalComponent, CheckoutModalComponent, SaveSearchModalComponent, CompareFloatingBarComponent],
  // ☝ Modal components stay in `imports` so Angular's compiler recognises them
  //   inside the `@defer` blocks below. The Angular CLI/esbuild compiler still
  //   tree-shakes them into separate lazy chunks because their ONLY usage is
  //   inside `@defer` — the eager-render path never instantiates them.
  template: `
    <header
      class="sticky top-0 z-40 border-b border-line/70 bg-white/85 backdrop-blur-md backdrop-saturate-150"
    >
      <div class="mx-auto grid w-full max-w-container grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-3 sm:py-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-4 lg:px-6 lg:py-5">
        <a
          [routerLink]="['/', currentLocale()]"
          class="inline-flex items-center"
          [attr.aria-label]="('app.company' | translate)"
        >
          <img
            src="assets/bm/logo.png"
            [alt]="'app.company' | translate"
            class="h-12 w-auto sm:h-14 lg:h-16"
            width="320"
            height="80"
          />
        </a>

        <nav
          class="hidden items-center justify-self-center gap-0.5 rounded-pill border border-line bg-surface-soft p-1 lg:flex"
          [attr.aria-label]="'nav.openMenu' | translate"
        >
          @for (item of nav; track item.id) {
            <a
              [routerLink]="['/', currentLocale(), item.segment]"
              [routerLinkActive]="'!bg-brand-700 !text-white !shadow-brand-sm'"
              class="rounded-pill px-4 py-2 text-[13px] font-medium text-ink-3 transition-colors hover:bg-white hover:text-ink"
            >
              {{ item.labelKey | translate }}
            </a>
          }
        </nav>

        <div class="flex items-center justify-end gap-1">
          <a
            [routerLink]="['/', currentLocale(), 'browse']"
            class="hidden h-9 w-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-soft sm:inline-grid"
            [attr.aria-label]="'nav.search' | translate"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="6" />
              <path d="m20 20-4.5-4.5" />
            </svg>
          </a>
          <button
            type="button"
            (click)="onWishlistClick()"
            class="relative hidden h-9 w-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-soft sm:inline-grid"
            [attr.aria-label]="'nav.favorites' | translate"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 21s-7-4.5-9.5-9C.8 8 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.2 4 4.5 8-2.5 4.5-9.5 9-9.5 9Z" />
            </svg>
          </button>
          <button
            type="button"
            (click)="toggleLanguage()"
            class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-2 hover:bg-surface-soft"
            [attr.aria-label]="'common.language' | translate"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
            </svg>
            <span>{{ currentLocale() === 'en' ? 'عربي' : 'EN' }}</span>
          </button>
          @if (isSignedIn()) {
            <!-- Signed-in avatar dropdown -->
            <div class="relative hidden sm:block" data-user-menu-root>
              <button
                type="button"
                (click)="toggleUserMenu()"
                class="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink-2 hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
                [attr.aria-expanded]="userMenuOpen()"
                [attr.aria-label]="'nav.accountMenu' | translate"
              >
                <span
                  class="inline-grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-brand-700 text-[13px] font-bold uppercase text-white"
                  aria-hidden="true"
                >{{ userInitial() }}</span>
                <span class="max-w-[112px] truncate">{{ userName() }}</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              @if (userMenuOpen()) {
                <!-- Backdrop to close on outside click -->
                <div
                  class="fixed inset-0 z-40"
                  (click)="closeUserMenu()"
                  aria-hidden="true"
                ></div>
                <div
                  class="absolute end-0 top-full z-50 mt-2 w-56 rounded-2xl border border-line bg-white py-2 shadow-brand"
                  role="menu"
                >
                  <!-- Identity -->
                  <div class="border-b border-line/70 px-4 pb-3 pt-2">
                    <p class="text-[13px] font-semibold text-ink truncate">{{ userFullName() }}</p>
                    <p class="text-[11px] text-muted truncate">{{ userContact() }}</p>
                  </div>
                  <!-- Nav items -->
                  <a
                    [routerLink]="['/', currentLocale(), 'account']"
                    (click)="closeUserMenu()"
                    role="menuitem"
                    class="flex min-h-[44px] items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-soft hover:text-ink"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                    {{ 'nav.account' | translate }}
                  </a>
                  <a
                    [routerLink]="['/', currentLocale(), 'account', 'inspections']"
                    (click)="closeUserMenu()"
                    role="menuitem"
                    class="flex min-h-[44px] items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-soft hover:text-ink"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    {{ 'account.myBookings.headerDropdown.myBookings' | translate }}
                  </a>
                  <a
                    [routerLink]="['/', currentLocale(), 'account', 'favorites']"
                    (click)="closeUserMenu()"
                    role="menuitem"
                    class="flex min-h-[44px] items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-soft hover:text-ink"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-4.5-9.5-9C.8 8 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.2 4 4.5 8-2.5 4.5-9.5 9-9.5 9Z"/></svg>
                    {{ 'account.myBookings.headerDropdown.savedCars' | translate }}
                  </a>
                  <div class="my-1.5 border-t border-line/70"></div>
                  <button
                    type="button"
                    (click)="onSignOut()"
                    role="menuitem"
                    class="flex min-h-[44px] w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    {{ 'account.myBookings.headerDropdown.signOut' | translate }}
                  </button>
                </div>
              }
            </div>
          } @else {
            <button
              type="button"
              (click)="openSignIn()"
              class="hidden items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white shadow-brand-sm hover:bg-brand-600 sm:inline-flex"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
              <span>{{ 'nav.signIn' | translate }}</span>
            </button>
          }
          <button
            type="button"
            class="inline-grid h-9 w-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-soft lg:hidden"
            (click)="toggleMenu()"
            [attr.aria-expanded]="menuOpen()"
            [attr.aria-label]="(menuOpen() ? 'nav.closeMenu' : 'nav.openMenu') | translate"
          >
            @if (menuOpen()) {
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            }
          </button>
        </div>
      </div>

      @if (menuOpen()) {
        <div class="border-t border-line bg-white px-4 py-2 sm:px-6 lg:hidden">
          @for (item of nav; track item.id) {
            <a
              [routerLink]="['/', currentLocale(), item.segment]"
              (click)="closeMenu()"
              class="block border-b border-line/70 py-3.5 text-[15px] font-medium text-ink-2 hover:text-brand-700"
            >
              {{ item.labelKey | translate }}
            </a>
          }
          @if (isSignedIn()) {
            <a
              [routerLink]="['/', currentLocale(), 'account']"
              (click)="closeMenu()"
              class="mt-2 block min-h-[44px] w-full rounded-lg bg-brand-700 px-3.5 py-3 text-center text-sm font-semibold text-white sm:hidden"
            >
              {{ 'nav.account' | translate }}
            </a>
            <a
              [routerLink]="['/', currentLocale(), 'my-bookings']"
              (click)="closeMenu()"
              class="mt-2 block min-h-[44px] w-full rounded-lg border border-line px-3.5 py-3 text-center text-sm font-semibold text-ink-2 hover:bg-surface-soft sm:hidden"
            >
              {{ 'account.myBookings.headerDropdown.myBookings' | translate }}
            </a>
            <button
              type="button"
              (click)="onSignOut()"
              class="mt-2 block min-h-[44px] w-full rounded-lg border border-red-200 px-3.5 py-3 text-center text-sm font-semibold text-red-600 hover:bg-red-50 sm:hidden"
            >
              {{ 'account.myBookings.headerDropdown.signOut' | translate }}
            </button>
          } @else {
            <button
              type="button"
              (click)="onMobileSignIn()"
              class="mt-2 block min-h-[44px] w-full rounded-lg bg-brand-700 px-3.5 py-3 text-center text-sm font-semibold text-white sm:hidden"
            >
              {{ 'nav.signIn' | translate }}
            </button>
          }
        </div>
      }
    </header>

    <main class="min-h-[calc(100vh-96px)]">
      <router-outlet></router-outlet>
    </main>

    <app-footer />

    <!-- v1.5-D17b: global compare-cart pill (self-hides when count < 2). -->
    <app-compare-floating-bar />

    @defer (when signInModal.isOpen()) {
      <app-sign-in-modal />
    }
    @defer (when signUpModal.isOpen()) {
      <app-sign-up-modal />
    }
    @defer (when checkoutModal.isOpen()) {
      <app-checkout-modal />
    }
    @defer (when saveSearchModal.isOpen()) {
      <app-save-search-modal />
    }
  `,
})
export class ShellComponent implements OnInit {
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  /* Template-accessible (used by `@defer (when …)` blocks below). */
  protected readonly signInModal = inject(SignInModalService);
  protected readonly signUpModal = inject(SignUpModalService);
  protected readonly checkoutModal = inject(CheckoutModalService);
  protected readonly saveSearchModal = inject(SaveSearchModalService);
  private readonly auth = inject(AuthService);
  /* v1.5-D7 outside-click fix: the backdrop overlay relied on `fixed inset-0` but
     `backdrop-filter` on the header creates a containing block for fixed
     descendants, constraining the backdrop to the header's height. So clicks
     below the header didn't dismiss the dropdown. @HostListener('document:click')
     gives us a viewport-wide listener that fires regardless of stacking context. */
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);

  readonly currentLocale = computed(() => this.language.current());
  readonly menuOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly nav = NAV;

  readonly isSignedIn = computed(() => this.auth.isSignedIn());

  readonly userInitial = computed(() => {
    const u = this.auth.user();
    if (!u) return '';
    return (u.fullName?.trim()[0] ?? u.email?.[0] ?? '?').toUpperCase();
  });

  readonly userName = computed(() => {
    const u = this.auth.user();
    if (!u) return '';
    const name = u.fullName?.trim() ?? '';
    return name.length > 14 ? name.slice(0, 14) + '…' : name;
  });

  readonly userFullName = computed(() => this.auth.user()?.fullName ?? '');
  readonly userContact = computed(() => this.auth.user()?.email ?? this.auth.user()?.mobile ?? '');

  ngOnInit(): void {
    /* Auto-open the sign-in modal when something redirects here with ?signin=1
       (manual link) or ?returnUrl=... (auth interceptor on 401). */
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const wantsSignIn = params.get('signin') === '1' || params.has('returnUrl');
      if (wantsSignIn) {
        /* v1.5-D21: carry returnUrl through to the modal so it can navigate
           back to the gated page (e.g. /sell/concierge) after sign-in. We
           strip it from the URL below to avoid re-triggering the modal on
           back/forward. */
        const returnUrl = params.get('returnUrl');
        this.signInModal.open(returnUrl);
        /* Clean the URL so back/forward doesn't re-trigger the modal. */
        void this.router.navigate([], {
          queryParams: { signin: null, returnUrl: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  openSignIn(): void {
    this.signInModal.open();
  }

  onWishlistClick(): void {
    /* Heart icon in header: route signed-in users straight to their saved
       cars; for guests, pop the sign-in modal (the saved-cars page would
       just show an empty "sign in to see this" state anyway). */
    if (this.isSignedIn()) {
      void this.router.navigate(['/', this.currentLocale(), 'my-bookings', 'saved-cars']);
    } else {
      this.signInModal.open();
    }
  }

  onMobileSignIn(): void {
    this.menuOpen.set(false);
    this.signInModal.open();
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  /**
   * v1.5-D7: Defense-in-depth outside-click handler for the avatar dropdown.
   * The in-template `fixed inset-0` backdrop fails inside a header that has
   * `backdrop-filter` (CSS containing-block rule) — this listener fires at
   * the document level regardless of stacking context.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.userMenuOpen()) return;
    const target = e.target as Node | null;
    if (!target) return;
    /* If the click landed inside the dropdown trigger or panel, ignore — the
       toggle / menuitem clicks already handle close. Otherwise dismiss. */
    const dropdownRoot = this.host.nativeElement.querySelector('[data-user-menu-root]');
    if (dropdownRoot && dropdownRoot.contains(target)) return;
    this.userMenuOpen.set(false);
  }

  onSignOut(): void {
    this.userMenuOpen.set(false);
    this.menuOpen.set(false);
    this.auth.signOut().subscribe(() => {
      void this.router.navigate(['/', this.currentLocale()]);
    });
  }

  toggleLanguage(): void {
    const next: Locale = this.language.current() === 'en' ? 'ar' : 'en';
    this.language.setLocale(next);
    /* Rewrite the first URL segment so deep-links and back-button history reflect the new locale. */
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    if (segments.length === 0 || !isLocale(segments[0])) {
      void this.router.navigate(['/', next]);
      return;
    }
    segments[0] = next;
    const queryParams = this.router.parseUrl(this.router.url).queryParams;
    void this.router.navigate(['/', ...segments], { queryParams });
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
