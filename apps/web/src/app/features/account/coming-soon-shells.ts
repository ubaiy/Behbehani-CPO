/**
 * Thin standalone shell wrappers for the 8 Coming-Soon feature routes.
 * Each component renders <bmc-coming-soon-page> with locked props.
 * v1.3.6 §5 — DO NOT add business logic here.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoonPageComponent } from './coming-soon-page.component';

@Component({
  selector: 'bmc-maintenance-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComingSoonPageComponent],
  template: `<bmc-coming-soon-page featurePath="/account/maintenance" featureTitleKey="account.comingSoon.maintenance.title" etaLabelKey="account.comingSoon.eta.q3_2026" [teaserBulletKeys]="bullets" illustrationSlug="wrench" />`,
})
export class MaintenanceShellComponent {
  readonly bullets = ['account.comingSoon.maintenance.bullet1', 'account.comingSoon.maintenance.bullet2', 'account.comingSoon.maintenance.bullet3'];
}

@Component({
  selector: 'bmc-financing-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComingSoonPageComponent],
  template: `<bmc-coming-soon-page featurePath="/account/financing" featureTitleKey="account.comingSoon.financing.title" etaLabelKey="account.comingSoon.eta.q4_2026" [teaserBulletKeys]="bullets" illustrationSlug="dollar" />`,
})
export class FinancingShellComponent {
  readonly bullets = ['account.comingSoon.financing.bullet1', 'account.comingSoon.financing.bullet2', 'account.comingSoon.financing.bullet3'];
}

@Component({
  selector: 'bmc-returns-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComingSoonPageComponent],
  template: `<bmc-coming-soon-page featurePath="/account/returns" featureTitleKey="account.comingSoon.returns.title" etaLabelKey="account.comingSoon.eta.q4_2026" [teaserBulletKeys]="bullets" illustrationSlug="undo" />`,
})
export class ReturnsShellComponent {
  readonly bullets = ['account.comingSoon.returns.bullet1', 'account.comingSoon.returns.bullet2', 'account.comingSoon.returns.bullet3'];
}

@Component({
  selector: 'bmc-reviews-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComingSoonPageComponent],
  template: `<bmc-coming-soon-page featurePath="/account/reviews" featureTitleKey="account.comingSoon.reviews.title" etaLabelKey="account.comingSoon.eta.q4_2026" [teaserBulletKeys]="bullets" illustrationSlug="star" />`,
})
export class ReviewsShellComponent {
  readonly bullets = ['account.comingSoon.reviews.bullet1', 'account.comingSoon.reviews.bullet2', 'account.comingSoon.reviews.bullet3'];
}

@Component({
  selector: 'bmc-referrals-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComingSoonPageComponent],
  template: `<bmc-coming-soon-page featurePath="/account/referrals" featureTitleKey="account.comingSoon.referrals.title" etaLabelKey="account.comingSoon.eta.year_2027" [teaserBulletKeys]="bullets" illustrationSlug="gift" />`,
})
export class ReferralsShellComponent {
  readonly bullets = ['account.comingSoon.referrals.bullet1', 'account.comingSoon.referrals.bullet2', 'account.comingSoon.referrals.bullet3'];
}
