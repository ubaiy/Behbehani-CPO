import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { CarCardComponent } from './car-card.component';
import { PublicCatalogService } from '../../../data/public-catalog.service';

@Component({
  selector: 'app-low-mileage-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, CarCardComponent, RouterLink],
  template: `
    <section class="container-page section">
      <header class="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="section-eyebrow">{{ 'home.lowMileage.eyebrow' | translate }}</div>
          <h2 class="mt-2 font-display text-[clamp(28px,3.4vw,44px)] font-bold tracking-[-0.025em] text-ink">
            {{ 'home.lowMileage.title' | translate }}
          </h2>
        </div>
        <!-- "View all" jumps to /browse — there's no dedicated low-mileage
             route yet, and the browse page lets the user filter on mileage
             via the existing facet. -->
        <a
          [routerLink]="['/', currentLocale(), 'browse']"
          class="link-arrow"
        >
          {{ 'home.featured.viewAll' | translate }}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="dirArrow()" />
          </svg>
        </a>
      </header>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        @for (car of cars(); track car.id) {
          <app-car-card [car]="car" />
        }
      </div>
    </section>
  `,
})
export class LowMileageRailComponent {
  private readonly language = inject(LanguageService);
  private readonly catalog = inject(PublicCatalogService);
  readonly currentLocale = computed(() => this.language.current());
  readonly dirArrow = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));
  readonly cars = toSignal(this.catalog.lowMileage$(), { initialValue: [] });
}
