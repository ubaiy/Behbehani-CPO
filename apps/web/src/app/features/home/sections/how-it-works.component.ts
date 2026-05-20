import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

interface Step {
  id: 'choose' | 'reserve' | 'finance' | 'delivered';
  iconPath: string;
}

const STEPS: ReadonlyArray<Step> = [
  { id: 'choose', iconPath: 'M11 17a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm5 0 4 4' },
  { id: 'reserve', iconPath: 'M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z' },
  { id: 'finance', iconPath: 'M9 11l3 3 6-6M22 12a10 10 0 1 1-10-10' },
  { id: 'delivered', iconPath: 'M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z' },
];

@Component({
  selector: 'app-how-it-works',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <section class="container-page section">
      <header class="mb-9">
        <div class="section-eyebrow">{{ 'home.how.eyebrow' | translate }}</div>
        <h2 class="mt-2 font-display text-[clamp(28px,3.4vw,44px)] font-bold tracking-[-0.025em] text-ink">
          {{ 'home.how.title' | translate }}
        </h2>
      </header>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        @for (step of steps; track step.id; let i = $index) {
          <article class="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <div class="mb-3.5 inline-grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">
              {{ i + 1 }}
            </div>
            <div class="mb-3 text-brand-700">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path [attr.d]="step.iconPath" />
              </svg>
            </div>
            <h3 class="text-[17px] font-bold tracking-tight text-ink">
              {{ 'home.how.steps.' + step.id + '.title' | translate }}
            </h3>
            <p class="mt-2 text-[13px] leading-relaxed text-muted">
              {{ 'home.how.steps.' + step.id + '.sub' | translate }}
            </p>
          </article>
        }
      </div>
    </section>
  `,
})
export class HowItWorksComponent {
  readonly steps = STEPS;
}
