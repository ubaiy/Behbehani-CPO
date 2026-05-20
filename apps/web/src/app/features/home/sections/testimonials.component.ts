import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TESTIMONIALS } from '../../../data/catalog.mock';

@Component({
  selector: 'app-testimonials',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <section class="container-page section">
      <header class="mb-8">
        <div class="section-eyebrow">{{ 'home.testimonials.eyebrow' | translate }}</div>
        <h2 class="mt-2 font-display text-[clamp(28px,3.4vw,44px)] font-bold tracking-[-0.025em] text-ink">
          {{ 'home.testimonials.title' | translate }}
        </h2>
      </header>
      <div class="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        @for (review of reviews; track review.id) {
          <article class="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <div class="mb-3 flex gap-0.5" [attr.aria-label]="review.stars + ' / 5'">
              @for (s of starArray(review.stars); track $index) {
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#F59E0B" aria-hidden="true">
                  <path d="m12 17.3-6.18 3.7 1.64-7.03L2 9.24l7.19-.62L12 2l2.81 6.62 7.19.62-5.46 4.73 1.64 7.03Z" />
                </svg>
              }
            </div>
            <p class="text-[15px] leading-relaxed text-ink-2">
              "{{ 'home.testimonials.items.' + review.id | translate }}"
            </p>
            <footer class="mt-5 flex items-center gap-3 border-t border-line pt-4">
              <div class="grid h-[38px] w-[38px] place-items-center rounded-full bg-brand-100 font-bold text-brand-700">
                {{ initial(review.name) }}
              </div>
              <div>
                <div class="text-sm font-semibold text-ink">{{ review.name }}</div>
                <div class="mt-0.5 text-xs text-muted">{{ 'home.testimonials.bought' | translate }} {{ review.car }}</div>
              </div>
            </footer>
          </article>
        }
      </div>
    </section>
  `,
})
export class TestimonialsComponent {
  readonly reviews = TESTIMONIALS;

  starArray(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  initial(name: string): string {
    return name.charAt(0);
  }
}
