import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@behbehani-cpo/data-access';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { SignInModalService } from '../auth/sign-in-modal.service';
import { SIGN_OUT_ICON_PATH } from './shell/account-nav';
import { SidebarDesktopComponent } from './shell/sidebar-desktop.component';
import { SidebarMobilePillsComponent } from './shell/sidebar-mobile-pills.component';

/**
 * Persistent shell for the customer-facing /account/* section.
 *
 * Routing: registered as a PARENT route in app.routes.ts with all the per-feature
 * pages nested as children. The shell renders:
 *   - on >=md screens: a left sidebar (sticky) + the routed child in the right pane
 *   - on <md screens:  a horizontal scrolling pill row + the routed child below
 *
 * Auth: guests see a sign-in card. Same pattern (and same i18n keys) as the
 * pre-shell account-hub guest gate at account-hub.component.ts:28-48.
 */
@Component({
  selector: 'app-account-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterOutlet,
    TranslateModule,
    SidebarDesktopComponent,
    SidebarMobilePillsComponent,
  ],
  template: `
    @if (!auth.isHydrated()) {
      <!-- v1.5-D9: pre-hydration placeholder. SSR renders this neutral state
           instead of the guest gate, so signed-in users don't see a flash of
           "Sign in" before client hydration swaps in the real shell. -->
      <div class="container-page py-16 text-center" aria-busy="true" aria-live="polite">
        <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-600"></span>
        <span class="ms-2 text-[13px] text-muted">{{ 'sell.offer.loading' | translate }}</span>
      </div>
    } @else if (!auth.isSignedIn()) {
      <!-- ── Guest gate (mirrors account-hub.component.ts:28-48). Only reached
           when authGuard allowed activation (SSR) OR client check returned
           signed-out — the in-thread sign-in modal effect (constructor) also
           pops automatically. ─────────── -->
      <header
        class="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white"
      >
        <div class="container-page py-10 sm:py-14">
          <div class="mx-auto max-w-4xl">
            <h1
              class="font-display text-[clamp(24px,3vw,38px)] font-extrabold leading-tight tracking-[-0.025em] text-white"
            >
              {{ 'account.hub.signInRequired.title' | translate }}
            </h1>
            <p class="mt-2 text-[14px] text-white/80">
              {{ 'account.hub.signInRequired.body' | translate }}
            </p>
          </div>
        </div>
      </header>
      <main class="container-page py-8 sm:py-10 max-w-4xl mx-auto">
        <div
          class="rounded-3xl border border-line bg-white p-10 text-center text-[14px] text-muted shadow-brand-sm"
        >
          <p>{{ 'account.myBookings.signInRequired.body' | translate }}</p>
          <button
            type="button"
            (click)="signInModal.open()"
            class="mt-5 inline-flex min-h-[44px] items-center rounded-pill bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors"
          >
            {{ 'nav.signIn' | translate }}
          </button>
        </div>
      </main>
    } @else {
      <!-- ── Mobile pill row (above the content pane on <md) ─────────────── -->
      <app-account-sidebar-mobile-pills [locale]="locale()" />

      <!-- ── Main shell grid ─────────────────────────────────────────────── -->
      <div class="container-page py-6 sm:py-10">
        <div class="mx-auto max-w-7xl">
          <div class="grid md:grid-cols-[260px_minmax(0,1fr)] gap-6">
            <!-- Desktop sidebar — hidden below md -->
            <app-account-sidebar-desktop
              [locale]="locale()"
              (signOut)="onSignOut()"
            />

            <!-- Content pane — child route renders here -->
            <main class="min-w-0">
              <router-outlet />

              <!-- Mobile-only sign-out (sidebar's bottom button is hidden on <md) -->
              <div class="md:hidden mt-8 px-1">
                <button
                  type="button"
                  (click)="onSignOut()"
                  class="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl px-3 py-3 text-[13px] font-semibold flex items-center justify-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-colors"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="signOutIconPath" />
                  </svg>
                  <span>{{ 'account.shell.nav.signOut' | translate }}</span>
                </button>
              </div>
            </main>
          </div>
        </div>
      </div>
    }
  `,
})
export class AccountLayoutComponent {
  readonly auth = inject(AuthService);
  readonly signInModal = inject(SignInModalService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);

  readonly locale = computed(() => this.language.current());
  readonly signOutIconPath = SIGN_OUT_ICON_PATH;

  constructor() {
    // Open sign-in modal for guests (SSR-safe — same trigger as account-hub did)
    effect(
      () => {
        if (isPlatformBrowser(this.platformId) && !this.auth.isSignedIn()) {
          this.signInModal.open();
        }
      },
      { allowSignalWrites: true },
    );

    // Page title — inherited from the hub since /account redirects to /account/profile
    effect(() => {
      this.translate.get('account.hub.metaTitle').subscribe((titleStr) => {
        this.title.setTitle(titleStr);
        this.meta.updateTag({ name: 'description', content: titleStr });
      });
    });
  }

  onSignOut(): void {
    this.auth.signOut().subscribe(() => {
      this.router.navigate(['/', this.locale()]);
    });
  }
}
