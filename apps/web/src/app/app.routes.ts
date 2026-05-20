import { Route, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { localeGuard, DEFAULT_LOCALE } from '@behbehani-cpo/shared-i18n';
import { ShellComponent } from './layout/shell.component';
import { HomeComponent } from './features/home/home.component';
import { SignInModalService } from './features/auth/sign-in-modal.service';

/**
 * Legacy guard: sign-in is a modal overlay now, not a route. If anything
 * still navigates to `/{locale}/auth/sign-in` (stale browser bundle, external
 * link, the data-access auth interceptor's default `signInPath`, etc.) this
 * guard opens the modal and reroutes to the locale home.
 */
function openSignInModalGuard(): UrlTree {
  const router = inject(Router);
  const modal = inject(SignInModalService);
  modal.open();
  const seg = router.url.split('/').filter(Boolean)[0];
  const locale = seg === 'en' || seg === 'ar' ? seg : DEFAULT_LOCALE;
  return router.createUrlTree(['/', locale]);
}

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: DEFAULT_LOCALE,
  },
  /* Public customer-signing page — TOP-LEVEL (outside the locale tree + shell).
     Opened from an SMS/email link; the storefront's buy/sell nav would be
     confusing context, and SMS links shouldn't have to encode a locale. The
     page reads `?lang=ar` itself to set direction. */
  {
    path: 'inspection-sign/:token',
    loadComponent: () =>
      import('./features/inspection-sign/inspection-sign-page.component').then(
        (m) => m.InspectionSignPageComponent,
      ),
  },
  {
    path: ':locale',
    canActivate: [localeGuard],
    component: ShellComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'browse',
        loadComponent: () =>
          import('./features/browse/browse-page.component').then((m) => m.BrowsePageComponent),
      },
      {
        path: 'listings/:slug',
        loadComponent: () =>
          import('./features/vdp/vdp-page.component').then((m) => m.VdpPageComponent),
      },
      {
        path: 'sell',
        loadComponent: () =>
          import('./features/sell/sell-landing.component').then((m) => m.SellLandingComponent),
      },
      {
        path: 'sell/details',
        loadComponent: () =>
          import('./features/sell/details-wizard.component').then(
            (m) => m.SellDetailsWizardComponent,
          ),
      },
      {
        path: 'sell/choose',
        loadComponent: () =>
          import('./features/sell/choose-option.component').then(
            (m) => m.SellChooseOptionComponent,
          ),
      },
      {
        path: 'sell/concierge',
        loadComponent: () =>
          import('./features/sell/concierge-page.component').then(
            (m) => m.SellConciergePageComponent,
          ),
      },
      {
        /* Booking-status tracker — reached after a successful POST on
           /sell/concierge or from B's email confirmation. Polls every 30s. */
        path: 'sell/concierge/status/:bookingRef',
        loadComponent: () =>
          import('./features/sell/concierge-status-page.component').then(
            (m) => m.SellConciergeStatusPageComponent,
          ),
      },
      {
        /* Customer-facing Offer/Valuation pages (Phase 4). Reached from the
           email/SMS B's notifications service sends after admin sends an offer. */
        path: 'sell/concierge/offer/:token',
        loadComponent: () =>
          import('./features/sell/offer/offer-page.component').then(
            (m) => m.SellOfferPageComponent,
          ),
      },
      {
        path: 'sell/concierge/offer/:token/counter',
        loadComponent: () =>
          import('./features/sell/offer/offer-counter.component').then(
            (m) => m.SellOfferCounterPageComponent,
          ),
      },
      {
        path: 'sell/self-service',
        loadComponent: () =>
          import('./features/sell/self-service-page.component').then(
            (m) => m.SellSelfServicePageComponent,
          ),
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./features/account/account-hub.component').then((m) => m.AccountHubComponent),
      },
      {
        path: 'account/addresses',
        loadComponent: () =>
          import('./features/account/addresses.component').then(
            (m) => m.AccountAddressesComponent,
          ),
      },
      {
        path: 'account/notifications',
        loadComponent: () =>
          import('./features/account/notifications.component').then(
            (m) => m.AccountNotificationsComponent,
          ),
      },
      {
        path: 'account/profile',
        loadComponent: () =>
          import('./features/account/profile.component').then((m) => m.AccountProfileComponent),
      },
      {
        path: 'account/security',
        loadComponent: () =>
          import('./features/account/security.component').then((m) => m.AccountSecurityComponent),
      },
      {
        path: 'my-bookings',
        loadComponent: () =>
          import('./features/account/my-bookings.component').then((m) => m.MyBookingsComponent),
      },
      {
        path: 'my-bookings/saved-cars',
        loadComponent: () =>
          import('./features/account/saved-listings.component').then(
            (m) => m.SavedListingsComponent,
          ),
      },
      {
        path: 'auth/sign-in',
        canActivate: [openSignInModalGuard],
        /* Never actually rendered — the guard always returns a UrlTree. */
        component: HomeComponent,
      },
      /* ── v1.3 Coming-Soon feature routes ── */
      {
        path: 'account/saved-searches',
        loadComponent: () =>
          import('./features/account/coming-soon-shells').then((m) => m.SavedSearchesShellComponent),
      },
      {
        path: 'account/orders',
        loadComponent: () =>
          import('./features/account/orders-page.component').then((m) => m.OrdersPageComponent),
      },
      {
        path: 'account/orders/:id',
        loadComponent: () =>
          import('./features/account/order-detail-page.component').then((m) => m.OrderDetailPageComponent),
      },
      {
        path: 'account/documents',
        loadComponent: () =>
          import('./features/account/documents-page.component').then((m) => m.DocumentsPageComponent),
      },
      {
        path: 'account/maintenance',
        loadComponent: () =>
          import('./features/account/coming-soon-shells').then((m) => m.MaintenanceShellComponent),
      },
      {
        path: 'account/financing',
        loadComponent: () =>
          import('./features/account/coming-soon-shells').then((m) => m.FinancingShellComponent),
      },
      {
        path: 'account/returns',
        loadComponent: () =>
          import('./features/account/coming-soon-shells').then((m) => m.ReturnsShellComponent),
      },
      {
        path: 'account/reviews',
        loadComponent: () =>
          import('./features/account/coming-soon-shells').then((m) => m.ReviewsShellComponent),
      },
      {
        path: 'account/referrals',
        loadComponent: () =>
          import('./features/account/coming-soon-shells').then((m) => m.ReferralsShellComponent),
      },
      /* ── Checkout return / cancel callback pages ── */
      {
        path: 'checkout/return',
        loadComponent: () =>
          import('./features/checkout/checkout-return-page.component').then(
            (m) => m.CheckoutReturnPageComponent,
          ),
      },
      {
        path: 'checkout/cancel',
        loadComponent: () =>
          import('./features/checkout/checkout-return-page.component').then(
            (m) => m.CheckoutReturnPageComponent,
          ),
      },
      /* ── v1.3 Route renames — redirect old URLs to existing components ── */
      { path: 'account/inspections', redirectTo: 'my-bookings', pathMatch: 'full' },
      { path: 'account/favorites', redirectTo: 'my-bookings/saved-cars', pathMatch: 'full' },
    ],
  },
];
