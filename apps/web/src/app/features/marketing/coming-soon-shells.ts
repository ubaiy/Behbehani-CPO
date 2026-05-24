/**
 * Storefront-level coming-soon shells for /finance, /services, /dealers.
 * v1.5-D14 — nav has linked these for a while, but no pages existed yet.
 * v1.5-D14b — added /dealers shell (same 404 pattern flagged by the polish
 *   batch follow-up).
 * Each component renders <bmc-coming-soon-page> with locked props.
 * DO NOT add business logic here.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoonPageComponent } from '../account/coming-soon-page.component';

@Component({
  selector: 'bmc-marketing-finance-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComingSoonPageComponent],
  template: `<bmc-coming-soon-page
    featurePath="/finance"
    featureTitleKey="financeComingSoon.title"
    etaLabelKey="account.comingSoon.eta.q4_2026"
    [teaserBulletKeys]="bullets"
    illustrationSlug="dollar" />`,
})
export class MarketingFinanceShellComponent {
  readonly bullets = [
    'financeComingSoon.bullet1',
    'financeComingSoon.bullet2',
    'financeComingSoon.bullet3',
  ];
}

@Component({
  selector: 'bmc-marketing-services-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComingSoonPageComponent],
  template: `<bmc-coming-soon-page
    featurePath="/services"
    featureTitleKey="servicesComingSoon.title"
    etaLabelKey="account.comingSoon.eta.q4_2026"
    [teaserBulletKeys]="bullets"
    illustrationSlug="wrench" />`,
})
export class MarketingServicesShellComponent {
  readonly bullets = [
    'servicesComingSoon.bullet1',
    'servicesComingSoon.bullet2',
    'servicesComingSoon.bullet3',
  ];
}

@Component({
  selector: 'bmc-marketing-dealers-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComingSoonPageComponent],
  template: `<bmc-coming-soon-page
    featurePath="/dealers"
    featureTitleKey="dealersComingSoon.title"
    etaLabelKey="account.comingSoon.eta.q4_2026"
    [teaserBulletKeys]="bullets"
    illustrationSlug="star" />`,
})
export class MarketingDealersShellComponent {
  readonly bullets = [
    'dealersComingSoon.bullet1',
    'dealersComingSoon.bullet2',
    'dealersComingSoon.bullet3',
  ];
}
